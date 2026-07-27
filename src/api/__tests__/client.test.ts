import { fetch as expoFetch } from "expo/fetch";
import { apiFetch, ApiError, streamChat, dispatchSseBlock } from "../client";
import type { SseHandlers } from "../client";

jest.mock("expo/fetch", () => ({ fetch: jest.fn() }));

let mockConfigured = true;
const mockGetSession = jest.fn();

jest.mock("@/auth/supabase", () => ({
  get supabaseConfigured() {
    return mockConfigured;
  },
  supabase: {
    auth: {
      getSession: (...args: unknown[]) => mockGetSession(...args),
    },
  },
}));

const mockExpoFetch = expoFetch as unknown as jest.Mock;

/** A Response whose body yields the given strings as separate stream chunks. */
function streamingResponse(chunks: string[]) {
  const encoder = new TextEncoder();
  let i = 0;
  return {
    ok: true,
    status: 200,
    statusText: "OK",
    body: {
      getReader: () => ({
        read: async () =>
          i < chunks.length
            ? { done: false, value: encoder.encode(chunks[i++]) }
            : { done: true, value: undefined },
      }),
    },
  };
}

function handlers(): SseHandlers & { [k: string]: jest.Mock } {
  return {
    onSession: jest.fn(),
    onCitations: jest.fn(),
    onToken: jest.fn(),
    onReplace: jest.fn(),
    onDone: jest.fn(),
    onError: jest.fn(),
    onChartEpigraph: jest.fn(),
  } as never;
}

beforeEach(() => {
  jest.clearAllMocks();
  mockConfigured = true;
  mockGetSession.mockResolvedValue({ data: { session: { access_token: "tok-123" } } });
  global.fetch = jest.fn() as never;
});

describe("streamChat — incremental delivery (guards F2)", () => {
  it("emits each token as its chunk arrives, not all at the end", async () => {
    mockExpoFetch.mockResolvedValue(
      streamingResponse([
        'data: {"type":"token","token":"Arjuna"}\n\n',
        'data: {"type":"token","token":" asked"}\n\n',
        'data: {"type":"done"}\n\n',
      ])
    );

    const h = handlers();
    await streamChat({}, h);

    expect(h.onToken).toHaveBeenCalledTimes(2);
    expect(h.onToken).toHaveBeenNthCalledWith(1, "Arjuna");
    expect(h.onToken).toHaveBeenNthCalledWith(2, " asked");
    expect(h.onDone).toHaveBeenCalledTimes(1);
  });

  it("reassembles an SSE block split across two chunks", async () => {
    mockExpoFetch.mockResolvedValue(
      streamingResponse(['data: {"type":"tok', 'en","token":"स्थितप्रज्ञ"}\n\n'])
    );

    const h = handlers();
    await streamChat({}, h);

    expect(h.onToken).toHaveBeenCalledWith("स्थितप्रज्ञ");
  });

  it("keeps multi-byte Devanagari intact when a character straddles a chunk", async () => {
    const encoder = new TextEncoder();
    const full = 'data: {"type":"token","token":"धर्म"}\n\n';
    const bytes = encoder.encode(full);
    // Split mid-character: "ध" is 3 bytes, so cut at byte 30 lands inside one.
    const cut = 30;
    let i = 0;
    const parts = [bytes.slice(0, cut), bytes.slice(cut)];
    mockExpoFetch.mockResolvedValue({
      ok: true,
      status: 200,
      statusText: "OK",
      body: {
        getReader: () => ({
          read: async () =>
            i < parts.length ? { done: false, value: parts[i++] } : { done: true, value: undefined },
        }),
      },
    });

    const h = handlers();
    await streamChat({}, h);

    expect(h.onToken).toHaveBeenCalledWith("धर्म");
  });

  it("dispatches a trailing block that has no terminating blank line", async () => {
    mockExpoFetch.mockResolvedValue(
      streamingResponse(['data: {"type":"token","token":"end"}'])
    );

    const h = handlers();
    await streamChat({}, h);

    expect(h.onToken).toHaveBeenCalledWith("end");
  });
});

describe("streamChat — failure paths (guards E3/F4)", () => {
  it("reports a friendly message when the network is unreachable", async () => {
    mockExpoFetch.mockRejectedValue(new Error("Network request failed"));

    const h = handlers();
    await streamChat({}, h);

    expect(h.onError).toHaveBeenCalledWith(
      "Could not reach Madhav. Check your connection and try again."
    );
    expect(h.onToken).not.toHaveBeenCalled();
  });

  it("stays silent when the request was aborted by the user", async () => {
    const abort = new Error("Aborted");
    abort.name = "AbortError";
    mockExpoFetch.mockRejectedValue(abort);

    const h = handlers();
    await streamChat({}, h);

    expect(h.onError).not.toHaveBeenCalled();
  });

  it("surfaces the server error body on a non-2xx response", async () => {
    mockExpoFetch.mockResolvedValue({
      ok: false,
      status: 429,
      statusText: "Too Many Requests",
      json: async () => ({ error: "Slow down" }),
    });

    const h = handlers();
    await streamChat({}, h);

    expect(h.onError).toHaveBeenCalledWith("Slow down");
  });

  it("falls back to buffered parsing when the response has no stream body", async () => {
    mockExpoFetch.mockResolvedValue({
      ok: true,
      status: 200,
      statusText: "OK",
      body: null,
      text: async () => 'data: {"type":"token","token":"buffered"}\n\n',
    });

    const h = handlers();
    await streamChat({}, h);

    expect(h.onToken).toHaveBeenCalledWith("buffered");
  });
});

describe("dispatchSseBlock", () => {
  it("prefers an explicit event: line over the payload type", () => {
    const h = handlers();
    dispatchSseBlock('event: citations\ndata: {"citations":[{"id":"2.47"}]}', h);
    expect(h.onCitations).toHaveBeenCalledWith([{ id: "2.47" }]);
  });

  it("ignores a block with no data", () => {
    const h = handlers();
    dispatchSseBlock("event: ping", h);
    expect(h.onToken).not.toHaveBeenCalled();
  });
});

describe("apiFetch auth headers", () => {
  it("attaches the bearer token when a session exists", async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ ok: true }),
    });

    await apiFetch("/api/favorites");

    const [, init] = (global.fetch as jest.Mock).mock.calls[0];
    expect(init.headers.Authorization).toBe("Bearer tok-123");
  });

  it("omits the bearer header when Supabase is not configured", async () => {
    mockConfigured = false;
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ ok: true }),
    });

    await apiFetch("/api/favorites");

    const [, init] = (global.fetch as jest.Mock).mock.calls[0];
    expect(init.headers.Authorization).toBeUndefined();
    expect(mockGetSession).not.toHaveBeenCalled();
  });

  it("maps a non-2xx response to ApiError carrying the server message", async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: false,
      status: 403,
      statusText: "Forbidden",
      json: async () => ({ error: "Not your reflection" }),
    });

    await expect(apiFetch("/api/reflections/9")).rejects.toMatchObject({
      status: 403,
      message: "Not your reflection",
    });
    await expect(apiFetch("/api/reflections/9")).rejects.toBeInstanceOf(ApiError);
  });
});

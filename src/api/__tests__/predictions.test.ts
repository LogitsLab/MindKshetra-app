/** @jest-environment node */

jest.mock("../client", () => ({
  apiFetch: jest.fn(),
  getApiUrl: () => "https://api.test",
}));

jest.mock("@/auth/supabase", () => ({
  supabaseConfigured: false,
  supabase: { auth: { getSession: jest.fn() } },
}));

import { astrologyApi, PredictionsError } from "../endpoints";

const mockFetch = jest.fn();
(global as { fetch: unknown }).fetch = mockFetch;

function jsonResponse(
  status: number,
  body: unknown,
  headers: Record<string, string> = {}
) {
  const lower: Record<string, string> = {};
  for (const [k, v] of Object.entries(headers)) lower[k.toLowerCase()] = v;
  return {
    ok: status >= 200 && status < 300,
    status,
    statusText: `HTTP ${status}`,
    headers: { get: (name: string) => lower[name.toLowerCase()] ?? null },
    json: async () => body,
  };
}

describe("astrologyApi.predictionsDetailed", () => {
  beforeEach(() => {
    mockFetch.mockReset();
  });

  it("POSTs to /api/astrology/predictions and normalizes predictionsText", async () => {
    const text = {
      language: "en",
      portrait: "A steady chart.",
      areas: { career: { headline: "x" } },
      generatedAt: "2026-08-01",
    };
    mockFetch.mockResolvedValue(
      jsonResponse(200, { chart: { predictionsText: text }, source: "llm" })
    );

    const res = await astrologyApi.predictionsDetailed({
      chartSessionId: "abc",
      language: "en",
    });

    expect(mockFetch).toHaveBeenCalledWith(
      "https://api.test/api/astrology/predictions",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ chartSessionId: "abc", language: "en" }),
      })
    );
    expect(res.predictionsText?.portrait).toBe("A steady chart.");
    expect(res.source).toBe("llm");
  });

  it("surfaces Retry-After seconds on 429", async () => {
    mockFetch.mockResolvedValue(
      jsonResponse(429, { error: "Too many requests" }, { "Retry-After": "42" })
    );

    const err = await astrologyApi
      .predictionsDetailed({ chartSessionId: "abc" })
      .catch((e: unknown) => e);

    expect(err).toBeInstanceOf(PredictionsError);
    expect((err as PredictionsError).status).toBe(429);
    expect((err as PredictionsError).retryAfterSec).toBe(42);
    expect((err as PredictionsError).message).toBe("Too many requests");
  });

  it("carries the recoverable flag on a 404 session miss", async () => {
    mockFetch.mockResolvedValue(
      jsonResponse(404, { error: "Chart session expired", recoverable: true })
    );

    const err = await astrologyApi
      .predictionsDetailed({ chartSessionId: "stale" })
      .catch((e: unknown) => e);

    expect(err).toBeInstanceOf(PredictionsError);
    expect((err as PredictionsError).status).toBe(404);
    expect((err as PredictionsError).recoverable).toBe(true);
  });

  it("defaults retryAfterSec to null when the header is absent or garbled", async () => {
    mockFetch.mockResolvedValue(
      jsonResponse(429, { error: "busy" }, { "Retry-After": "soon" })
    );

    const err = await astrologyApi
      .predictionsDetailed({ chartSessionId: "abc" })
      .catch((e: unknown) => e);

    expect((err as PredictionsError).retryAfterSec).toBeNull();
  });

  it("passes the abort signal through to fetch", async () => {
    mockFetch.mockResolvedValue(
      jsonResponse(200, { chart: { predictionsText: null } })
    );
    const ac = new AbortController();

    await astrologyApi.predictionsDetailed({ memberId: "m1" }, ac.signal);

    expect(mockFetch).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ signal: ac.signal })
    );
  });
});

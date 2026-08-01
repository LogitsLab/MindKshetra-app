/** @jest-environment node */

import { contentApi, pushApi } from "../endpoints";

jest.mock("../client", () => ({
  apiFetch: jest.fn(),
}));

import { apiFetch } from "../client";

const mockApiFetch = apiFetch as jest.MockedFunction<typeof apiFetch>;

describe("contentApi.slokas", () => {
  beforeEach(() => {
    mockApiFetch.mockReset();
  });

  it("wraps a bare chapter array from /api/slokas", async () => {
    mockApiFetch.mockResolvedValue([
      { id: 415, chapter: 11, verse_number: 1, sanskrit_devanagari: "x" },
    ]);

    const res = await contentApi.slokas({ chapter: 11 });

    expect(mockApiFetch).toHaveBeenCalledWith("/api/slokas?chapter=11");
    expect(res.slokas).toHaveLength(1);
    expect(res.total).toBe(1);
  });

  it("passes through wrapped search results", async () => {
    mockApiFetch.mockResolvedValue({
      results: [{ id: 2, chapter: 2, verse_number: 47 }],
    });

    const res = await contentApi.slokas({ q: "karma" });

    expect(res.slokas).toHaveLength(1);
    expect(res.slokas[0].id).toBe(2);
  });
});

describe("pushApi", () => {
  beforeEach(() => {
    mockApiFetch.mockReset();
  });

  it("POSTs token + platform to /api/push/register", async () => {
    mockApiFetch.mockResolvedValue({ ok: true });
    await pushApi.register({ token: "ExponentPushToken[x]", platform: "ios" });
    expect(mockApiFetch).toHaveBeenCalledWith("/api/push/register", {
      method: "POST",
      body: JSON.stringify({
        token: "ExponentPushToken[x]",
        platform: "ios",
      }),
    });
  });

  it("DELETEs token to disable", async () => {
    mockApiFetch.mockResolvedValue({ ok: true });
    await pushApi.disable({ token: "ExponentPushToken[x]" });
    expect(mockApiFetch).toHaveBeenCalledWith("/api/push/register", {
      method: "DELETE",
      body: JSON.stringify({ token: "ExponentPushToken[x]" }),
    });
  });
});

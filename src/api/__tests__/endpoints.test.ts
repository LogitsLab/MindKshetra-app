/** @jest-environment node */

import { contentApi, journeysApi, pathsApi, pushApi } from "../endpoints";

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

describe("journeysApi", () => {
  beforeEach(() => {
    mockApiFetch.mockReset();
  });

  it("GETs a run without a body so guests get { guest: true }, not a 401", async () => {
    mockApiFetch.mockResolvedValue({
      journeyId: "anxiety-7",
      currentDay: 1,
      completedDays: [],
      guest: true,
    });
    await journeysApi.run("anxiety-7");
    expect(mockApiFetch).toHaveBeenCalledWith("/api/journeys/anxiety-7/run");
  });

  it("encodes the journey id into the path", async () => {
    mockApiFetch.mockResolvedValue({ currentDay: 2, completedDays: [1] });
    await journeysApi.markDay("a b/c", 1);
    expect(mockApiFetch).toHaveBeenCalledWith(
      "/api/journeys/a%20b%2Fc/run",
      expect.objectContaining({ method: "POST" })
    );
  });

  it("POSTs the whole device-local set to the merge route", async () => {
    mockApiFetch.mockResolvedValue({ ok: true, merged: 2 });
    await journeysApi.merge([
      { journeyId: "anxiety-7", completedDays: [1, 2] },
      { journeyId: "grief-7", completedDays: [1] },
    ]);
    expect(mockApiFetch).toHaveBeenCalledWith("/api/journeys/merge", {
      method: "POST",
      body: JSON.stringify({
        journeys: [
          { journeyId: "anxiety-7", completedDays: [1, 2] },
          { journeyId: "grief-7", completedDays: [1] },
        ],
      }),
    });
  });

  it("routes the legacy pathsApi.markDay through the journeys engine", async () => {
    mockApiFetch.mockResolvedValue({ currentDay: 3, completedDays: [1, 2] });
    await pathsApi.markDay("purpose-7", 2);
    expect(mockApiFetch).toHaveBeenCalledWith("/api/journeys/purpose-7/run", {
      method: "POST",
      body: JSON.stringify({ day: 2 }),
    });
  });
});

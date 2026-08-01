/** @jest-environment node */
import {
  advanceRun,
  isDayUnlocked,
  isJourneyComplete,
  nextDayFrom,
  normalizeDays,
} from "../journeys";

/**
 * Mirrors MindKshetra/test/journeys-core.test.ts. The two cores must agree:
 * the server rejects a locked day with 409, so a client that computes unlock
 * differently offers days the API refuses to save.
 */

describe("isDayUnlocked", () => {
  it("opens day 1 and chains the rest", () => {
    expect(isDayUnlocked(1, [], 21, "chain")).toBe(true);
    expect(isDayUnlocked(2, [], 21, "chain")).toBe(false);
    expect(isDayUnlocked(2, [1], 21, "chain")).toBe(true);
    expect(isDayUnlocked(3, [1], 21, "chain")).toBe(false);
  });

  it("leaves every day open for 'open' journeys — the 7-day paths' behaviour", () => {
    for (const day of [1, 4, 7]) {
      expect(isDayUnlocked(day, [], 7, "open")).toBe(true);
    }
  });

  it("rejects days outside the journey in both modes", () => {
    for (const unlock of ["chain", "open"] as const) {
      expect(isDayUnlocked(0, [1, 2], 7, unlock)).toBe(false);
      expect(isDayUnlocked(8, [1, 2], 7, unlock)).toBe(false);
      expect(isDayUnlocked(1.5, [], 7, unlock)).toBe(false);
    }
  });

  it("chains by default, so an omitted mode never accidentally opens a day", () => {
    expect(isDayUnlocked(2, [], 7)).toBe(false);
  });
});

describe("nextDayFrom", () => {
  it("offers the first incomplete day", () => {
    expect(nextDayFrom([], 21)).toBe(1);
    expect(nextDayFrom([1, 2, 3], 21)).toBe(4);
  });

  it("fills an earlier gap before moving on (chained)", () => {
    // Day 3 completed out of order can't unlock 4 while 2 is missing.
    expect(nextDayFrom([1, 3], 21, "chain")).toBe(2);
  });

  it("skips completed days on open journeys", () => {
    expect(nextDayFrom([1, 3], 7, "open")).toBe(2);
    expect(nextDayFrom([2], 7, "open")).toBe(1);
  });

  it("clamps at the end of a finished journey", () => {
    expect(nextDayFrom([1, 2, 3, 4, 5, 6, 7], 7)).toBe(7);
  });
});

describe("advanceRun", () => {
  it("adds a day, sorts, and moves the cursor", () => {
    const run = advanceRun([1], 2, 2, 21, "chain");
    expect(run.completedDays).toEqual([1, 2]);
    expect(run.currentDay).toBe(3);
  });

  it("is idempotent — re-marking a day changes nothing", () => {
    const once = advanceRun([1, 2], 3, 2, 21, "chain");
    const twice = advanceRun(once.completedDays, once.currentDay, 2, 21, "chain");
    expect(twice).toEqual(once);
  });

  it("never walks the cursor backwards", () => {
    const run = advanceRun([1, 2, 3], 4, 1, 21, "chain");
    expect(run.currentDay).toBe(4);
  });

  it("drops days outside the journey instead of storing them", () => {
    const run = advanceRun([1], 2, 99, 7, "open");
    expect(run.completedDays).toEqual([1]);
  });
});

describe("normalizeDays", () => {
  it("dedupes, sorts, and rejects junk", () => {
    expect(normalizeDays([3, 1, 3, 2], 7)).toEqual([1, 2, 3]);
    expect(normalizeDays([0, 8, -1, 2.5, "4", null], 7)).toEqual([]);
    expect(normalizeDays("nope", 7)).toEqual([]);
    expect(normalizeDays(null, 7)).toEqual([]);
  });

  it("keeps the valid days out of a mixed payload", () => {
    // AsyncStorage round-trips whatever an older build wrote; the survivors
    // still have to reach the merge endpoint.
    expect(normalizeDays([2, "x", 99, 5, null], 7)).toEqual([2, 5]);
  });
});

describe("isJourneyComplete", () => {
  it("needs every day, not just the count", () => {
    expect(isJourneyComplete([1, 2, 3, 4, 5, 6, 7], 7)).toBe(true);
    expect(isJourneyComplete([1, 2, 3, 4, 5, 6, 8], 7)).toBe(false);
    expect(isJourneyComplete([], 7)).toBe(false);
  });
});

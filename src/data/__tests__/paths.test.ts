/** @jest-environment node */
import { isDayUnlocked } from "../journeys";
import { getPracticePath, PRACTICE_PATHS } from "../paths";

/**
 * The catalog is bundled JSON, so a malformed or mis-registered file is a
 * silent runtime bug rather than a type error. These assertions are cheap and
 * catch the two ways it goes wrong: a legacy file registered without its
 * default unlock, and a day list that does not match its own days_count.
 */

describe("PRACTICE_PATHS", () => {
  it("leads with the 21-day arc and chains it", () => {
    expect(PRACTICE_PATHS[0].id).toBe("gita-21");
    expect(PRACTICE_PATHS[0].unlock).toBe("chain");
    expect(PRACTICE_PATHS[0].days_count).toBe(21);
  });

  it("leaves the themed weeks open", () => {
    for (const path of PRACTICE_PATHS.slice(1)) {
      expect(path.unlock).toBe("open");
      expect(path.days_count).toBe(7);
    }
  });

  it("gives every journey an unlock mode", () => {
    for (const path of PRACTICE_PATHS) {
      expect(["chain", "open"]).toContain(path.unlock);
    }
  });

  it("has as many days as it claims, numbered 1..n", () => {
    for (const path of PRACTICE_PATHS) {
      expect(path.days).toHaveLength(path.days_count);
      expect(path.days.map((d) => d.day)).toEqual(
        Array.from({ length: path.days_count }, (_, i) => i + 1)
      );
    }
  });

  it("gives every day a verse ref and both languages", () => {
    for (const path of PRACTICE_PATHS) {
      for (const day of path.days) {
        expect(day.ref.chapter).toBeGreaterThan(0);
        expect(day.ref.verse).toBeGreaterThan(0);
        expect(day.title_hi.length).toBeGreaterThan(0);
        expect(day.prompt_hi.length).toBeGreaterThan(0);
      }
    }
  });

  it("has unique ids that getPracticePath can find", () => {
    const ids = PRACTICE_PATHS.map((p) => p.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const id of ids) expect(getPracticePath(id)?.id).toBe(id);
    expect(getPracticePath("not-a-path")).toBeUndefined();
  });
});

describe("the catalog against the unlock core", () => {
  it("opens only day 1 of the chained arc to a fresh run", () => {
    const arc = getPracticePath("gita-21")!;
    expect(isDayUnlocked(1, [], arc.days_count, arc.unlock)).toBe(true);
    expect(isDayUnlocked(2, [], arc.days_count, arc.unlock)).toBe(false);
  });

  it("opens every day of a themed week to a fresh run", () => {
    const week = getPracticePath("anxiety-7")!;
    for (let d = 1; d <= week.days_count; d++) {
      expect(isDayUnlocked(d, [], week.days_count, week.unlock)).toBe(true);
    }
  });
});

/** @jest-environment node */

import { closingVerses, closingVerseFor } from "../closingVerses";

describe("closing verses", () => {
  it("has a non-empty, well-formed bundled set", () => {
    expect(closingVerses.length).toBeGreaterThan(0);
    for (const v of closingVerses) {
      expect(v.chapter).toBeGreaterThanOrEqual(1);
      expect(v.chapter).toBeLessThanOrEqual(18);
      expect(v.verse).toBeGreaterThanOrEqual(1);
      expect(v.ref).toBe(`${v.chapter}.${v.verse}`);
      expect(v.en.trim().length).toBeGreaterThan(0);
      expect(v.hi.trim().length).toBeGreaterThan(0);
    }
  });

  it("is deterministic for a given seed", () => {
    expect(closingVerseFor(3)).toBe(closingVerseFor(3));
    expect(closingVerseFor(0)).toBe(closingVerses[0]);
  });

  it("wraps in range for large, zero, and negative seeds", () => {
    const n = closingVerses.length;
    expect(closingVerseFor(n)).toBe(closingVerses[0]);
    expect(closingVerseFor(n + 1)).toBe(closingVerses[1]);
    expect(closingVerses).toContain(closingVerseFor(-5));
    expect(closingVerses).toContain(closingVerseFor(999999));
  });
});

/** @jest-environment node */
import {
  milestonesFor,
  newlyCrossed,
  nextMilestone,
  PRACTICE_LADDER,
  VISIT_LADDER,
} from "../milestones";

/**
 * Guards the port against drift from MindKshetra/lib/milestones.ts. A mark
 * that says one thing on the web and another in the app is worse than no mark,
 * and the ladders are the whole system.
 */

describe("milestonesFor", () => {
  it("earns nothing from empty stats", () => {
    expect(milestonesFor({})).toEqual([]);
  });

  it("earns every visit rung at or below the longest streak", () => {
    const keys = milestonesFor({ visitStreakDays: 21 }).map((m) => m.key);
    expect(keys).toEqual(["visit-2", "visit-7", "visit-21"]);
  });

  it("reads the LONGEST streak, so a reset never un-earns a mark", () => {
    // The stats carry longest, not current — this is the invariant that makes
    // the marks invitational rather than a guilt meter.
    expect(milestonesFor({ visitStreakDays: 2 })).toHaveLength(1);
  });

  it("counts malas as floor(beads / 108)", () => {
    expect(milestonesFor({ japaLifetimeCount: 107 })).toEqual([]);
    expect(milestonesFor({ japaLifetimeCount: 108 }).map((m) => m.key)).toEqual([
      "japa-mala-1",
    ]);
    expect(
      milestonesFor({ japaLifetimeCount: 108 * 11 }).map((m) => m.key)
    ).toEqual(["japa-mala-1", "japa-mala-11"]);
  });

  it("gives the whole-Gita mark only at the full corpus", () => {
    const short = milestonesFor({ versesRead: 699, totalVerses: 700 });
    const whole = milestonesFor({ versesRead: 700, totalVerses: 700 });
    expect(short.some((m) => m.key === "reading-all")).toBe(false);
    expect(whole.some((m) => m.key === "reading-all")).toBe(true);
  });

  it("names a completed path in both languages", () => {
    const [mark] = milestonesFor({
      pathsCompleted: [{ id: "anxiety-7", titleEn: "Anxiety", titleHi: "चिंता" }],
    });
    expect(mark.key).toBe("path-anxiety-7");
    expect(mark.motif).toBe("patha");
    expect(mark.en.name).toContain("Anxiety");
    expect(mark.hi.name).toContain("चिंता");
  });

  it("carries Hindi for every mark it earns", () => {
    const marks = milestonesFor({
      visitStreakDays: 7,
      practiceStreakDays: { japa: 7 },
      japaLifetimeCount: 108,
      versesRead: 1,
      chaptersCompleted: [2],
    });
    expect(marks.length).toBeGreaterThan(0);
    for (const m of marks) {
      expect(m.hi.name.length).toBeGreaterThan(0);
      expect(m.hi.line.length).toBeGreaterThan(0);
    }
  });
});

describe("nextMilestone", () => {
  it("proposes something to a practice that has just begun", () => {
    expect(nextMilestone({})).not.toBeNull();
  });

  it("picks the rung closest to being crossed", () => {
    // Six visit days out of seven beats one verse out of 108.
    const next = nextMilestone({ visitStreakDays: 6, versesRead: 1 });
    expect(next?.key).toBe("visit-7");
  });

  it("never proposes a rung already earned", () => {
    const next = nextMilestone({ visitStreakDays: 2 });
    expect(next?.key).not.toBe("visit-2");
  });
});

describe("newlyCrossed", () => {
  it("returns only what the newer stats added", () => {
    const fresh = newlyCrossed(
      { visitStreakDays: 2 },
      { visitStreakDays: 7 }
    ).map((m) => m.key);
    expect(fresh).toEqual(["visit-7"]);
  });

  it("returns nothing when nothing moved", () => {
    expect(newlyCrossed({ visitStreakDays: 7 }, { visitStreakDays: 7 })).toEqual(
      []
    );
  });
});

describe("the ladders themselves", () => {
  it("match the web's rungs", () => {
    expect([...VISIT_LADDER]).toEqual([2, 7, 21, 49, 108]);
    expect([...PRACTICE_LADDER]).toEqual([7, 21, 108]);
  });
});

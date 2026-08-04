/** @jest-environment node */
import {
  POST_MOOD_CHOICES,
  postMoodValueFor,
} from "../meditationCompletion";
import { dailySitsCatalog, sittingProgram } from "../meditation";

describe("meditation completion", () => {
  it("keeps localized mood labels mapped to stable stored values", () => {
    expect(POST_MOOD_CHOICES).toEqual([
      { value: 4, labelKey: "medMoodGreat" },
      { value: 3, labelKey: "medMoodGood" },
      { value: 2, labelKey: "medMoodNeutral" },
      { value: 1, labelKey: "medMoodLow" },
    ]);
    expect(postMoodValueFor("medMoodGreat")).toBe(4);
    expect(postMoodValueFor("medMoodGood")).toBe(3);
    expect(postMoodValueFor("medMoodNeutral")).toBe(2);
    expect(postMoodValueFor("medMoodLow")).toBe(1);
  });

  it("retains the full progressive course", () => {
    expect(sittingProgram.days_count).toBe(45);
    expect(sittingProgram.days.map((day) => day.day_number)).toEqual(
      Array.from({ length: 45 }, (_, index) => index + 1)
    );
  });

  it("only exposes real one-off sessions as quick sits", () => {
    expect(
      dailySitsCatalog.sessions.map(({ id, duration_minutes }) => ({
        id,
        duration_minutes,
      }))
    ).toEqual([
      { id: "daily-breath-5", duration_minutes: 5 },
      { id: "daily-release-8", duration_minutes: 8 },
    ]);
    expect(
      dailySitsCatalog.sessions.every(
        (session) => session.tier === "daily" && session.unlock_rule === "always"
      )
    ).toBe(true);
  });
});

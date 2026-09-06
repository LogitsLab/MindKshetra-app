import {
  houseType,
  isCombust,
  planetStrength,
  houseStrength,
} from "@/components/astrology/houseStrength";
import type { DeskPlanet, DeskAspect } from "@/components/astrology/chartModel";

function planet(overrides: Partial<DeskPlanet> & { id: string }): DeskPlanet {
  return {
    longitude: 0,
    sign: "aries",
    signIndex: 0,
    degreeInSign: 0,
    nakshatra: "Ashwini",
    pada: 1,
    house: 1,
    retrograde: false,
    ...overrides,
  };
}

describe("houseType", () => {
  it.each([
    [1, "trikona"],
    [4, "kendra"],
    [5, "trikona"],
    [7, "kendra"],
    [10, "kendra"],
    [6, "dusthana"],
    [8, "dusthana"],
    [12, "dusthana"],
    [2, "neutral"],
    [11, "neutral"],
  ])("house %i is %s", (h, kind) => {
    expect(houseType(h as number)).toBe(kind);
  });
});

describe("isCombust", () => {
  const sun = planet({ id: "sun", longitude: 100 });
  it("flags a planet within its orb of the Sun", () => {
    expect(isCombust(planet({ id: "mercury", longitude: 105 }), sun)).toBe(true);
  });
  it("does not flag a distant planet", () => {
    expect(isCombust(planet({ id: "mercury", longitude: 160 }), sun)).toBe(false);
  });
  it("never flags the Sun, Rahu or Ketu", () => {
    expect(isCombust(planet({ id: "sun", longitude: 100 }), sun)).toBe(false);
    expect(isCombust(planet({ id: "rahu", longitude: 101 }), sun)).toBe(false);
  });
});

describe("planetStrength", () => {
  const base = { aspects: [] as DeskAspect[], planets: [] as DeskPlanet[] };

  it("exalted in a kendra → strong", () => {
    const s = planetStrength(planet({ id: "sun", house: 10 }), {
      ...base,
      dignity: "exalted",
    });
    expect(s.level).toBe("strong");
    expect(s.reasons.map((r) => r.code)).toEqual(
      expect.arrayContaining(["exalted", "kendra"])
    );
  });

  it("debilitated in a dusthana → weak", () => {
    const s = planetStrength(planet({ id: "saturn", house: 8 }), {
      ...base,
      dignity: "debilitated",
    });
    expect(s.level).toBe("weak");
  });

  it("own sign in a kendra → strong", () => {
    const s = planetStrength(planet({ id: "venus", house: 7 }), {
      ...base,
      dignity: "own",
    });
    expect(s.level).toBe("strong");
  });

  it("exalted but in a dusthana → complex (mixed)", () => {
    const s = planetStrength(planet({ id: "jupiter", house: 6 }), {
      ...base,
      dignity: "exalted",
    });
    expect(s.level).toBe("complex");
  });

  it("combustion adds a reason and pressures the level", () => {
    const sun = planet({ id: "sun", longitude: 100, house: 3 });
    const s = planetStrength(planet({ id: "mercury", longitude: 104, house: 3 }), {
      aspects: [],
      planets: [sun],
    });
    expect(s.reasons.map((r) => r.code)).toContain("combust");
  });

  it("a benefic aspect is credited", () => {
    const aspects: DeskAspect[] = [{ from: "jupiter", to: "mars", kind: "full" }];
    const s = planetStrength(planet({ id: "mars", house: 2 }), {
      dignity: "neutral",
      aspects,
      planets: [],
    });
    expect(s.reasons.map((r) => r.code)).toContain("beneficAspect");
  });
});

describe("houseStrength", () => {
  it("empty dusthana house notes emptiness", () => {
    const s = houseStrength(6, {
      occupants: [],
      lordInHouse: null,
      dignities: {},
      aspects: [],
      planets: [],
    });
    expect(s.reasons.map((r) => r.code)).toEqual(
      expect.arrayContaining(["dusthana", "empty"])
    );
  });

  it("strong occupant + lord in kendra → strong", () => {
    const occ = planet({ id: "jupiter", house: 5 });
    const s = houseStrength(5, {
      occupants: [occ],
      lordInHouse: 10,
      dignities: { jupiter: "exalted" },
      aspects: [],
      planets: [occ],
    });
    expect(s.level).toBe("strong");
  });
});

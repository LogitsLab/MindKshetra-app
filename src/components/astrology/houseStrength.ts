import type { DeskPlanet, DeskAspect, DignityKind } from "@/components/astrology/chartModel";

/**
 * Explainable planet + house strength.
 *
 * Deliberately NOT Shadbala: a transparent composite of signals the engine
 * already gives us (dignity, house type, combustion, retrograde, aspects) that
 * always reports WHY. Reasons are returned as structured codes so the UI can
 * render them in English or Hindi — the model itself stays pure and testable.
 */

export type StrengthLevel = "weak" | "moderate" | "strong" | "complex";

export type ReasonCode =
  | "exalted"
  | "debilitated"
  | "own"
  | "kendra"
  | "trikona"
  | "dusthana"
  | "combust"
  | "retrograde"
  | "beneficAspect"
  | "maleficAspect"
  | "lordStrong"
  | "lordDusthana"
  | "empty";

export type StrengthReason = {
  code: ReasonCode;
  /** Optional context for the UI template (a sign, a planet, a house). */
  sign?: string;
  planet?: string;
  house?: number;
};

export type Strength = {
  level: StrengthLevel;
  reasons: StrengthReason[];
};

const KENDRA = new Set([1, 4, 7, 10]);
const TRIKONA = new Set([1, 5, 9]);
const DUSTHANA = new Set([6, 8, 12]);

const BENEFICS = new Set(["jupiter", "venus", "mercury", "moon"]);
const MALEFICS = new Set(["saturn", "mars", "sun", "rahu", "ketu"]);

/** Classical combustion orbs (degrees from the Sun). */
const COMBUST_ORB: Record<string, number> = {
  moon: 12,
  mars: 17,
  mercury: 14,
  jupiter: 11,
  venus: 10,
  saturn: 15,
};

export function houseType(house: number): "kendra" | "trikona" | "dusthana" | "neutral" {
  // 1 is both kendra and trikona; report trikona (the more auspicious).
  if (TRIKONA.has(house)) return "trikona";
  if (KENDRA.has(house)) return "kendra";
  if (DUSTHANA.has(house)) return "dusthana";
  return "neutral";
}

function angularSeparation(a: number, b: number): number {
  const d = Math.abs(a - b) % 360;
  return d > 180 ? 360 - d : d;
}

/** True when `planet` is within its combustion orb of the Sun (Sun itself is never combust). */
export function isCombust(planet: DeskPlanet, sun: DeskPlanet | undefined): boolean {
  if (!sun || planet.id === "sun" || planet.id === "rahu" || planet.id === "ketu") {
    return false;
  }
  const orb = COMBUST_ORB[planet.id];
  if (orb == null) return false;
  return angularSeparation(planet.longitude, sun.longitude) <= orb;
}

/** Map a signed score + signal flags to a level with the same rubric everywhere. */
function levelFrom(score: number, hasStrongPos: boolean, hasNeg: boolean): StrengthLevel {
  if (score <= -2) return "weak";
  if (hasStrongPos && hasNeg) return "complex";
  if (score >= 2) return "strong";
  return "moderate";
}

export type PlanetStrengthInput = {
  dignity?: DignityKind;
  aspects: DeskAspect[];
  planets: DeskPlanet[];
};

/**
 * Strength of a single planet by its placement. Pure — pass the parsed
 * dignities/aspects from `deskChartFromBlob`.
 */
export function planetStrength(
  planet: DeskPlanet,
  { dignity, aspects, planets }: PlanetStrengthInput
): Strength {
  const reasons: StrengthReason[] = [];
  let score = 0;
  let hasStrongPos = false;
  let hasNeg = false;

  if (dignity === "exalted") {
    score += 2;
    hasStrongPos = true;
    reasons.push({ code: "exalted", sign: planet.sign });
  } else if (dignity === "own" || dignity === "mooltrikona") {
    score += 1;
    hasStrongPos = true;
    reasons.push({ code: "own", sign: planet.sign });
  } else if (dignity === "debilitated") {
    score -= 2;
    hasNeg = true;
    reasons.push({ code: "debilitated", sign: planet.sign });
  }

  if (planet.house != null) {
    const kind = houseType(planet.house);
    if (kind === "trikona" || kind === "kendra") {
      score += 1;
      hasStrongPos = true;
      reasons.push({ code: kind, house: planet.house });
    } else if (kind === "dusthana") {
      score -= 1;
      hasNeg = true;
      reasons.push({ code: "dusthana", house: planet.house });
    }
  }

  const sun = planets.find((p) => p.id === "sun");
  if (isCombust(planet, sun)) {
    score -= 1;
    hasNeg = true;
    reasons.push({ code: "combust" });
  }

  if (planet.retrograde) {
    reasons.push({ code: "retrograde" });
  }

  let beneficHits = 0;
  let maleficHits = 0;
  for (const a of aspects) {
    if (a.to !== planet.id) continue;
    if (BENEFICS.has(a.from)) beneficHits += 1;
    else if (MALEFICS.has(a.from)) maleficHits += 1;
  }
  if (beneficHits > 0) {
    score += Math.min(2, beneficHits);
    hasStrongPos = true;
    reasons.push({ code: "beneficAspect" });
  }
  if (maleficHits > 0) {
    score -= Math.min(2, maleficHits);
    hasNeg = true;
    reasons.push({ code: "maleficAspect" });
  }

  return { level: levelFrom(score, hasStrongPos, hasNeg), reasons };
}

export type HouseStrengthInput = {
  occupants: DeskPlanet[];
  lordInHouse: number | null;
  dignities: Record<string, DignityKind>;
  aspects: DeskAspect[];
  planets: DeskPlanet[];
};

/**
 * Aggregate strength of a house: its own auspicious/inauspicious nature, the
 * planets sitting in it, and where its lord is placed.
 */
export function houseStrength(
  house: number,
  { occupants, lordInHouse, dignities, aspects, planets }: HouseStrengthInput
): Strength {
  const reasons: StrengthReason[] = [];
  let score = 0;
  let hasStrongPos = false;
  let hasNeg = false;

  const kind = houseType(house);
  if (kind === "trikona" || kind === "kendra") {
    score += 1;
    hasStrongPos = true;
    reasons.push({ code: kind, house });
  } else if (kind === "dusthana") {
    score -= 1;
    hasNeg = true;
    reasons.push({ code: "dusthana", house });
  }

  if (occupants.length === 0) {
    reasons.push({ code: "empty" });
  }
  for (const occ of occupants) {
    const s = planetStrength(occ, { dignity: dignities[occ.id], aspects, planets });
    if (s.level === "strong") {
      score += 2;
      hasStrongPos = true;
    } else if (s.level === "moderate") {
      score += 1;
    } else if (s.level === "weak") {
      score -= 2;
      hasNeg = true;
    } else {
      // complex occupant → mixed
      hasStrongPos = true;
      hasNeg = true;
    }
    // Surface the occupant's headline reason (dignity/house) for the "why".
    const headline = s.reasons.find(
      (r) => r.code === "exalted" || r.code === "debilitated" || r.code === "own"
    );
    if (headline) reasons.push({ ...headline, planet: occ.id });
  }

  if (lordInHouse != null) {
    const lordKind = houseType(lordInHouse);
    if (lordKind === "trikona" || lordKind === "kendra") {
      score += 1;
      hasStrongPos = true;
      reasons.push({ code: "lordStrong", house: lordInHouse });
    } else if (lordKind === "dusthana") {
      score -= 1;
      hasNeg = true;
      reasons.push({ code: "lordDusthana", house: lordInHouse });
    }
  }

  return { level: levelFrom(score, hasStrongPos, hasNeg), reasons };
}

/** Filled-dot meter for a level (UI helper). */
export function strengthDots(level: StrengthLevel): { filled: number; total: number } {
  const map: Record<StrengthLevel, number> = {
    weak: 1,
    moderate: 2,
    complex: 2,
    strong: 3,
  };
  return { filled: map[level], total: 3 };
}

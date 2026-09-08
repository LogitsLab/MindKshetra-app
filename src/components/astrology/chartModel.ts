export const PLANET_ABBR: Record<string, string> = {
  sun: "Su",
  moon: "Mo",
  mars: "Ma",
  mercury: "Me",
  jupiter: "Ju",
  venus: "Ve",
  saturn: "Sa",
  rahu: "Ra",
  ketu: "Ke",
  ascendant: "As",
};

export const SIGN_ABBR: Record<string, string> = {
  aries: "Ar",
  taurus: "Ta",
  gemini: "Ge",
  cancer: "Cn",
  leo: "Le",
  virgo: "Vi",
  libra: "Li",
  scorpio: "Sc",
  sagittarius: "Sg",
  capricorn: "Cp",
  aquarius: "Aq",
  pisces: "Pi",
};

export const PLANET_LABELS: Record<string, { en: string; hi: string }> = {
  sun: { en: "Sun", hi: "सूर्य" },
  moon: { en: "Moon", hi: "चन्द्र" },
  mars: { en: "Mars", hi: "मंगल" },
  mercury: { en: "Mercury", hi: "बुध" },
  jupiter: { en: "Jupiter", hi: "गुरु" },
  venus: { en: "Venus", hi: "शुक्र" },
  saturn: { en: "Saturn", hi: "शनि" },
  rahu: { en: "Rahu", hi: "राहु" },
  ketu: { en: "Ketu", hi: "केतु" },
  ascendant: { en: "Ascendant", hi: "लग्न" },
};

/** Localised planet name, e.g. "sun" → "Sun" / "सूर्य". Falls back to the id. */
export function planetLabel(id: string | null | undefined, lang: string): string {
  if (!id) return "—";
  const row = PLANET_LABELS[id];
  return row ? (lang === "hi" ? row.hi : row.en) : id;
}

/** Capitalised sign name, e.g. "leo" → "Leo". */
export function signLabel(s: string | null | undefined): string {
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : "—";
}

export const SIGNS = [
  "aries",
  "taurus",
  "gemini",
  "cancer",
  "leo",
  "virgo",
  "libra",
  "scorpio",
  "sagittarius",
  "capricorn",
  "aquarius",
  "pisces",
] as const;

export type DeskPlanet = {
  id: string;
  longitude: number;
  sign: string;
  signIndex: number;
  degreeInSign: number;
  nakshatra: string;
  pada: number;
  nakshatraLord?: string;
  house?: number;
  retrograde?: boolean;
  starLord?: string;
  subLord?: string;
  subSubLord?: string;
};

export type DeskCusp = {
  house: number;
  longitude: number;
  sign: string;
  starLord?: string;
  subLord?: string;
  subSubLord?: string;
};

export type DeskVarga = {
  ascendant: DeskPlanet | null;
  planets: DeskPlanet[];
};

export type DeskYoga = {
  id: string;
  name: string;
  present: boolean;
  detail: string;
};

/** exalted | debilitated | own | mooltrikona | neutral (from the engine). */
export type DignityKind =
  | "exalted"
  | "debilitated"
  | "own"
  | "mooltrikona"
  | "neutral";

export type DeskAspect = {
  from: string;
  to: string;
  kind: "full" | "special";
};

export type DeskChart = {
  tobUnknown: boolean;
  ephemerisMode?: string;
  ayanamsa?: number;
  ayanamsaKp?: number | null;
  asOfDate?: string;
  planets: DeskPlanet[];
  ascendant: DeskPlanet | null;
  placidusCusps: DeskCusp[];
  kp: {
    cusps: DeskCusp[];
    planets: DeskPlanet[];
    significators: Array<{ house: number; significators: string[] }>;
  } | null;
  vargas: {
    d3?: DeskVarga | null;
    d7?: DeskVarga | null;
    d9?: DeskVarga | null;
    d10?: DeskVarga | null;
    d12?: DeskVarga | null;
  };
  yogas: DeskYoga[];
  /** planet id → dignity kind (from the engine's `dignities`). */
  dignities: Record<string, DignityKind>;
  /** graha drishti (from the engine's `aspects`). */
  aspects: DeskAspect[];
};

function num(v: unknown): number | undefined {
  return typeof v === "number" && Number.isFinite(v) ? v : undefined;
}

function str(v: unknown): string | undefined {
  return typeof v === "string" && v.length ? v : undefined;
}

function asPlanet(raw: unknown): DeskPlanet | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const id = str(o.id);
  const longitude = num(o.longitude);
  if (!id || longitude == null) return null;
  const sign = str(o.sign) ?? "aries";
  const signIndex =
    num(o.signIndex) ?? Math.floor((((longitude % 360) + 360) % 360) / 30);
  return {
    id,
    longitude,
    sign,
    signIndex,
    degreeInSign: num(o.degreeInSign) ?? longitude % 30,
    nakshatra: str(o.nakshatra) ?? "—",
    pada: num(o.pada) ?? 1,
    nakshatraLord: str(o.nakshatraLord),
    house: num(o.house),
    retrograde: Boolean(o.retrograde),
    starLord: str(o.starLord),
    subLord: str(o.subLord),
    subSubLord: str(o.subSubLord),
  };
}

function asCusp(raw: unknown): DeskCusp | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const house = num(o.house);
  const longitude = num(o.longitude);
  if (house == null || longitude == null) return null;
  return {
    house,
    longitude,
    sign: str(o.sign) ?? "—",
    starLord: str(o.starLord),
    subLord: str(o.subLord),
    subSubLord: str(o.subSubLord),
  };
}

function asVarga(raw: unknown): DeskVarga | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const planets = Array.isArray(o.planets)
    ? o.planets.map(asPlanet).filter((p): p is DeskPlanet => p != null)
    : [];
  return {
    ascendant: asPlanet(o.ascendant),
    planets,
  };
}

export function formatDmsInSign(degreeInSign: number, signLabel: string): string {
  const clamped = Math.min(29.9999, Math.max(0, degreeInSign));
  const d = Math.floor(clamped);
  const mFloat = (clamped - d) * 60;
  let m = Math.floor(mFloat);
  let s = Math.round((mFloat - m) * 60);
  if (s === 60) {
    s = 0;
    m += 1;
  }
  if (m === 60) {
    m = 0;
  }
  return `${d}° ${signLabel} ${m}' ${s}"`;
}

export function glyphFor(id: string, retrograde?: boolean): string {
  const g = PLANET_ABBR[id] ?? id.slice(0, 2);
  return retrograde ? `${g}ʳ` : g;
}

export function deskChartFromBlob(chart: Record<string, unknown> | null): DeskChart | null {
  if (!chart) return null;
  const planets = Array.isArray(chart.planets)
    ? chart.planets.map(asPlanet).filter((p): p is DeskPlanet => p != null)
    : [];
  const vargasRaw =
    chart.vargas && typeof chart.vargas === "object"
      ? (chart.vargas as Record<string, unknown>)
      : {};
  const kpRaw =
    chart.kp && typeof chart.kp === "object"
      ? (chart.kp as Record<string, unknown>)
      : null;
  const yogas = Array.isArray(chart.yogas)
    ? chart.yogas
        .map((y) => {
          if (!y || typeof y !== "object") return null;
          const o = y as Record<string, unknown>;
          return {
            id: str(o.id) ?? str(o.name) ?? "yoga",
            name: str(o.name) ?? "Yoga",
            present: Boolean(o.present),
            detail: str(o.detail) ?? "",
          };
        })
        .filter((y): y is DeskYoga => y != null)
    : [];

  const dignities: Record<string, DignityKind> = {};
  if (Array.isArray(chart.dignities)) {
    for (const d of chart.dignities) {
      if (!d || typeof d !== "object") continue;
      const o = d as Record<string, unknown>;
      const planet = str(o.planet);
      const kind = str(o.kind);
      if (planet && kind) dignities[planet] = kind as DignityKind;
    }
  }
  const aspects: DeskAspect[] = Array.isArray(chart.aspects)
    ? chart.aspects
        .map((a): DeskAspect | null => {
          if (!a || typeof a !== "object") return null;
          const o = a as Record<string, unknown>;
          const from = str(o.from);
          const to = str(o.to);
          if (!from || !to) return null;
          return { from, to, kind: o.kind === "special" ? "special" : "full" };
        })
        .filter((a): a is DeskAspect => a != null)
    : [];

  return {
    tobUnknown: Boolean(chart.tobUnknown),
    ephemerisMode: str(chart.ephemerisMode),
    ayanamsa: num(chart.ayanamsa),
    ayanamsaKp: num(chart.ayanamsaKp) ?? null,
    asOfDate: str(chart.asOfDate),
    planets,
    ascendant: asPlanet(chart.ascendant),
    placidusCusps: Array.isArray(chart.placidusCusps)
      ? chart.placidusCusps.map(asCusp).filter((c): c is DeskCusp => c != null)
      : [],
    kp: kpRaw
      ? {
          cusps: Array.isArray(kpRaw.cusps)
            ? kpRaw.cusps.map(asCusp).filter((c): c is DeskCusp => c != null)
            : [],
          planets: Array.isArray(kpRaw.planets)
            ? kpRaw.planets
                .map(asPlanet)
                .filter((p): p is DeskPlanet => p != null)
            : [],
          significators: Array.isArray(kpRaw.significators)
            ? kpRaw.significators
                .map((row) => {
                  if (!row || typeof row !== "object") return null;
                  const o = row as Record<string, unknown>;
                  const house = num(o.house);
                  const sigs = Array.isArray(o.significators)
                    ? o.significators.filter((s): s is string => typeof s === "string")
                    : [];
                  return house == null ? null : { house, significators: sigs };
                })
                .filter((r): r is { house: number; significators: string[] } => r != null)
            : [],
        }
      : null,
    vargas: {
      d3: asVarga(vargasRaw.d3),
      d7: asVarga(vargasRaw.d7),
      d9: asVarga(vargasRaw.d9),
      d10: asVarga(vargasRaw.d10),
      d12: asVarga(vargasRaw.d12),
    },
    yogas,
    dignities,
    aspects,
  };
}

/** Sign rulerships (ported from the engine's yogas.ts). */
export const SIGN_LORDS: Record<string, string> = {
  aries: "mars",
  taurus: "venus",
  gemini: "mercury",
  cancer: "moon",
  leo: "sun",
  virgo: "mercury",
  libra: "venus",
  scorpio: "mars",
  sagittarius: "jupiter",
  capricorn: "saturn",
  aquarius: "saturn",
  pisces: "jupiter",
};

/** The whole-sign sign index (0..11) that a house falls in, given the ascendant. */
export function houseSignIndex(house: number, ascSignIndex: number): number {
  return (ascSignIndex + (house - 1)) % 12;
}

export type HouseLordPlacement = {
  lord: string;
  /** House the lord occupies, or null if unknown (e.g. birth-time unknown). */
  inHouse: number | null;
  /** Sign the lord occupies. */
  inSign: string | null;
};

/**
 * The lord of `house` and where it sits — the classic "9th lord in the 11th"
 * reading. Returns null lord when the ascendant is unknown.
 */
export function houseLordPlacement(
  desk: DeskChart,
  house: number
): HouseLordPlacement | null {
  const asc = desk.ascendant;
  if (!asc) return null;
  const ascSignIndex = asc.signIndex;
  const signIdx = houseSignIndex(house, ascSignIndex);
  const sign = SIGNS[signIdx];
  const lord = SIGN_LORDS[sign];
  if (!lord) return null;
  const lordPlanet = desk.planets.find((p) => p.id === lord);
  return {
    lord,
    inHouse: lordPlanet?.house ?? null,
    inSign: lordPlanet?.sign ?? null,
  };
}

export type WheelMode = "rashi" | "bhav" | "combine";
export type ChartStyle = "north" | "south" | "circular";
export type ChartSystem = "vedic" | "kp";
export type VargaKind = "d1" | "d3" | "d7" | "d9" | "d10" | "d12";

export function vargaOf(desk: DeskChart, kind: VargaKind): DeskVarga | null {
  if (kind === "d1") {
    return { ascendant: desk.ascendant, planets: desk.planets };
  }
  return desk.vargas[kind] ?? null;
}

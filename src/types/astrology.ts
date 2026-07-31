export type AreaPrediction = {
  headline: string;
  overview: string;
  strengths: string[];
  watchouts: string[];
  now: string;
  nearTerm: string;
  guidance: string;
};

export type LifeArea =
  | "career"
  | "marriage"
  | "health"
  | "finance"
  | "education"
  | "travel";

export const LIFE_AREAS: LifeArea[] = [
  "career",
  "marriage",
  "health",
  "finance",
  "education",
  "travel",
];

export type PredictionsText = {
  language: "en" | "hi";
  portrait: string;
  areas: Partial<Record<LifeArea, AreaPrediction>>;
  generatedAt: string;
  source?: "llm" | "rules";
};

export type ChartOverview = {
  ascendantSign?: string | null;
  sunSign?: string | null;
  moonSign?: string | null;
  currentMaha?: { lord?: string; start?: string; end?: string } | null;
  currentAntar?: { lord?: string; start?: string; end?: string } | null;
  currentPratyantar?: { lord?: string; start?: string; end?: string } | null;
};

export type ChartPlanet = {
  id?: string;
  name?: string;
  sign?: string;
  house?: number | null;
  nakshatra?: string;
  degreeInSign?: number;
  retrograde?: boolean;
};

export type DashaPeriodNode = {
  lord: string;
  start: string;
  end: string;
  level?: string;
  children?: DashaPeriodNode[];
};

export function extractPredictionsText(data: unknown): PredictionsText | null {
  if (!data || typeof data !== "object") return null;
  const obj = data as Record<string, unknown>;
  const chart = (obj.chart as Record<string, unknown> | undefined) ?? obj;
  const text = chart.predictionsText;
  if (!text || typeof text !== "object") return null;
  const p = text as PredictionsText;
  if (!p.portrait || !p.areas) return null;
  return {
    ...p,
    source:
      p.source ??
      (typeof obj.source === "string" ? (obj.source as "llm" | "rules") : undefined),
  };
}

const CONF_RANK: Record<string, number> = { high: 3, medium: 2, low: 1 };

/**
 * Mirrors web ChartHub's topBlended: the featured life area is the
 * highest-confidence blended verdict, so both clients lead with the same
 * area instead of mobile hardcoding "career".
 */
export function featuredAreaFromChart(chart: unknown): LifeArea | null {
  if (!chart || typeof chart !== "object") return null;
  const verdicts = (chart as { verdicts?: { blended?: unknown } }).verdicts;
  const blended = verdicts?.blended;
  if (!Array.isArray(blended) || blended.length === 0) return null;
  const top = [...blended].sort(
    (a, b) =>
      (CONF_RANK[(b as { confidence?: string }).confidence ?? ""] ?? 0) -
      (CONF_RANK[(a as { confidence?: string }).confidence ?? ""] ?? 0)
  )[0] as { lifeArea?: string };
  return LIFE_AREAS.includes(top?.lifeArea as LifeArea)
    ? (top.lifeArea as LifeArea)
    : null;
}

export function formatDashaLord(
  period: { lord?: string; start?: string; end?: string } | null | undefined
): string {
  if (!period?.lord) return "—";
  const range =
    period.start && period.end ? ` (${period.start} → ${period.end})` : "";
  return `${period.lord}${range}`;
}

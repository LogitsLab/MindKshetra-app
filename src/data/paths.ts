import gita21 from "@/data/gita-21.json";
import anxiety7 from "@/data/anxiety-7.json";
import grief7 from "@/data/grief-7.json";
import purpose7 from "@/data/purpose-7.json";
import relationships7 from "@/data/relationships-7.json";
import student7 from "@/data/student-7.json";
import type { JourneyUnlock } from "@/data/journeys";

export type PracticePathDay = {
  day: number;
  ref: { chapter: number; verse: number };
  practice: string;
  minutes: number;
  title_en: string;
  title_hi: string;
  prompt_en: string;
  prompt_hi: string;
};

export type PracticePath = {
  id: string;
  days_count: number;
  /**
   * Per journey, not per engine. The themed weeks stay open — people use them
   * as a menu — while the 21-day arc chains, which is the only way three
   * movements in sequence mean anything.
   */
  unlock: JourneyUnlock;
  title_en: string;
  title_hi: string;
  intro_en: string;
  intro_hi: string;
  days: PracticePathDay[];
};

/** The legacy themed-path files predate `unlock` and are all open. */
function openPath(raw: unknown): PracticePath {
  return { unlock: "open", ...(raw as Omit<PracticePath, "unlock">) };
}

/**
 * Ordered catalog — the long arc first, then the themed weeks, matching the
 * order the web's journeys loader declares. Keep in sync with
 * MindKshetra/data/journeys/ and MindKshetra/data/paths/.
 */
export const PRACTICE_PATHS: PracticePath[] = [
  gita21 as PracticePath,
  openPath(anxiety7),
  openPath(grief7),
  openPath(purpose7),
  openPath(relationships7),
  openPath(student7),
];

export function getPracticePath(id: string): PracticePath | undefined {
  return PRACTICE_PATHS.find((p) => p.id === id);
}

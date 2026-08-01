import anxiety7 from "@/data/anxiety-7.json";
import grief7 from "@/data/grief-7.json";
import purpose7 from "@/data/purpose-7.json";
import relationships7 from "@/data/relationships-7.json";
import student7 from "@/data/student-7.json";

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
  title_en: string;
  title_hi: string;
  intro_en: string;
  intro_hi: string;
  days: PracticePathDay[];
};

/** Ordered catalog — keep in sync with MindKshetra/data/paths/. */
export const PRACTICE_PATHS: PracticePath[] = [
  anxiety7 as PracticePath,
  grief7 as PracticePath,
  purpose7 as PracticePath,
  relationships7 as PracticePath,
  student7 as PracticePath,
];

export function getPracticePath(id: string): PracticePath | undefined {
  return PRACTICE_PATHS.find((p) => p.id === id);
}

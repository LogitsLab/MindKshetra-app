import foundation7 from "@/data/meditation/foundation-7.json";
import dailySits from "@/data/meditation/daily-sits.json";

export type MeditationPhase =
  | { type: "speak"; text_en: string; text_hi: string }
  | { type: "silence"; seconds: number };

export type MeditationSession = {
  id: string;
  day_number: number;
  tier: "foundation" | "habit" | "goal" | "daily";
  track: string | null;
  unlock_rule: "previous_completed" | "always";
  audio_url: string | null;
  duration_minutes: number;
  title_en: string;
  title_hi: string;
  theme_en: string;
  theme_hi: string;
  phases: MeditationPhase[];
};

export type MeditationProgram = {
  id: string;
  days_count: number;
  title_en: string;
  title_hi: string;
  intro_en: string;
  intro_hi: string;
  days: MeditationSession[];
};

export type DailySitsCatalog = {
  id: string;
  title_en: string;
  title_hi: string;
  intro_en: string;
  intro_hi: string;
  sessions: MeditationSession[];
};

export const FOUNDATION_PROGRAM_ID = "foundation-7";

export const foundationProgram = foundation7 as MeditationProgram;
export const dailySitsCatalog = dailySits as DailySitsCatalog;

export function getFoundationDay(day: number): MeditationSession | undefined {
  return foundationProgram.days.find((d) => d.day_number === day);
}

export function getSessionById(id: string): MeditationSession | undefined {
  return (
    foundationProgram.days.find((d) => d.id === id) ??
    dailySitsCatalog.sessions.find((s) => s.id === id)
  );
}

export function isDayUnlocked(
  day: number,
  completedDays: number[],
  daysCount: number
): boolean {
  if (!Number.isInteger(day) || day < 1 || day > daysCount) return false;
  if (day === 1) return true;
  return completedDays.includes(day - 1);
}

export function sessionTranscript(
  session: MeditationSession,
  lang: "en" | "hi"
): string {
  return session.phases
    .filter((p): p is Extract<MeditationPhase, { type: "speak" }> => p.type === "speak")
    .map((p) => (lang === "hi" ? p.text_hi : p.text_en))
    .join("\n\n");
}

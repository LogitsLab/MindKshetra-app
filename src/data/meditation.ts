import foundation7 from "@/data/meditation/foundation-7.json";
import meditation21 from "@/data/meditation/meditation-21.json";
import meditation45 from "@/data/meditation/meditation-45.json";
import dailySits from "@/data/meditation/daily-sits.json";

export type MeditationPhase =
  | { type: "speak"; text_en: string; text_hi: string }
  | { type: "silence"; seconds: number };

export type MeditationTier =
  | "foundation"
  | "habit"
  | "deepening"
  | "goal"
  | "daily";

export type MeditationSession = {
  id: string;
  day_number: number;
  tier: MeditationTier;
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
export const SITTING_COURSE_ID = "sitting-course";
export const SITTING_MILESTONES = [7, 21, 45] as const;
export type SittingMilestone = (typeof SITTING_MILESTONES)[number];

function asSessions(raw: { days: MeditationSession[] }): MeditationSession[] {
  return (raw.days as MeditationSession[]).slice().sort(
    (a, b) => a.day_number - b.day_number
  );
}

const composedDays: MeditationSession[] = [
  ...asSessions(foundation7 as { days: MeditationSession[] }),
  ...asSessions(meditation21 as { days: MeditationSession[] }),
  ...asSessions(meditation45 as { days: MeditationSession[] }),
].sort((a, b) => a.day_number - b.day_number);

const highest = composedDays[composedDays.length - 1]?.day_number ?? 7;

/** Progressive sitting course: foundation + habit + deepening. */
export const sittingProgram: MeditationProgram = {
  id: SITTING_COURSE_ID,
  days_count: highest,
  title_en:
    highest >= 45
      ? "Forty-five days of sitting"
      : highest >= 21
        ? "Twenty-one days of sitting"
        : (foundation7 as MeditationProgram).title_en,
  title_hi:
    highest >= 45
      ? "बैठने के पैंतालीस दिन"
      : highest >= 21
        ? "बैठने के इक्कीस दिन"
        : (foundation7 as MeditationProgram).title_hi,
  intro_en:
    "A free progressive sit — foundation, habit, and deepening. Finish a day to unlock the next. Missing a calendar day never erases your place.",
  intro_hi:
    "मुफ़्त क्रमिक बैठक — नींव, आदत, और गहराई। दिन पूर्ण होने पर अगला खुलता है। कैलेंडर का दिन छूटने से प्रगति नहीं मिटती।",
  days: composedDays,
};

/** @deprecated Prefer sittingProgram */
export const foundationProgram = sittingProgram;

export const dailySitsCatalog = dailySits as DailySitsCatalog;

export function getSittingDay(day: number): MeditationSession | undefined {
  return sittingProgram.days.find((d) => d.day_number === day);
}

/** @deprecated Prefer getSittingDay */
export function getFoundationDay(day: number): MeditationSession | undefined {
  return getSittingDay(day);
}

export function getSessionById(id: string): MeditationSession | undefined {
  return (
    sittingProgram.days.find((d) => d.id === id) ??
    dailySitsCatalog.sessions.find((s) => s.id === id)
  );
}

export function sittingSectionForDay(day: number): {
  id: "foundation" | "habit" | "deepening";
} {
  if (day <= 7) return { id: "foundation" };
  if (day <= 21) return { id: "habit" };
  return { id: "deepening" };
}

export { isDayUnlocked } from "@/data/journeys";

export function sessionTranscript(
  session: MeditationSession,
  lang: "en" | "hi"
): string {
  return session.phases
    .filter((p): p is Extract<MeditationPhase, { type: "speak" }> => p.type === "speak")
    .map((p) => (lang === "hi" ? p.text_hi : p.text_en))
    .join("\n\n");
}

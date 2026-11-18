import AsyncStorage from "@react-native-async-storage/async-storage";

export const MEDITATION_STATS_KEY = "mindkshetra-meditation-stats";
export const SILENT_SETUP_KEY = "mindkshetra-silent-setup";
export const SLEEP_EVENINGS_KEY = "mindkshetra-sleep-7";
export const SILENT_PRESETS = [5, 10, 15, 20, 30, 45] as const;

export type MeditationStats = {
  lifetimeMinutes: number;
  lifetimeSits: number;
  dayStamp: string;
  dayMinutes: number;
  daySits: number;
};

export type SilentSetup = {
  minutes: number;
  bed: "off" | "drone" | "bowls" | "rain";
  intervalMin: 0 | 5 | 10;
};

function localDayStamp(now = new Date()): string {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function empty(): MeditationStats {
  return {
    lifetimeMinutes: 0,
    lifetimeSits: 0,
    dayStamp: localDayStamp(),
    dayMinutes: 0,
    daySits: 0,
  };
}

export async function readMeditationStats(): Promise<MeditationStats> {
  const today = localDayStamp();
  try {
    const raw = await AsyncStorage.getItem(MEDITATION_STATS_KEY);
    if (!raw) return empty();
    const p = JSON.parse(raw) as Partial<MeditationStats>;
    const same = p.dayStamp === today;
    return {
      lifetimeMinutes: Math.max(0, Math.floor(p.lifetimeMinutes ?? 0)),
      lifetimeSits: Math.max(0, Math.floor(p.lifetimeSits ?? 0)),
      dayStamp: today,
      dayMinutes: same ? Math.max(0, Math.floor(p.dayMinutes ?? 0)) : 0,
      daySits: same ? Math.max(0, Math.floor(p.daySits ?? 0)) : 0,
    };
  } catch {
    return empty();
  }
}

export async function recordMeditationSit(durationSec: number): Promise<MeditationStats> {
  const cur = await readMeditationStats();
  const minutes = Math.max(1, Math.round((durationSec || 0) / 60));
  const next: MeditationStats = {
    lifetimeMinutes: cur.lifetimeMinutes + minutes,
    lifetimeSits: cur.lifetimeSits + 1,
    dayStamp: localDayStamp(),
    dayMinutes: cur.dayMinutes + minutes,
    daySits: cur.daySits + 1,
  };
  await AsyncStorage.setItem(MEDITATION_STATS_KEY, JSON.stringify(next));
  return next;
}

export async function readSilentSetup(): Promise<SilentSetup> {
  const fallback: SilentSetup = { minutes: 10, bed: "rain", intervalMin: 0 };
  try {
    const p = JSON.parse((await AsyncStorage.getItem(SILENT_SETUP_KEY)) ?? "{}") as Partial<SilentSetup>;
    const minutes = (SILENT_PRESETS as readonly number[]).includes(p.minutes ?? 0)
      ? (p.minutes as number)
      : 10;
    const bed =
      p.bed === "off" || p.bed === "drone" || p.bed === "bowls" || p.bed === "rain"
        ? p.bed
        : "rain";
    const intervalMin = p.intervalMin === 5 || p.intervalMin === 10 ? p.intervalMin : 0;
    return { minutes, bed, intervalMin };
  } catch {
    return fallback;
  }
}

export async function writeSilentSetup(setup: SilentSetup): Promise<void> {
  await AsyncStorage.setItem(SILENT_SETUP_KEY, JSON.stringify(setup));
}

export async function readSleepEvenings(): Promise<number[]> {
  try {
    const raw = JSON.parse((await AsyncStorage.getItem(SLEEP_EVENINGS_KEY)) ?? "[]") as unknown;
    if (!Array.isArray(raw)) return [];
    return raw.filter((n) => Number.isInteger(n) && n >= 1 && n <= 7) as number[];
  } catch {
    return [];
  }
}

export function nextSleepEvening(completed: number[]): number {
  const done = completed.filter((n) => n >= 1 && n <= 7);
  if (!done.length) return 1;
  const max = Math.max(...done);
  return max >= 7 ? 7 : max + 1;
}

export async function markSleepEvening(day: number): Promise<void> {
  const next = Array.from(new Set([...(await readSleepEvenings()), day])).sort((a, b) => a - b);
  await AsyncStorage.setItem(SLEEP_EVENINGS_KEY, JSON.stringify(next));
}

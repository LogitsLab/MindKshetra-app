import AsyncStorage from "@react-native-async-storage/async-storage";

const KEY = "mindkshetra-sit-credit";

export type SitCredit = {
  day: string;
  source: "meditation" | "daily-sit";
  durationSec: number;
};

function localDayStamp(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export async function writeSitCredit(
  source: SitCredit["source"],
  durationSec: number
): Promise<void> {
  const payload: SitCredit = {
    day: localDayStamp(),
    source,
    durationSec: Math.max(1, Math.floor(durationSec)),
  };
  await AsyncStorage.setItem(KEY, JSON.stringify(payload));
}

export async function readTodaySitCredit(): Promise<SitCredit | null> {
  const raw = await AsyncStorage.getItem(KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as SitCredit;
    if (!parsed?.day || parsed.day !== localDayStamp()) return null;
    return parsed;
  } catch {
    return null;
  }
}

export async function clearSitCredit(): Promise<void> {
  await AsyncStorage.removeItem(KEY);
}

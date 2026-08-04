import AsyncStorage from "@react-native-async-storage/async-storage";
import { meditationApi } from "@/api/endpoints";

export const GUEST_QUEUE_KEY = "mindkshetra-meditation-queue";

export async function queueMeditationGuestCompletion(
  row: Record<string, unknown>
): Promise<void> {
  const raw = await AsyncStorage.getItem(GUEST_QUEUE_KEY);
  let parsed: unknown = [];
  try {
    parsed = raw ? JSON.parse(raw) : [];
  } catch {
    parsed = [];
  }
  const next = Array.isArray(parsed) ? [...parsed, row].slice(-90) : [row];
  await AsyncStorage.setItem(GUEST_QUEUE_KEY, JSON.stringify(next));
}

/** Replays guest completions through the idempotent merge endpoint. */
export async function flushMeditationGuestQueue(): Promise<number> {
  const raw = await AsyncStorage.getItem(GUEST_QUEUE_KEY);
  if (!raw) return 0;
  let completions: unknown;
  try {
    completions = JSON.parse(raw);
  } catch {
    return 0;
  }
  if (!Array.isArray(completions) || completions.length === 0) return 0;
  let timezone: string | undefined;
  try {
    timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || undefined;
  } catch {
    timezone = undefined;
  }
  await meditationApi.merge(completions, timezone);
  await AsyncStorage.removeItem(GUEST_QUEUE_KEY);
  return completions.length;
}

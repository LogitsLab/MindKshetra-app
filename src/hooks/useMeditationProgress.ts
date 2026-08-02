import { useCallback, useEffect, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { meditationApi } from "@/api/endpoints";
import { useAuth } from "@/context/AuthContext";
import { nextDayFrom, normalizeDays } from "@/data/journeys";
import {
  FOUNDATION_PROGRAM_ID,
  SITTING_COURSE_ID,
  sittingProgram,
} from "@/data/meditation";
import {
  getGuestJourneyDays,
  setGuestJourneyDays,
} from "@/storage/local";

/** Legacy guest key — still read so nobody loses week-one progress. */
export const GUEST_RUN_KEY = `mindkshetra-meditation-run-${FOUNDATION_PROGRAM_ID}`;
export const GUEST_QUEUE_KEY = "mindkshetra-meditation-queue";

export type MeditationProgress = {
  completedDays: number[];
  currentDay: number;
  streak: number;
  loading: boolean;
};

async function readGuestDays(daysCount: number): Promise<number[]> {
  const fromJourney = await getGuestJourneyDays(SITTING_COURSE_ID, daysCount);
  if (fromJourney.length) return fromJourney;
  try {
    const raw = await AsyncStorage.getItem(GUEST_RUN_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as { completedDays?: unknown };
    return normalizeDays(parsed.completedDays, daysCount);
  } catch {
    return [];
  }
}

export async function markSittingGuestDay(
  day: number,
  daysCount: number
): Promise<number[]> {
  const prior = await readGuestDays(daysCount);
  const next = normalizeDays([...prior, day], daysCount);
  await setGuestJourneyDays(SITTING_COURSE_ID, next);
  try {
    await AsyncStorage.setItem(
      GUEST_RUN_KEY,
      JSON.stringify({ completedDays: next.filter((d) => d <= 7) })
    );
  } catch {
    /* ignore */
  }
  return next;
}

export function useMeditationProgress(): MeditationProgress & {
  reload: () => void;
} {
  const { isSignedIn } = useAuth();
  const daysCount = sittingProgram.days_count;
  const [state, setState] = useState<MeditationProgress>({
    completedDays: [],
    currentDay: 1,
    streak: 0,
    loading: true,
  });
  const [nonce, setNonce] = useState(0);

  useEffect(() => {
    let alive = true;
    void (async () => {
      const fromLocal = async () => {
        const days = await readGuestDays(daysCount);
        return {
          completedDays: days,
          currentDay: nextDayFrom(days, daysCount, "chain"),
          streak: 0,
          loading: false,
        };
      };

      let next: MeditationProgress;
      try {
        const data = await meditationApi.progress(SITTING_COURSE_ID);
        if (data.guest) {
          next = await fromLocal();
        } else {
          const days = normalizeDays(data.completedDays, daysCount);
          next = {
            completedDays: days,
            currentDay:
              data.currentDay ?? nextDayFrom(days, daysCount, "chain"),
            streak: data.streak?.current ?? 0,
            loading: false,
          };
        }
      } catch {
        next = await fromLocal();
      }
      if (alive) setState(next);
    })();
    return () => {
      alive = false;
    };
  }, [daysCount, isSignedIn, nonce]);

  const reload = useCallback(() => setNonce((n) => n + 1), []);
  return { ...state, reload };
}

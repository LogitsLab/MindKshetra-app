import { useCallback, useEffect, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { meditationApi } from "@/api/endpoints";
import { useAuth } from "@/context/AuthContext";
import { nextDayFrom, normalizeDays } from "@/data/journeys";
import { FOUNDATION_PROGRAM_ID, foundationProgram } from "@/data/meditation";

/** Written by MeditationPlayer when there is no session to save to. */
export const GUEST_RUN_KEY = `mindkshetra-meditation-run-${FOUNDATION_PROGRAM_ID}`;
export const GUEST_QUEUE_KEY = "mindkshetra-meditation-queue";

export type MeditationProgress = {
  completedDays: number[];
  /** The day to offer next. Server-authoritative when there is a session. */
  currentDay: number;
  streak: number;
  loading: boolean;
};

async function readGuestDays(daysCount: number): Promise<number[]> {
  try {
    const raw = await AsyncStorage.getItem(GUEST_RUN_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as { completedDays?: unknown };
    return normalizeDays(parsed.completedDays, daysCount);
  } catch {
    return [];
  }
}

/**
 * The course's progress, in one place.
 *
 * The hub used to recompute the continue-day as `last completed + 1`, which
 * disagrees with the server whenever days were completed out of order or a
 * merge grew the past. The server's currentDay wins when there is one; the
 * device path goes through the journeys core rather than re-deriving it.
 */
export function useMeditationProgress(): MeditationProgress & {
  reload: () => void;
} {
  const { isSignedIn } = useAuth();
  const daysCount = foundationProgram.days_count;
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
        const data = await meditationApi.progress(FOUNDATION_PROGRAM_ID);
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

import { useCallback, useEffect, useState } from "react";
import { journeysApi } from "@/api/endpoints";
import {
  isDayUnlocked,
  nextDayFrom,
  normalizeDays,
  type JourneyUnlock,
} from "@/data/journeys";
import { useAuth } from "@/context/AuthContext";
import { getGuestJourneyDays, markGuestJourneyDay } from "@/storage/local";

export type JourneyRunState = {
  completedDays: number[];
  /** The day to offer next, from the core — never recomputed at call sites. */
  currentDay: number;
  /** True while progress lives only on this device. */
  guest: boolean;
  loading: boolean;
};

const EMPTY: JourneyRunState = {
  completedDays: [],
  currentDay: 1,
  guest: true,
  loading: true,
};

/**
 * One journey's progress, server-first with a device-local fallback — the
 * shape the web's path list and detail both use.
 *
 * The server is authoritative when it answers with a real run; `{ guest: true }`
 * (its answer to a signed-out caller) and any failure fall back to storage, so
 * a person offline still sees the days they marked.
 */
async function loadRun(
  journeyId: string,
  daysCount: number,
  unlock: JourneyUnlock
): Promise<Omit<JourneyRunState, "loading">> {
  const fromLocal = async () => {
    const days = await getGuestJourneyDays(journeyId, daysCount);
    return {
      completedDays: days,
      currentDay: nextDayFrom(days, daysCount, unlock),
      guest: true,
    };
  };

  try {
    const data = await journeysApi.run(journeyId);
    if (data.guest) return fromLocal();
    const days = normalizeDays(data.completedDays, daysCount);
    return {
      completedDays: days,
      currentDay: data.currentDay ?? nextDayFrom(days, daysCount, unlock),
      guest: false,
    };
  } catch {
    return fromLocal();
  }
}

export function useJourneyRun(
  journeyId: string | undefined,
  daysCount: number,
  unlock: JourneyUnlock = "open"
): JourneyRunState & {
  markDay: (day: number) => Promise<void>;
  canMark: (day: number) => boolean;
  reload: () => void;
} {
  const { isSignedIn } = useAuth();
  const [state, setState] = useState<JourneyRunState>(EMPTY);
  const [nonce, setNonce] = useState(0);

  useEffect(() => {
    if (!journeyId) {
      setState({ ...EMPTY, loading: false });
      return;
    }
    let alive = true;
    setState((s) => ({ ...s, loading: true }));
    void (async () => {
      const next = await loadRun(journeyId, daysCount, unlock);
      if (alive) setState({ ...next, loading: false });
    })();
    return () => {
      alive = false;
    };
  }, [journeyId, daysCount, unlock, isSignedIn, nonce]);

  const markDay = useCallback(
    async (day: number) => {
      if (!journeyId) return;
      if (!isDayUnlocked(day, state.completedDays, daysCount, unlock)) return;
      if (isSignedIn) {
        try {
          const data = await journeysApi.markDay(journeyId, day);
          const days = normalizeDays(data.completedDays, daysCount);
          setState({
            completedDays: days,
            currentDay: data.currentDay ?? nextDayFrom(days, daysCount, unlock),
            guest: false,
            loading: false,
          });
          return;
        } catch {
          // 401/offline — fall through and keep the day on the device, where
          // the sign-in merge will find it.
        }
      }
      const days = await markGuestJourneyDay(journeyId, day, daysCount);
      setState({
        completedDays: days,
        currentDay: nextDayFrom(days, daysCount, unlock),
        guest: true,
        loading: false,
      });
    },
    [journeyId, daysCount, unlock, isSignedIn, state.completedDays]
  );

  const canMark = useCallback(
    (day: number) => isDayUnlocked(day, state.completedDays, daysCount, unlock),
    [state.completedDays, daysCount, unlock]
  );

  return {
    ...state,
    markDay,
    canMark,
    reload: () => setNonce((n) => n + 1),
  };
}

export type JourneyRunLine = { currentDay: number; completedCount: number };

/**
 * Progress for a whole catalog, fetched in parallel. An id absent from the
 * result has no run — the card then renders no progress line at all rather
 * than guessing at "day 1 of 7" for someone who never started.
 */
export function useJourneyRuns(
  journeys: Array<{ id: string; days_count: number; unlock?: JourneyUnlock }>
): Record<string, JourneyRunLine> {
  const { isSignedIn } = useAuth();
  const [runs, setRuns] = useState<Record<string, JourneyRunLine>>({});
  // The catalog is a module constant, but a caller could pass a fresh array
  // each render; key the effect on the ids, not the array identity.
  const key = journeys.map((j) => `${j.id}:${j.days_count}`).join(",");

  useEffect(() => {
    let alive = true;
    void (async () => {
      const next: Record<string, JourneyRunLine> = {};
      await Promise.all(
        journeys.map(async (j) => {
          const run = await loadRun(j.id, j.days_count, j.unlock ?? "open");
          if (run.completedDays.length > 0) {
            next[j.id] = {
              currentDay: run.currentDay,
              completedCount: run.completedDays.length,
            };
          }
        })
      );
      if (alive) setRuns(next);
    })();
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, isSignedIn]);

  return runs;
}

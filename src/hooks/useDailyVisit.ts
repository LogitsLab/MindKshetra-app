import { useEffect, useRef } from "react";
import { AppState } from "react-native";
import { userApi } from "@/api/endpoints";
import { useAuth } from "@/context/AuthContext";
import { getVisitDay, localDayStamp, setVisitDay } from "@/storage/local";

function deviceTimezone(): string | undefined {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || undefined;
  } catch {
    return undefined;
  }
}

/**
 * Records the daily visit that advances the reading streak. Mobile previously
 * never called POST /api/account/streak, so app users' streaks were frozen.
 * Fires at most once per local calendar day: on mount and whenever the app
 * returns to the foreground into a new day.
 */
export function useDailyVisit() {
  const { user } = useAuth();
  const userId = user?.id ?? null;
  const inFlightRef = useRef(false);

  useEffect(() => {
    if (!userId) return;

    const recordIfNewDay = async () => {
      if (inFlightRef.current) return;
      inFlightRef.current = true;
      try {
        // Keyed by user so an account switch on a shared device still counts.
        const stamp = `${userId}:${localDayStamp()}`;
        const recorded = await getVisitDay();
        if (recorded === stamp) return;
        await userApi.recordVisit(deviceTimezone());
        await setVisitDay(stamp);
      } catch {
        // Offline or server hiccup — the next foreground retries.
      } finally {
        inFlightRef.current = false;
      }
    };

    void recordIfNewDay();
    const sub = AppState.addEventListener("change", (state) => {
      if (state === "active") void recordIfNewDay();
    });
    return () => sub.remove();
  }, [userId]);
}

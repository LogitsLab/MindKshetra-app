import { useEffect, useState } from "react";
import { panchangApi } from "@/api/endpoints";
import {
  getStoredPanchang,
  istDayStamp,
  setStoredPanchang,
} from "@/storage/local";
import type { PanchangDay } from "@/types";

/**
 * Day-scoped daily panchang (v1 always uses the server's shared New Delhi
 * reference sky). Freshness uses the Asia/Kolkata civil day so devices in
 * other zones do not serve yesterday's sky near IST midnight.
 */
export function usePanchang(): {
  panchang: PanchangDay | null;
  loading: boolean;
  error: string | null;
  stale: boolean;
} {
  const [panchang, setPanchang] = useState<PanchangDay | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stale, setStale] = useState(false);

  useEffect(() => {
    let alive = true;
    (async () => {
      const todayIst = istDayStamp();
      const stored = await getStoredPanchang();
      if (stored && stored.date === todayIst) {
        if (alive) {
          setPanchang(stored.payload);
          setLoading(false);
        }
        return;
      }
      try {
        const fresh = await panchangApi.today();
        await setStoredPanchang({ date: todayIst, payload: fresh });
        if (alive) setPanchang(fresh);
      } catch (e) {
        if (alive) {
          if (stored) {
            setPanchang(stored.payload);
            setStale(true);
          }
          setError((e as Error).message || "offline");
        }
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  return { panchang, loading, error, stale };
}

import { useEffect, useState } from "react";
import { contentApi, votdApi } from "@/api/endpoints";
import {
  getStoredVotd,
  localDayStamp,
  setStoredVotd,
} from "@/storage/local";
import type { Sloka } from "@/types";

/**
 * Server-authoritative verse of the day. The id used to be derived from the
 * device clock in two screens with a formula that disagreed with the web and
 * the VOTD email; now every surface asks /api/votd/today. The last answer is
 * cached per day so an offline morning still shows a verse.
 */
export function useVotd(): {
  votd: Sloka | null;
  loading: boolean;
  error: string | null;
} {
  const [votd, setVotd] = useState<Sloka | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      let meta = await getStoredVotd();
      if (!meta || meta.date !== localDayStamp()) {
        try {
          const fresh = await votdApi.today();
          meta = { id: fresh.id, ref: fresh.ref, date: localDayStamp() };
          await setStoredVotd(meta);
        } catch {
          // Offline — a stale cached verse beats an empty panel.
        }
      }
      if (!meta) {
        if (alive) {
          setError("offline");
          setLoading(false);
        }
        return;
      }
      try {
        const sloka = await contentApi.sloka(meta.id);
        if (alive) setVotd(sloka);
      } catch (e) {
        if (alive) setError((e as Error).message);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  return { votd, loading, error };
}

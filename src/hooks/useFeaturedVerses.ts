import { useEffect, useState } from "react";
import { contentApi, votdApi } from "@/api/endpoints";
import {
  cacheVerse,
  getCachedVerse,
  getStoredVotd,
  localDayStamp,
  setStoredVotd,
} from "@/storage/local";
import type { Sloka } from "@/types";

export type FeaturedVerse = {
  sloka: Sloka;
  /** 0 = today, -1 = yesterday, -2 = earlier */
  offset: number;
};

/**
 * Today / yesterday / earlier — same three-slide VOTD carousel as web home.
 */
export function useFeaturedVerses(): {
  verses: FeaturedVerse[];
  loading: boolean;
  error: string | null;
  stale: boolean;
} {
  const [verses, setVerses] = useState<FeaturedVerse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stale, setStale] = useState(false);

  useEffect(() => {
    let alive = true;
    (async () => {
      const offsets = [0, -1, -2] as const;
      const found: FeaturedVerse[] = [];
      const seen = new Set<number>();

      for (const offset of offsets) {
        try {
          const meta = await votdApi.today({ offset, full: true });
          let sloka = meta.sloka ?? null;
          if (!sloka) {
            const cached = await getCachedVerse<Sloka>(meta.id);
            sloka = cached ?? (await contentApi.sloka(meta.id));
          }
          if (!sloka || seen.has(sloka.id)) continue;
          seen.add(sloka.id);
          found.push({
            sloka,
            offset,
          });
          await cacheVerse(meta.id, sloka);
          if (offset === 0) {
            await setStoredVotd({
              id: meta.id,
              ref: meta.ref,
              date: localDayStamp(),
            });
            if (alive) setStale(meta.date !== localDayStamp());
          }
        } catch {
          /* try next offset / fall through to cache */
        }
      }

      if (!found.length) {
        const meta = await getStoredVotd();
        if (meta) {
          const cached = await getCachedVerse<Sloka>(meta.id);
          if (cached) {
            found.push({
              sloka: cached,
              offset: 0,
            });
            if (alive) {
              setStale(meta.date !== localDayStamp());
              setError("offline");
            }
          }
        }
      }

      if (alive) {
        setVerses(found);
        if (!found.length) setError("offline");
        setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  return { verses, loading, error, stale };
}

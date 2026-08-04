import { useEffect, useState } from "react";
import { contentApi } from "@/api/endpoints";

export type SlokaRef = { chapter: number; verse: number };

/** "2.47" — the key a resolved ref is stored under. */
export function refKey(ref: SlokaRef): string {
  return `${ref.chapter}.${ref.verse}`;
}

export type SlokaRefsResult = {
  ids: Record<string, number>;
  failedRefs: SlokaRef[];
  loading: boolean;
};

export async function resolveSlokaRefs(
  refs: SlokaRef[],
  loadChapter: typeof contentApi.slokas = contentApi.slokas
): Promise<Omit<SlokaRefsResult, "loading">> {
  const ids: Record<string, number> = {};
  const failedChapters = new Set<number>();
  const chapters = Array.from(new Set(refs.map((ref) => ref.chapter)));
  await Promise.all(
    chapters.map(async (chapter) => {
      try {
        const res = await loadChapter({ chapter });
        for (const sloka of res.slokas) {
          ids[`${sloka.chapter}.${sloka.verse_number}`] = sloka.id;
        }
      } catch {
        failedChapters.add(chapter);
      }
    })
  );
  return {
    ids,
    failedRefs: refs.filter((ref) => failedChapters.has(ref.chapter)),
  };
}

/**
 * Resolve verse refs to sloka ids, one request per distinct chapter.
 *
 * The web resolves a journey day's slokaId server-side and hands the id
 * straight to the sādhana deep link. Mobile only had the raw chapter/verse, so
 * a path day could not link to its own verse and the sādhana screen had to
 * re-fetch a whole chapter to find one line. Resolving here gives both: an
 * "open verse" link per day, and an exact id for the hand-off.
 *
 * Failure is silent and partial by design — an unresolved ref simply renders
 * no verse link, and the sādhana screen still has the chapter/verse fallback.
 */
export function useSlokaRefs(refs: SlokaRef[]): SlokaRefsResult {
  const [ids, setIds] = useState<Record<string, number>>({});
  const [failedRefs, setFailedRefs] = useState<SlokaRef[]>([]);
  const [loading, setLoading] = useState(refs.length > 0);
  const key = refs.map(refKey).sort().join(",");

  useEffect(() => {
    let alive = true;
    const chapters = Array.from(new Set(refs.map((r) => r.chapter)));
    if (!chapters.length) {
      setIds({});
      setFailedRefs([]);
      setLoading(false);
      return;
    }

    void (async () => {
      setLoading(true);
      const next = await resolveSlokaRefs(refs);
      if (alive) {
        setIds(next.ids);
        setFailedRefs(next.failedRefs);
        setLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  return { ids, failedRefs, loading };
}

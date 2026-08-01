import { useEffect, useState } from "react";
import { contentApi } from "@/api/endpoints";

export type SlokaRef = { chapter: number; verse: number };

/** "2.47" — the key a resolved ref is stored under. */
export function refKey(ref: SlokaRef): string {
  return `${ref.chapter}.${ref.verse}`;
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
export function useSlokaRefs(refs: SlokaRef[]): Record<string, number> {
  const [ids, setIds] = useState<Record<string, number>>({});
  const key = refs.map(refKey).sort().join(",");

  useEffect(() => {
    let alive = true;
    const chapters = Array.from(new Set(refs.map((r) => r.chapter)));
    if (!chapters.length) return;

    void (async () => {
      const next: Record<string, number> = {};
      await Promise.all(
        chapters.map(async (chapter) => {
          try {
            const res = await contentApi.slokas({ chapter });
            for (const sloka of res.slokas) {
              next[`${sloka.chapter}.${sloka.verse_number}`] = sloka.id;
            }
          } catch {
            /* this chapter's days keep the chapter/verse fallback */
          }
        })
      );
      if (alive) setIds(next);
    })();

    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  return ids;
}

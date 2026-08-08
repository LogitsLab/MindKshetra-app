import chaptersData from "@/data/chapters.json";
import type { ChapterMeta } from "@/types";

const chapters = chaptersData as ChapterMeta[];

export function getChapterMetas(): ChapterMeta[] {
  return chapters;
}

export function getChapterMeta(number: number): ChapterMeta | undefined {
  return chapters.find((c) => c.number === number);
}

export function chapterMoral(
  meta: ChapterMeta | undefined,
  lang: "en" | "hi"
): string {
  if (!meta) return "";
  if (lang === "hi") return meta.moral_hi?.trim() || meta.moral?.trim() || "";
  return meta.moral?.trim() || meta.moral_hi?.trim() || "";
}

/** Primary chapter heading for the active UI language. */
export function chapterTitle(
  meta: ChapterMeta | undefined,
  lang: "en" | "hi",
  fallback = ""
): string {
  if (!meta) return fallback;
  if (lang === "hi") {
    return (
      meta.name_sanskrit?.trim() ||
      meta.name_hi?.trim() ||
      meta.name ||
      fallback
    );
  }
  return meta.name?.trim() || meta.name_sanskrit || fallback;
}

/** Secondary line under the title, never switches to the other language’s prose. */
export function chapterSubtitle(
  meta: ChapterMeta | undefined,
  lang: "en" | "hi"
): string {
  if (!meta) return "";
  if (lang === "hi") return meta.name_hi?.trim() || "";
  return meta.name_sanskrit?.trim() || "";
}

export function chapterSummary(
  meta: ChapterMeta | undefined,
  lang: "en" | "hi"
): string {
  if (!meta) return "";
  if (lang === "hi") {
    return meta.summary_hi?.trim() || meta.summary?.trim() || "";
  }
  return meta.summary?.trim() || meta.summary_hi?.trim() || "";
}

/**
 * Contiguous sloka-id ranges per chapter (ids 1–701 in chapter order).
 * Used for Explore tile done/total without fetching every verse.
 */
export type ChapterIdRange = {
  chapter: number;
  start: number;
  end: number;
  versesCount: number;
};

export function chapterIdRanges(
  metas: ChapterMeta[] = getChapterMetas()
): ChapterIdRange[] {
  const ordered = [...metas].sort((a, b) => a.number - b.number);
  let start = 1;
  return ordered.map((c) => {
    const versesCount = c.verses_count;
    const range: ChapterIdRange = {
      chapter: c.number,
      start,
      end: start + versesCount - 1,
      versesCount,
    };
    start += versesCount;
    return range;
  });
}

/** Count completed verse ids that fall inside a chapter's id range. */
export function completedInChapter(
  completedIds: number[],
  range: ChapterIdRange
): number {
  let n = 0;
  for (const id of completedIds) {
    if (id >= range.start && id <= range.end) n += 1;
  }
  return n;
}

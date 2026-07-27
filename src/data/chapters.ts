import chaptersData from "@/data/chapters.json";
import type { ChapterMeta } from "@/types";

const chapters = chaptersData as ChapterMeta[];

export function getChapterMetas(): ChapterMeta[] {
  return chapters;
}

export function getChapterMeta(number: number): ChapterMeta | undefined {
  return chapters.find((c) => c.number === number);
}

/** @jest-environment node */

import {
  chapterIdRanges,
  completedInChapter,
  getChapterMetas,
} from "./chapters";

describe("chapterIdRanges", () => {
  it("covers 701 contiguous verse ids across 18 chapters", () => {
    const ranges = chapterIdRanges(getChapterMetas());
    expect(ranges).toHaveLength(18);
    expect(ranges[0]).toMatchObject({ chapter: 1, start: 1, end: 47 });
    const last = ranges[ranges.length - 1];
    expect(last.end).toBe(701);
    expect(last.start).toBe(701 - last.versesCount + 1);
  });

  it("counts completed verses inside a chapter range", () => {
    const ch1 = chapterIdRanges()[0];
    expect(completedInChapter([1, 2, 47, 48], ch1)).toBe(3);
    expect(completedInChapter([48, 49], ch1)).toBe(0);
  });
});

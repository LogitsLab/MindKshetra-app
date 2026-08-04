/** @jest-environment node */

jest.mock("@/api/endpoints", () => ({
  contentApi: { slokas: jest.fn() },
}));

import { resolveSlokaRefs } from "../useSlokaRefs";

describe("resolveSlokaRefs", () => {
  it("keeps successful chapters and exposes only failed refs", async () => {
    const loadChapter = jest.fn(async ({ chapter }: { chapter?: number }) => {
      if (chapter === 3) throw new Error("offline");
      return {
        slokas: [
          {
            id: 47,
            chapter: 2,
            verse_number: 47,
          },
        ],
      };
    });

    const result = await resolveSlokaRefs(
      [
        { chapter: 2, verse: 47 },
        { chapter: 3, verse: 21 },
      ],
      loadChapter as never
    );

    expect(result.ids).toEqual({ "2.47": 47 });
    expect(result.failedRefs).toEqual([{ chapter: 3, verse: 21 }]);
  });
});

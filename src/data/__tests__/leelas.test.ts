/** @jest-environment node */

import {
  emptyLeelaProgress,
  getAllLeelaChapters,
  getAllLeelaStories,
  getContinueLeelaStory,
  getLeelaChapterById,
  getLeelaStoriesByChapterId,
  getLeelaStoryById,
  getNextLeelaStory,
  getPreviousLeelaStory,
  resolveLeelaRoute,
  splitLeelaParagraphs,
} from "../leelas";

const DIVINE_ARRIVAL_STORY_IDS = [
  "prophecy-that-shook-mathura",
  "midnight-when-krishna-appeared",
  "when-the-prison-doors-opened",
  "when-yamuna-made-way",
  "the-night-gokula-received-krishna",
  "nandas-festival-of-joy",
] as const;

const LITTLE_KRISHNA_STORY_IDS = [
  "the-naming-ceremony-of-krishna",
  "putana-and-the-baby-krishna",
  "the-cart-that-crumbled",
  "the-whirlwind-that-carried-krishna-away",
  "krishna-and-the-mystery-of-the-mud",
  "the-butter-thief-of-gokula",
  "the-day-yashoda-tied-krishna",
  "the-trees-that-fell-for-krishna",
] as const;

const MAGIC_OF_VRINDAVAN_STORY_IDS = [
  "the-cowherd-boys-and-vrindavan",
  "the-cowherd-boys-and-aghāsura",
  "brahma-tests-little-krishna",
  "kaliya-and-the-poisoned-yamuna",
  "the-flute-that-called-everyone",
  "govardhana-and-the-mountain-lift",
  "indras-pride-and-his-apology",
  "radha-and-the-love-of-vraja",
  "the-gopis-hear-the-flute",
  "the-rasa-dance-of-vrindavan",
] as const;

const CALL_OF_MATHURA_STORY_IDS = [
  "nanda-saved-from-the-serpent",
  "akrura-arrives-in-vrindavan",
  "akruras-vision-in-the-yamuna",
  "krishna-enters-mathura",
  "the-flower-garland-maker",
  "the-bent-woman-krishnas-kindness",
  "the-bow-that-broke",
  "kuvalayapida-the-elephant",
] as const;

const KRISHNA_THE_KING_STORY_IDS = [
  "krishna-enters-the-wrestling-arena",
  "kamsas-final-moment",
  "krishna-and-balarama-meet-their-parents",
  "krishna-and-balaramas-education",
  "krishna-rescues-sandipanis-son",
  "uddhava-goes-to-vrindavan",
  "rukmini-hears-of-krishna",
  "rukmini-writes-her-letter",
] as const;

const KRISHNA_AND_THE_MAHABHARATA_STORY_IDS = [
  "krishna-builds-dvaraka",
  "jarasandha-keeps-returning",
  "rukmini-harana",
  "satyabhama-and-the-syamantaka-jewel",
  "narakasura-and-the-release-of-prisoners",
  "sudama-visits-krishna",
  "krishna-and-arjuna-become-friends",
  "krishna-and-the-rajasuya-plan",
] as const;

const FINAL_LEELAS_STORY_IDS = [
  "the-rajasuya-and-krishnas-honor",
  "sisupala-and-the-hundred-offenses",
  "krishna-becomes-arjunas-charioteer",
  "the-teaching-of-the-gita",
  "krishna-and-the-final-days-of-dvaraka",
  "uddhava-receives-krishnas-last-teachings",
  "the-yadu-clan-at-prabhasa",
] as const;

const ALL_STORY_IDS = [
  ...DIVINE_ARRIVAL_STORY_IDS,
  ...LITTLE_KRISHNA_STORY_IDS,
  ...MAGIC_OF_VRINDAVAN_STORY_IDS,
  ...CALL_OF_MATHURA_STORY_IDS,
  ...KRISHNA_THE_KING_STORY_IDS,
  ...KRISHNA_AND_THE_MAHABHARATA_STORY_IDS,
  ...FINAL_LEELAS_STORY_IDS,
] as const;

describe("Krishna Leela catalog", () => {
  it("returns all chapters ordered 1..7", () => {
    const chapters = getAllLeelaChapters();
    expect(chapters).toHaveLength(7);
    expect(chapters.map((c) => c.order)).toEqual([1, 2, 3, 4, 5, 6, 7]);
    expect(chapters.map((c) => c.id)).toEqual([
      "divine-arrival",
      "little-krishna",
      "magic-of-vrindavan",
      "call-of-mathura",
      "krishna-the-king",
      "krishna-and-the-mahabharata",
      "final-leelas",
    ]);
    expect(chapters.map((c) => c.title)).toEqual([
      "The Divine Arrival",
      "Little Krishna",
      "The Magic of Vrindavan",
      "The Call of Mathura",
      "Krishna the King",
      "Krishna and the Mahabharata",
      "The Final Leelas",
    ]);
    expect(chapters.map((c) => c.stories.length)).toEqual([
      6, 8, 10, 8, 8, 8, 7,
    ]);
  });

  it("gives every chapter subtitle, location, introduction, and artwork key", () => {
    for (const chapter of getAllLeelaChapters()) {
      expect(chapter.subtitle.length).toBeGreaterThan(0);
      expect(chapter.location.length).toBeGreaterThan(0);
      expect(chapter.introduction.length).toBeGreaterThan(0);
      expect(chapter.artwork?.length).toBeGreaterThan(0);
      expect(Array.isArray(chapter.stories)).toBe(true);
    }
  });

  it("resolves /leela/[id] to chapter, story, or missing", () => {
    expect(resolveLeelaRoute("divine-arrival")).toEqual({
      kind: "chapter",
      chapter: expect.objectContaining({ id: "divine-arrival" }),
    });
    expect(resolveLeelaRoute("krishna-and-the-mahabharata")).toEqual({
      kind: "chapter",
      chapter: expect.objectContaining({
        id: "krishna-and-the-mahabharata",
      }),
    });
    expect(resolveLeelaRoute("prophecy-that-shook-mathura")).toEqual({
      kind: "story",
      story: expect.objectContaining({ id: "prophecy-that-shook-mathura" }),
    });
    expect(resolveLeelaRoute("the-teaching-of-the-gita")).toEqual({
      kind: "story",
      story: expect.objectContaining({ id: "the-teaching-of-the-gita" }),
    });
    expect(resolveLeelaRoute("missing")).toEqual({ kind: "missing" });
    expect(resolveLeelaRoute("")).toEqual({ kind: "missing" });
  });

  it("finds a chapter by id and returns null for invalid ids", () => {
    expect(getLeelaChapterById("final-leelas")?.title).toBe("The Final Leelas");
    expect(getLeelaChapterById("missing")).toBeNull();
    expect(getLeelaChapterById("")).toBeNull();
  });

  it("returns all 55 catalog stories in order", () => {
    expect(getAllLeelaStories()).toHaveLength(55);
    expect(getAllLeelaStories().map((s) => s.id)).toEqual([...ALL_STORY_IDS]);
  });

  it("filters and orders stories by chapter", () => {
    expect(getLeelaStoriesByChapterId("divine-arrival").map((s) => s.id)).toEqual(
      [...DIVINE_ARRIVAL_STORY_IDS]
    );
    expect(getLeelaStoriesByChapterId("little-krishna").map((s) => s.id)).toEqual(
      [...LITTLE_KRISHNA_STORY_IDS]
    );
    expect(
      getLeelaStoriesByChapterId("magic-of-vrindavan").map((s) => s.id)
    ).toEqual([...MAGIC_OF_VRINDAVAN_STORY_IDS]);
    expect(getLeelaStoriesByChapterId("call-of-mathura").map((s) => s.id)).toEqual(
      [...CALL_OF_MATHURA_STORY_IDS]
    );
    expect(getLeelaStoriesByChapterId("krishna-the-king").map((s) => s.id)).toEqual(
      [...KRISHNA_THE_KING_STORY_IDS]
    );
    expect(
      getLeelaStoriesByChapterId("krishna-and-the-mahabharata").map((s) => s.id)
    ).toEqual([...KRISHNA_AND_THE_MAHABHARATA_STORY_IDS]);
    expect(getLeelaStoriesByChapterId("final-leelas").map((s) => s.id)).toEqual(
      [...FINAL_LEELAS_STORY_IDS]
    );
    expect(getLeelaStoriesByChapterId("nope")).toEqual([]);
  });

  it("finds a story by id and returns null for invalid ids", () => {
    const story = getLeelaStoryById("the-teaching-of-the-gita");
    expect(story?.chapterId).toBe("final-leelas");
    expect(getLeelaStoryById("not-a-story")).toBeNull();
    expect(getLeelaStoryById("")).toBeNull();
  });

  it("continues from the first catalog story when progress is empty", () => {
    expect(getContinueLeelaStory(emptyLeelaProgress())?.id).toBe(
      "prophecy-that-shook-mathura"
    );
  });

  it("walks next and previous across all chapter boundaries", () => {
    expect(getNextLeelaStory("the-rasa-dance-of-vrindavan")?.id).toBe(
      "nanda-saved-from-the-serpent"
    );
    expect(getPreviousLeelaStory("nanda-saved-from-the-serpent")?.id).toBe(
      "the-rasa-dance-of-vrindavan"
    );

    expect(getNextLeelaStory("kuvalayapida-the-elephant")?.id).toBe(
      "krishna-enters-the-wrestling-arena"
    );
    expect(
      getPreviousLeelaStory("krishna-enters-the-wrestling-arena")?.id
    ).toBe("kuvalayapida-the-elephant");

    expect(getNextLeelaStory("rukmini-writes-her-letter")?.id).toBe(
      "krishna-builds-dvaraka"
    );
    expect(getPreviousLeelaStory("krishna-builds-dvaraka")?.id).toBe(
      "rukmini-writes-her-letter"
    );
    expect(getNextLeelaStory("jarasandha-keeps-returning")?.id).toBe(
      "rukmini-harana"
    );
    expect(getPreviousLeelaStory("rukmini-harana")?.id).toBe(
      "jarasandha-keeps-returning"
    );

    expect(getNextLeelaStory("krishna-and-the-rajasuya-plan")?.id).toBe(
      "the-rajasuya-and-krishnas-honor"
    );
    expect(getPreviousLeelaStory("the-rajasuya-and-krishnas-honor")?.id).toBe(
      "krishna-and-the-rajasuya-plan"
    );

    expect(getNextLeelaStory("the-yadu-clan-at-prabhasa")).toBeNull();
    expect(getPreviousLeelaStory("prophecy-that-shook-mathura")).toBeNull();
  });

  it("keeps previous/next continuous for every catalog story", () => {
    const stories = getAllLeelaStories();
    expect(stories).toHaveLength(55);

    expect(getPreviousLeelaStory(stories[0].id)).toBeNull();
    expect(getNextLeelaStory(stories[stories.length - 1].id)).toBeNull();

    for (let i = 0; i < stories.length; i++) {
      const id = stories[i].id;
      const previous = getPreviousLeelaStory(id);
      const next = getNextLeelaStory(id);

      if (i === 0) {
        expect(previous).toBeNull();
      } else {
        expect(previous?.id).toBe(stories[i - 1].id);
      }

      if (i === stories.length - 1) {
        expect(next).toBeNull();
      } else {
        expect(next?.id).toBe(stories[i + 1].id);
      }
    }
  });

  it("splits story content into paragraphs for the reader", () => {
    expect(splitLeelaParagraphs("")).toEqual([]);
    expect(splitLeelaParagraphs("One block")).toEqual(["One block"]);
    expect(
      splitLeelaParagraphs("First paragraph.\n\nSecond paragraph.")
    ).toEqual(["First paragraph.", "Second paragraph."]);
    expect(
      splitLeelaParagraphs(
        getLeelaStoryById("the-teaching-of-the-gita")!.content
      ).length
    ).toBeGreaterThanOrEqual(2);
  });
});

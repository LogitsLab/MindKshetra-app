/** @jest-environment node */

import { images } from "@/theme/assets";
import {
  LEELA_SCENE_KEYS,
  LEELA_SCENE_FILENAMES,
  LEELA_HUB_ARTWORK_KEY,
  isLeelaArtworkKey,
  isLeelaSceneKey,
  leelaChapterArtworkFallbackIds,
} from "@/theme/leelaArtworkKeys";
import {
  leelaDedicatedAssets,
  getDedicatedLeelaAsset,
  listExpectedLeelaAssetPaths,
  LEELA_DEDICATED_SCENE_COUNT,
} from "@/theme/leelaDedicatedAssets";
import {
  LEELA_CHAPTER_SCENE_PLAN,
  LEELA_STORY_SCENE_PLAN,
} from "@/theme/leelaScenePlan";
import {
  LEELA_SCENE_FOCUS,
  getLeelaSceneFocus,
  resolveLeelaHubArtworkFocus,
  resolveChapterArtworkFocus,
  resolveStoryArtworkFocus,
} from "@/theme/leelaSceneFocus";
import {
  resolveChapterArtwork,
  resolveLeelaArtwork,
  resolveLeelaHubArtwork,
  resolveStoryArtwork,
  leelaArtwork,
} from "@/theme/leelaArt";
import {
  getAllLeelaChapters,
  getAllLeelaStories,
  getLeelaStoryById,
} from "@/data/leelas";
import { validateLeelaCatalog } from "@/data/leelaValidation";
import catalogData from "@/data/leelas.json";
import type { LeelaCatalog } from "@/types/leela";

describe("Krishna Leela dedicated artwork architecture", () => {
  it("registers exactly 22 unique scene keys", () => {
    expect(LEELA_SCENE_KEYS).toHaveLength(22);
    expect(new Set(LEELA_SCENE_KEYS).size).toBe(22);
    expect(LEELA_DEDICATED_SCENE_COUNT).toBe(22);
    for (const key of LEELA_SCENE_KEYS) {
      expect(isLeelaSceneKey(key)).toBe(true);
      expect(isLeelaArtworkKey(key)).toBe(true);
      expect(LEELA_SCENE_FILENAMES[key]).toBe(`${key}.jpg`);
    }
  });

  it("wires all 22 dedicated assets and prefers them over interim art", () => {
    const paths = listExpectedLeelaAssetPaths();
    expect(paths).toHaveLength(22);
    expect(Object.keys(leelaDedicatedAssets)).toHaveLength(22);

    for (const key of LEELA_SCENE_KEYS) {
      const dedicated = getDedicatedLeelaAsset(key);
      expect(dedicated).toBeTruthy();
      expect(dedicated).toBe(leelaDedicatedAssets[key]);
      // Dedicated wins over interim map.
      expect(resolveLeelaArtwork(key)).toBe(dedicated);
      expect(resolveLeelaArtwork(key)).not.toBe(leelaArtwork[key]);
    }
  });

  it("maps all 55 stories to dedicated scene assets (per-chapter counts)", () => {
    const stories = getAllLeelaStories();
    expect(stories).toHaveLength(55);
    expect(Object.keys(LEELA_STORY_SCENE_PLAN)).toHaveLength(55);

    const byChapter: Record<string, { ok: number; total: number }> = {};
    for (const chapter of getAllLeelaChapters()) {
      byChapter[chapter.id] = { ok: 0, total: chapter.stories.length };
    }

    const unmapped: string[] = [];
    for (const story of stories) {
      const scene = LEELA_STORY_SCENE_PLAN[story.id];
      if (!scene || !isLeelaSceneKey(scene)) {
        unmapped.push(story.id);
        continue;
      }
      const art = resolveStoryArtwork(story);
      expect(art).toBe(leelaDedicatedAssets[scene]);
      byChapter[story.chapterId].ok += 1;
    }

    expect(unmapped).toEqual([]);
    expect(byChapter["divine-arrival"]).toEqual({ ok: 6, total: 6 });
    expect(byChapter["little-krishna"]).toEqual({ ok: 8, total: 8 });
    expect(byChapter["magic-of-vrindavan"]).toEqual({ ok: 10, total: 10 });
    expect(byChapter["call-of-mathura"]).toEqual({ ok: 8, total: 8 });
    expect(byChapter["krishna-the-king"]).toEqual({ ok: 8, total: 8 });
    expect(byChapter["krishna-and-the-mahabharata"]).toEqual({
      ok: 8,
      total: 8,
    });
    expect(byChapter["final-leelas"]).toEqual({ ok: 7, total: 7 });
  });

  it("resolves chapter covers and hub through dedicated assets", () => {
    expect(LEELA_CHAPTER_SCENE_PLAN).toEqual({
      "divine-arrival": "leela-birth-midnight",
      "little-krishna": "leela-damodara",
      "magic-of-vrindavan": "leela-flute-vrindavan",
      "call-of-mathura": "leela-mathura-streets",
      "krishna-the-king": "leela-kamsa-arena",
      "krishna-and-the-mahabharata": "leela-gita-chariot",
      "final-leelas": "leela-prabhasa",
    });

    for (const chapter of getAllLeelaChapters()) {
      const scene = LEELA_CHAPTER_SCENE_PLAN[chapter.id];
      expect(leelaChapterArtworkFallbackIds[chapter.id]).toBe(scene);
      expect(resolveChapterArtwork(chapter.id, chapter.artwork)).toBe(
        leelaDedicatedAssets[scene]
      );
    }

    expect(LEELA_HUB_ARTWORK_KEY).toBe("leela-hub-hero");
    expect(resolveLeelaHubArtwork()).toBe(
      leelaDedicatedAssets["leela-hub-hero"]
    );
  });

  it("keeps fallback for null/unknown keys", () => {
    expect(resolveLeelaArtwork(null)).toBe(images.krishnaGlade);
    expect(resolveLeelaArtwork(undefined)).toBe(images.krishnaGlade);
    expect(resolveLeelaArtwork("not-a-real-key")).toBe(images.krishnaGlade);
    expect(resolveStoryArtwork({ id: "missing-story", artwork: null })).toBe(
      images.krishnaGlade
    );
  });

  it("defines a cover focus for every dedicated scene", () => {
    expect(Object.keys(LEELA_SCENE_FOCUS)).toHaveLength(22);
    for (const key of LEELA_SCENE_KEYS) {
      expect(["center", "top", "bottom", "left", "right"]).toContain(
        LEELA_SCENE_FOCUS[key]
      );
      expect(getLeelaSceneFocus(key)).toBe(LEELA_SCENE_FOCUS[key]);
    }
    expect(resolveLeelaHubArtworkFocus()).toBe("center");
    expect(resolveChapterArtworkFocus("divine-arrival")).toBe("top");
    expect(
      resolveStoryArtworkFocus({ id: "the-teaching-of-the-gita" })
    ).toBe("top");
  });

  it("still resolves every catalog story id and accepts the catalog", () => {
    for (const story of getAllLeelaStories()) {
      expect(getLeelaStoryById(story.id)?.id).toBe(story.id);
    }
    expect(validateLeelaCatalog(catalogData as LeelaCatalog)).toEqual([]);
  });
});

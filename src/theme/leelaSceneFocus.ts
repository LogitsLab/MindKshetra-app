import type { CoverImageFocus } from "@/components/CoverImage";
import type { LeelaSceneKey } from "@/theme/leelaArtworkKeys";
import { isLeelaSceneKey } from "@/theme/leelaArtworkKeys";
import {
  LEELA_CHAPTER_SCENE_PLAN,
  LEELA_HUB_SCENE_PLAN,
  LEELA_STORY_SCENE_PLAN,
} from "@/theme/leelaScenePlan";

/**
 * Scene-specific cover focus for dedicated Leela stills.
 * Tuned for near-square scene art (~1.12) and panoramic hub-hero (3:1)
 * inside portrait PathTiles / landscape story cards — without editing JPGs.
 */
export const LEELA_SCENE_FOCUS: Record<LeelaSceneKey, CoverImageFocus> = {
  // Ultra-wide hub art in tall PathTile — center avoids over-zoom from `top`.
  "leela-hub-hero": "center",

  "leela-birth-midnight": "top",
  "leela-yamuna-crossing": "center",
  "leela-gokula-arrival": "top",
  "leela-putana": "top",
  "leela-butter-thief": "top",
  "leela-damodara": "top",
  "leela-flute-vrindavan": "top",
  "leela-kaliya": "center",
  "leela-govardhana": "center",
  "leela-rasa-radha": "center",
  "leela-akrura-farewell": "top",
  "leela-mathura-streets": "center",
  "leela-kamsa-arena": "center",
  "leela-dvaraka-city": "center",
  "leela-rukmini": "top",
  "leela-satyabhama": "top",
  "leela-sudama": "top",
  "leela-arjuna-friend": "top",
  "leela-gita-chariot": "top",
  "leela-uddhava-teaching": "top",
  "leela-prabhasa": "center",
};

export function getLeelaSceneFocus(
  sceneKey?: string | null
): CoverImageFocus {
  if (sceneKey && isLeelaSceneKey(sceneKey)) {
    return LEELA_SCENE_FOCUS[sceneKey];
  }
  return "center";
}

export function resolveStoryArtworkFocus(story: {
  id: string;
}): CoverImageFocus {
  return getLeelaSceneFocus(LEELA_STORY_SCENE_PLAN[story.id]);
}

export function resolveChapterArtworkFocus(chapterId: string): CoverImageFocus {
  return getLeelaSceneFocus(LEELA_CHAPTER_SCENE_PLAN[chapterId]);
}

export function resolveLeelaHubArtworkFocus(): CoverImageFocus {
  return getLeelaSceneFocus(LEELA_HUB_SCENE_PLAN);
}

/**
 * Home PathTile is portrait; use center cover-fill so the art edge-meets the
 * rounded clip (scene `top` bias can leave a 1px fringe / false top line).
 */
export function resolveLeelaHomeTileArtworkFocus(): CoverImageFocus {
  return "center";
}

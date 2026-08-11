import type { ImageSourcePropType } from "react-native";
import { images } from "@/theme/assets";
import { getDedicatedLeelaAsset } from "@/theme/leelaDedicatedAssets";
import {
  type LeelaArtworkKey,
  isLeelaArtworkKey,
  leelaChapterArtworkFallbackIds,
  LEELA_HUB_ARTWORK_KEY,
  LEELA_HOME_TILE_ARTWORK_KEY,
} from "@/theme/leelaArtworkKeys";
import {
  LEELA_CHAPTER_SCENE_PLAN,
  LEELA_STORY_SCENE_PLAN,
} from "@/theme/leelaScenePlan";

export {
  LEELA_ARTWORK_KEYS,
  LEELA_SCENE_KEYS,
  LEELA_SCENE_FILENAMES,
  LEELA_HUB_ARTWORK_KEY,
  LEELA_HOME_TILE_ARTWORK_KEY,
  type LeelaArtworkKey,
  type LeelaSceneKey,
  isLeelaArtworkKey,
  isLeelaSceneKey,
  EXPECTED_LEELA_CHAPTER_TITLES,
  EXPECTED_LEELA_CHAPTER_COUNT,
  leelaChapterArtworkFallbackIds,
} from "@/theme/leelaArtworkKeys";

export {
  leelaDedicatedAssets,
  getDedicatedLeelaAsset,
  listExpectedLeelaAssetPaths,
  LEELA_DEDICATED_SCENE_COUNT,
} from "@/theme/leelaDedicatedAssets";

export {
  LEELA_STORY_SCENE_PLAN,
  LEELA_CHAPTER_SCENE_PLAN,
  LEELA_HUB_SCENE_PLAN,
  LEELA_HOME_TILE_SCENE_PLAN,
  storiesForLeelaScene,
} from "@/theme/leelaScenePlan";

export {
  LEELA_SCENE_FOCUS,
  getLeelaSceneFocus,
  resolveStoryArtworkFocus,
  resolveChapterArtworkFocus,
  resolveLeelaHubArtworkFocus,
  resolveLeelaHomeTileArtworkFocus,
} from "@/theme/leelaSceneFocus";

/**
 * Interim key → existing bundled image when a dedicated JPG is not wired.
 * Dedicated files in `leelaDedicatedAssets` always win when present.
 */
export const leelaArtwork: Record<LeelaArtworkKey, ImageSourcePropType> = {
  // Dedicated scenes (interim)
  "leela-birth-midnight": images.krishnaGlade,
  "leela-yamuna-crossing": images.krishnaCharan,
  "leela-gokula-arrival": images.krishnaGlade,
  "leela-putana": images.krishnaGlade,
  "leela-butter-thief": images.krishnaCharan,
  "leela-damodara": images.krishnaCharan,
  "leela-flute-vrindavan": images.krishnaGlade,
  "leela-kaliya": images.pathMadhav,
  "leela-govardhana": images.pathMeditation,
  "leela-rasa-radha": images.krishnaGlade,
  "leela-akrura-farewell": images.krishnaCharan,
  "leela-mathura-streets": images.pathMadhav,
  "leela-kamsa-arena": images.pathMadhav,
  "leela-dvaraka-city": images.pathPaths,
  "leela-rukmini": images.pathPaths,
  "leela-satyabhama": images.pathPaths,
  "leela-sudama": images.krishnaCharan,
  "leela-arjuna-friend": images.krishnaKurukshetra,
  "leela-gita-chariot": images.krishnaKurukshetra,
  "leela-uddhava-teaching": images.krishnaGlade,
  "leela-prabhasa": images.krishnaVishwaroop,
  "leela-hub-hero": images.krishnaVishwaroop,

  // Legacy keys (catalog may still carry these until a later remap)
  "hero-journey": images.krishnaVishwaroop,
  "krishna-birth": images.krishnaGlade,
  "vasudeva-yamuna": images.krishnaCharan,
  "vasudeva-journey": images.krishnaCharan,
  "krishna-gokula": images.krishnaGlade,
  "nanda-festival": images.krishnaGlade,
  "yashoda-damodara": images.krishnaCharan,
  "butter-thief": images.krishnaCharan,
  "vrindavan-flute": images.krishnaGlade,
  "vrindavan-forest": images.krishnaGlade,
  "krishna-flute": images.krishnaGlade,
  "krishna-forest": images.krishnaGlade,
  "radha-vrindavan": images.krishnaGlade,
  "radha-krishna": images.krishnaGlade,
  "rasa-dance": images.krishnaGlade,
  govardhan: images.pathMeditation,
  govardhana: images.pathMeditation,
  kaliya: images.pathMadhav,
  "kaliya-dance": images.pathMadhav,
  "mathura-kamsa": images.pathMadhav,
  mathura: images.pathMadhav,
  akrura: images.krishnaCharan,
  rukmini: images.pathPaths,
  satyabhama: images.pathPaths,
  sudama: images.krishnaCharan,
  dwarka: images.pathPaths,
  dvaraka: images.pathPaths,
  "arjuna-chariot": images.krishnaKurukshetra,
  "krishna-arjuna": images.krishnaKurukshetra,
  "bhagavad-gita": images.krishnaKurukshetra,
  "final-journey": images.krishnaVishwaroop,
};

/** Chapter id → default cover when chapter.artwork is unset. */
export const leelaChapterArtworkFallback: Record<string, LeelaArtworkKey> =
  leelaChapterArtworkFallbackIds;

/**
 * Resolve artwork for cards / reader / hub.
 * Preference: dedicated wired JPG → interim bundled map → glade.
 * Never throws; unknown / null keys fall back safely.
 */
export function resolveLeelaArtwork(
  key?: string | null
): ImageSourcePropType {
  if (key) {
    const dedicated = getDedicatedLeelaAsset(key);
    if (dedicated) return dedicated;
    if (isLeelaArtworkKey(key)) return leelaArtwork[key];
  }
  return images.krishnaGlade;
}

/**
 * Story artwork: prefer the dedicated scene plan (audit mapping), then the
 * catalog artwork field, then glade. Does not require changing leelas.json.
 */
export function resolveStoryArtwork(story: {
  id: string;
  artwork?: string | null;
}): ImageSourcePropType {
  const planned = LEELA_STORY_SCENE_PLAN[story.id];
  if (planned) return resolveLeelaArtwork(planned);
  return resolveLeelaArtwork(story.artwork);
}

/**
 * Chapter cover: prefer the dedicated chapter scene plan, then catalog key,
 * then registry fallback.
 */
export function resolveChapterArtwork(
  chapterId: string,
  artworkKey?: string | null
): ImageSourcePropType {
  const planned = LEELA_CHAPTER_SCENE_PLAN[chapterId];
  if (planned) return resolveLeelaArtwork(planned);
  if (artworkKey) return resolveLeelaArtwork(artworkKey);
  const fallback = leelaChapterArtworkFallback[chapterId];
  return resolveLeelaArtwork(fallback ?? LEELA_HUB_ARTWORK_KEY);
}

/** Hub panoramic hero artwork. */
export function resolveLeelaHubArtwork(): ImageSourcePropType {
  return resolveLeelaArtwork(LEELA_HUB_ARTWORK_KEY);
}

/** Home/Path discovery tile — portrait-friendly dedicated scene. */
export function resolveLeelaHomeTileArtwork(): ImageSourcePropType {
  return resolveLeelaArtwork(LEELA_HOME_TILE_ARTWORK_KEY);
}

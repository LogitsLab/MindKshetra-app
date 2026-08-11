import type { ImageSourcePropType } from "react-native";
import type { LeelaSceneKey } from "@/theme/leelaArtworkKeys";
import { LEELA_SCENE_KEYS, LEELA_SCENE_FILENAMES } from "@/theme/leelaArtworkKeys";

/**
 * Dedicated Krishna Leela stills under `assets/leela/`.
 *
 * `resolveLeelaArtwork` prefers these over interim fallbacks in `leelaArt.ts`.
 */
export const leelaDedicatedAssets: Record<LeelaSceneKey, ImageSourcePropType> = {
  "leela-birth-midnight": require("../../assets/leela/leela-birth-midnight.jpg"),
  "leela-yamuna-crossing": require("../../assets/leela/leela-yamuna-crossing.jpg"),
  "leela-gokula-arrival": require("../../assets/leela/leela-gokula-arrival.jpg"),
  "leela-putana": require("../../assets/leela/leela-putana.jpg"),
  "leela-butter-thief": require("../../assets/leela/leela-butter-thief.jpg"),
  "leela-damodara": require("../../assets/leela/leela-damodara.jpg"),
  "leela-flute-vrindavan": require("../../assets/leela/leela-flute-vrindavan.jpg"),
  "leela-kaliya": require("../../assets/leela/leela-kaliya.jpg"),
  "leela-govardhana": require("../../assets/leela/leela-govardhana.jpg"),
  "leela-rasa-radha": require("../../assets/leela/leela-rasa-radha.jpg"),
  "leela-akrura-farewell": require("../../assets/leela/leela-akrura-farewell.jpg"),
  "leela-mathura-streets": require("../../assets/leela/leela-mathura-streets.jpg"),
  "leela-kamsa-arena": require("../../assets/leela/leela-kamsa-arena.jpg"),
  "leela-dvaraka-city": require("../../assets/leela/leela-dvaraka-city.jpg"),
  "leela-rukmini": require("../../assets/leela/leela-rukmini.jpg"),
  "leela-satyabhama": require("../../assets/leela/leela-satyabhama.jpg"),
  "leela-sudama": require("../../assets/leela/leela-sudama.jpg"),
  "leela-arjuna-friend": require("../../assets/leela/leela-arjuna-friend.jpg"),
  "leela-gita-chariot": require("../../assets/leela/leela-gita-chariot.jpg"),
  "leela-uddhava-teaching": require("../../assets/leela/leela-uddhava-teaching.jpg"),
  "leela-prabhasa": require("../../assets/leela/leela-prabhasa.jpg"),
  "leela-hub-hero": require("../../assets/leela/leela-hub-hero.jpg"),
};

export function getDedicatedLeelaAsset(
  key: string
): ImageSourcePropType | undefined {
  return leelaDedicatedAssets[key as LeelaSceneKey];
}

/** Planned scene count (must stay in sync with LEELA_SCENE_KEYS). */
export const LEELA_DEDICATED_SCENE_COUNT = LEELA_SCENE_KEYS.length;

export function listExpectedLeelaAssetPaths(): string[] {
  return LEELA_SCENE_KEYS.map(
    (key) => `assets/leela/${LEELA_SCENE_FILENAMES[key]}`
  );
}

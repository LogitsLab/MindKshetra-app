import type { LeelaSceneKey } from "@/theme/leelaArtworkKeys";
import { LEELA_HUB_ARTWORK_KEY, LEELA_HOME_TILE_ARTWORK_KEY } from "@/theme/leelaArtworkKeys";

/**
 * Developer plan: story id → dedicated scene key.
 * Catalog `artwork` fields should match this map (artwork keys only).
 */
export const LEELA_STORY_SCENE_PLAN: Record<string, LeelaSceneKey> = {
  // Chapter 1 — The Divine Arrival
  "prophecy-that-shook-mathura": "leela-birth-midnight",
  "midnight-when-krishna-appeared": "leela-birth-midnight",
  "when-the-prison-doors-opened": "leela-birth-midnight",
  "when-yamuna-made-way": "leela-yamuna-crossing",
  "the-night-gokula-received-krishna": "leela-gokula-arrival",
  "nandas-festival-of-joy": "leela-gokula-arrival",

  // Chapter 2 — Little Krishna
  "the-naming-ceremony-of-krishna": "leela-gokula-arrival",
  "putana-and-the-baby-krishna": "leela-putana",
  "the-cart-that-crumbled": "leela-putana",
  "the-whirlwind-that-carried-krishna-away": "leela-putana",
  "krishna-and-the-mystery-of-the-mud": "leela-butter-thief",
  "the-butter-thief-of-gokula": "leela-butter-thief",
  "the-day-yashoda-tied-krishna": "leela-damodara",
  "the-trees-that-fell-for-krishna": "leela-damodara",

  // Chapter 3 — The Magic of Vrindavan
  "the-cowherd-boys-and-vrindavan": "leela-flute-vrindavan",
  "the-flute-that-called-everyone": "leela-flute-vrindavan",
  "kaliya-and-the-poisoned-yamuna": "leela-kaliya",
  "the-cowherd-boys-and-aghāsura": "leela-flute-vrindavan",
  "brahma-tests-little-krishna": "leela-flute-vrindavan",
  "govardhana-and-the-mountain-lift": "leela-govardhana",
  "indras-pride-and-his-apology": "leela-govardhana",
  "radha-and-the-love-of-vraja": "leela-rasa-radha",
  "the-gopis-hear-the-flute": "leela-rasa-radha",
  "the-rasa-dance-of-vrindavan": "leela-rasa-radha",

  // Chapter 4 — The Call of Mathura
  "nanda-saved-from-the-serpent": "leela-flute-vrindavan",
  "akrura-arrives-in-vrindavan": "leela-akrura-farewell",
  "akruras-vision-in-the-yamuna": "leela-akrura-farewell",
  "krishna-enters-mathura": "leela-mathura-streets",
  "the-flower-garland-maker": "leela-mathura-streets",
  "the-bent-woman-krishnas-kindness": "leela-mathura-streets",
  "the-bow-that-broke": "leela-mathura-streets",
  "kuvalayapida-the-elephant": "leela-kamsa-arena",

  // Chapter 5 — Krishna the King
  "krishna-enters-the-wrestling-arena": "leela-kamsa-arena",
  "kamsas-final-moment": "leela-kamsa-arena",
  "krishna-and-balarama-meet-their-parents": "leela-kamsa-arena",
  "krishna-and-balaramas-education": "leela-mathura-streets",
  "krishna-rescues-sandipanis-son": "leela-mathura-streets",
  "uddhava-goes-to-vrindavan": "leela-uddhava-teaching",
  "rukmini-hears-of-krishna": "leela-rukmini",
  "rukmini-harana": "leela-rukmini",

  // Chapter 6 — Krishna and the Mahabharata
  "krishna-builds-dvaraka": "leela-dvaraka-city",
  "jarasandha-keeps-returning": "leela-dvaraka-city",
  "satyabhama-and-the-syamantaka-jewel": "leela-satyabhama",
  "narakasura-and-the-release-of-prisoners": "leela-satyabhama",
  "rukmini-writes-her-letter": "leela-rukmini",
  "sudama-visits-krishna": "leela-sudama",
  "krishna-and-arjuna-become-friends": "leela-arjuna-friend",
  "krishna-and-the-rajasuya-plan": "leela-arjuna-friend",

  // Chapter 7 — The Final Leelas
  "the-rajasuya-and-krishnas-honor": "leela-arjuna-friend",
  "sisupala-and-the-hundred-offenses": "leela-arjuna-friend",
  "krishna-becomes-arjunas-charioteer": "leela-gita-chariot",
  "the-teaching-of-the-gita": "leela-gita-chariot",
  "krishna-and-the-final-days-of-dvaraka": "leela-dvaraka-city",
  "uddhava-receives-krishnas-last-teachings": "leela-uddhava-teaching",
  "the-yadu-clan-at-prabhasa": "leela-prabhasa",
};

/** Chapter id → cover scene. */
export const LEELA_CHAPTER_SCENE_PLAN: Record<string, LeelaSceneKey> = {
  "divine-arrival": "leela-birth-midnight",
  "little-krishna": "leela-damodara",
  "magic-of-vrindavan": "leela-flute-vrindavan",
  "call-of-mathura": "leela-mathura-streets",
  "krishna-the-king": "leela-kamsa-arena",
  "krishna-and-the-mahabharata": "leela-gita-chariot",
  "final-leelas": "leela-prabhasa",
};

export const LEELA_HUB_SCENE_PLAN: LeelaSceneKey = LEELA_HUB_ARTWORK_KEY;

/** Home/Path tile scene (portrait PathTile). */
export const LEELA_HOME_TILE_SCENE_PLAN: LeelaSceneKey =
  LEELA_HOME_TILE_ARTWORK_KEY;

/** Stories that share each dedicated scene (for audits / packing). */
export function storiesForLeelaScene(scene: LeelaSceneKey): string[] {
  return Object.entries(LEELA_STORY_SCENE_PLAN)
    .filter(([, key]) => key === scene)
    .map(([storyId]) => storyId);
}

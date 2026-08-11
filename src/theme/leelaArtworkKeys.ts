/**
 * Artwork key registry for Krishna Leela.
 * Keep in sync with mappings in `leelaArt.ts` and wiring in `leelaDedicatedAssets.ts`.
 *
 * Master JSON may use these keys or null; unknown non-null keys fail validation.
 */

/**
 * Dedicated scene IDs for the future `assets/leela/*.jpg` pack (one key per visual scene).
 * Files are not required to exist yet — see `leelaDedicatedAssets.ts`.
 */
export const LEELA_SCENE_KEYS = [
  "leela-birth-midnight",
  "leela-yamuna-crossing",
  "leela-gokula-arrival",
  "leela-putana",
  "leela-butter-thief",
  "leela-damodara",
  "leela-flute-vrindavan",
  "leela-kaliya",
  "leela-govardhana",
  "leela-rasa-radha",
  "leela-akrura-farewell",
  "leela-mathura-streets",
  "leela-kamsa-arena",
  "leela-dvaraka-city",
  "leela-rukmini",
  "leela-satyabhama",
  "leela-sudama",
  "leela-arjuna-friend",
  "leela-gita-chariot",
  "leela-uddhava-teaching",
  "leela-prabhasa",
  "leela-hub-hero",
] as const;

export type LeelaSceneKey = (typeof LEELA_SCENE_KEYS)[number];

/** Expected filenames under `assets/leela/` (no files created until art ships). */
export const LEELA_SCENE_FILENAMES: Record<LeelaSceneKey, string> = {
  "leela-birth-midnight": "leela-birth-midnight.jpg",
  "leela-yamuna-crossing": "leela-yamuna-crossing.jpg",
  "leela-gokula-arrival": "leela-gokula-arrival.jpg",
  "leela-putana": "leela-putana.jpg",
  "leela-butter-thief": "leela-butter-thief.jpg",
  "leela-damodara": "leela-damodara.jpg",
  "leela-flute-vrindavan": "leela-flute-vrindavan.jpg",
  "leela-kaliya": "leela-kaliya.jpg",
  "leela-govardhana": "leela-govardhana.jpg",
  "leela-rasa-radha": "leela-rasa-radha.jpg",
  "leela-akrura-farewell": "leela-akrura-farewell.jpg",
  "leela-mathura-streets": "leela-mathura-streets.jpg",
  "leela-kamsa-arena": "leela-kamsa-arena.jpg",
  "leela-dvaraka-city": "leela-dvaraka-city.jpg",
  "leela-rukmini": "leela-rukmini.jpg",
  "leela-satyabhama": "leela-satyabhama.jpg",
  "leela-sudama": "leela-sudama.jpg",
  "leela-arjuna-friend": "leela-arjuna-friend.jpg",
  "leela-gita-chariot": "leela-gita-chariot.jpg",
  "leela-uddhava-teaching": "leela-uddhava-teaching.jpg",
  "leela-prabhasa": "leela-prabhasa.jpg",
  "leela-hub-hero": "leela-hub-hero.jpg",
};

/**
 * Full registry: dedicated scene keys + legacy transition keys still present in
 * `leelas.json` / Home until content is remapped.
 */
export const LEELA_ARTWORK_KEYS = [
  ...LEELA_SCENE_KEYS,
  "hero-journey",
  "krishna-birth",
  "vasudeva-yamuna",
  "vasudeva-journey",
  "krishna-gokula",
  "nanda-festival",
  "yashoda-damodara",
  "butter-thief",
  "vrindavan-flute",
  "vrindavan-forest",
  "krishna-flute",
  "krishna-forest",
  "radha-vrindavan",
  "radha-krishna",
  "rasa-dance",
  "govardhan",
  "govardhana",
  "kaliya",
  "kaliya-dance",
  "mathura-kamsa",
  "mathura",
  "akrura",
  "rukmini",
  "satyabhama",
  "sudama",
  "dwarka",
  "dvaraka",
  "arjuna-chariot",
  "krishna-arjuna",
  "bhagavad-gita",
  "final-journey",
] as const;

export type LeelaArtworkKey = (typeof LEELA_ARTWORK_KEYS)[number];

const KEY_SET = new Set<string>(LEELA_ARTWORK_KEYS);
const SCENE_SET = new Set<string>(LEELA_SCENE_KEYS);

export function isLeelaArtworkKey(key: string): key is LeelaArtworkKey {
  return KEY_SET.has(key);
}

export function isLeelaSceneKey(key: string): key is LeelaSceneKey {
  return SCENE_SET.has(key);
}

/** Canonical chapter titles in chronological order (Hub / data contract). */
export const EXPECTED_LEELA_CHAPTER_TITLES = [
  "The Divine Arrival",
  "Little Krishna",
  "The Magic of Vrindavan",
  "The Call of Mathura",
  "Krishna the King",
  "Krishna and the Mahabharata",
  "The Final Leelas",
] as const;

export const EXPECTED_LEELA_CHAPTER_COUNT =
  EXPECTED_LEELA_CHAPTER_TITLES.length;

/**
 * Chapter id → cover scene when chapter.artwork is unset.
 * Target covers from the artwork audit (dedicated keys; interim assets until JPGs land).
 */
export const leelaChapterArtworkFallbackIds: Record<string, LeelaArtworkKey> = {
  "divine-arrival": "leela-birth-midnight",
  "little-krishna": "leela-damodara",
  "magic-of-vrindavan": "leela-flute-vrindavan",
  "call-of-mathura": "leela-mathura-streets",
  "krishna-the-king": "leela-kamsa-arena",
  "krishna-and-the-mahabharata": "leela-gita-chariot",
  "final-leelas": "leela-prabhasa",
};

/** Hub hero panoramic scene (wide frames only). */
export const LEELA_HUB_ARTWORK_KEY: LeelaSceneKey = "leela-hub-hero";

/** Home/Path discovery tile — portrait-friendly scene (not the panoramic hub). */
export const LEELA_HOME_TILE_ARTWORK_KEY: LeelaSceneKey = "leela-flute-vrindavan";

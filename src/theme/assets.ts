import type { ImageSourcePropType } from "react-native";

/**
 * Path photography — copies of MindKshetra/public/images/paths/* kept under
 * assets/paths/ so Metro can bundle them (sibling requires are unreliable).
 *
 * `madhavMark` is a mobile-only crop with no web peer.
 * Krishna backgrounds are mobile atmosphere / hero art (v1 pack).
 */
export const images = {
  hero: require("../../assets/backgrounds/hero.jpg"),
  /** Onboarding poster — glade flute scene. */
  onboarding: require("../../assets/backgrounds/krishna-glade.jpg"),
  krishnaGlade: require("../../assets/backgrounds/krishna-glade.jpg"),
  krishnaKurukshetra: require("../../assets/backgrounds/krishna-kurukshetra.jpg"),
  krishnaCharan: require("../../assets/backgrounds/krishna-charan.jpg"),
  krishnaVishwaroop: require("../../assets/backgrounds/krishna-vishwaroop.jpg"),
  pathExplore: require("../../assets/paths/explore.jpg"),
  pathMood: require("../../assets/paths/mood.jpg"),
  pathMeditation: require("../../assets/paths/meditation.jpg"),
  pathMadhav: require("../../assets/paths/madhav.jpg"),
  /** Vishwaroop graded to path-tile teal/brass (Ask Madhav tile). */
  pathMadhavVishwaroop: require("../../assets/paths/madhav-vishwaroop.jpg"),
  pathAstrology: require("../../assets/paths/astrology.jpg"),
  pathCommunity: require("../../assets/paths/community.jpg"),
  pathSadhana: require("../../assets/paths/sadhana.jpg"),
  pathPaths: require("../../assets/paths/paths.jpg"),
  pathPanchangRing: require("../../assets/paths/panchang-ring.jpg"),
  madhavPortrait: require("../../assets/brand/madhav.jpg"),
  arjunPortrait: require("../../assets/brand/arjun.jpg"),
  madhavMark: require("../../assets/paths/path-madhav-mark.jpg"),
};

/** Calm Krishna stills for the cold-start BootReveal lottery (excludes Vishwaroopam). */
export const bootRevealPool: ImageSourcePropType[] = [
  images.hero,
  images.krishnaGlade,
  images.krishnaKurukshetra,
  images.krishnaCharan,
];

export const moodAccent: Record<string, string> = {
  anxious: "#4a8fa3",
  sad: "#6b7f9e",
  angry: "#c45a3a",
  confused: "#9a8450",
  grieving: "#7a6a90",
  lonely: "#4a6a8a",
  overwhelmed: "#3d8a7a",
  guilty: "#9a5a6a",
  jealous: "#b08a2a",
  unmotivated: "#6a7380",
  fearful: "#5a5e9a",
  hopeful: "#d4a84a",
  grateful: "#2f8a6a",
  "big-decision": "#a07a40",
  conflict: "#a05040",
  failure: "#8a5a8a",
  purpose: "#e2c45a",
  happy: "#c9a227",
};

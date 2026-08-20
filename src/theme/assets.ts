import type { ImageSourcePropType } from "react-native";

/**
 * Path photography — copies of MindKshetra/public/images/paths/* kept under
 * assets/paths/ so Metro can bundle them (sibling requires are unreliable).
 *
 * `madhavMark` is a mobile-only crop with no web peer.
 * Krishna backgrounds are mobile atmosphere / hero art (v1 pack).
 * Boot stills under assets/backgrounds/boot/ rotate on cold start.
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
  pathCommunity: require("../../assets/paths/community.jpg"),
  pathSadhana: require("../../assets/paths/sadhana.jpg"),
  pathPaths: require("../../assets/paths/paths.jpg"),
  madhavPortrait: require("../../assets/brand/madhav.jpg"),
  arjunPortrait: require("../../assets/brand/arjun.jpg"),
  madhavMark: require("../../assets/paths/path-madhav-mark.jpg"),
};

/**
 * Cold-start BootReveal lottery — one random still from boot/ (+ the glade
 * splash). Keep this pool to curated portrait stills only; mixing the older
 * hero/Kurukshetra pack caused a second “bad” image after the native splash.
 * Native Expo splash is a solid void; the random still is the only art shown.
 */
export const bootRevealPool: ImageSourcePropType[] = [
  require("../../assets/backgrounds/krishna-glade-splash.png"),
  require("../../assets/backgrounds/boot/boot-01.png"),
  require("../../assets/backgrounds/boot/boot-02.png"),
  require("../../assets/backgrounds/boot/boot-03.png"),
  require("../../assets/backgrounds/boot/boot-04.png"),
  require("../../assets/backgrounds/boot/boot-05.png"),
  require("../../assets/backgrounds/boot/boot-06.png"),
  require("../../assets/backgrounds/boot/boot-07.png"),
  require("../../assets/backgrounds/boot/boot-08.png"),
  require("../../assets/backgrounds/boot/boot-09.png"),
  require("../../assets/backgrounds/boot/boot-10.png"),
  require("../../assets/backgrounds/boot/boot-11.png"),
  require("../../assets/backgrounds/boot/boot-12.png"),
  require("../../assets/backgrounds/boot/boot-13.png"),
  require("../../assets/backgrounds/boot/boot-14.png"),
  require("../../assets/backgrounds/boot/boot-15.png"),
  require("../../assets/backgrounds/boot/boot-16.png"),
  require("../../assets/backgrounds/boot/boot-17.png"),
  require("../../assets/backgrounds/boot/boot-18.png"),
  require("../../assets/backgrounds/boot/boot-19.png"),
  require("../../assets/backgrounds/boot/boot-20.png"),
  require("../../assets/backgrounds/boot/boot-21.png"),
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

export const images = {
  hero: require("../../assets/backgrounds/hero.jpg"),
  /**
   * Paintings from MindKshetra/public/images/paths/, renamed with a `path-`
   * prefix. Most are byte-identical copies; two are not, and the difference
   * matters:
   *
   * - `pathMadhavMark` is a mobile-only crop of the Madhav portrait, with no
   *   web peer.
   * - `pathAstrology` shipped for one release as a copy of the web's
   *   panchang-ring.jpg, so every astrology surface showed the brass almanac
   *   diagram instead of the night sky. Both files are now present under
   *   their own names — verify with `md5` against the web repo before
   *   replacing either.
   */
  pathExplore: require("../../assets/paths/path-explore.jpg"),
  pathMood: require("../../assets/paths/path-mood.jpg"),
  pathMeditation: require("../../assets/paths/path-meditation.jpg"),
  pathMadhav: require("../../assets/paths/path-madhav.jpg"),
  pathAstrology: require("../../assets/paths/path-astrology.jpg"),
  pathCommunity: require("../../assets/paths/path-community.jpg"),
  pathSadhana: require("../../assets/paths/path-sadhana.jpg"),
  pathPaths: require("../../assets/paths/path-paths.jpg"),
  pathPanchangRing: require("../../assets/paths/path-panchang-ring.jpg"),
  madhavPortrait: require("../../assets/brand/madhav.jpg"),
  madhavMark: require("../../assets/paths/path-madhav-mark.jpg"),
};

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

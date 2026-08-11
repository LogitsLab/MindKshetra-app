import type { Href } from "expo-router";
import type { ImageSourcePropType } from "react-native";
import type { CoverImageFocus } from "@/components/CoverImage";
import { images } from "@/theme/assets";
import { resolveLeelaHomeTileArtwork } from "@/theme/leelaArt";
import { resolveLeelaHomeTileArtworkFocus } from "@/theme/leelaSceneFocus";

export type HomePathEntry = {
  index: string;
  titleKey:
    | "homeExploreTitle"
    | "homeLeelaTitle"
    | "homeMoodTitle"
    | "homeMeditationTitle"
    | "homeMadhavTitle"
    | "homeAstroTitle"
    | "homeBlockPathsTitle";
  blurbKey:
    | "homeExploreBlurb"
    | "homeLeelaBlurb"
    | "homeMoodBlurb"
    | "homeMeditationBlurb"
    | "homeMadhavBlurb"
    | "homeAstroBlurb"
    | "homeBlockPathsBody";
  image: ImageSourcePropType;
  /** Cover-crop preference for tall hero art. */
  imageFocus?: CoverImageFocus;
  mark: "explore" | "leela" | "mood" | "meditation" | "madhav" | "astrology" | "paths";
  href: Href;
};

/**
 * Paths Into, Home + Path tab (shared discovery tiles).
 * Krishna Leela sits last — portrait-friendly flute art, not the hub panoramic.
 */
export const HOME_PATHS: HomePathEntry[] = [
  {
    index: "01",
    titleKey: "homeExploreTitle",
    blurbKey: "homeExploreBlurb",
    image: images.pathExplore,
    mark: "explore",
    href: "/(tabs)/explore",
  },
  {
    index: "02",
    titleKey: "homeMoodTitle",
    blurbKey: "homeMoodBlurb",
    image: images.pathMood,
    mark: "mood",
    href: "/(tabs)/mood",
  },
  {
    index: "03",
    titleKey: "homeMeditationTitle",
    blurbKey: "homeMeditationBlurb",
    image: images.pathMeditation,
    mark: "meditation",
    href: "/meditation",
  },
  {
    index: "04",
    titleKey: "homeMadhavTitle",
    blurbKey: "homeMadhavBlurb",
    image: images.pathMadhavVishwaroop,
    imageFocus: "top",
    mark: "madhav",
    href: "/madhav",
  },
  {
    index: "05",
    titleKey: "homeAstroTitle",
    blurbKey: "homeAstroBlurb",
    image: images.pathAstrology,
    mark: "astrology",
    href: "/(tabs)/astrology",
  },
  {
    index: "06",
    titleKey: "homeBlockPathsTitle",
    blurbKey: "homeBlockPathsBody",
    image: images.pathPaths,
    mark: "paths",
    href: "/paths",
  },
  {
    index: "07",
    titleKey: "homeLeelaTitle",
    blurbKey: "homeLeelaBlurb",
    image: resolveLeelaHomeTileArtwork(),
    imageFocus: resolveLeelaHomeTileArtworkFocus(),
    mark: "leela",
    href: "/leela",
  },
];

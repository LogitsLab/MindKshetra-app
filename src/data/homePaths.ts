import type { Href } from "expo-router";
import type { ImageSourcePropType } from "react-native";
import { images } from "@/theme/assets";

export type HomePathEntry = {
  index: string;
  titleKey:
    | "homeExploreTitle"
    | "homeMoodTitle"
    | "homeMeditationTitle"
    | "homeMadhavTitle"
    | "homeAstroTitle"
    | "homeBlockPathsTitle";
  blurbKey:
    | "homeExploreBlurb"
    | "homeMoodBlurb"
    | "homeMeditationBlurb"
    | "homeMadhavBlurb"
    | "homeAstroBlurb"
    | "homeBlockPathsBody";
  image: ImageSourcePropType;
  mark: "explore" | "mood" | "meditation" | "madhav" | "astrology" | "paths";
  href: Href;
};

/**
 * Paths Into — Home + Path tab (six tiles, including Ask Madhav).
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
    image: images.pathMadhav,
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
];

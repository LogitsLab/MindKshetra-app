import type { Href } from "expo-router";
import type { ImageSourcePropType } from "react-native";
import type { CoverImageFocus } from "@/components/CoverImage";
import { images } from "@/theme/assets";

export type HomePathEntry = {
  index: string;
  titleKey:
    | "homeExploreTitle"
    | "homeMoodTitle"
    | "homeMeditationTitle"
    | "homeMadhavTitle"
    | "homeBlockPathsTitle";
  blurbKey:
    | "homeExploreBlurb"
    | "homeMoodBlurb"
    | "homeMeditationBlurb"
    | "homeMadhavBlurb"
    | "homeBlockPathsBody";
  image: ImageSourcePropType;
  /** Cover-crop preference for tall hero art. */
  imageFocus?: CoverImageFocus;
  mark: "explore" | "mood" | "meditation" | "madhav" | "paths";
  href: Href;
};

/**
 * Paths Into, Home + Path tab.
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
    titleKey: "homeBlockPathsTitle",
    blurbKey: "homeBlockPathsBody",
    image: images.pathPaths,
    mark: "paths",
    href: "/paths",
  },
];

import React from "react";
import { Image, ScrollView, StyleSheet, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Text } from "@/components/Text";
import { Rise } from "@/components/Rise";
import { MadhavMark } from "@/components/BrandMark";
import { useLanguage } from "@/context/LanguageContext";
import { useTheme } from "@/context/ThemeContext";
import { images } from "@/theme/assets";
import { radii, spacing, typeScale } from "@/theme/tokens";
import type { DictKey } from "@/i18n/dictionary";
import type { PathMarkKind } from "@/components/SlokaCard";

type PathCard = {
  index: string;
  titleKey: DictKey;
  blurbKey: DictKey;
  image: number;
  mark: PathMarkKind;
};

const PATHS: PathCard[] = [
  {
    index: "01",
    titleKey: "onboardingPathExploreTitle",
    blurbKey: "onboardingPathExploreBlurb",
    image: images.pathExplore,
    mark: "explore",
  },
  {
    index: "02",
    titleKey: "onboardingPathMoodTitle",
    blurbKey: "onboardingPathMoodBlurb",
    image: images.pathMood,
    mark: "mood",
  },
  {
    index: "03",
    titleKey: "onboardingPathMeditationTitle",
    blurbKey: "onboardingPathMeditationBlurb",
    image: images.pathMeditation,
    mark: "meditation",
  },
  {
    index: "04",
    titleKey: "onboardingPathMadhavTitle",
    blurbKey: "onboardingPathMadhavBlurb",
    image: images.pathMadhav,
    mark: "madhav",
  },
  {
    index: "05",
    titleKey: "onboardingPathAstrologyTitle",
    blurbKey: "onboardingPathAstrologyBlurb",
    image: images.pathAstrology,
    mark: "astrology",
  },
  {
    index: "06",
    titleKey: "onboardingPathPathsTitle",
    blurbKey: "onboardingPathPathsBlurb",
    image: images.pathPaths,
    mark: "paths",
  },
];

/** Fits a subtitle plus two lines of readable blurb without clipping in Hindi. */
const ROW_HEIGHT = 88;

function PathRow({ item }: { item: PathCard }) {
  const { colors } = useTheme();
  const { t } = useLanguage();

  return (
    <View
      // Grouped, so a screen reader announces the path as one item instead of
      // reading an index number, a title and a blurb as three separate stops.
      accessible
      accessibilityLabel={`${t(item.titleKey)}. ${t(item.blurbKey)}`}
      style={[
        styles.row,
        { height: ROW_HEIGHT, borderColor: colors.line, backgroundColor: colors.surface },
      ]}
    >
      <View style={styles.thumbWrap}>
        <Image source={item.image} style={styles.thumb} resizeMode="cover" />
        <LinearGradient
          colors={["transparent", "rgba(7,9,15,0.6)"]}
          style={StyleSheet.absoluteFillObject}
        />
        <View style={styles.thumbBadge}>
          {item.mark === "madhav" ? (
            <MadhavMark size={20} />
          ) : (
            <Text variant="eyebrow" color={colors.brassSoft}>
              {item.index}
            </Text>
          )}
        </View>
      </View>
      <View style={styles.copy}>
        <Text variant="title" style={styles.rowTitle}>
          {t(item.titleKey)}
        </Text>
        {/*
          These four sentences are the only explanation of what the product
          does. DESIGN.md reserves text-muted for chrome and text-soft for prose
          someone is meant to read; this is prose. `soft` also carries its own
          colour, so no override is needed.
        */}
        <Text variant="soft" numberOfLines={2} style={styles.rowBlurb}>
          {t(item.blurbKey)}
        </Text>
      </View>
    </View>
  );
}

/** `active` is false while the pager still has the poster on screen. */
export function OnboardingPathsSlide({ active = true }: { active?: boolean }) {
  const { t } = useLanguage();
  const { colors } = useTheme();

  return (
    <ScrollView
      style={styles.wrap}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
      bounces={false}
    >
      <Rise active={active}>
        <Text variant="eyebrow" color={colors.brassSoft}>
          {t("onboardingPathsEyebrow")}
        </Text>
        <Text
          variant="display"
          accessibilityRole="header"
          style={styles.heading}
        >
          {t("onboardingPathsTitle")}
        </Text>
      </Rise>

      <View style={styles.list}>
        {PATHS.map((item) => (
          <PathRow key={item.index} item={item} />
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.lg,
    paddingBottom: spacing.xs,
  },
  heading: {
    marginTop: spacing.xs,
    marginBottom: spacing.md,
  },
  list: {
    gap: spacing.sm,
  },
  row: {
    flexDirection: "row",
    borderRadius: radii.lg,
    borderWidth: StyleSheet.hairlineWidth * 2,
    overflow: "hidden",
  },
  thumbWrap: {
    width: 88,
    position: "relative",
    backgroundColor: "#0e1420",
  },
  thumb: {
    width: "100%",
    height: "100%",
  },
  thumbBadge: {
    position: "absolute",
    left: spacing.xs,
    bottom: spacing.xs,
  },
  copy: {
    flex: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    justifyContent: "center",
    gap: spacing.xs,
  },
  rowTitle: {
    fontSize: typeScale.subtitle.size,
    lineHeight: typeScale.subtitle.line,
  },
  rowBlurb: {
    fontSize: typeScale.muted.size,
    lineHeight: typeScale.muted.line,
  },
});

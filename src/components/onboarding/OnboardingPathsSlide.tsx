import React from "react";
import { Image, ScrollView, StyleSheet, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Text } from "@/components/Text";
import { Rise } from "@/components/Rise";
import { MadhavMark } from "@/components/BrandMark";
import { useLanguage } from "@/context/LanguageContext";
import { useTheme } from "@/context/ThemeContext";
import { images } from "@/theme/assets";
import { radii, spacing } from "@/theme/tokens";
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
    titleKey: "onboardingPathMadhavTitle",
    blurbKey: "onboardingPathMadhavBlurb",
    image: images.pathMadhav,
    mark: "madhav",
  },
  {
    index: "04",
    titleKey: "onboardingPathAstrologyTitle",
    blurbKey: "onboardingPathAstrologyBlurb",
    image: images.pathAstrology,
    mark: "astrology",
  },
];

const ROW_HEIGHT = 72;

function PathRow({ item }: { item: PathCard }) {
  const { colors } = useTheme();
  const { t } = useLanguage();

  return (
    <View
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
        <Text variant="soft" color={colors.textMuted} numberOfLines={2} style={styles.rowBlurb}>
          {t(item.blurbKey)}
        </Text>
      </View>
    </View>
  );
}

export function OnboardingPathsSlide() {
  const { t } = useLanguage();
  const { colors } = useTheme();

  return (
    <ScrollView
      style={styles.wrap}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
      bounces={false}
    >
      <Rise>
        <Text variant="eyebrow" color={colors.brassSoft}>
          {t("onboardingPathsEyebrow")}
        </Text>
        <Text variant="display" style={styles.heading}>
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
    paddingBottom: spacing.xs,
  },
  heading: {
    marginTop: spacing.xs,
    marginBottom: spacing.sm,
    fontSize: 24,
    lineHeight: 30,
  },
  list: {
    gap: spacing.xs,
  },
  row: {
    flexDirection: "row",
    borderRadius: radii.lg,
    borderWidth: StyleSheet.hairlineWidth * 2,
    overflow: "hidden",
  },
  thumbWrap: {
    width: 80,
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
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    justifyContent: "center",
    gap: 2,
  },
  rowTitle: {
    fontSize: 16,
    lineHeight: 21,
  },
  rowBlurb: {
    fontSize: 12,
    lineHeight: 16,
  },
});

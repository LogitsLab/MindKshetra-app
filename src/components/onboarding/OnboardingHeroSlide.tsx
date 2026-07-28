import React from "react";
import { ImageBackground, StyleSheet, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Text } from "@/components/Text";
import { BrandMark } from "@/components/BrandMark";
import { Rise } from "@/components/Rise";
import { useLanguage } from "@/context/LanguageContext";
import { useTheme } from "@/context/ThemeContext";
import { images } from "@/theme/assets";
import { spacing } from "@/theme/tokens";

export function OnboardingHeroSlide() {
  const { colors } = useTheme();
  const { t } = useLanguage();

  return (
    <View style={styles.wrap}>
      <ImageBackground
        source={images.hero}
        style={styles.hero}
        imageStyle={styles.heroImage}
        resizeMode="cover"
      >
        <LinearGradient
          colors={[
            "rgba(7,9,15,0.78)",
            "rgba(7,9,15,0.5)",
            "rgba(7,9,15,0.94)",
          ]}
          locations={[0, 0.5, 1]}
          style={StyleSheet.absoluteFillObject}
        />
        <LinearGradient
          colors={[colors.atmosphereTeal, "transparent"]}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 0.5 }}
          style={styles.teal}
        />

        <Text style={[styles.watermark, { color: colors.text }]}>मनः</Text>

        <View style={styles.centerBlock}>
          <Rise>
            <View style={styles.brandRow}>
              <BrandMark size={28} />
              <Text variant="eyebrow" color={colors.brassSoft} style={styles.eyebrow}>
                {t("onboardingWelcomeEyebrow")}
              </Text>
            </View>

            <View style={styles.titleBlock}>
              <Text style={[styles.titleLine, { color: colors.text }]}>Mind</Text>
              <Text style={[styles.titleLine, { color: colors.brassSoft }]}>
                Kshetra
              </Text>
            </View>

            <Text variant="title" color={colors.brassSoft} style={styles.tagline}>
              {t("homeTagline")}
            </Text>
          </Rise>
        </View>

        <View style={styles.bottomBlock}>
          <Text variant="soft" style={styles.story}>
            {t("onboardingBrandStory")}
          </Text>
        </View>
      </ImageBackground>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    borderRadius: 16,
    overflow: "hidden",
  },
  hero: {
    flex: 1,
    justifyContent: "space-between",
  },
  heroImage: {
    transform: [{ scale: 1.08 }],
  },
  teal: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 160,
  },
  watermark: {
    position: "absolute",
    top: "12%",
    alignSelf: "center",
    fontFamily: "Fraunces_600SemiBold",
    fontSize: 110,
    lineHeight: 110,
    opacity: 0.08,
  },
  centerBlock: {
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: spacing.md,
  },
  brandRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  eyebrow: {
    flex: 1,
    flexShrink: 1,
  },
  titleBlock: {
    marginBottom: spacing.sm,
  },
  titleLine: {
    fontFamily: "Fraunces_600SemiBold",
    fontSize: 56,
    lineHeight: 60,
    letterSpacing: -1,
  },
  tagline: {
    fontSize: 18,
    lineHeight: 26,
  },
  bottomBlock: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.md,
    paddingTop: spacing.xs,
  },
  story: {
    lineHeight: 22,
    fontSize: 14,
    opacity: 0.9,
  },
});

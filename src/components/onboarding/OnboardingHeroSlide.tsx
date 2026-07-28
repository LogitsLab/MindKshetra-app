import React from "react";
import { StyleSheet, View } from "react-native";
import { Text } from "@/components/Text";
import { BrandMark } from "@/components/BrandMark";
import { Rise } from "@/components/Rise";
import { useLanguage } from "@/context/LanguageContext";
import { useTheme } from "@/context/ThemeContext";
import { motion, spacing } from "@/theme/tokens";

/**
 * The poster. Sits directly on `OnboardingBackdrop` — no second photograph, no
 * card, no radius.
 *
 * Copy lives in the upper sky and the lower ground, both of which are nearly
 * black in `hero.jpg`, so the type gets its contrast from the image instead of
 * from a scrim laid over it. The horizon band and the chariot in the middle are
 * left clean: that is the visual anchor, and nothing is allowed to sit on it.
 *
 * Text uses `onMedia` rather than `text` because this copy is always over the
 * photograph, in both themes. `colors.text` is near-black under light mode.
 */
export function OnboardingHeroSlide() {
  const { colors } = useTheme();
  const { t } = useLanguage();

  return (
    <View style={styles.wrap}>
      <Rise style={styles.top}>
        <View style={styles.brandRow}>
          <BrandMark size={26} />
          <Text
            variant="eyebrow"
            color={colors.brassSoft}
            style={styles.eyebrow}
          >
            {t("onboardingWelcomeEyebrow")}
          </Text>
        </View>

        <View
          accessible
          accessibilityRole="header"
          accessibilityLabel="MindKshetra"
        >
          <Text
            style={[styles.titleLine, { color: colors.onMedia }]}
            numberOfLines={1}
          >
            Mind
          </Text>
          <Text
            style={[styles.titleLine, { color: colors.brassSoft }]}
            numberOfLines={1}
          >
            Kshetra
          </Text>
        </View>

        <Text variant="title" color={colors.brassSoft} style={styles.tagline}>
          {t("homeTagline")}
        </Text>
      </Rise>

      {/* The horizon. Deliberately empty. */}
      <View style={styles.anchor} />

      <Rise delay={motion.staggerMs * 2} style={styles.bottom}>
        <Text
          variant="soft"
          color={colors.onMediaMuted}
          style={styles.story}
        >
          {t("onboardingBrandStory")}
        </Text>
      </Rise>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
  },
  top: {
    paddingTop: spacing.lg,
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
  titleLine: {
    fontFamily: "Fraunces_600SemiBold",
    fontSize: 52,
    lineHeight: 58,
    letterSpacing: -1,
  },
  tagline: {
    marginTop: spacing.md,
    fontSize: 18,
    lineHeight: 26,
    maxWidth: 300,
  },
  anchor: {
    flex: 1,
    minHeight: spacing.xl,
  },
  bottom: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.sm,
  },
  story: {
    fontSize: 15,
    lineHeight: 23,
  },
});

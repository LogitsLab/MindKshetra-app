import React from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { CoverImage } from "@/components/CoverImage";
import { Text } from "@/components/Text";
import { useLanguage } from "@/context/LanguageContext";
import { useTheme } from "@/context/ThemeContext";
import { images } from "@/theme/assets";
import { radii, spacing } from "@/theme/tokens";

type Props = { streak?: number };

/**
 * "Begin today's sādhana" in the Daily-verses card idiom — a full-bleed photo
 * under the same scrim, with the eyebrow / title / body stack and a Begin
 * action. This is the home's primary action, so it replaces the hero ring-CTA
 * (keeping a single "Begin sādhana" entry, not two).
 */
export function SadhanaCard({ streak = 0 }: Props) {
  const router = useRouter();
  const { colors } = useTheme();
  const { t } = useLanguage();
  return (
    <Pressable
      testID="home-sadhana-card"
      onPress={() => router.push("/sadhana")}
      accessibilityRole="button"
      accessibilityLabel={t("homeSadhanaTitle")}
      style={({ pressed }) => [
        styles.band,
        { borderColor: colors.line, opacity: pressed ? 0.94 : 1 },
      ]}
    >
      <CoverImage source={images.pathSadhana} opacity={0.45} />
      <LinearGradient
        colors={["rgba(7,9,15,0.18)", "rgba(7,9,15,0.42)", "rgba(7,9,15,0.68)"]}
        locations={[0, 0.5, 1]}
        style={StyleSheet.absoluteFill}
      />
      <View style={styles.inner}>
        <Text variant="eyebrow" color={colors.brassSoft}>
          {t("homeSadhanaEyebrow")}
        </Text>
        <Text variant="title" color={colors.onMedia} style={styles.title}>
          {t("homeSadhanaTitle")}
        </Text>
        <Text variant="soft" color={colors.onMediaMuted} style={styles.body}>
          {t("homeSadhanaBody")}
        </Text>
        <View style={styles.actions}>
          <View style={[styles.beginBtn, { borderColor: colors.brass }]}>
            <Text variant="eyebrow" color={colors.brassSoft}>
              {t("homeSadhanaCta")}  ›
            </Text>
          </View>
          {streak > 0 ? (
            <Text variant="muted" color={colors.onMediaMuted} style={styles.streak}>
              {streak} {t("homeStreakLabel")}
            </Text>
          ) : null}
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  band: {
    minHeight: 158,
    borderRadius: radii.lg,
    overflow: "hidden",
    borderWidth: StyleSheet.hairlineWidth * 2,
    justifyContent: "flex-end",
    backgroundColor: "transparent",
    position: "relative",
  },
  inner: {
    padding: spacing.md,
    paddingBottom: spacing.md + spacing.xs,
    zIndex: 1,
  },
  title: {
    marginTop: spacing.xs,
    fontSize: 18,
    lineHeight: 23,
  },
  body: {
    marginTop: spacing.xs,
    fontSize: 13,
    lineHeight: 19,
  },
  actions: {
    marginTop: spacing.sm,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  beginBtn: {
    borderWidth: StyleSheet.hairlineWidth * 2,
    borderRadius: radii.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    minHeight: 40,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(201,162,39,0.14)",
  },
  streak: { fontSize: 12 },
});

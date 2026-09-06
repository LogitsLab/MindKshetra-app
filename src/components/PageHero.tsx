import React, { type ReactNode } from "react";
import {
  Pressable,
  StyleSheet,
  View,
  type ImageSourcePropType,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { CoverImage } from "@/components/CoverImage";
import { Text } from "@/components/Text";
import { BackButton, HeaderBrandRight } from "@/components/ScreenHeader";
import { useLanguage } from "@/context/LanguageContext";
import { useTheme } from "@/context/ThemeContext";
import { radii, spacing } from "@/theme/tokens";

type Props = {
  image: ImageSourcePropType;
  eyebrow?: string;
  title: string;
  /** Alias for web ImmersiveHero `intro`. */
  body?: string;
  intro?: string;
  meta?: ReactNode;
  actions?: ReactNode;
  children?: ReactNode;
  /** Slightly shorter, for quiet pages like Care. */
  compact?: boolean;
  /**
   * Edge-to-edge hero that covers the complete top (under the status bar) with a
   * floating back + brand pinned to the left. The screen must drop the top
   * safe-area edge (`edges={["left", "right"]}`) so the ScrollView starts at
   * y=0 and the image is not clipped, and hide the native header. The hero
   * handles the top inset itself via the floating bar + copy padding.
   */
  fullBleed?: boolean;
  /** Where the floating back button goes if history is empty (fullBleed). */
  backFallback?: string;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
};

/**
 * Shared field hero for lifestyle surfaces, ports web ImmersiveHero:
 * tall image, scrim, brass CTAs, optional meta/actions.
 *
 * Devanagari never takes the tracked, uppercased eyebrow: Fraunces has no
 * Devanagari coverage and letter-spacing breaks matra shaping.
 */
export function PageHero({
  image,
  eyebrow,
  title,
  body,
  intro,
  meta,
  actions,
  children,
  compact = false,
  fullBleed = false,
  backFallback,
  onPress,
  style,
}: Props) {
  const { colors } = useTheme();
  const { lang } = useLanguage();
  const insets = useSafeAreaInsets();
  const blurb = intro ?? body;
  const hiEyebrow =
    lang === "hi"
      ? { letterSpacing: 0, textTransform: "none" as const }
      : null;
  const hiTitle =
    lang === "hi"
      ? { fontFamily: "NotoSerifDevanagari_600SemiBold" as const }
      : null;

  const content = (
    <>
      <CoverImage source={image} />
      <LinearGradient
        colors={["rgba(7,9,15,0.22)", "rgba(7,9,15,0.55)", "rgba(7,9,15,0.94)"]}
        locations={[0, 0.45, 1]}
        style={StyleSheet.absoluteFill}
      />
      {fullBleed ? (
        <View style={[styles.floatBar, { top: insets.top + spacing.sm }]}>
          <BackButton fallback={backFallback} />
          <HeaderBrandRight />
        </View>
      ) : null}
      <View
        style={[
          styles.copy,
          fullBleed && { paddingTop: insets.top + 72, paddingBottom: spacing.xl },
        ]}
      >
        {eyebrow ? (
          <Text variant="eyebrow" color={colors.brassSoft} style={hiEyebrow}>
            {eyebrow}
          </Text>
        ) : null}
        <Text
          variant="title"
          color={colors.onMedia}
          style={[styles.title, compact && styles.titleCompact, hiTitle]}
        >
          {title}
        </Text>
        {blurb ? (
          <Text
            variant="soft"
            color={colors.onMediaMuted}
            style={styles.blurb}
          >
            {blurb}
          </Text>
        ) : null}
        {meta ? <View style={styles.meta}>{meta}</View> : null}
        {actions ? <View style={styles.actions}>{actions}</View> : null}
        {children}
      </View>
    </>
  );

  const bandStyle = fullBleed
    ? [styles.fullBleedBand, { minHeight: 340 + insets.top }, style]
    : [
        styles.band,
        compact ? styles.bandCompact : styles.bandTall,
        { borderColor: colors.line },
        style,
      ];

  if (onPress) {
    return (
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [
          ...bandStyle,
          { opacity: pressed ? 0.94 : 1, transform: [{ scale: pressed ? 0.985 : 1 }] },
        ]}
      >
        {content}
      </Pressable>
    );
  }

  return <View style={bandStyle}>{content}</View>;
}

const styles = StyleSheet.create({
  band: {
    borderRadius: radii.lg,
    overflow: "hidden",
    borderWidth: StyleSheet.hairlineWidth * 2,
    justifyContent: "flex-end",
    position: "relative",
    backgroundColor: "#0e1420",
  },
  bandTall: {
    minHeight: 248,
  },
  bandCompact: {
    minHeight: 196,
  },
  fullBleedBand: {
    // Break out of the Screen's horizontal padding so the image reaches both edges.
    marginHorizontal: -spacing.md,
    overflow: "hidden",
    justifyContent: "flex-end",
    position: "relative",
    backgroundColor: "#0e1420",
  },
  floatBar: {
    position: "absolute",
    left: spacing.md,
    right: spacing.md,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    zIndex: 2,
  },
  copy: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl,
    paddingBottom: spacing.lg,
    zIndex: 1,
  },
  title: {
    marginTop: spacing.sm,
    fontSize: 30,
    lineHeight: 36,
    letterSpacing: -0.3,
    maxWidth: 340,
  },
  titleCompact: {
    fontSize: 26,
    lineHeight: 32,
  },
  blurb: {
    marginTop: spacing.sm,
    maxWidth: 320,
    fontSize: 14,
    lineHeight: 21,
  },
  meta: {
    marginTop: spacing.md,
    maxWidth: 320,
  },
  actions: {
    marginTop: spacing.lg,
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "flex-end",
    gap: spacing.sm,
  },
});

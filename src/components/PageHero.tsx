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
import { CoverImage } from "@/components/CoverImage";
import { Text } from "@/components/Text";
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
  /** Slightly shorter — for quiet pages like Care. */
  compact?: boolean;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
};

/**
 * Shared field hero for lifestyle surfaces — ports web ImmersiveHero:
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
  onPress,
  style,
}: Props) {
  const { colors } = useTheme();
  const { lang } = useLanguage();
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
        style={StyleSheet.absoluteFillObject}
      />
      <View style={styles.copy}>
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

  const bandStyle = [
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

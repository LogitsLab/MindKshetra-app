import React from "react";
import {
  Text as RNText,
  type TextProps as RNTextProps,
  StyleSheet,
} from "react-native";
import { useTextScale } from "@/context/TextScaleContext";
import { useTheme } from "@/context/ThemeContext";

type Variant = "display" | "title" | "body" | "soft" | "muted" | "eyebrow" | "sanskrit";

type Props = RNTextProps & {
  variant?: Variant;
  color?: string;
};

export function Text({ variant = "body", color, style, ...rest }: Props) {
  const { mode, colors } = useTheme();
  const { multiplier } = useTextScale();
  const styles = variantStyles(mode, colors, multiplier);
  return (
    <RNText
      {...rest}
      style={[styles.base, styles[variant], color ? { color } : null, style]}
    />
  );
}

function scale(n: number, m: number) {
  return Math.round(n * m * 10) / 10;
}

// Colors are fully determined by theme mode, so (mode, multiplier) is a
// complete cache key: 2 modes x 3 text scales = at most 6 sheets, instead of
// a fresh StyleSheet.create per <Text> render.
const styleCache = new Map<string, ReturnType<typeof createVariantStyles>>();

function variantStyles(
  mode: ReturnType<typeof useTheme>["mode"],
  colors: ReturnType<typeof useTheme>["colors"],
  m: number
) {
  const key = `${mode}:${m}`;
  let sheet = styleCache.get(key);
  if (!sheet) {
    sheet = createVariantStyles(colors, m);
    styleCache.set(key, sheet);
  }
  return sheet;
}

function createVariantStyles(
  colors: ReturnType<typeof useTheme>["colors"],
  m: number
) {
  return StyleSheet.create({
    base: { color: colors.text },
    display: {
      fontFamily: "Fraunces_600SemiBold",
      fontSize: scale(28, m),
      lineHeight: scale(34, m),
      letterSpacing: -0.3,
    },
    title: {
      fontFamily: "Fraunces_600SemiBold",
      fontSize: scale(22, m),
      lineHeight: scale(28, m),
    },
    body: {
      fontFamily: "Sora_400Regular",
      fontSize: scale(16, m),
      lineHeight: scale(24, m),
    },
    soft: {
      fontFamily: "Sora_400Regular",
      fontSize: scale(15, m),
      lineHeight: scale(22, m),
      color: colors.textSoft,
    },
    muted: {
      fontFamily: "Sora_400Regular",
      fontSize: scale(13, m),
      lineHeight: scale(18, m),
      color: colors.textMuted,
    },
    eyebrow: {
      fontFamily: "Sora_600SemiBold",
      fontSize: scale(11, m),
      lineHeight: scale(14, m),
      letterSpacing: 1.6,
      textTransform: "uppercase",
      color: colors.textMuted,
    },
    sanskrit: {
      // Fraunces has no Devanagari glyphs — it silently fell back to the
      // system font here. Noto Serif Devanagari is the intended serif voice.
      fontFamily: "NotoSerifDevanagari_500Medium",
      fontSize: scale(22, m),
      lineHeight: scale(36, m),
      color: colors.text,
    },
  });
}

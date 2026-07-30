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
  const { colors } = useTheme();
  const { multiplier } = useTextScale();
  const styles = variantStyles(colors, multiplier);
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

function variantStyles(
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
      fontFamily: "Fraunces_500Medium",
      fontSize: scale(22, m),
      lineHeight: scale(34, m),
      color: colors.text,
    },
  });
}

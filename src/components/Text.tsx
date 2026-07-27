import React from "react";
import {
  Text as RNText,
  type TextProps as RNTextProps,
  StyleSheet,
} from "react-native";
import { useTheme } from "@/context/ThemeContext";

type Variant = "display" | "title" | "body" | "soft" | "muted" | "eyebrow" | "sanskrit";

type Props = RNTextProps & {
  variant?: Variant;
  color?: string;
};

export function Text({ variant = "body", color, style, ...rest }: Props) {
  const { colors } = useTheme();
  const styles = variantStyles(colors);
  return (
    <RNText
      {...rest}
      style={[styles.base, styles[variant], color ? { color } : null, style]}
    />
  );
}

function variantStyles(colors: ReturnType<typeof useTheme>["colors"]) {
  return StyleSheet.create({
    base: { color: colors.text },
    display: {
      fontFamily: "Fraunces_600SemiBold",
      fontSize: 28,
      lineHeight: 34,
      letterSpacing: -0.3,
    },
    title: {
      fontFamily: "Fraunces_600SemiBold",
      fontSize: 22,
      lineHeight: 28,
    },
    body: {
      fontFamily: "Sora_400Regular",
      fontSize: 16,
      lineHeight: 24,
    },
    soft: {
      fontFamily: "Sora_400Regular",
      fontSize: 15,
      lineHeight: 22,
      color: colors.textSoft,
    },
    muted: {
      fontFamily: "Sora_400Regular",
      fontSize: 13,
      lineHeight: 18,
      color: colors.textMuted,
    },
    eyebrow: {
      fontFamily: "Sora_600SemiBold",
      fontSize: 11,
      lineHeight: 14,
      letterSpacing: 1.6,
      textTransform: "uppercase",
      color: colors.textMuted,
    },
    sanskrit: {
      fontFamily: "Fraunces_500Medium",
      fontSize: 22,
      lineHeight: 34,
      color: colors.text,
    },
  });
}

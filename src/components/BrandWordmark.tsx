import React from "react";
import { StyleSheet, View, type StyleProp, type TextStyle, type ViewStyle } from "react-native";
import { Text } from "@/components/Text";
import { useTheme } from "@/context/ThemeContext";
import { spacing } from "@/theme/tokens";

export const BRAND_NAME = "MindKshetra";
export const BRAND_CREDIT = "by LogitsLab";

type CreditProps = {
  tone?: "brass" | "muted";
  style?: StyleProp<TextStyle>;
};

/** Small studio credit — header lockup only. */
export function BrandCredit({ tone = "muted", style }: CreditProps) {
  const { colors } = useTheme();
  return (
    <Text
      style={[styles.credit, style]}
      color={tone === "brass" ? colors.brassSoft : colors.textMuted}
    >
      {BRAND_CREDIT}
    </Text>
  );
}

type NavProps = {
  /** Extra nodes after the name stack (e.g. streak). */
  trailing?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
};

/**
 * Header lockup: stacked name + credit, trailing edges aligned
 * so "LogitsLab" lines up with "Kshetra".
 */
export function BrandNavLabel({ trailing, style }: NavProps) {
  const { colors } = useTheme();
  return (
    <View style={[styles.navWrap, style]}>
      <View style={styles.navStack}>
        <Text variant="muted" color={colors.textSoft} style={styles.navName}>
          {BRAND_NAME}
        </Text>
        <BrandCredit tone="muted" style={styles.navCredit} />
      </View>
      {trailing}
    </View>
  );
}

type HeroProps = {
  fontSize?: number;
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
  nameStyle?: StyleProp<TextStyle>;
};

/** Home / page hero — product name only (no studio credit). */
export function BrandHeroTitle({
  fontSize = 40,
  accessibilityLabel = BRAND_NAME,
  style,
  nameStyle,
}: HeroProps) {
  return (
    <View
      accessible
      accessibilityRole="header"
      accessibilityLabel={accessibilityLabel}
      style={style}
    >
      <Text
        variant="display"
        style={[{ fontSize, lineHeight: fontSize + 4 }, nameStyle]}
      >
        {BRAND_NAME}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  credit: {
    fontFamily: "Sora_400Regular",
    fontSize: 11,
    lineHeight: 14,
    letterSpacing: 0.35,
  },
  navWrap: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: spacing.xs,
    flexShrink: 1,
  },
  navStack: {
    flexDirection: "column",
    alignItems: "flex-end",
    justifyContent: "center",
    flexShrink: 1,
  },
  navName: {
    lineHeight: 18,
  },
  navCredit: {
    marginTop: 1,
    fontSize: 10,
    lineHeight: 12,
    letterSpacing: 0.2,
  },
});

import React from "react";
import { Pressable, StyleSheet, View, type ViewStyle } from "react-native";
import { useRouter } from "expo-router";
import Svg, { Path } from "react-native-svg";
import { BrandNavLabel } from "@/components/BrandWordmark";
import { Text } from "@/components/Text";
import { useTheme } from "@/context/ThemeContext";
import { radii, spacing } from "@/theme/tokens";

/** Stack `headerRight` lockup — brand credit. */
export function HeaderBrandRight() {
  return (
    <View style={styles.brandRight}>
      <BrandNavLabel showCredit />
    </View>
  );
}

/** Back chevron for nested screens without a Stack header. */
export function BackButton({ fallback = "/(tabs)/home" }: { fallback?: string }) {
  const router = useRouter();
  const { colors } = useTheme();

  return (
    <Pressable
      testID="nav-back"
      accessibilityRole="button"
      accessibilityLabel="Go back"
      hitSlop={12}
      onPress={() => {
        if (router.canGoBack()) router.back();
        else router.replace(fallback as never);
      }}
      style={({ pressed }) => [
        styles.back,
        {
          borderColor: colors.line,
          backgroundColor: colors.panel,
          opacity: pressed ? 0.85 : 1,
        },
      ]}
    >
      <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
        <Path
          d="M15 6l-6 6 6 6"
          stroke={colors.brassSoft}
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </Svg>
    </Pressable>
  );
}

type ScreenHeaderProps = {
  title?: string;
  subtitle?: string;
  /** Show back control (chapter, mood detail, etc.) */
  showBack?: boolean;
  /** Where back goes if history is empty */
  backFallback?: string;
  /** Left slot when not using title (e.g. brand mark) */
  leading?: React.ReactNode;
  /** MindKshetra by LogitsLab — on by default for every screen. */
  showBrand?: boolean;
  style?: ViewStyle;
};

/**
 * Shared top chrome: optional back, title/leading, brand credit.
 */
export function ScreenHeader({
  title,
  subtitle,
  showBack = false,
  backFallback,
  leading,
  showBrand = true,
  style,
}: ScreenHeaderProps) {
  const { colors } = useTheme();

  return (
    <View style={[styles.row, style]}>
      <View style={styles.left}>
        {showBack ? (
          <BackButton fallback={backFallback} />
        ) : leading ? (
          leading
        ) : null}
        {title || subtitle ? (
          <View
            style={[
              styles.copy,
              showBack || leading ? { marginLeft: spacing.sm } : null,
            ]}
          >
            {title ? (
              <Text
                variant={showBack ? "title" : "display"}
                numberOfLines={showBack ? 2 : 1}
                style={showBack ? styles.titleNested : styles.title}
              >
                {title}
              </Text>
            ) : null}
            {subtitle ? (
              <Text
                variant="soft"
                numberOfLines={2}
                style={{ marginTop: 2 }}
                color={colors.textSoft}
              >
                {subtitle}
              </Text>
            ) : null}
          </View>
        ) : null}
      </View>
      {showBrand ? (
        <View style={styles.brandRight}>
          <BrandNavLabel showCredit />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.sm,
    marginTop: spacing.sm,
    marginBottom: spacing.sm,
    minHeight: 44,
  },
  brandRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    flexShrink: 0,
  },
  left: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    minWidth: 0,
  },
  copy: {
    flex: 1,
    minWidth: 0,
  },
  title: {
    fontSize: 28,
    lineHeight: 34,
  },
  titleNested: {
    fontSize: 20,
    lineHeight: 26,
  },
  back: {
    width: 40,
    height: 40,
    borderRadius: radii.md,
    borderWidth: StyleSheet.hairlineWidth * 2,
    alignItems: "center",
    justifyContent: "center",
  },
});

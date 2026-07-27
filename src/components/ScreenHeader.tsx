import React from "react";
import { Pressable, StyleSheet, View, type ViewStyle } from "react-native";
import { usePathname, useRouter } from "expo-router";
import Svg, { Path } from "react-native-svg";
import { Text } from "@/components/Text";
import { useAuth } from "@/context/AuthContext";
import { useTheme } from "@/context/ThemeContext";
import { radii, spacing } from "@/theme/tokens";

function profileLetter(email?: string | null, isAnonymous?: boolean) {
  if (isAnonymous || !email) return "A";
  const ch = email.trim().charAt(0).toUpperCase();
  return /[A-Z0-9]/.test(ch) ? ch : "A";
}

/** Account / settings entry — use on every main screen. */
export function ProfileButton() {
  const router = useRouter();
  const pathname = usePathname();
  const { colors } = useTheme();
  const { user, isAnonymous } = useAuth();

  if (pathname?.startsWith("/account")) return null;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Account and settings"
      onPress={() => router.push("/account")}
      style={({ pressed }) => [
        styles.avatar,
        {
          borderColor: colors.line,
          backgroundColor: colors.panel,
          opacity: pressed ? 0.85 : 1,
        },
      ]}
    >
      <Text
        style={{
          color: colors.brassSoft,
          fontFamily: "Sora_600SemiBold",
          fontSize: 14,
        }}
      >
        {profileLetter(user?.email, isAnonymous || !user)}
      </Text>
    </Pressable>
  );
}

/** Back chevron for nested screens without a Stack header. */
export function BackButton({ fallback = "/(tabs)" }: { fallback?: string }) {
  const router = useRouter();
  const { colors } = useTheme();

  return (
    <Pressable
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
  showProfile?: boolean;
  style?: ViewStyle;
};

/**
 * Shared top chrome: optional back, title/leading, always-on profile.
 */
export function ScreenHeader({
  title,
  subtitle,
  showBack = false,
  backFallback,
  leading,
  showProfile = true,
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
              (showBack || leading) ? { marginLeft: spacing.sm } : null,
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
      {showProfile ? <ProfileButton /> : null}
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
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: StyleSheet.hairlineWidth * 2,
    alignItems: "center",
    justifyContent: "center",
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

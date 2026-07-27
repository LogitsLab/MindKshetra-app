import React, { useEffect, useRef } from "react";
import { Animated, Pressable, StyleSheet, View } from "react-native";
import { usePathname, useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Text } from "@/components/Text";
import { useMadhav } from "@/context/MadhavContext";
import { useTheme } from "@/context/ThemeContext";
import { radii, spacing } from "@/theme/tokens";

const TAB_BAR_HEIGHT = 56;

export function MadhavFab() {
  const pathname = usePathname();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const { streaming, slokaId, askAboutVerse } = useMadhav();
  const pulse = useRef(new Animated.Value(1)).current;

  const hide =
    pathname?.includes("/madhav") ||
    pathname?.includes("auth/callback");

  const onTabs =
    pathname === "/" ||
    pathname?.startsWith("/explore") ||
    pathname?.startsWith("/mood") ||
    (pathname?.startsWith("/astrology") &&
      !pathname.includes("/members") &&
      !pathname.includes("/incognito"));

  useEffect(() => {
    if (!streaming) {
      pulse.setValue(1);
      return;
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1.08, duration: 700, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 1, duration: 700, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [streaming, pulse]);

  if (hide) return null;

  const bottom =
    insets.bottom + spacing.sm + (onTabs ? TAB_BAR_HEIGHT : spacing.md);

  return (
    <Animated.View
      style={[
        styles.wrap,
        {
          right: spacing.fabInset,
          bottom,
          transform: [{ scale: pulse }],
        },
      ]}
    >
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Ask Madhav"
        onPress={() => {
          void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          router.push("/madhav");
        }}
        onLongPress={() => {
          if (slokaId) {
            askAboutVerse(slokaId);
          }
          void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
          router.push("/madhav");
        }}
        style={({ pressed }) => [
          styles.fab,
          {
            backgroundColor: colors.brass,
            opacity: pressed ? 0.85 : 1,
            shadowColor: colors.brass,
          },
        ]}
      >
        <View style={[styles.ring, { borderColor: colors.onBrass }]}>
          <Text
            style={{
              color: colors.onBrass,
              fontFamily: "Fraunces_600SemiBold",
              fontSize: 18,
            }}
          >
            M
          </Text>
        </View>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: "absolute",
    zIndex: 50,
  },
  fab: {
    width: spacing.fab,
    height: spacing.fab,
    borderRadius: radii.fab,
    alignItems: "center",
    justifyContent: "center",
    shadowOpacity: 0.35,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  ring: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: StyleSheet.hairlineWidth * 2,
    alignItems: "center",
    justifyContent: "center",
  },
});

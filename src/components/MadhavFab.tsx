import React, { useEffect, useRef } from "react";
import {
  Animated,
  Image,
  Platform,
  Pressable,
  StyleSheet,
  View,
} from "react-native";
import { usePathname, useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useMadhav } from "@/context/MadhavContext";
import { useTheme } from "@/context/ThemeContext";
import { images } from "@/theme/assets";
import { radii, spacing } from "@/theme/tokens";

const TAB_BAR_HEIGHT = spacing.tabBar;

export function MadhavFab() {
  const pathname = usePathname();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const { streaming, slokaId, askAboutVerse } = useMadhav();
  const pulse = useRef(new Animated.Value(1)).current;

  const hide =
    pathname?.includes("/madhav") || pathname?.includes("auth/callback");

  const onTabs =
    pathname === "/" ||
    pathname === "/home" ||
    pathname === "/practise" ||
    pathname === "/path" ||
    pathname === "/profile" ||
    pathname?.startsWith("/explore") ||
    pathname?.startsWith("/mood");

  useEffect(() => {
    if (!streaming) {
      pulse.setValue(1);
      return;
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1.08,
          duration: 700,
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 1,
          duration: 700,
          useNativeDriver: true,
        }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [streaming, pulse]);

  if (hide) return null;

  // Match tabs layout: Android system nav must clear the FAB too.
  const bottomInset = Math.max(
    insets.bottom,
    Platform.OS === "android" ? 12 : 0
  );
  const bottom =
    bottomInset + spacing.sm + (onTabs ? TAB_BAR_HEIGHT : spacing.md);

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
        testID="madhav-fab"
        accessibilityRole="button"
        accessibilityLabel="Ask Madhav"
        onPress={() => {
          void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          router.push("/madhav");
        }}
        onLongPress={() => {
          if (slokaId) askAboutVerse(slokaId);
          void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
          router.push("/madhav");
        }}
        style={({ pressed }) => [
          styles.fab,
          {
            borderColor: colors.brass,
            opacity: pressed ? 0.9 : 1,
            shadowColor: colors.brass,
          },
        ]}
      >
        <Image
          source={images.madhavPortrait}
          style={styles.photo}
          resizeMode="cover"
        />
        <View
          pointerEvents="none"
          style={[styles.ring, { borderColor: colors.brassSoft }]}
        />
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
    overflow: "hidden",
    borderWidth: 2,
    shadowOpacity: 0.45,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 8,
    backgroundColor: "#0e1420",
  },
  photo: {
    width: "100%",
    height: "100%",
  },
  ring: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: radii.fab,
    borderWidth: StyleSheet.hairlineWidth * 2,
    opacity: 0.55,
  },
});

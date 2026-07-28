import React, { useEffect, useRef } from "react";
import { Animated, Image, StyleSheet, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useTheme } from "@/context/ThemeContext";
import { images } from "@/theme/assets";

type Props = {
  /** 0 while the poster is on screen, 1 once the flow is a working surface. */
  reading: Animated.AnimatedInterpolation<number> | number;
};

/**
 * The one photograph in onboarding.
 *
 * `hero.jpg` is self-scrimming: near-black sky, near-black ground, and a single
 * bright horizon band about 62% down. A flat heavy veil is what kills it, so the
 * poster veil is darkest exactly where copy sits (top and bottom) and lightest
 * across the horizon. The reading veil then fades in on top for the steps that
 * carry cards, inputs and buttons, which need a calm ground more than they need
 * the glow.
 */
export function OnboardingBackdrop({ reading }: Props) {
  const { colors, mode } = useTheme();
  const dark = mode === "dark";

  const poster = dark
    ? (["rgba(7,9,15,0.38)", "rgba(7,9,15,0.18)", "rgba(7,9,15,0.86)"] as const)
    : (["rgba(7,9,15,0.30)", "rgba(7,9,15,0.14)", "rgba(7,9,15,0.72)"] as const);

  const readingVeil = dark
    ? (["rgba(7,9,15,0.52)", "rgba(7,9,15,0.66)", "rgba(7,9,15,0.55)"] as const)
    : (["rgba(7,9,15,0.34)", "rgba(7,9,15,0.46)", "rgba(7,9,15,0.38)"] as const);

  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <Image
        source={images.hero}
        style={StyleSheet.absoluteFill}
        resizeMode="cover"
      />
      <LinearGradient
        colors={[colors.atmosphereTeal, "transparent"]}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 0.55 }}
        style={styles.teal}
      />
      <LinearGradient
        colors={[colors.atmosphereBrass, "transparent"]}
        start={{ x: 1, y: 0.2 }}
        end={{ x: 0.3, y: 0.7 }}
        style={styles.brass}
      />
      <LinearGradient
        colors={[...poster]}
        locations={[0, 0.58, 1]}
        style={StyleSheet.absoluteFill}
      />
      <Animated.View style={[StyleSheet.absoluteFill, { opacity: reading }]}>
        <LinearGradient
          colors={[...readingVeil]}
          style={StyleSheet.absoluteFill}
        />
      </Animated.View>
    </View>
  );
}

/** Drives `reading` from a discrete step change rather than a scroll offset. */
export function useReadingVeil(active: boolean) {
  const value = useRef(new Animated.Value(active ? 1 : 0)).current;

  useEffect(() => {
    Animated.timing(value, {
      toValue: active ? 1 : 0,
      duration: 320,
      useNativeDriver: true,
    }).start();
  }, [active, value]);

  return value;
}

const styles = StyleSheet.create({
  teal: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 280,
  },
  brass: {
    position: "absolute",
    top: 40,
    right: 0,
    width: 220,
    height: 220,
  },
});

import React, { useEffect, useMemo, useRef } from "react";
import {
  Animated,
  Image,
  StyleSheet,
  useWindowDimensions,
  View,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useTheme } from "@/context/ThemeContext";
import { images } from "@/theme/assets";

/** Intrinsic size of `krishna-glade.jpg` (keep in sync with the asset). */
const IMG_W = 895;
const IMG_H = 1600;
const IMG_ASPECT = IMG_W / IMG_H;

type Props = {
  /** 0 while the poster is on screen, 1 once the flow is a working surface. */
  reading: Animated.AnimatedInterpolation<number> | number;
};

/**
 * The one photograph in onboarding.
 *
 * Fits the full glade frame inside the screen (contain) — never cover-crops or
 * zooms. Void letterboxes any leftover edges. Poster veil keeps copy readable
 * without hiding Krishna; reading veil calms later steps.
 */
export function OnboardingBackdrop({ reading }: Props) {
  const { mode } = useTheme();
  const { width: screenW, height: screenH } = useWindowDimensions();
  const dark = mode === "dark";

  const photoStyle = useMemo(() => {
    const screenAspect = screenW / screenH;
    // Contain: scale so the entire image fits; letterbox the rest.
    if (screenAspect > IMG_ASPECT) {
      const height = screenH;
      const width = height * IMG_ASPECT;
      return { width, height };
    }
    const width = screenW;
    const height = width / IMG_ASPECT;
    return { width, height };
  }, [screenW, screenH]);

  // Welcome poster: light touch so the full glade (Krishna + animals) stays
  // visible. Reading steps get a heavier calm ground for cards/inputs.
  const poster = dark
    ? (["rgba(7,9,15,0.48)", "rgba(7,9,15,0.04)", "rgba(7,9,15,0.28)"] as const)
    : (["rgba(7,9,15,0.36)", "rgba(7,9,15,0.02)", "rgba(7,9,15,0.22)"] as const);

  const readingVeil = dark
    ? (["rgba(7,9,15,0.58)", "rgba(7,9,15,0.70)", "rgba(7,9,15,0.62)"] as const)
    : (["rgba(7,9,15,0.38)", "rgba(7,9,15,0.50)", "rgba(7,9,15,0.42)"] as const);

  return (
    <View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.root]}>
      <View style={styles.photoWrap}>
        <Image
          source={images.onboarding}
          style={photoStyle}
          resizeMode="stretch"
          accessibilityIgnoresInvertColors
        />
      </View>
      <LinearGradient
        colors={[...poster]}
        locations={[0, 0.42, 1]}
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
  root: {
    backgroundColor: "#07090f",
  },
  photoWrap: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
  },
});

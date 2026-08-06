import React, { useEffect, useRef } from "react";
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

type Props = {
  /** 0 while the poster is on screen, 1 once the flow is a working surface. */
  reading: Animated.AnimatedInterpolation<number> | number;
};

/**
 * The one photograph in onboarding.
 *
 * Stretches to the full window so every phone sees the complete glade
 * (Krishna + animals) with no letterbox and no cover-crop zoom. Mild aspect
 * distortion on very tall/wide devices is preferred over losing the subject.
 */
export function OnboardingBackdrop({ reading }: Props) {
  const { mode } = useTheme();
  const { width, height } = useWindowDimensions();
  const dark = mode === "dark";

  // Welcome poster: light touch so the full glade stays vivid.
  // Reading steps get a heavier calm ground for cards/inputs.
  const poster = dark
    ? (["rgba(7,9,15,0.42)", "rgba(7,9,15,0.02)", "rgba(7,9,15,0.22)"] as const)
    : (["rgba(7,9,15,0.32)", "rgba(7,9,15,0.02)", "rgba(7,9,15,0.18)"] as const);

  const readingVeil = dark
    ? (["rgba(7,9,15,0.58)", "rgba(7,9,15,0.70)", "rgba(7,9,15,0.62)"] as const)
    : (["rgba(7,9,15,0.38)", "rgba(7,9,15,0.50)", "rgba(7,9,15,0.42)"] as const);

  return (
    <View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.root]}>
      <Image
        source={images.onboarding}
        style={{ width, height }}
        resizeMode="stretch"
        accessibilityIgnoresInvertColors
      />
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
});

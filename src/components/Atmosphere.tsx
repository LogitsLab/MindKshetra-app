import React, { useEffect, useRef } from "react";
import {
  AccessibilityInfo,
  Animated,
  ImageBackground,
  StyleSheet,
  View,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useTheme } from "@/context/ThemeContext";
import { images } from "@/theme/assets";

type Props = {
  intensity?: "default" | "strong" | "soft";
};

/** Web-parity atmosphere: hero photo + veil + teal/brass light. */
export function Atmosphere({ intensity = "default" }: Props) {
  const { colors, mode } = useTheme();
  const breathe = useRef(new Animated.Value(1)).current;
  const [reduceMotion, setReduceMotion] = React.useState(false);

  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then(setReduceMotion);
    const sub = AccessibilityInfo.addEventListener(
      "reduceMotionChanged",
      setReduceMotion
    );
    return () => sub.remove();
  }, []);

  useEffect(() => {
    if (reduceMotion) {
      breathe.setValue(1);
      return;
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(breathe, {
          toValue: 1.06,
          duration: 7000,
          useNativeDriver: true,
        }),
        Animated.timing(breathe, {
          toValue: 1,
          duration: 7000,
          useNativeDriver: true,
        }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [breathe, reduceMotion]);

  const veil =
    mode === "dark"
      ? intensity === "strong"
        ? (["rgba(7,9,15,0.65)", "rgba(7,9,15,0.82)", "rgba(7,9,15,0.95)"] as const)
        : intensity === "soft"
          ? (["rgba(7,9,15,0.35)", "rgba(7,9,15,0.55)", "rgba(7,9,15,0.78)"] as const)
          : (["rgba(7,9,15,0.55)", "rgba(7,9,15,0.7)", "rgba(7,9,15,0.9)"] as const)
      : (["rgba(7,9,15,0.25)", "rgba(7,9,15,0.15)", "rgba(7,9,15,0.35)"] as const);

  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <ImageBackground
        source={images.hero}
        style={StyleSheet.absoluteFill}
        imageStyle={styles.heroImage}
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
      <LinearGradient colors={[...veil]} style={StyleSheet.absoluteFill} />
      {!reduceMotion ? (
        <Animated.View
          style={[
            styles.rings,
            {
              borderColor: colors.brass,
              opacity: breathe.interpolate({
                inputRange: [1, 1.06],
                outputRange: [0.12, 0.22],
              }),
              transform: [{ scale: breathe }],
            },
          ]}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  heroImage: {
    // Focal ~ center 38% like web
    top: -40,
  },
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
  rings: {
    position: "absolute",
    top: "18%",
    alignSelf: "center",
    width: 280,
    height: 280,
    borderRadius: 140,
    borderWidth: StyleSheet.hairlineWidth * 2,
  },
});

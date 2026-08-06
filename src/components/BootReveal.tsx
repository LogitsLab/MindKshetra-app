import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  AccessibilityInfo,
  Animated,
  ImageBackground,
  Pressable,
  StyleSheet,
  View,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { BrandMark } from "@/components/BrandMark";
import { bootRevealPool } from "@/theme/assets";

const MIN_HOLD_MS = 1200;
const MAX_HOLD_MS = 2000;
const FADE_MS = 420;
const REDUCE_HOLD_MS = 600;
const REDUCE_FADE_MS = 160;

type Props = {
  /** When true, reveal may finish (fonts/app shell ready). */
  active: boolean;
  onFinished: () => void;
};

/**
 * Full-bleed Krishna still after the native splash — random calm image,
 * tap to skip, capped hold. Does not change session atmosphere.
 */
export function BootReveal({ active, onFinished }: Props) {
  const source = useMemo(
    () => bootRevealPool[Math.floor(Math.random() * bootRevealPool.length)]!,
    []
  );
  const opacity = useRef(new Animated.Value(1)).current;
  const [reduceMotion, setReduceMotion] = useState(false);
  const finished = useRef(false);
  const minElapsed = useRef(false);
  const skipRequested = useRef(false);

  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then(setReduceMotion);
    const sub = AccessibilityInfo.addEventListener(
      "reduceMotionChanged",
      setReduceMotion
    );
    return () => sub.remove();
  }, []);

  const complete = React.useCallback(() => {
    if (finished.current) return;
    finished.current = true;
    const fade = reduceMotion ? REDUCE_FADE_MS : FADE_MS;
    Animated.timing(opacity, {
      toValue: 0,
      duration: fade,
      useNativeDriver: true,
    }).start(({ finished: ok }) => {
      if (ok) onFinished();
      else onFinished();
    });
  }, [onFinished, opacity, reduceMotion]);

  useEffect(() => {
    if (!active) return;
    const minHold = reduceMotion ? REDUCE_HOLD_MS : MIN_HOLD_MS;
    const maxHold = reduceMotion ? REDUCE_HOLD_MS + 200 : MAX_HOLD_MS;

    const minTimer = setTimeout(() => {
      minElapsed.current = true;
      if (skipRequested.current) complete();
    }, minHold);

    const maxTimer = setTimeout(() => {
      complete();
    }, maxHold);

    return () => {
      clearTimeout(minTimer);
      clearTimeout(maxTimer);
    };
  }, [active, complete, reduceMotion]);

  const onSkip = () => {
    skipRequested.current = true;
    if (minElapsed.current) complete();
  };

  if (!active) return null;

  return (
    <Animated.View
      style={[StyleSheet.absoluteFill, styles.root, { opacity }]}
      pointerEvents="box-none"
    >
      <Pressable
        style={StyleSheet.absoluteFill}
        onPress={onSkip}
        accessibilityRole="button"
        accessibilityLabel="Continue"
      >
        <ImageBackground
          source={source}
          style={StyleSheet.absoluteFill}
          resizeMode="cover"
        >
          <LinearGradient
            colors={[
              "rgba(7,9,15,0.55)",
              "rgba(7,9,15,0.12)",
              "rgba(7,9,15,0.72)",
            ]}
            locations={[0, 0.45, 1]}
            style={StyleSheet.absoluteFill}
          />
          <View style={styles.markWrap} pointerEvents="none">
            <BrandMark size={36} />
          </View>
        </ImageBackground>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  root: {
    zIndex: 100,
    elevation: 100,
    backgroundColor: "#07090f",
  },
  markWrap: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "flex-end",
    paddingBottom: 56,
  },
});

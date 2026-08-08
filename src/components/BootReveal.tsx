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
import { BRAND_CREDIT, BRAND_NAME } from "@/components/BrandWordmark";
import { Text } from "@/components/Text";
import { bootRevealPool } from "@/theme/assets";
import { spacing } from "@/theme/tokens";

const MIN_HOLD_MS = 1200;
const MAX_HOLD_MS = 2000;
const FADE_MS = 420;
const REDUCE_HOLD_MS = 600;
const REDUCE_FADE_MS = 160;
/** Absolute failsafe so a flaky animation never traps the home screen. */
const HARD_DISMISS_MS = 3500;

type Props = {
  /** When true, reveal may finish (fonts/app shell ready). */
  active: boolean;
  onFinished: () => void;
};

/**
 * Full-bleed mythic still after the native splash — random pick from
 * bootRevealPool, tap to skip, capped hold. Does not change session atmosphere.
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
  // Keep latest callback/motion without resetting hold timers on parent re-renders
  // (Auth/Language/Theme hydrate under the same tree and used to restart the clock).
  const onFinishedRef = useRef(onFinished);
  onFinishedRef.current = onFinished;
  const reduceMotionRef = useRef(reduceMotion);
  reduceMotionRef.current = reduceMotion;

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
    const fade = reduceMotionRef.current ? REDUCE_FADE_MS : FADE_MS;
    Animated.timing(opacity, {
      toValue: 0,
      duration: fade,
      useNativeDriver: true,
    }).start(() => {
      onFinishedRef.current();
    });
  }, [opacity]);

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

    const hardTimer = setTimeout(() => {
      if (finished.current) return;
      finished.current = true;
      onFinishedRef.current();
    }, HARD_DISMISS_MS);

    return () => {
      clearTimeout(minTimer);
      clearTimeout(maxTimer);
      clearTimeout(hardTimer);
    };
  }, [active, reduceMotion, complete]);

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
          <View
            style={styles.brandWrap}
            pointerEvents="none"
            accessible
            accessibilityRole="header"
            accessibilityLabel={`${BRAND_NAME} ${BRAND_CREDIT}`}
          >
            <BrandMark size={44} />
            <Text variant="display" color="#F4F0E6" style={styles.brandName}>
              {BRAND_NAME}
            </Text>
            <Text variant="eyebrow" color="rgba(244,240,230,0.72)" style={styles.brandCredit}>
              {BRAND_CREDIT}
            </Text>
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
  brandWrap: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "flex-end",
    paddingBottom: 64,
    paddingHorizontal: spacing.lg,
    gap: spacing.sm,
  },
  brandName: {
    fontSize: 32,
    lineHeight: 38,
    letterSpacing: -0.4,
    textAlign: "center",
  },
  brandCredit: {
    letterSpacing: 1.6,
    textTransform: "uppercase",
    textAlign: "center",
  },
});

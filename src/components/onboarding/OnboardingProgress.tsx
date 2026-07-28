import React, { useEffect, useRef, useState } from "react";
import { AccessibilityInfo, Animated, StyleSheet, View } from "react-native";
import { Text } from "@/components/Text";
import { useTheme } from "@/context/ThemeContext";
import { spacing } from "@/theme/tokens";

type Props = {
  /** 0-based position across the whole flow. */
  step: number;
  total: number;
};

/**
 * One track for the whole flow.
 *
 * The previous dots showed two dots on the welcome pager and three on the
 * steps after it, so the scale of the thing measuring progress changed
 * halfway through and step one never read as done. An indicator that
 * renegotiates its own scale cannot answer "how much is left", which is the
 * only question it exists to answer.
 */
export function OnboardingProgress({ step, total }: Props) {
  const { colors } = useTheme();
  const [trackWidth, setTrackWidth] = useState(0);
  const [reduceMotion, setReduceMotion] = useState(false);
  const fill = useRef(new Animated.Value(0)).current;

  const ratio = total > 0 ? Math.min(1, (step + 1) / total) : 0;

  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then(setReduceMotion);
  }, []);

  useEffect(() => {
    const target = trackWidth * ratio;
    if (reduceMotion || trackWidth === 0) {
      fill.setValue(target);
      return;
    }
    Animated.timing(fill, {
      toValue: target,
      duration: 380,
      useNativeDriver: false,
    }).start();
  }, [fill, ratio, reduceMotion, trackWidth]);

  return (
    <View
      style={styles.row}
      accessibilityRole="progressbar"
      accessibilityValue={{ min: 1, max: total, now: step + 1 }}
    >
      <View
        style={[styles.track, { backgroundColor: colors.hairline }]}
        onLayout={(e) => setTrackWidth(e.nativeEvent.layout.width)}
      >
        <Animated.View
          style={[styles.fill, { width: fill, backgroundColor: colors.brass }]}
        />
      </View>
      <Text variant="eyebrow" color={colors.brassSoft} style={styles.count}>
        {pad(step + 1)} / {pad(total)}
      </Text>
    </View>
  );
}

function pad(n: number) {
  return n < 10 ? `0${n}` : String(n);
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  track: {
    flex: 1,
    height: 3,
    borderRadius: 2,
    overflow: "hidden",
  },
  fill: {
    height: 3,
    borderRadius: 2,
  },
  count: {
    // Tabular by construction: the flow is four steps, so both sides are 2 digits.
    letterSpacing: 1.2,
  },
});

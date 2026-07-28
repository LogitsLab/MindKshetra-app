import React, { useEffect, useRef } from "react";
import { AccessibilityInfo, Animated, type ViewStyle } from "react-native";
import { motion } from "@/theme/tokens";

type Props = {
  children: React.ReactNode;
  delay?: number;
  style?: ViewStyle;
  /**
   * Hold the entrance until the content is actually on screen. A horizontal
   * pager renders its pages eagerly, so without this a page animates in while
   * it is still off to the side and arrives flat.
   */
  active?: boolean;
};

export function Rise({ children, delay = 0, style, active = true }: Props) {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(motion.riseY)).current;

  useEffect(() => {
    if (!active) return;
    let cancelled = false;
    AccessibilityInfo.isReduceMotionEnabled().then((reduce) => {
      if (cancelled) return;
      if (reduce) {
        opacity.setValue(1);
        translateY.setValue(0);
        return;
      }
      Animated.parallel([
        Animated.timing(opacity, {
          toValue: 1,
          duration: motion.enterMs,
          delay,
          useNativeDriver: true,
        }),
        Animated.timing(translateY, {
          toValue: 0,
          duration: motion.enterMs,
          delay,
          useNativeDriver: true,
        }),
      ]).start();
    });
    return () => {
      cancelled = true;
    };
  }, [active, delay, opacity, translateY]);

  return (
    <Animated.View style={[{ opacity, transform: [{ translateY }] }, style]}>
      {children}
    </Animated.View>
  );
}

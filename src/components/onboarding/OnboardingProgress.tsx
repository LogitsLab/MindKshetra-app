import React from "react";
import { StyleSheet, View } from "react-native";
import { useTheme } from "@/context/ThemeContext";
import { spacing } from "@/theme/tokens";

type Props = {
  /** 0-based position across the whole flow. */
  step: number;
  total: number;
};

/** A consistent dot scale spanning personalization and account setup. */
export function OnboardingProgress({ step, total }: Props) {
  const { colors } = useTheme();

  return (
    <View
      style={styles.row}
      accessibilityRole="progressbar"
      accessibilityValue={{ min: 1, max: total, now: step + 1 }}
    >
      {Array.from({ length: total }, (_, index) => (
        <View
          key={index}
          style={[
            styles.dot,
            {
              backgroundColor: index === step ? colors.brass : colors.textMuted,
              opacity: index === step ? 1 : 0.38,
            },
            index === step && styles.active,
          ]}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.xs + 2,
  },
  dot: {
    width: 5,
    height: 5,
    borderRadius: 3,
  },
  active: {
    width: 17,
  },
});

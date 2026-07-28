import React from "react";
import { StyleSheet, View } from "react-native";
import { useTheme } from "@/context/ThemeContext";
import { spacing } from "@/theme/tokens";

type Props = {
  /** 0-based main step index (welcome, language, account) */
  step: number;
  /** Total main steps */
  total?: number;
  /** Optional sub-step within welcome pager (0–1) */
  welcomeSub?: number;
  welcomeSubTotal?: number;
};

export function OnboardingStepDots({
  step,
  total = 3,
  welcomeSub,
  welcomeSubTotal = 2,
}: Props) {
  const { colors } = useTheme();
  const onWelcome = step === 0 && welcomeSub != null;

  return (
    <View style={styles.row}>
      {onWelcome ? (
        Array.from({ length: welcomeSubTotal }).map((_, subIndex) => (
          <View
            key={subIndex}
            style={[
              styles.welcomeDot,
              {
                backgroundColor:
                  subIndex === welcomeSub ? colors.brass : colors.line,
                opacity: subIndex === welcomeSub ? 1 : 0.45,
                width: subIndex === welcomeSub ? 28 : 16,
              },
            ]}
          />
        ))
      ) : (
        Array.from({ length: total }).map((_, index) => {
          const active = index === step;
          const done = index < step;
          return (
            <View
              key={index}
              style={[
                styles.mainDot,
                {
                  backgroundColor: active || done ? colors.brass : colors.line,
                  opacity: active ? 1 : done ? 0.85 : 0.4,
                  width: active ? 28 : 16,
                },
              ]}
            />
          );
        })
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
  },
  mainDot: {
    height: 4,
    borderRadius: 2,
  },
  welcomeDot: {
    height: 4,
    borderRadius: 2,
  },
});

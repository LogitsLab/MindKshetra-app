import React from "react";
import { Pressable, StyleSheet, View } from "react-native";
import Svg, { Path } from "react-native-svg";
import { Text } from "@/components/Text";
import { OnboardingProgress } from "@/components/onboarding/OnboardingProgress";
import { useLanguage } from "@/context/LanguageContext";
import { useTheme } from "@/context/ThemeContext";
import { radii, spacing } from "@/theme/tokens";

type Props = {
  step: number;
  total: number;
  /** Omitted on the first screen, where there is nowhere to go back to. */
  onBack?: () => void;
  /** Omitted once the flow reaches the steps that carry real choices. */
  onSkip?: () => void;
};

/**
 * Back · progress · skip, in one row that keeps its geometry across every step.
 *
 * Both controls reserve their slot when absent, so the progress track never
 * shifts sideways as you move through the flow.
 */
export function OnboardingHeader({ step, total, onBack, onSkip }: Props) {
  const { colors } = useTheme();
  const { t } = useLanguage();

  return (
    <View style={styles.row}>
      {onBack ? (
        <Pressable
          onPress={onBack}
          accessibilityRole="button"
          accessibilityLabel={t("onboardingBack")}
          hitSlop={12}
          style={({ pressed }) => [styles.slot, { opacity: pressed ? 0.6 : 1 }]}
        >
          <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
            <Path
              d="M15 5l-7 7 7 7"
              stroke={colors.onMedia}
              strokeWidth="1.6"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </Svg>
        </Pressable>
      ) : (
        <View style={styles.slot} />
      )}

      <OnboardingProgress step={step} total={total} />

      {/*
        Always rendered, hidden rather than removed. A spacer of some guessed
        width would have to match the label in every language to keep the track
        from resizing; keeping the real control in the layout makes that exact
        by construction.
      */}
      <Pressable
        onPress={onSkip}
        disabled={!onSkip}
        accessibilityElementsHidden={!onSkip}
        importantForAccessibility={onSkip ? "yes" : "no-hide-descendants"}
        accessibilityRole="button"
        hitSlop={12}
        style={({ pressed }) => [
          styles.skip,
          {
            borderColor: colors.line,
            opacity: !onSkip ? 0 : pressed ? 0.6 : 1,
          },
        ]}
      >
        <Text variant="eyebrow" color={colors.onMediaMuted}>
          {t("onboardingSkipIntro")}
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
  },
  slot: {
    width: 28,
    height: 32,
    alignItems: "flex-start",
    justifyContent: "center",
  },
  skip: {
    height: 32,
    justifyContent: "center",
    paddingHorizontal: spacing.sm + 2,
    borderRadius: radii.sm,
    borderWidth: StyleSheet.hairlineWidth * 2,
  },
});

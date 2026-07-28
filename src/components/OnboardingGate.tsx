import React from "react";
import { ActivityIndicator, View } from "react-native";
import { useOnboarding } from "@/context/OnboardingContext";
import { useTheme } from "@/context/ThemeContext";

/** Waits for onboarding status from storage before mounting the root Stack. */
export function OnboardingGate({ children }: { children: React.ReactNode }) {
  const { ready } = useOnboarding();
  const { colors } = useTheme();

  if (!ready) {
    return (
      <View
        style={{
          flex: 1,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: colors.void,
        }}
      >
        <ActivityIndicator color={colors.brass} />
      </View>
    );
  }

  return <>{children}</>;
}

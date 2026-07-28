import React from "react";
import { ActivityIndicator, View } from "react-native";
import { Redirect } from "expo-router";
import { useOnboarding } from "@/context/OnboardingContext";
import { useTheme } from "@/context/ThemeContext";

/**
 * Sole owner of `/`. Sends new users to onboarding; returning users to the home tab.
 * (tabs)/home.tsx must NOT be named index — that caused Expo to open the homepage at `/`.
 */
export default function RootIndex() {
  const { ready, complete } = useOnboarding();
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

  if (!complete) {
    return <Redirect href="/onboarding" />;
  }

  return <Redirect href="/(tabs)/home" />;
}

import React from "react";
import { ActivityIndicator, View } from "react-native";
import { Redirect } from "expo-router";
import { useAuth } from "@/context/AuthContext";
import { useOnboarding } from "@/context/OnboardingContext";
import { useTheme } from "@/context/ThemeContext";

/**
 * Sole owner of `/`. Signed-in accounts always land on the home tab — even on
 * a fresh install where the local onboarding flag is empty (session restores
 * from Supabase). Guests and first-time users go to onboarding until they
 * complete it.
 * (tabs)/home.tsx must NOT be named index — that caused Expo to open the homepage at `/`.
 */
export default function RootIndex() {
  const { ready, complete } = useOnboarding();
  const { loading: authLoading, isSignedIn } = useAuth();
  const { colors } = useTheme();

  if (!ready || authLoading) {
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

  if (!complete && !isSignedIn) {
    return <Redirect href="/onboarding" />;
  }

  return <Redirect href="/(tabs)/home" />;
}

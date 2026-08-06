import React from "react";
import { ActivityIndicator, View } from "react-native";
import { Redirect } from "expo-router";
import { useTheme } from "@/context/ThemeContext";
import { useOnboardingDone } from "@/hooks/useOnboardingDone";

/**
 * Sole owner of `/`. Signed-in accounts always land on the home tab — even on
 * a fresh install where the local onboarding flag is empty (session restores
 * from Supabase). Guests and first-time users go to onboarding until they
 * complete it.
 * (tabs)/home.tsx must NOT be named index — that caused Expo to open the homepage at `/`.
 */
export default function RootIndex() {
  const { ready, authLoading, done } = useOnboardingDone();
  const { colors } = useTheme();
  // A boot signal that never resolves must not strand the app on this
  // spinner — after the deadline, proceed with whatever we know.
  const [timedOut, setTimedOut] = React.useState(false);
  React.useEffect(() => {
    const id = setTimeout(() => setTimedOut(true), 5000);
    return () => clearTimeout(id);
  }, []);

  if ((!ready || authLoading) && !timedOut) {
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

  if (!done) {
    return <Redirect href="/onboarding" />;
  }

  return <Redirect href="/(tabs)/home" />;
}

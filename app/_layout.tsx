import React, { useCallback, useEffect, useState } from "react";
import { View } from "react-native";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { useFonts, Fraunces_500Medium, Fraunces_600SemiBold } from "@expo-google-fonts/fraunces";
import {
  NotoSerifDevanagari_500Medium,
  NotoSerifDevanagari_600SemiBold,
} from "@expo-google-fonts/noto-serif-devanagari";
import { Sora_400Regular, Sora_600SemiBold } from "@expo-google-fonts/sora";
import * as SplashScreen from "expo-splash-screen";
import { ThemeProvider, useTheme } from "@/context/ThemeContext";
import { LanguageProvider, useLanguage } from "@/context/LanguageContext";
import { TextScaleProvider } from "@/context/TextScaleContext";
import { OnboardingProvider } from "@/context/OnboardingContext";
import { AuthProvider } from "@/context/AuthContext";
import { MadhavProvider } from "@/context/MadhavContext";
import { warmAudioManifest } from "@/audio/manifest";
import { BootReveal } from "@/components/BootReveal";
import { MadhavFab } from "@/components/MadhavFab";
import { HeaderBrandRight } from "@/components/ScreenHeader";
import { OnboardingGate } from "@/components/OnboardingGate";
import { useOnboarding } from "@/context/OnboardingContext";
import { useDailyVisit } from "@/hooks/useDailyVisit";
import { useNotificationObserver } from "@/notifications/handlers";
import { useOnboardingRouting } from "@/hooks/useOnboardingRouting";
import { useSegments } from "expo-router";

SplashScreen.preventAutoHideAsync().catch(() => undefined);

/** App always boots at app/index.tsx, which routes by onboarding status. */
export const unstable_settings = {
  initialRouteName: "index",
};

function RootNavigator() {
  const { mode, colors } = useTheme();
  const { t } = useLanguage();
  const { ready } = useOnboarding();
  const segments = useSegments();
  const onOnboarding = segments[0] === "onboarding";

  useOnboardingRouting();
  useDailyVisit();
  // Notification taps → in-app routes (warm and cold start). One mount.
  useNotificationObserver();
  // Pull audio manifest once so Listen isn’t blocked on first tap.
  useEffect(() => {
    warmAudioManifest();
  }, []);

  // Never return bare null — that flashes pure black between splash and Stack.
  if (!ready) {
    return <View style={{ flex: 1, backgroundColor: colors.void }} />;
  }

  return (
    <>
      <StatusBar style={mode === "dark" ? "light" : "dark"} translucent />
      <Stack
        initialRouteName="index"
        screenOptions={{
          headerStyle: { backgroundColor: colors.navBg },
          headerTintColor: colors.text,
          headerTitleStyle: { fontFamily: "Sora_600SemiBold" },
          contentStyle: { backgroundColor: colors.void },
          headerShadowVisible: false,
          headerBackButtonDisplayMode: "minimal",
          headerRight: () => <HeaderBrandRight />,
        }}
      >
        <Stack.Screen
          name="index"
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="onboarding"
          options={{ headerShown: false, gestureEnabled: false }}
        />
        <Stack.Screen
          name="(tabs)"
          options={{ headerShown: false, title: "Home" }}
        />
        <Stack.Screen
          name="madhav"
          options={{
            presentation: "modal",
            headerShown: false,
            animation: "slide_from_bottom",
          }}
        />
        <Stack.Screen name="sloka/[id]" options={{ title: "Verse" }} />
        <Stack.Screen name="verse-of-the-day" options={{ title: "Verse of the Day" }} />
        <Stack.Screen name="japa" options={{ title: "Japa" }} />
        <Stack.Screen name="sadhana" options={{ title: "Sādhana" }} />
        <Stack.Screen
          name="community"
          options={{ title: t("homeBlockSanghaTitle") }}
        />
        <Stack.Screen
          name="care"
          options={{ title: t("homeBlockCareTitle") }}
        />
        <Stack.Screen
          name="support"
          options={{ title: t("homeBlockSupportTitle") }}
        />
        <Stack.Screen name="paths/index" options={{ title: "Paths" }} />
        <Stack.Screen name="paths/[id]" options={{ title: "Path" }} />
        {/* Unregistered until now, so all three fell back to expo-router's
            default header instead of the app's. */}
        <Stack.Screen
          name="meditation/index"
          options={{ title: t("medEyebrow") }}
        />
        <Stack.Screen name="meditation/[day]" options={{ title: "Day" }} />
        <Stack.Screen
          name="meditation/daily/[id]"
          options={{ title: t("medDailiesTitle") }}
        />
        <Stack.Screen name="favorites" options={{ title: "Favorites" }} />
        <Stack.Screen
          name="account/index"
          options={{
            title: "Profile",
            animation: "slide_from_right",
            animationDuration: 280,
            gestureEnabled: true,
          }}
        />
        <Stack.Screen
          name="account/reflections"
          options={{ title: "Reflections" }}
        />
        <Stack.Screen
          name="account/achievements"
          options={{ title: "Achievements" }}
        />
        <Stack.Screen
          name="account/progress"
          options={{ title: "Progress" }}
        />
        <Stack.Screen
          name="account/personalize"
          options={{ title: "Personalize" }}
        />
        <Stack.Screen
          name="journal/index"
          options={{ title: "Journal" }}
        />
        <Stack.Screen
          name="u/[handle]"
          options={{ title: "Profile", headerShown: false }}
        />
        <Stack.Screen name="auth/callback" options={{ headerShown: false }} />
        <Stack.Screen name="privacy" options={{ title: "Privacy" }} />
      </Stack>
      {!onOnboarding ? <MadhavFab /> : null}
    </>
  );
}

/** Cold-start Krishna still over the navigator; once per JS boot. */
function AppWithBootReveal() {
  const [revealing, setRevealing] = useState(true);
  const onFinished = useCallback(() => setRevealing(false), []);
  return (
    <View style={{ flex: 1, backgroundColor: "#07090f" }}>
      <RootNavigator />
      {revealing ? <BootReveal active onFinished={onFinished} /> : null}
    </View>
  );
}

export default function RootLayout() {
  const [loaded, fontError] = useFonts({
    Fraunces_500Medium,
    Fraunces_600SemiBold,
    // Fraunces has no Devanagari coverage (see docs/design/VISUAL_SYSTEM.md);
    // Sanskrit/Hindi display text gets a real serif instead of a silent
    // system-font fallback.
    NotoSerifDevanagari_500Medium,
    NotoSerifDevanagari_600SemiBold,
    Sora_400Regular,
    Sora_600SemiBold,
  });

  // If font loading errors or hangs, boot with system fonts after 2s rather
  // than blocking on the splash screen forever.
  const [fontsTimedOut, setFontsTimedOut] = useState(false);
  useEffect(() => {
    const timer = setTimeout(() => setFontsTimedOut(true), 2000);
    return () => clearTimeout(timer);
  }, []);

  const ready = loaded || fontError != null || fontsTimedOut;

  // Do not hide the native splash here — BootReveal dismisses it once the
  // random still has loaded, so cold start never flashes two artworks.

  // Match splash / theme void so font boot never flashes system black.
  if (!ready) {
    return <View style={{ flex: 1, backgroundColor: "#07090f" }} />;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: "#07090f" }}>
      <ThemeProvider>
        <TextScaleProvider>
          <LanguageProvider>
            <OnboardingProvider>
              <AuthProvider>
                <MadhavProvider>
                  <OnboardingGate>
                    <AppWithBootReveal />
                  </OnboardingGate>
                </MadhavProvider>
              </AuthProvider>
            </OnboardingProvider>
          </LanguageProvider>
        </TextScaleProvider>
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}

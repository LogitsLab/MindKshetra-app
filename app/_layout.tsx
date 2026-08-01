import React, { useEffect } from "react";
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
import { MadhavFab } from "@/components/MadhavFab";
import { ProfileButton } from "@/components/ScreenHeader";
import { OnboardingGate } from "@/components/OnboardingGate";
import { useOnboarding } from "@/context/OnboardingContext";
import { useDailyVisit } from "@/hooks/useDailyVisit";
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

  if (!ready) return null;

  return (
    <>
      <StatusBar style={mode === "dark" ? "light" : "dark"} />
      <Stack
        initialRouteName="index"
        screenOptions={{
          headerStyle: { backgroundColor: colors.navBg },
          headerTintColor: colors.text,
          headerTitleStyle: { fontFamily: "Sora_600SemiBold" },
          contentStyle: { backgroundColor: colors.void },
          headerShadowVisible: false,
          headerBackButtonDisplayMode: "minimal",
          headerRight: () => <ProfileButton />,
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
            title: "Ask Madhav",
            animation: "slide_from_bottom",
          }}
        />
        <Stack.Screen name="sloka/[id]" options={{ title: "Verse" }} />
        <Stack.Screen name="verse-of-the-day" options={{ title: "Verse of the Day" }} />
        <Stack.Screen name="japa" options={{ title: "Japa" }} />
        <Stack.Screen name="panchang" options={{ title: "Panchang" }} />
        <Stack.Screen name="sadhana" options={{ title: "Sādhana" }} />
        <Stack.Screen
          name="community"
          options={{ title: t("homeBlockSanghaTitle") }}
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
            headerRight: () => null,
            animation: "slide_from_right",
            animationDuration: 280,
            gestureEnabled: true,
          }}
        />
        <Stack.Screen
          name="account/reflections"
          options={{ title: "Reflections", headerRight: () => null }}
        />
        <Stack.Screen name="astrology/incognito" options={{ title: "Incognito chart" }} />
        <Stack.Screen name="astrology/members/index" options={{ title: "Members" }} />
        <Stack.Screen name="astrology/members/new" options={{ title: "Add member" }} />
        <Stack.Screen name="astrology/members/[id]" options={{ title: "Chart" }} />
        <Stack.Screen name="astrology/milan" options={{ title: "Kundli Milan" }} />
        <Stack.Screen name="auth/callback" options={{ headerShown: false }} />
        <Stack.Screen name="privacy" options={{ title: "Privacy" }} />
      </Stack>
      {!onOnboarding ? <MadhavFab /> : null}
    </>
  );
}

export default function RootLayout() {
  const [loaded] = useFonts({
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

  useEffect(() => {
    if (loaded) SplashScreen.hideAsync().catch(() => undefined);
  }, [loaded]);

  if (!loaded) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ThemeProvider>
        <TextScaleProvider>
          <LanguageProvider>
            <OnboardingProvider>
              <AuthProvider>
                <MadhavProvider>
                  <OnboardingGate>
                    <RootNavigator />
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

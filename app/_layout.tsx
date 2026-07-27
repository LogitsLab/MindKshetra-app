import React, { useEffect } from "react";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { useFonts, Fraunces_500Medium, Fraunces_600SemiBold } from "@expo-google-fonts/fraunces";
import { Sora_400Regular, Sora_600SemiBold } from "@expo-google-fonts/sora";
import * as SplashScreen from "expo-splash-screen";
import { ThemeProvider, useTheme } from "@/context/ThemeContext";
import { LanguageProvider } from "@/context/LanguageContext";
import { AuthProvider } from "@/context/AuthContext";
import { MadhavProvider } from "@/context/MadhavContext";
import { MadhavFab } from "@/components/MadhavFab";
import { ProfileButton } from "@/components/ScreenHeader";

SplashScreen.preventAutoHideAsync().catch(() => undefined);

function RootNavigator() {
  const { mode, colors } = useTheme();
  return (
    <>
      <StatusBar style={mode === "dark" ? "light" : "dark"} />
      <Stack
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
        <Stack.Screen name="favorites" options={{ title: "Favorites" }} />
        <Stack.Screen
          name="account/index"
          options={{
            title: "Profile",
            headerRight: () => null,
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
        <Stack.Screen name="auth/callback" options={{ headerShown: false }} />
        <Stack.Screen name="privacy" options={{ title: "Privacy" }} />
      </Stack>
      <MadhavFab />
    </>
  );
}

export default function RootLayout() {
  const [loaded] = useFonts({
    Fraunces_500Medium,
    Fraunces_600SemiBold,
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
        <LanguageProvider>
          <AuthProvider>
            <MadhavProvider>
              <RootNavigator />
            </MadhavProvider>
          </AuthProvider>
        </LanguageProvider>
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}

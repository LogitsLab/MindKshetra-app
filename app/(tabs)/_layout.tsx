import React from "react";
import { ActivityIndicator, Platform, StyleSheet, View } from "react-native";
import { BlurView } from "expo-blur";
import { Redirect, Tabs } from "expo-router";
import {
  TabHomeIcon,
  TabPathIcon,
  TabPractiseIcon,
  TabProfileIcon,
} from "@/components/BrandMark";
import { useLanguage } from "@/context/LanguageContext";
import { useTheme } from "@/context/ThemeContext";
import { useOnboardingDone } from "@/hooks/useOnboardingDone";

export default function TabsLayout() {
  const { colors, mode } = useTheme();
  const { t } = useLanguage();
  // Must match index + useOnboardingRouting: signed-in counts as done.
  // Gating on `complete` alone bounced signed-in users home↔onboarding
  // (black flicker / crash) whenever the local flag lagged the session.
  const { ready, authLoading, done } = useOnboardingDone();

  if (!ready || authLoading) {
    return (
      <View style={[styles.block, { backgroundColor: colors.void }]}>
        <ActivityIndicator color={colors.brass} />
      </View>
    );
  }

  if (!done) {
    return <Redirect href="/onboarding" />;
  }

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          position: "absolute",
          backgroundColor:
            Platform.OS === "ios" ? "transparent" : colors.navBg,
          borderTopColor: colors.hairline,
          borderTopWidth: StyleSheet.hairlineWidth * 2,
          height: 64,
          paddingBottom: 8,
          paddingTop: 8,
          elevation: 0,
        },
        tabBarBackground:
          Platform.OS === "ios"
            ? () => (
                <BlurView
                  intensity={mode === "dark" ? 40 : 60}
                  tint={mode === "dark" ? "dark" : "light"}
                  style={StyleSheet.absoluteFill}
                />
              )
            : undefined,
        tabBarActiveTintColor: colors.brass,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarShowLabel: true,
        tabBarLabelStyle: {
          fontFamily: "Sora_600SemiBold",
          fontSize: 10,
          marginTop: 2,
        },
      }}
    >
      <Tabs.Screen
        name="home"
        options={{
          title: t("navHome"),
          tabBarButtonTestID: "tab-home",
          tabBarIcon: ({ focused }) => <TabHomeIcon focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="practise"
        options={{
          title: t("navPractise"),
          tabBarButtonTestID: "tab-practise",
          tabBarIcon: ({ focused }) => <TabPractiseIcon focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="path"
        options={{
          title: t("navPath"),
          tabBarButtonTestID: "tab-path",
          tabBarIcon: ({ focused }) => <TabPathIcon focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: t("navProfile"),
          tabBarButtonTestID: "tab-profile",
          tabBarIcon: ({ focused }) => <TabProfileIcon focused={focused} />,
        }}
      />
      {/* Reachable from Home paths — kept off the tab bar */}
      <Tabs.Screen name="explore/index" options={{ href: null }} />
      <Tabs.Screen name="explore/[chapter]" options={{ href: null }} />
      <Tabs.Screen name="mood/index" options={{ href: null }} />
      <Tabs.Screen name="mood/[id]" options={{ href: null }} />
      <Tabs.Screen name="astrology/index" options={{ href: null }} />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  block: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
});

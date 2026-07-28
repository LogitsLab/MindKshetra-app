import React from "react";
import { ActivityIndicator, Platform, StyleSheet, View } from "react-native";
import { BlurView } from "expo-blur";
import { Redirect, Tabs } from "expo-router";
import {
  TabAstrologyIcon,
  TabExploreIcon,
  TabHomeIcon,
  TabMoodIcon,
} from "@/components/BrandMark";
import { useLanguage } from "@/context/LanguageContext";
import { useOnboarding } from "@/context/OnboardingContext";
import { useTheme } from "@/context/ThemeContext";

export default function TabsLayout() {
  const { colors, mode } = useTheme();
  const { t } = useLanguage();
  const { ready, complete } = useOnboarding();

  if (!ready) {
    return (
      <View style={[styles.block, { backgroundColor: colors.void }]}>
        <ActivityIndicator color={colors.brass} />
      </View>
    );
  }

  if (!complete) {
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
        tabBarActiveTintColor: colors.brassSoft,
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
          tabBarIcon: ({ focused }) => <TabHomeIcon focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="explore/index"
        options={{
          title: t("navExplore"),
          tabBarIcon: ({ focused }) => <TabExploreIcon focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="mood/index"
        options={{
          title: t("navMood"),
          tabBarIcon: ({ focused }) => <TabMoodIcon focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="astrology/index"
        options={{
          title: t("navAstrology"),
          tabBarIcon: ({ focused }) => <TabAstrologyIcon focused={focused} />,
        }}
      />
      <Tabs.Screen name="explore/[chapter]" options={{ href: null }} />
      <Tabs.Screen name="mood/[id]" options={{ href: null }} />
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

import React from "react";
import { Tabs } from "expo-router";
import { View, StyleSheet } from "react-native";
import { Text } from "@/components/Text";
import { useLanguage } from "@/context/LanguageContext";
import { useTheme } from "@/context/ThemeContext";

function TabIcon({ label, focused }: { label: string; focused: boolean }) {
  const { colors } = useTheme();
  return (
    <View style={styles.iconWrap}>
      <Text
        style={{
          fontFamily: "Sora_600SemiBold",
          fontSize: 11,
          color: focused ? colors.brassSoft : colors.textMuted,
        }}
      >
        {label}
      </Text>
    </View>
  );
}

export default function TabsLayout() {
  const { colors } = useTheme();
  const { t } = useLanguage();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: colors.navBg,
          borderTopColor: colors.hairline,
          height: 64,
          paddingBottom: 8,
          paddingTop: 8,
        },
        tabBarActiveTintColor: colors.brassSoft,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarShowLabel: false,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: t("navHome"),
          tabBarIcon: ({ focused }) => <TabIcon label="Home" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="explore/index"
        options={{
          title: t("navExplore"),
          tabBarIcon: ({ focused }) => <TabIcon label="Explore" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="mood/index"
        options={{
          title: t("navMood"),
          tabBarIcon: ({ focused }) => <TabIcon label="Mood" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="astrology/index"
        options={{
          title: t("navAstrology"),
          tabBarIcon: ({ focused }) => <TabIcon label="Jyotish" focused={focused} />,
        }}
      />
      <Tabs.Screen name="explore/[chapter]" options={{ href: null }} />
      <Tabs.Screen name="mood/[id]" options={{ href: null }} />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  iconWrap: { alignItems: "center", justifyContent: "center" },
});

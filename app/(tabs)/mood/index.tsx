import React from "react";
import { FlatList, Pressable, StyleSheet, View } from "react-native";
import { useRouter } from "expo-router";
import { Screen } from "@/components/Screen";
import { Text } from "@/components/Text";
import { ScreenHeader } from "@/components/ScreenHeader";
import { moods } from "@/data/moods";
import { useLanguage } from "@/context/LanguageContext";
import { useTheme } from "@/context/ThemeContext";
import { moodAccent } from "@/theme/assets";
import { radii, spacing } from "@/theme/tokens";

export default function MoodScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const { lang } = useLanguage();

  return (
    <Screen>
      <ScreenHeader
        title={lang === "hi" ? "मनोदशा" : "Mood"}
        subtitle={
          lang === "hi"
            ? "आज कैसा अनुभव है — उसके लिए श्लोक।"
            : "Choose how you feel. We’ll meet you with verses."
        }
        style={{ marginBottom: spacing.md }}
      />
      <FlatList
        data={moods}
        keyExtractor={(m) => m.id}
        numColumns={2}
        columnWrapperStyle={{ gap: spacing.sm }}
        contentContainerStyle={{ gap: spacing.sm, paddingBottom: spacing.contentBottom }}
        renderItem={({ item }) => {
          const accent = moodAccent[item.id] ?? colors.brass;
          return (
            <Pressable
              onPress={() => router.push(`/(tabs)/mood/${item.id}`)}
              style={({ pressed }) => [
                styles.tile,
                {
                  backgroundColor: pressed
                    ? colors.surfaceHover
                    : `${accent}18`,
                  borderColor: `${accent}55`,
                },
              ]}
            >
              <View style={[styles.dot, { backgroundColor: accent }]} />
              <Text variant="title" style={{ fontSize: 15, marginTop: spacing.sm }}>
                {lang === "hi" ? item.labelHi : item.label}
              </Text>
            </Pressable>
          );
        }}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  tile: {
    flex: 1,
    minHeight: 96,
    borderRadius: radii.lg,
    borderWidth: StyleSheet.hairlineWidth * 2,
    padding: spacing.md,
    justifyContent: "flex-end",
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    opacity: 0.9,
  },
});

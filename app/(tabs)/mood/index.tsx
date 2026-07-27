import React from "react";
import { FlatList, Pressable, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import { Screen } from "@/components/Screen";
import { Text } from "@/components/Text";
import { moods } from "@/data/moods";
import { useLanguage } from "@/context/LanguageContext";
import { useTheme } from "@/context/ThemeContext";
import { radii, spacing } from "@/theme/tokens";

export default function MoodScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const { lang } = useLanguage();

  return (
    <Screen>
      <Text variant="display" style={{ marginTop: spacing.md }}>
        {lang === "hi" ? "मनोदशा" : "Mood"}
      </Text>
      <Text variant="soft" style={{ marginTop: spacing.sm, marginBottom: spacing.md }}>
        {lang === "hi"
          ? "आज कैसा अनुभव है — उसके लिए श्लोक।"
          : "Choose how you feel. We’ll meet you with verses."}
      </Text>
      <FlatList
        data={moods}
        keyExtractor={(m) => m.id}
        numColumns={2}
        columnWrapperStyle={{ gap: spacing.sm }}
        contentContainerStyle={{ gap: spacing.sm, paddingBottom: 120 }}
        renderItem={({ item }) => (
          <Pressable
            onPress={() => router.push(`/(tabs)/mood/${item.id}`)}
            style={({ pressed }) => [
              styles.tile,
              {
                backgroundColor: pressed ? colors.surfaceHover : colors.surface,
                borderColor: colors.line,
              },
            ]}
          >
            <Text variant="title" style={{ fontSize: 16 }}>
              {lang === "hi" ? item.labelHi : item.label}
            </Text>
          </Pressable>
        )}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  tile: {
    flex: 1,
    minHeight: 88,
    borderRadius: radii.md,
    borderWidth: StyleSheet.hairlineWidth * 2,
    padding: spacing.md,
    justifyContent: "center",
  },
});

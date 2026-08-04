import React, { useState } from "react";
import { FlatList, Pressable, StyleSheet, View } from "react-native";
import { useRouter } from "expo-router";
import { Screen } from "@/components/Screen";
import { Text } from "@/components/Text";
import { moods } from "@/data/moods";
import { useLanguage } from "@/context/LanguageContext";
import { useTheme } from "@/context/ThemeContext";
import { radii, spacing } from "@/theme/tokens";

const moodSymbols: Record<string, string> = {
  anxious: "◉",
  sad: "◒",
  angry: "△",
  confused: "◇",
  grieving: "◐",
  lonely: "○",
  overwhelmed: "≋",
  guilty: "⌁",
  jealous: "◈",
  unmotivated: "⌛",
  fearful: "✦",
  hopeful: "☼",
  grateful: "❋",
  "big-decision": "⇄",
  conflict: "⚖",
  failure: "↘",
  purpose: "⌖",
  happy: "✺",
};

export default function MoodScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const { lang } = useLanguage();
  const [selectedId, setSelectedId] = useState<string | null>(null);

  return (
    <Screen testID="screen-mood" atmosphere="soft">
      <View style={styles.heading}>
        <Text variant="display" style={styles.title}>
          {lang === "hi" ? "आप कैसा महसूस कर रहे हैं?" : "How are you feeling?"}
        </Text>
        <Text variant="soft" style={styles.subtitle}>
          {lang === "hi"
            ? "जहाँ आप हैं, वहीं मिलने वाले श्लोक।"
            : "Verses that meet you where you are."}
        </Text>
      </View>
      <FlatList
        data={moods}
        keyExtractor={(m) => m.id}
        numColumns={2}
        columnWrapperStyle={styles.row}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        renderItem={({ item }) => {
          const selected = selectedId === item.id;
          return (
            <Pressable
              testID={`mood-${item.id}`}
              accessibilityRole="button"
              accessibilityState={{ selected }}
              onPress={() => {
                setSelectedId(item.id);
                requestAnimationFrame(() =>
                  router.push(`/(tabs)/mood/${item.id}`)
                );
              }}
              style={({ pressed }) => [
                styles.tile,
                {
                  backgroundColor:
                    selected || pressed ? colors.panelStrong : colors.panel,
                  borderColor: selected ? colors.brass : colors.line,
                  transform: [{ scale: pressed ? 0.98 : 1 }],
                },
              ]}
            >
              <Text style={[styles.symbol, { color: colors.brassSoft }]}>
                {moodSymbols[item.id] ?? "✦"}
              </Text>
              <Text variant="body" style={styles.label}>
                {item.label}
              </Text>
              <Text variant="sanskrit" style={[styles.hindi, { color: colors.textSoft }]}>
                {item.labelHi}
              </Text>
            </Pressable>
          );
        }}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  heading: {
    alignItems: "center",
    paddingTop: spacing.lg,
    paddingBottom: spacing.xl,
  },
  title: {
    textAlign: "center",
    fontFamily: "Fraunces_500Medium",
    fontSize: 30,
    lineHeight: 38,
  },
  subtitle: {
    marginTop: spacing.sm,
    textAlign: "center",
    fontFamily: "Fraunces_500Medium",
    fontStyle: "italic",
  },
  list: {
    gap: spacing.md,
    paddingBottom: spacing.contentBottom,
  },
  row: {
    gap: spacing.md,
  },
  tile: {
    flex: 1,
    minHeight: 132,
    borderRadius: radii.lg,
    borderWidth: StyleSheet.hairlineWidth * 2,
    padding: spacing.lg,
    alignItems: "center",
    justifyContent: "center",
  },
  symbol: {
    fontFamily: "Fraunces_500Medium",
    fontSize: 28,
    lineHeight: 34,
  },
  label: {
    marginTop: spacing.sm,
    textAlign: "center",
    fontFamily: "Sora_600SemiBold",
    fontSize: 15,
    lineHeight: 20,
  },
  hindi: {
    marginTop: 2,
    textAlign: "center",
    fontSize: 14,
    lineHeight: 22,
  },
});

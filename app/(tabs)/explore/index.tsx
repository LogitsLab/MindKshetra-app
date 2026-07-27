import React, { useMemo, useState } from "react";
import {
  FlatList,
  Pressable,
  StyleSheet,
  TextInput,
  View,
} from "react-native";
import { useRouter } from "expo-router";
import { Screen } from "@/components/Screen";
import { Text } from "@/components/Text";
import { getChapterMetas } from "@/data/chapters";
import { useLanguage } from "@/context/LanguageContext";
import { useTheme } from "@/context/ThemeContext";
import { radii, spacing } from "@/theme/tokens";

export default function ExploreScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const { lang } = useLanguage();
  const [q, setQ] = useState("");
  const chapters = useMemo(() => {
    const all = getChapterMetas();
    if (!q.trim()) return all;
    const needle = q.trim().toLowerCase();
    return all.filter(
      (c) =>
        c.name.toLowerCase().includes(needle) ||
        c.name_sanskrit.includes(q) ||
        String(c.number).includes(needle)
    );
  }, [q]);

  return (
    <Screen>
      <Text variant="display" style={{ marginTop: spacing.md }}>
        {lang === "hi" ? "अन्वेषण" : "Explore"}
      </Text>
      <TextInput
        value={q}
        onChangeText={setQ}
        placeholder={lang === "hi" ? "अध्याय खोजें" : "Search chapters"}
        placeholderTextColor={colors.textMuted}
        style={[
          styles.search,
          {
            backgroundColor: colors.inputBg,
            borderColor: colors.line,
            color: colors.text,
          },
        ]}
      />
      <FlatList
        data={chapters}
        keyExtractor={(c) => String(c.number)}
        contentContainerStyle={{ paddingBottom: 120 }}
        renderItem={({ item }) => (
          <Pressable
            onPress={() => router.push(`/(tabs)/explore/${item.number}`)}
            style={({ pressed }) => [
              styles.row,
              {
                backgroundColor: pressed ? colors.surfaceHover : colors.surface,
                borderColor: colors.hairline,
              },
            ]}
          >
            <View style={[styles.num, { borderColor: colors.line }]}>
              <Text color={colors.brassSoft} style={{ fontFamily: "Sora_600SemiBold" }}>
                {item.number}
              </Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text variant="title" style={{ fontSize: 18 }}>
                {item.name}
              </Text>
              <Text variant="muted" style={{ marginTop: 2 }}>
                {item.name_sanskrit} · {item.verses_count} verses
              </Text>
            </View>
          </Pressable>
        )}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  search: {
    marginTop: spacing.md,
    marginBottom: spacing.md,
    borderWidth: StyleSheet.hairlineWidth * 2,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
    fontFamily: "Sora_400Regular",
    fontSize: 16,
  },
  row: {
    flexDirection: "row",
    gap: spacing.md,
    alignItems: "center",
    padding: spacing.md,
    borderRadius: radii.md,
    borderWidth: StyleSheet.hairlineWidth * 2,
    marginBottom: spacing.sm,
  },
  num: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: StyleSheet.hairlineWidth * 2,
    alignItems: "center",
    justifyContent: "center",
  },
});

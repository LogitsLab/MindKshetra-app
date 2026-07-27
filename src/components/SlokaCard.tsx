import React from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { useRouter } from "expo-router";
import { Text } from "@/components/Text";
import { useTheme } from "@/context/ThemeContext";
import { radii, spacing } from "@/theme/tokens";
import type { Sloka } from "@/types";

export function SlokaCard({
  sloka,
  lang = "en",
}: {
  sloka: Sloka;
  lang?: "en" | "hi";
}) {
  const router = useRouter();
  const { colors } = useTheme();
  const translation =
    lang === "hi" ? sloka.hindi_translation : sloka.english_translation;

  return (
    <Pressable
      onPress={() => router.push(`/sloka/${sloka.id}`)}
      style={({ pressed }) => [
        styles.card,
        {
          backgroundColor: colors.surface,
          borderColor: colors.line,
          opacity: pressed ? 0.85 : 1,
        },
      ]}
    >
      <Text variant="eyebrow">
        {sloka.chapter}.{sloka.verse_number}
      </Text>
      <Text variant="sanskrit" style={{ marginTop: spacing.sm, fontSize: 18 }}>
        {sloka.sanskrit_devanagari}
      </Text>
      <Text variant="soft" numberOfLines={3} style={{ marginTop: spacing.sm }}>
        {translation}
      </Text>
    </Pressable>
  );
}

export function EmptyState({
  title,
  body,
}: {
  title: string;
  body: string;
}) {
  const { colors } = useTheme();
  return (
    <View style={[styles.empty, { borderColor: colors.hairline }]}>
      <Text variant="title" style={{ textAlign: "center" }}>
        {title}
      </Text>
      <Text variant="soft" style={{ textAlign: "center", marginTop: spacing.sm }}>
        {body}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: StyleSheet.hairlineWidth * 2,
    borderRadius: radii.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  empty: {
    borderWidth: StyleSheet.hairlineWidth * 2,
    borderRadius: radii.lg,
    padding: spacing.xl,
    marginTop: spacing.xl,
  },
});

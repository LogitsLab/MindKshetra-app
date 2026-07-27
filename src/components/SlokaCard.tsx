import React from "react";
import {
  Pressable,
  StyleSheet,
  View,
  Image,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import { useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { Text } from "@/components/Text";
import { Panel } from "@/components/Panel";
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
          backgroundColor: pressed ? colors.surfaceHover : colors.surface,
          borderColor: colors.hairline,
        },
      ]}
    >
      <Text variant="eyebrow" color={colors.brassSoft}>
        {sloka.chapter}.{sloka.verse_number}
      </Text>
      <Text
        variant="sanskrit"
        style={{ marginTop: spacing.sm, fontSize: 17, lineHeight: 28 }}
      >
        {sloka.sanskrit_devanagari}
      </Text>
      <Text variant="soft" numberOfLines={2} style={{ marginTop: spacing.sm }}>
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
    <Panel style={{ marginTop: spacing.xl, alignItems: "center" }}>
      <View style={[styles.ornament, { borderColor: colors.line }]}>
        <Text
          color={colors.brassSoft}
          style={{ fontFamily: "Fraunces_600SemiBold", fontSize: 20 }}
        >
          ◈
        </Text>
      </View>
      <Text
        variant="title"
        style={{ textAlign: "center", marginTop: spacing.md }}
      >
        {title}
      </Text>
      <Text
        variant="soft"
        style={{ textAlign: "center", marginTop: spacing.sm }}
      >
        {body}
      </Text>
    </Panel>
  );
}

export function PathTile({
  title,
  body,
  image,
  index,
  onPress,
  style,
}: {
  title: string;
  body: string;
  image: number;
  index: string;
  onPress: () => void;
  style?: StyleProp<ViewStyle>;
}) {
  const { colors } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.path,
        style,
        { opacity: pressed ? 0.92 : 1, borderColor: colors.line },
      ]}
    >
      <Image
        source={image}
        style={StyleSheet.absoluteFillObject}
        resizeMode="cover"
      />
      {/* Heavy uniform scrim so bright tiles (Madhav) match quiet ones */}
      <View style={styles.pathScrim} />
      <LinearGradient
        colors={[
          "rgba(7,9,15,0.2)",
          "rgba(7,9,15,0.55)",
          "rgba(7,9,15,0.94)",
        ]}
        locations={[0, 0.45, 1]}
        style={StyleSheet.absoluteFillObject}
      />
      <View style={styles.pathFooter}>
        <Text variant="eyebrow" color={colors.brassSoft} numberOfLines={1}>
          {index}
        </Text>
        <Text
          variant="title"
          color={colors.onMedia}
          numberOfLines={1}
          style={styles.pathTitle}
        >
          {title}
        </Text>
        <Text
          variant="soft"
          color={colors.onMediaMuted}
          numberOfLines={1}
          style={styles.pathBody}
        >
          {body}
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: StyleSheet.hairlineWidth * 2,
    borderRadius: radii.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  ornament: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: StyleSheet.hairlineWidth * 2,
    alignItems: "center",
    justifyContent: "center",
  },
  path: {
    flex: 1,
    aspectRatio: 1,
    borderRadius: radii.lg,
    overflow: "hidden",
    borderWidth: StyleSheet.hairlineWidth * 2,
    justifyContent: "flex-end",
  },
  pathScrim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(7,9,15,0.35)",
  },
  pathFooter: {
    padding: spacing.sm + 4,
    minHeight: 72,
    justifyContent: "flex-end",
  },
  pathTitle: {
    marginTop: 4,
    fontSize: 17,
    lineHeight: 22,
  },
  pathBody: {
    marginTop: 2,
    fontSize: 12,
    lineHeight: 16,
  },
});

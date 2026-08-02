import React from "react";
import {
  Pressable,
  StyleSheet,
  View,
  Image,
  type StyleProp,
  type ViewStyle,
  type ImageSourcePropType,
} from "react-native";
import { useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import Svg, { Circle, Path, Rect } from "react-native-svg";
import { Text } from "@/components/Text";
import { Panel } from "@/components/Panel";
import { useTheme } from "@/context/ThemeContext";
import { images } from "@/theme/assets";
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

function ExplorePathMark({ size = 36 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 64 64" fill="none">
      <Rect
        x="10"
        y="10"
        width="44"
        height="44"
        stroke="#c9a227"
        strokeWidth="1.25"
        opacity={0.55}
      />
      <Path
        d="M20 44V20h16l8 8v16H20z"
        stroke="#e2c45a"
        strokeWidth="1.25"
      />
      <Path d="M36 20v8h8" stroke="#e2c45a" strokeWidth="1.25" />
      <Circle cx="32" cy="36" r="5" stroke="#c9a227" strokeWidth="1" />
    </Svg>
  );
}

function MoodPathMark({ size = 36 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 64 64" fill="none">
      <Circle
        cx="32"
        cy="32"
        r="18"
        stroke="#c9a227"
        strokeWidth="1.25"
        opacity={0.7}
      />
      <Path
        d="M24 30c0-1.5 1.2-2.5 2.5-2.5S29 28.5 29 30"
        stroke="#e2c45a"
        strokeWidth="1.25"
        strokeLinecap="round"
      />
      <Path
        d="M35 30c0-1.5 1.2-2.5 2.5-2.5S40 28.5 40 30"
        stroke="#e2c45a"
        strokeWidth="1.25"
        strokeLinecap="round"
      />
      <Path
        d="M24 38c2.5 3 5.5 4.5 8 4.5s5.5-1.5 8-4.5"
        stroke="#c9a227"
        strokeWidth="1.25"
        strokeLinecap="round"
      />
    </Svg>
  );
}

function MeditationPathMark({ size = 36 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 64 64" fill="none">
      <Circle
        cx="32"
        cy="34"
        r="16"
        stroke="#c9a227"
        strokeWidth="1.25"
        opacity={0.55}
      />
      <Path
        d="M32 22c0 8-6 12-6 18a6 6 0 0 0 12 0c0-6-6-10-6-18z"
        stroke="#e2c45a"
        strokeWidth="1.25"
      />
      <Path
        d="M20 48h24"
        stroke="#c9a227"
        strokeWidth="1.1"
        opacity={0.7}
      />
      <Circle cx="32" cy="14" r="2" fill="#e2c45a" />
    </Svg>
  );
}

export type PathMarkKind =
  | "explore"
  | "mood"
  | "madhav"
  | "astrology"
  | "meditation"
  | "paths";

/**
 * Path card for the home 2×2 grid. Landscape web photos use cover;
 * keep tiles near-square so the scene stays recognizable.
 */
export function PathTile({
  title,
  body,
  image,
  index,
  onPress,
  mark = "explore",
  style,
}: {
  title: string;
  body: string;
  image: ImageSourcePropType;
  index: string;
  onPress: () => void;
  mark?: PathMarkKind;
  style?: StyleProp<ViewStyle>;
}) {
  const { colors } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.path,
        style,
        { opacity: pressed ? 0.94 : 1, borderColor: colors.line },
      ]}
    >
      <Image source={image} style={styles.pathImage} resizeMode="cover" />
      <LinearGradient
        colors={[
          "rgba(7,9,15,0.1)",
          "rgba(7,9,15,0.35)",
          "rgba(7,9,15,0.9)",
        ]}
        locations={[0, 0.45, 1]}
        style={StyleSheet.absoluteFillObject}
      />
      <View style={styles.pathFooter}>
        <View style={styles.pathMark}>
          {mark === "madhav" ? (
            <Image
              source={images.madhavMark}
              style={styles.madhavMark}
              resizeMode="cover"
            />
          ) : mark === "mood" ? (
            <MoodPathMark size={28} />
          ) : mark === "meditation" ? (
            <MeditationPathMark size={28} />
          ) : (
            <ExplorePathMark size={28} />
          )}
        </View>
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
    aspectRatio: 0.92,
    borderRadius: radii.lg,
    overflow: "hidden",
    borderWidth: StyleSheet.hairlineWidth * 2,
    justifyContent: "flex-end",
    backgroundColor: "#0e1420",
  },
  pathImage: {
    ...StyleSheet.absoluteFillObject,
    width: "100%",
    height: "100%",
    opacity: 0.8,
  },
  pathFooter: {
    padding: spacing.sm + 4,
    justifyContent: "flex-end",
  },
  pathMark: {
    marginBottom: 4,
  },
  madhavMark: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth * 2,
    borderColor: "rgba(201, 162, 39, 0.5)",
  },
  pathTitle: {
    marginTop: 2,
    fontSize: 17,
    lineHeight: 22,
  },
  pathBody: {
    marginTop: 2,
    fontSize: 12,
    lineHeight: 16,
  },
});

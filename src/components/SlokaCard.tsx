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
import { CoverImage, type CoverImageFocus } from "@/components/CoverImage";
import { Text } from "@/components/Text";
import { Panel } from "@/components/Panel";
import { useTheme } from "@/context/ThemeContext";
import { images } from "@/theme/assets";
import { radii, spacing } from "@/theme/tokens";
import type { Sloka } from "@/types";
import { truncateAtWord } from "@/utils/text";

export function SlokaCard({
  sloka,
  lang = "en",
  completed = false,
}: {
  sloka: Sloka;
  lang?: "en" | "hi";
  /** Show a completed checkmark when this verse is marked done. */
  completed?: boolean;
}) {
  const router = useRouter();
  const { colors } = useTheme();
  const translation =
    lang === "hi" ? sloka.hindi_translation : sloka.english_translation;

  return (
    <Pressable
      testID="verse-card"
      onPress={() => router.push(`/sloka/${sloka.id}`)}
      style={({ pressed }) => [
        styles.card,
        {
          backgroundColor: pressed ? colors.surfaceHover : colors.surface,
          borderColor: completed ? colors.brass : colors.hairline,
        },
      ]}
    >
      <View
        style={{
          flexDirection: "row",
          alignItems: "baseline",
          justifyContent: "space-between",
          gap: spacing.sm,
        }}
      >
        <Text variant="eyebrow" color={colors.brassSoft}>
          {sloka.chapter}.{sloka.verse_number}
        </Text>
        {completed ? (
          <Text
            variant="eyebrow"
            color={colors.brass}
            accessibilityLabel={lang === "hi" ? "पूर्ण" : "Complete"}
          >
            ✓
          </Text>
        ) : null}
      </View>
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
 * Path card for Home. Default near-square grid tile; `layout="wide"` is the
 * UI 2.0 / Stitch full-bleed cinematic row (title + chevron).
 */
export function PathTile({
  title,
  body,
  image,
  imageFocus = "center",
  index,
  onPress,
  mark = "explore",
  layout = "tile",
  style,
}: {
  title: string;
  body: string;
  image: ImageSourcePropType;
  imageFocus?: CoverImageFocus;
  index: string;
  onPress: () => void;
  mark?: PathMarkKind;
  layout?: "tile" | "wide";
  style?: StyleProp<ViewStyle>;
}) {
  const { colors } = useTheme();
  const wide = layout === "wide";
  const bodyLine = body ? truncateAtWord(body, wide ? 72 : 48) : "";
  return (
    <Pressable
      testID={`home-path-${mark}`}
      onPress={onPress}
      style={({ pressed }) => [
        wide ? styles.pathWide : styles.path,
        style,
        {
          opacity: pressed ? 0.94 : 1,
          borderColor: colors.line,
          transform: [{ scale: pressed ? 0.975 : 1 }],
        },
      ]}
    >
      <CoverImage source={image} opacity={0.85} focus={imageFocus} />
      <LinearGradient
        colors={
          wide
            ? [
                "rgba(7,9,15,0.55)",
                "rgba(7,9,15,0.35)",
                "rgba(7,9,15,0.72)",
              ]
            : [
                "rgba(7,9,15,0.1)",
                "rgba(7,9,15,0.35)",
                "rgba(7,9,15,0.88)",
              ]
        }
        locations={wide ? [0, 0.5, 1] : [0, 0.45, 1]}
        start={wide ? { x: 0, y: 0.5 } : { x: 0.5, y: 0 }}
        end={wide ? { x: 1, y: 0.5 } : { x: 0.5, y: 1 }}
        style={StyleSheet.absoluteFillObject}
      />
      {wide ? (
        <View style={styles.pathWideRow}>
          <View style={{ flex: 1 }}>
            <Text
              variant="title"
              color={colors.onMedia}
              numberOfLines={1}
              ellipsizeMode="tail"
              style={styles.pathWideTitle}
            >
              {title}
            </Text>
            {bodyLine ? (
              <Text
                variant="soft"
                color={colors.onMediaMuted}
                numberOfLines={2}
                ellipsizeMode="tail"
                style={{ marginTop: 2 }}
              >
                {bodyLine}
              </Text>
            ) : null}
          </View>
          <Text
            color={colors.brassSoft}
            style={{ fontFamily: "Sora_600SemiBold", fontSize: 22 }}
          >
            ›
          </Text>
        </View>
      ) : (
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
            numberOfLines={2}
            ellipsizeMode="tail"
            style={styles.pathTitle}
          >
            {title}
          </Text>
          <Text
            variant="soft"
            color={colors.onMediaMuted}
            numberOfLines={2}
            ellipsizeMode="tail"
            style={styles.pathBody}
          >
            {bodyLine}
          </Text>
        </View>
      )}
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
    aspectRatio: 0.82,
    borderRadius: radii.lg,
    overflow: "hidden",
    borderWidth: StyleSheet.hairlineWidth * 2,
    justifyContent: "flex-end",
    backgroundColor: "#0e1420",
    position: "relative",
  },
  pathWide: {
    width: "100%",
    minHeight: 92,
    borderRadius: radii.lg,
    overflow: "hidden",
    borderWidth: StyleSheet.hairlineWidth * 2,
    justifyContent: "center",
    backgroundColor: "#0e1420",
    marginBottom: spacing.sm,
    position: "relative",
  },
  pathWideRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    gap: spacing.md,
    zIndex: 1,
  },
  pathWideTitle: {
    fontSize: 22,
    lineHeight: 28,
  },
  pathFooter: {
    padding: spacing.sm + 4,
    justifyContent: "flex-end",
    zIndex: 1,
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
    fontSize: 16,
    lineHeight: 20,
  },
  pathBody: {
    marginTop: 3,
    fontSize: 12,
    lineHeight: 16,
  },
});

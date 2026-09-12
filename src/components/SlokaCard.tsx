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
import Svg, { Circle, Path } from "react-native-svg";
import { CoverImage, type CoverImageFocus } from "@/components/CoverImage";
import { Text } from "@/components/Text";
import { Button } from "@/components/Button";
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
  actionLabel,
  onAction,
}: {
  title: string;
  body: string;
  actionLabel?: string;
  onAction?: () => void;
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
      {onAction && actionLabel ? (
        <View style={{ marginTop: spacing.md, alignSelf: "stretch" }}>
          <Button label={actionLabel} variant="ghost" onPress={onAction} />
        </View>
      ) : null}
    </Panel>
  );
}

/** Explore — an open book (the scripture you browse), not a file/folder. */
function ExplorePathMark({ size = 36 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 64 64" fill="none">
      <Circle cx="32" cy="32" r="20" stroke="#c9a227" strokeWidth="1.1" opacity={0.5} />
      <Path
        d="M32 24c-3-2.5-7-3.6-11-3.6V42c4 0 8 1.1 11 3.6"
        stroke="#e2c45a"
        strokeWidth="1.3"
        strokeLinejoin="round"
      />
      <Path
        d="M32 24c3-2.5 7-3.6 11-3.6V42c-4 0-8 1.1-11 3.6"
        stroke="#e2c45a"
        strokeWidth="1.3"
        strokeLinejoin="round"
      />
      <Path d="M32 24v21.6" stroke="#c9a227" strokeWidth="1.1" />
    </Svg>
  );
}

/** Astrology — a four-point star with attendant stars inside a faint zodiac ring. */
function AstrologyPathMark({ size = 36 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 64 64" fill="none">
      <Circle cx="32" cy="32" r="20" stroke="#c9a227" strokeWidth="1.1" opacity={0.5} />
      <Path
        d="M32 18 L35 29 L46 32 L35 35 L32 46 L29 35 L18 32 L29 29 Z"
        stroke="#e2c45a"
        strokeWidth="1.25"
        strokeLinejoin="round"
      />
      <Circle cx="45" cy="20" r="1.5" fill="#e2c45a" />
      <Circle cx="20" cy="44" r="1.3" fill="#c9a227" />
    </Svg>
  );
}

/** Themed paths — a dashed winding trail from a start dot to a destination ring. */
function PathsPathMark({ size = 36 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 64 64" fill="none">
      <Circle cx="32" cy="32" r="20" stroke="#c9a227" strokeWidth="1.1" opacity={0.5} />
      <Path
        d="M26 47 C26 39 40 39 40 31 C40 23 26 23 26 15"
        stroke="#e2c45a"
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeDasharray="1.5 5"
      />
      <Circle cx="26" cy="47" r="2" fill="#c9a227" />
      <Circle cx="26" cy="15" r="3.2" stroke="#e2c45a" strokeWidth="1.3" />
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

export function PathMark({
  kind,
  size = 28,
}: {
  kind: PathMarkKind;
  size?: number;
}) {
  if (kind === "madhav") {
    return (
      <Image
        source={images.madhavMark}
        style={{
          width: size,
          height: size,
          borderRadius: size / 2,
          borderWidth: StyleSheet.hairlineWidth * 2,
          borderColor: "rgba(201, 162, 39, 0.5)",
        }}
        resizeMode="cover"
      />
    );
  }
  if (kind === "mood") return <MoodPathMark size={size} />;
  if (kind === "meditation") return <MeditationPathMark size={size} />;
  if (kind === "astrology") return <AstrologyPathMark size={size} />;
  if (kind === "paths") return <PathsPathMark size={size} />;
  return <ExplorePathMark size={size} />;
}

/**
 * Path card for Path tab / grids. Default near-square tile; `layout="wide"` is
 * the UI 2.0 / Stitch full-bleed cinematic row (title + chevron).
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
        style={StyleSheet.absoluteFill}
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
            <PathMark kind={mark} size={28} />
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

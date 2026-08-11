import React from "react";
import {
  Pressable,
  StyleSheet,
  View,
  type ImageSourcePropType,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { CoverImage, type CoverImageFocus } from "@/components/CoverImage";
import { Text } from "@/components/Text";
import { useTheme } from "@/context/ThemeContext";
import type { LeelaStory } from "@/data/leelas";
import { resolveStoryArtworkFocus } from "@/theme/leelaSceneFocus";
import { radii, spacing } from "@/theme/tokens";

type Props = {
  story: LeelaStory;
  image: ImageSourcePropType;
  onPress: () => void;
  cta?: string;
  /** Defaults to padded `story.order` (01, 02…). */
  indexLabel?: string;
  featured?: boolean;
  /** Override scene-plan focus when needed. */
  imageFocus?: CoverImageFocus;
};

function padIndex(order: number): string {
  return String(order).padStart(2, "0");
}

/**
 * Image-led story tile for Krishna Leela Hub / Chapter lists.
 * Media + body share one solid surface so no seam appears between art and text.
 */
export function LeelaStoryCard({
  story,
  image,
  onPress,
  cta = "Read Leela",
  indexLabel,
  featured = false,
  imageFocus,
}: Props) {
  const { colors } = useTheme();
  const index = indexLabel ?? padIndex(story.order);
  const focus = imageFocus ?? resolveStoryArtworkFocus(story);

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${cta} ${story.title}`}
      style={({ pressed }) => [
        styles.card,
        {
          borderColor: colors.line,
          backgroundColor: colors.field,
          opacity: pressed ? 0.94 : 1,
          transform: [{ scale: pressed ? 0.985 : 1 }],
        },
      ]}
    >
      <View style={[styles.media, featured && styles.mediaFeatured]}>
        <CoverImage source={image} opacity={0.92} focus={focus} />
        <LinearGradient
          colors={[
            "rgba(7,9,15,0.08)",
            "rgba(7,9,15,0.42)",
            "rgba(14,20,32,0.97)",
          ]}
          locations={[0, 0.5, 1]}
          style={StyleSheet.absoluteFillObject}
        />
        <View style={styles.mediaCopy}>
          <Text variant="eyebrow" color={colors.brassSoft}>
            {index}
          </Text>
          <Text
            variant="title"
            color={colors.onMedia}
            style={styles.mediaTitle}
            numberOfLines={3}
          >
            {story.title}
          </Text>
        </View>
      </View>
      <View style={[styles.body, { backgroundColor: colors.field }]}>
        <Text
          variant="soft"
          color={colors.textSoft}
          numberOfLines={3}
          style={styles.teaser}
        >
          {story.teaser}
        </Text>
        <View style={styles.footer}>
          <Text variant="muted" color={colors.textMuted} style={styles.time}>
            {story.readingTimeMinutes} min read
          </Text>
          <Text variant="body" color={colors.brassSoft} style={styles.cta}>
            {cta} →
          </Text>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    alignSelf: "stretch",
    borderRadius: radii.lg,
    overflow: "hidden",
    borderWidth: StyleSheet.hairlineWidth * 2,
  },
  media: {
    alignSelf: "stretch",
    // Near dedicated scene AR (~1.12) so cover crop is gentler than 16:10.
    aspectRatio: 5 / 4,
    backgroundColor: "#0e1420",
    justifyContent: "flex-end",
    overflow: "hidden",
  },
  mediaFeatured: {
    aspectRatio: 4 / 3,
  },
  mediaCopy: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.md,
    paddingTop: spacing.lg,
    zIndex: 1,
    alignSelf: "stretch",
  },
  mediaTitle: {
    marginTop: spacing.xs,
    fontSize: 20,
    lineHeight: 26,
  },
  body: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm + 4,
    paddingBottom: spacing.md,
    alignSelf: "stretch",
    marginTop: -1,
  },
  teaser: {
    flexShrink: 1,
  },
  footer: {
    marginTop: spacing.md,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.sm,
  },
  time: {
    flexShrink: 1,
  },
  cta: {
    fontFamily: "Sora_600SemiBold",
    flexShrink: 0,
  },
});

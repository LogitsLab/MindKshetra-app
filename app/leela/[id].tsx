/**
 * `/leela/[id]` — chapter screen or story reader via `resolveLeelaRoute`.
 */
import React, { useMemo } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Screen } from "@/components/Screen";
import { ScreenHeader } from "@/components/ScreenHeader";
import { CoverImage } from "@/components/CoverImage";
import { Text } from "@/components/Text";
import { Button } from "@/components/Button";
import { Rise } from "@/components/Rise";
import { LeelaStoryCard } from "@/components/leela/LeelaStoryCard";
import { LeelaStoryReader } from "@/components/leela/LeelaStoryReader";
import {
  getLeelaStoriesByChapterId,
  resolveLeelaRoute,
  type LeelaChapter,
  type LeelaStory,
} from "@/data/leelas";
import { useTheme } from "@/context/ThemeContext";
import { resolveChapterArtwork, resolveStoryArtwork } from "@/theme/leelaArt";
import { resolveChapterArtworkFocus } from "@/theme/leelaSceneFocus";
import { motion, radii, spacing } from "@/theme/tokens";

function paramId(raw: string | string[] | undefined): string {
  if (typeof raw === "string") return raw;
  if (Array.isArray(raw)) return raw[0] ?? "";
  return "";
}

function chapterIndexLabel(order: number): string {
  return String(order).padStart(2, "0");
}

function storyCountLabel(count: number): string {
  if (count === 0) return "Stories coming soon";
  if (count === 1) return "1 story";
  return `${count} stories`;
}

export default function LeelaIdScreen() {
  const { id: rawId } = useLocalSearchParams<{ id: string }>();
  const id = paramId(rawId);
  const target = useMemo(() => resolveLeelaRoute(id), [id]);

  if (target.kind === "chapter") {
    return <LeelaChapterScreen chapter={target.chapter} />;
  }

  if (target.kind === "story") {
    return <LeelaStoryReader story={target.story} />;
  }

  return <LeelaMissingScreen />;
}

function LeelaMissingScreen() {
  const router = useRouter();
  const { colors } = useTheme();

  return (
    <Screen atmosphere="soft" padded>
      <ScreenHeader showBack backFallback="/leela" />
      <Rise style={styles.missing}>
        <Text variant="title">Leela not found</Text>
        <Text
          variant="soft"
          color={colors.textSoft}
          style={{ marginTop: spacing.sm }}
        >
          This path is not in the catalog. Return to Krishna Leela and choose
          another chapter or story.
        </Text>
        <View style={{ marginTop: spacing.lg, alignSelf: "flex-start" }}>
          <Button
            label="Return to Krishna Leela"
            onPress={() => router.replace("/leela")}
          />
        </View>
      </Rise>
    </Screen>
  );
}

function LeelaChapterScreen({ chapter }: { chapter: LeelaChapter }) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const stories = useMemo(
    () => getLeelaStoriesByChapterId(chapter.id),
    [chapter.id]
  );
  const bottomPad = spacing.contentBottom + Math.max(insets.bottom, 0);
  const art = resolveChapterArtwork(chapter.id, chapter.artwork);

  const openStory = (story: LeelaStory) => {
    router.push(`/leela/${story.id}`);
  };

  return (
    <Screen atmosphere="soft" padded>
      <ScreenHeader showBack backFallback="/leela" />
      <ScrollView
        contentContainerStyle={{ paddingBottom: bottomPad }}
        showsVerticalScrollIndicator={false}
      >
        <Rise>
          <View
            style={[styles.hero, { borderColor: colors.line }]}
            accessibilityRole="image"
            accessibilityLabel={`${chapter.title} chapter artwork`}
          >
            <CoverImage
              source={art}
              opacity={0.9}
              focus={resolveChapterArtworkFocus(chapter.id)}
            />
            <LinearGradient
              colors={[
                "rgba(7,9,15,0.2)",
                "rgba(7,9,15,0.5)",
                "rgba(7,9,15,0.94)",
              ]}
              locations={[0, 0.4, 1]}
              style={StyleSheet.absoluteFillObject}
            />
            <View style={styles.heroCopy}>
              <Text variant="eyebrow" color={colors.brassSoft}>
                {chapterIndexLabel(chapter.order)}
              </Text>
              <Text
                variant="display"
                color={colors.onMedia}
                style={styles.heroTitle}
              >
                {chapter.title}
              </Text>
              <Text
                variant="soft"
                color={colors.onMediaMuted}
                style={styles.heroSubtitle}
              >
                {chapter.subtitle}
              </Text>
              <Text
                variant="muted"
                color={colors.brassSoft}
                style={styles.heroLocation}
              >
                {chapter.location}
              </Text>
            </View>
          </View>
        </Rise>

        <Rise delay={motion.staggerMs} style={styles.section}>
          <Text variant="soft" color={colors.textSoft} style={styles.intro}>
            {chapter.introduction}
          </Text>
          <Text
            variant="muted"
            color={colors.textMuted}
            style={{ marginTop: spacing.md }}
          >
            {storyCountLabel(stories.length)}
          </Text>
        </Rise>

        <Rise delay={motion.staggerMs * 2} style={styles.section}>
          <Text variant="eyebrow" color={colors.brassSoft}>
            The Leelas
          </Text>
          <Text
            variant="soft"
            color={colors.textSoft}
            style={styles.sectionBlurb}
          >
            Stories from this chapter
          </Text>

          {stories.length === 0 ? (
            <Text
              variant="soft"
              color={colors.textMuted}
              style={{ marginTop: spacing.md }}
            >
              Stories for this chapter will arrive soon. The path is open —
              content is still being prepared.
            </Text>
          ) : (
            <View style={styles.list}>
              {stories.map((story, i) => (
                <Rise key={story.id} delay={motion.staggerMs * (i % 4)}>
                  <LeelaStoryCard
                    story={story}
                    image={resolveStoryArtwork(story)}
                    onPress={() => openStory(story)}
                    cta="Read Leela"
                  />
                </Rise>
              ))}
            </View>
          )}
        </Rise>

        <Rise delay={motion.staggerMs} style={styles.closingWrap}>
          <View style={[styles.closing, { borderColor: colors.hairline }]}>
            <Text
              variant="soft"
              color={colors.textSoft}
              style={styles.closingText}
            >
              Enter a Leela when you are ready.{"\n"}
              Each story is a doorway into this chapter of His life.
            </Text>
          </View>
        </Rise>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  missing: {
    marginTop: spacing.md,
    alignSelf: "stretch",
  },
  hero: {
    alignSelf: "stretch",
    // Match dedicated scene stills (~1.12) more closely than 16:11.
    aspectRatio: 5 / 4,
    maxHeight: 280,
    borderRadius: radii.lg,
    overflow: "hidden",
    borderWidth: StyleSheet.hairlineWidth * 2,
    justifyContent: "flex-end",
    backgroundColor: "#0e1420",
  },
  heroCopy: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.md,
    paddingTop: spacing.xl,
    zIndex: 1,
    alignSelf: "stretch",
  },
  heroTitle: {
    marginTop: spacing.xs,
    fontSize: 30,
    lineHeight: 36,
    letterSpacing: -0.3,
  },
  heroSubtitle: {
    marginTop: spacing.sm,
  },
  heroLocation: {
    marginTop: spacing.sm,
  },
  section: {
    marginTop: spacing.lg,
    alignSelf: "stretch",
  },
  intro: {
    lineHeight: 22,
  },
  sectionBlurb: {
    marginTop: spacing.xs,
  },
  list: {
    marginTop: spacing.md,
    gap: spacing.md,
    alignSelf: "stretch",
  },
  closingWrap: {
    marginTop: spacing.xl,
    alignSelf: "stretch",
  },
  closing: {
    borderTopWidth: StyleSheet.hairlineWidth * 2,
    paddingTop: spacing.lg,
    paddingBottom: spacing.sm,
    alignSelf: "stretch",
  },
  closingText: {
    textAlign: "center",
    lineHeight: 24,
  },
});

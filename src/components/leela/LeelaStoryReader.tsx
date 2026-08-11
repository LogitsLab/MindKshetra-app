import React, { useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Screen } from "@/components/Screen";
import { ScreenHeader } from "@/components/ScreenHeader";
import { CoverImage } from "@/components/CoverImage";
import { Text } from "@/components/Text";
import { Rise } from "@/components/Rise";
import {
  getLeelaChapterById,
  getNextLeelaStory,
  getPreviousLeelaStory,
  splitLeelaParagraphs,
  type LeelaStory,
} from "@/data/leelas";
import { useTheme } from "@/context/ThemeContext";
import { resolveStoryArtwork } from "@/theme/leelaArt";
import { resolveStoryArtworkFocus } from "@/theme/leelaSceneFocus";
import { motion, radii, spacing } from "@/theme/tokens";

type Props = {
  story: LeelaStory;
};

/**
 * Long-form Krishna Leela story reader.
 * Content is entirely data-driven; room left for future "mark as read".
 */
export function LeelaStoryReader({ story }: Props) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const [sourceOpen, setSourceOpen] = useState(false);

  const chapter = useMemo(
    () => getLeelaChapterById(story.chapterId),
    [story.chapterId]
  );
  const paragraphs = useMemo(
    () => splitLeelaParagraphs(story.content),
    [story.content]
  );
  const previous = useMemo(
    () => getPreviousLeelaStory(story.id),
    [story.id]
  );
  const next = useMemo(() => getNextLeelaStory(story.id), [story.id]);

  const bottomPad = spacing.contentBottom + Math.max(insets.bottom, 0);
  const art = resolveStoryArtwork(story);
  const artFocus = resolveStoryArtworkFocus(story);

  const goStory = (id: string) => {
    router.push(`/leela/${id}`);
  };

  return (
    <Screen atmosphere="soft" padded>
      <ScreenHeader
        showBack
        backFallback={`/leela/${story.chapterId}`}
      />
      <ScrollView
        contentContainerStyle={{ paddingBottom: bottomPad }}
        showsVerticalScrollIndicator={false}
      >
        <Rise style={styles.headerBlock}>
          {chapter ? (
            <Text variant="eyebrow" color={colors.brassSoft}>
              {chapter.title}
            </Text>
          ) : null}
          <Text
            variant="display"
            accessibilityRole="header"
            style={styles.title}
          >
            {story.title}
          </Text>
          <Text
            variant="muted"
            color={colors.textMuted}
            style={styles.readingTime}
          >
            {story.readingTimeMinutes} min read
          </Text>
          <Text
            variant="soft"
            color={colors.textSoft}
            style={styles.teaser}
          >
            {story.teaser}
          </Text>
          {story.characters.length > 0 ? (
            <Text
              variant="muted"
              color={colors.textMuted}
              style={styles.characters}
            >
              {story.characters.join(" · ")}
            </Text>
          ) : null}
        </Rise>

        <Rise delay={motion.staggerMs * 0.5} style={styles.heroWrap}>
          <View
            style={[styles.hero, { borderColor: colors.line }]}
            accessibilityRole="image"
            accessibilityLabel={`${story.title} artwork`}
          >
            <CoverImage source={art} opacity={0.94} focus={artFocus} />
          </View>
        </Rise>

        <Rise delay={motion.staggerMs} style={styles.bodyBlock}>
          {paragraphs.map((paragraph, index) => (
            <Text
              key={`${story.id}-p-${index}`}
              variant="body"
              style={[
                styles.paragraph,
                index === 0 ? null : styles.paragraphGap,
                { color: colors.text },
              ]}
            >
              {paragraph}
            </Text>
          ))}
        </Rise>

        <Rise delay={motion.staggerMs} style={styles.section}>
          <Text variant="eyebrow" color={colors.brassSoft}>
            What this Leela teaches us
          </Text>
          <Text variant="soft" color={colors.textSoft} style={styles.lesson}>
            {story.lesson}
          </Text>
        </Rise>

        <Rise delay={motion.staggerMs} style={styles.section}>
          <Text variant="eyebrow" color={colors.brassSoft}>
            A thought to carry
          </Text>
          <Text
            variant="title"
            style={[styles.thought, { color: colors.text }]}
          >
            {story.closingThought}
          </Text>
        </Rise>

        {/* Reserved for future mark-as-read / completion — no fake progress. */}
        <View style={styles.completionSlot} accessibilityElementsHidden />

        <Rise delay={motion.staggerMs} style={styles.section}>
          <Pressable
            onPress={() => setSourceOpen((open) => !open)}
            accessibilityRole="button"
            accessibilityState={{ expanded: sourceOpen }}
            accessibilityLabel="Source"
            style={styles.sourceToggle}
          >
            <Text variant="eyebrow" color={colors.brassSoft}>
              Source
            </Text>
            <Text variant="muted" color={colors.textMuted}>
              {sourceOpen ? "Hide" : "Show"}
            </Text>
          </Pressable>
          {sourceOpen ? (
            <View style={styles.sourceBody}>
              <Text variant="soft" color={colors.textSoft}>
                {story.source}
              </Text>
              <Text
                variant="muted"
                color={colors.textMuted}
                style={{ marginTop: spacing.xs }}
              >
                {story.sourceReference}
              </Text>
              {story.traditionNote ? (
                <>
                  <Text
                    variant="eyebrow"
                    color={colors.brassSoft}
                    style={{ marginTop: spacing.md }}
                  >
                    Tradition note
                  </Text>
                  <Text
                    variant="muted"
                    color={colors.textMuted}
                    style={{ marginTop: spacing.xs }}
                  >
                    {story.traditionNote}
                  </Text>
                </>
              ) : null}
            </View>
          ) : null}
        </Rise>

        <Rise delay={motion.staggerMs} style={styles.navSection}>
          <View style={[styles.navRow, { borderColor: colors.hairline }]}>
            {previous ? (
              <Pressable
                onPress={() => goStory(previous.id)}
                accessibilityRole="button"
                accessibilityLabel={`Previous Leela: ${previous.title}`}
                style={styles.navSide}
              >
                <Text variant="muted" color={colors.brassSoft}>
                  ← Previous Leela
                </Text>
                <Text
                  variant="soft"
                  color={colors.textSoft}
                  numberOfLines={2}
                  style={styles.navTitle}
                >
                  {previous.title}
                </Text>
              </Pressable>
            ) : (
              <View style={styles.navSide} />
            )}

            {next ? (
              <Pressable
                onPress={() => goStory(next.id)}
                accessibilityRole="button"
                accessibilityLabel={`Next Leela: ${next.title}`}
                style={[styles.navSide, styles.navSideEnd]}
              >
                <Text variant="muted" color={colors.brassSoft}>
                  Next Leela →
                </Text>
                <Text
                  variant="soft"
                  color={colors.textSoft}
                  numberOfLines={2}
                  style={[styles.navTitle, styles.navTitleEnd]}
                >
                  {next.title}
                </Text>
              </Pressable>
            ) : (
              <View style={[styles.navSide, styles.navSideEnd]}>
                <Text variant="muted" color={colors.textMuted}>
                  End of the path
                </Text>
                <Text
                  variant="soft"
                  color={colors.textSoft}
                  style={[styles.navTitle, styles.navTitleEnd]}
                >
                  You have reached the last Leela.
                </Text>
              </View>
            )}
          </View>
        </Rise>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  headerBlock: {
    alignSelf: "stretch",
    paddingTop: spacing.xs,
  },
  title: {
    marginTop: spacing.sm,
    fontSize: 32,
    lineHeight: 40,
    letterSpacing: -0.35,
  },
  readingTime: {
    marginTop: spacing.sm,
  },
  teaser: {
    marginTop: spacing.md,
    lineHeight: 24,
  },
  characters: {
    marginTop: spacing.sm,
  },
  heroWrap: {
    marginTop: spacing.lg,
    alignSelf: "stretch",
  },
  hero: {
    alignSelf: "stretch",
    aspectRatio: 5 / 4,
    maxHeight: 260,
    borderRadius: radii.lg,
    overflow: "hidden",
    borderWidth: StyleSheet.hairlineWidth * 2,
    backgroundColor: "#0e1420",
  },
  bodyBlock: {
    marginTop: spacing.xl,
    alignSelf: "stretch",
  },
  paragraph: {
    fontSize: 17,
    lineHeight: 28,
  },
  paragraphGap: {
    marginTop: spacing.lg,
  },
  section: {
    marginTop: spacing.xl,
    alignSelf: "stretch",
  },
  lesson: {
    marginTop: spacing.md,
    lineHeight: 24,
  },
  thought: {
    marginTop: spacing.md,
    fontSize: 20,
    lineHeight: 28,
    fontStyle: "italic",
  },
  completionSlot: {
    height: spacing.sm,
  },
  sourceToggle: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.sm,
    paddingVertical: spacing.xs,
  },
  sourceBody: {
    marginTop: spacing.sm,
    alignSelf: "stretch",
  },
  navSection: {
    marginTop: spacing.xl,
    alignSelf: "stretch",
  },
  navRow: {
    flexDirection: "row",
    gap: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth * 2,
    paddingTop: spacing.lg,
    alignSelf: "stretch",
  },
  navSide: {
    flex: 1,
    minWidth: 0,
  },
  navSideEnd: {
    alignItems: "flex-end",
  },
  navTitle: {
    marginTop: spacing.xs,
  },
  navTitleEnd: {
    textAlign: "right",
  },
});

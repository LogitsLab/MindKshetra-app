/**
 * Krishna Leela Hub — browseable catalog (chapters + featured openings).
 *
 * Layout note (RN Web): do not set width/"100%" on ScrollView content or
 * section children. Percentage width resolves against the window, ignoring
 * Screen’s paddingHorizontal, and clips on the right. Stretch like Paths /
 * Meditation hubs instead.
 */
import React, { useMemo } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  View,
  type ImageSourcePropType,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Screen } from "@/components/Screen";
import { ScreenHeader } from "@/components/ScreenHeader";
import { CoverImage } from "@/components/CoverImage";
import { Text } from "@/components/Text";
import { Rise } from "@/components/Rise";
import { LeelaStoryCard } from "@/components/leela/LeelaStoryCard";
import {
  emptyLeelaProgress,
  getAllLeelaChapters,
  getContinueLeelaStory,
  type LeelaChapter,
  type LeelaStory,
} from "@/data/leelas";
import { useTheme } from "@/context/ThemeContext";
import {
  resolveChapterArtwork,
  resolveLeelaHubArtwork,
  resolveStoryArtwork,
} from "@/theme/leelaArt";
import {
  resolveChapterArtworkFocus,
  resolveLeelaHubArtworkFocus,
} from "@/theme/leelaSceneFocus";
import { motion, radii, spacing } from "@/theme/tokens";

function chapterIndexLabel(order: number): string {
  return String(order).padStart(2, "0");
}

function storyCountLabel(count: number): string {
  if (count === 0) return "Stories coming soon";
  if (count === 1) return "1 story";
  return `${count} stories`;
}

function storyArt(story: LeelaStory): ImageSourcePropType {
  return resolveStoryArtwork(story);
}

function chapterArt(chapter: LeelaChapter): ImageSourcePropType {
  return resolveChapterArtwork(chapter.id, chapter.artwork);
}

export default function LeelaIndexScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();

  const chapters = useMemo(() => getAllLeelaChapters(), []);
  /** One opening story per chapter — do not dump the full 55-story catalog here. */
  const featuredStories = useMemo(
    () =>
      chapters
        .map((chapter) => chapter.stories[0])
        .filter((story): story is LeelaStory => Boolean(story)),
    [chapters]
  );
  const continueStory = useMemo(
    () => getContinueLeelaStory(emptyLeelaProgress()),
    []
  );

  const bottomPad = spacing.contentBottom + Math.max(insets.bottom, 0);

  const openStory = (story: LeelaStory) => {
    router.push(`/leela/${story.id}`);
  };

  const openChapter = (chapter: LeelaChapter) => {
    router.push(`/leela/${chapter.id}`);
  };

  return (
    <Screen atmosphere="soft" padded>
      <ScreenHeader showBack backFallback="/(tabs)/home" />
      <ScrollView
        contentContainerStyle={{ paddingBottom: bottomPad }}
        showsVerticalScrollIndicator={false}
      >
        <Rise style={styles.brandBlock}>
          <Text
            variant="display"
            accessibilityRole="header"
            style={styles.brandTitle}
          >
            Krishna Leela
          </Text>
          <Text variant="soft" color={colors.textSoft} style={styles.brandSubtitle}>
            Walk through His journey,{"\n"}love & divine play
          </Text>
        </Rise>

        <Rise delay={motion.staggerMs * 0.5} style={styles.section}>
          <View
            style={[styles.hero, { borderColor: colors.line }]}
            accessibilityRole="image"
            accessibilityLabel="Krishna journey artwork"
          >
            <CoverImage
              source={resolveLeelaHubArtwork()}
              opacity={0.92}
              focus={resolveLeelaHubArtworkFocus()}
            />
            <LinearGradient
              colors={[
                "rgba(7,9,15,0.15)",
                "rgba(7,9,15,0.45)",
                "rgba(7,9,15,0.92)",
              ]}
              locations={[0, 0.45, 1]}
              style={StyleSheet.absoluteFillObject}
            />
            <View style={styles.heroCopy}>
              <Text
                variant="title"
                color={colors.onMedia}
                style={styles.heroLine}
              >
                {"From the child of Gokul\nto the charioteer of Arjuna"}
              </Text>
            </View>
          </View>
        </Rise>

        <Rise delay={motion.staggerMs} style={styles.section}>
          <Text variant="soft" color={colors.textSoft} style={styles.intro}>
            Discover the stories, friendships, miracles and moments that shaped
            the life of Shri Krishna — from His playful childhood in Gokul to
            the wisdom of the Bhagavad Gita.
          </Text>
        </Rise>

        {continueStory ? (
          <Rise delay={motion.staggerMs * 2} style={styles.section}>
            <Text variant="eyebrow" color={colors.brassSoft}>
              Continue Reading
            </Text>
            <View style={styles.cardSlot}>
              <LeelaStoryCard
                story={continueStory}
                image={storyArt(continueStory)}
                cta="Begin Reading"
                onPress={() => openStory(continueStory)}
                featured
              />
            </View>
          </Rise>
        ) : null}

        <Rise delay={motion.staggerMs * 3} style={styles.section}>
          <Text variant="eyebrow" color={colors.brassSoft}>
            His Journey
          </Text>
          <Text variant="soft" color={colors.textSoft} style={styles.sectionBlurb}>
            Explore the chapters of Krishna's life
          </Text>
          <View style={styles.list}>
            {chapters.map((chapter) => {
              const count = chapter.stories.length;
              return (
                <ChapterVisualTile
                  key={chapter.id}
                  chapter={chapter}
                  image={chapterArt(chapter)}
                  countLabel={storyCountLabel(count)}
                  onPress={() => openChapter(chapter)}
                />
              );
            })}
          </View>
        </Rise>

        {featuredStories.length > 0 ? (
          <Rise delay={motion.staggerMs} style={styles.section}>
            <Text variant="eyebrow" color={colors.brassSoft}>
              Begin with a Leela
            </Text>
            <Text
              variant="soft"
              color={colors.textSoft}
              style={styles.sectionBlurb}
            >
              An opening story from each chapter
            </Text>
            <View style={styles.list}>
              {featuredStories.map((story) => (
                <LeelaStoryCard
                  key={story.id}
                  story={story}
                  image={storyArt(story)}
                  cta="Read Leela"
                  onPress={() => openStory(story)}
                />
              ))}
            </View>
          </Rise>
        ) : null}

        <Rise delay={motion.staggerMs} style={styles.closingWrap}>
          <View style={[styles.closing, { borderColor: colors.hairline }]}>
            <Text
              variant="soft"
              color={colors.textSoft}
              style={styles.closingText}
            >
              Every Leela tells a story.{"\n"}
              Every story carries a lesson.{"\n"}
              And every lesson brings us a little closer to Krishna.
            </Text>
          </View>
        </Rise>
      </ScrollView>
    </Screen>
  );
}

function ChapterVisualTile({
  chapter,
  image,
  countLabel,
  onPress,
}: {
  chapter: LeelaChapter;
  image: ImageSourcePropType;
  countLabel: string;
  onPress: () => void;
}) {
  const { colors } = useTheme();
  const empty = chapter.stories.length === 0;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${chapter.title}, ${countLabel}`}
      style={({ pressed }) => [
        styles.chapterTile,
        {
          borderColor: colors.line,
          opacity: empty ? 0.78 : pressed ? 0.94 : 1,
          transform: [{ scale: pressed ? 0.985 : 1 }],
        },
      ]}
    >
      <CoverImage
        source={image}
        opacity={0.88}
        focus={resolveChapterArtworkFocus(chapter.id)}
      />
      <LinearGradient
        colors={[
          "rgba(7,9,15,0.5)",
          "rgba(7,9,15,0.28)",
          "rgba(7,9,15,0.88)",
        ]}
        locations={[0, 0.45, 1]}
        start={{ x: 0, y: 0.5 }}
        end={{ x: 1, y: 0.5 }}
        style={StyleSheet.absoluteFillObject}
      />
      <View style={styles.chapterRow}>
        <View style={styles.chapterCopy}>
          <Text variant="eyebrow" color={colors.brassSoft}>
            {chapterIndexLabel(chapter.order)}
            {" · "}
            {countLabel}
          </Text>
          <Text
            variant="title"
            color={colors.onMedia}
            style={styles.chapterTitle}
          >
            {chapter.title}
          </Text>
          <Text
            variant="soft"
            color={colors.onMediaMuted}
            style={styles.chapterSubtitle}
          >
            {chapter.subtitle}
          </Text>
        </View>
        <Text color={colors.brassSoft} style={styles.chapterChevron}>
          ›
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  brandBlock: {
    paddingTop: spacing.xs,
    paddingBottom: spacing.sm,
    alignSelf: "stretch",
  },
  brandTitle: {
    fontSize: 34,
    lineHeight: 40,
    letterSpacing: -0.4,
  },
  brandSubtitle: {
    marginTop: spacing.xs,
  },
  section: {
    marginTop: spacing.lg,
    alignSelf: "stretch",
  },
  hero: {
    alignSelf: "stretch",
    // Hub hero art is panoramic (3:1); keep a wide frame to avoid tall crop.
    aspectRatio: 21 / 9,
    maxHeight: 200,
    borderRadius: radii.lg,
    overflow: "hidden",
    borderWidth: StyleSheet.hairlineWidth * 2,
    justifyContent: "flex-end",
    backgroundColor: "#0e1420",
  },
  heroCopy: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.md,
    paddingTop: spacing.lg,
    zIndex: 1,
    alignSelf: "stretch",
  },
  heroLine: {
    fontSize: 20,
    lineHeight: 26,
  },
  intro: {
    lineHeight: 22,
  },
  sectionBlurb: {
    marginTop: spacing.xs,
    marginBottom: spacing.sm,
  },
  cardSlot: {
    marginTop: spacing.md,
    alignSelf: "stretch",
  },
  list: {
    marginTop: spacing.sm,
    gap: spacing.sm,
    alignSelf: "stretch",
  },
  chapterTile: {
    alignSelf: "stretch",
    minHeight: 112,
    borderRadius: radii.lg,
    overflow: "hidden",
    borderWidth: StyleSheet.hairlineWidth * 2,
    justifyContent: "center",
    backgroundColor: "#0e1420",
    position: "relative",
  },
  chapterRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    zIndex: 1,
    gap: spacing.sm,
    alignSelf: "stretch",
  },
  chapterCopy: {
    flex: 1,
    minWidth: 0,
  },
  chapterTitle: {
    marginTop: 4,
    fontSize: 20,
    lineHeight: 26,
  },
  chapterSubtitle: {
    marginTop: 2,
  },
  chapterChevron: {
    fontFamily: "Sora_600SemiBold",
    fontSize: 22,
    flexShrink: 0,
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

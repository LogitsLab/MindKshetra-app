import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Dimensions,
  FlatList,
  Pressable,
  StyleSheet,
  View,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  type ViewToken,
} from "react-native";
import { useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { CoverImage } from "@/components/CoverImage";
import { Text } from "@/components/Text";
import { resolveRecitationUrl } from "@/audio/manifest";
import { playOrSpeak, stopNarration } from "@/audio/narration";
import { useLanguage } from "@/context/LanguageContext";
import { useTheme } from "@/context/ThemeContext";
import type { FeaturedVerse } from "@/hooks/useFeaturedVerses";
import { images } from "@/theme/assets";
import { radii, spacing } from "@/theme/tokens";
import { truncateAtWord } from "@/utils/text";

const AUTOPLAY_MS = 5000;

type Props = {
  verses: FeaturedVerse[];
  error?: string | null;
  stale?: boolean;
};

export function VotdCarousel({ verses, error, stale }: Props) {
  const router = useRouter();
  const { colors } = useTheme();
  const { t, lang } = useLanguage();
  const listRef = useRef<FlatList<FeaturedVerse>>(null);
  const [index, setIndex] = useState(0);
  /** Which sloka id is currently narrating — null = idle. */
  const [playingId, setPlayingId] = useState<number | null>(null);
  const [paused, setPaused] = useState(false);
  const indexRef = useRef(0);
  const playingIdRef = useRef<number | null>(null);
  const screenPad = spacing.md * 2;
  const slideWidth = Dimensions.get("window").width - screenPad;

  useEffect(() => {
    indexRef.current = index;
  }, [index]);

  const setPlaying = (id: number | null) => {
    playingIdRef.current = id;
    setPlayingId(id);
  };

  useEffect(() => () => stopNarration(), []);

  /** Always land on today (index 0) when verses first arrive. */
  useEffect(() => {
    if (!verses.length) return;
    stopNarration();
    setPlaying(null);
    setIndex(0);
    indexRef.current = 0;
    requestAnimationFrame(() => {
      listRef.current?.scrollToIndex({ index: 0, animated: false });
    });
  }, [verses.length, verses[0]?.sloka.id]);

  // Autoplay only when nothing is narrating.
  useEffect(() => {
    if (verses.length < 2 || paused || playingId != null) return;
    const id = setInterval(() => {
      if (playingIdRef.current != null) return;
      const next = (indexRef.current + 1) % verses.length;
      listRef.current?.scrollToIndex({ index: next, animated: true });
      setIndex(next);
    }, AUTOPLAY_MS);
    return () => clearInterval(id);
  }, [verses.length, paused, playingId]);

  const dayLabel = (offset: number) => {
    if (offset === 0) return t("homeVotdToday");
    if (offset === -1) return t("homeVotdYesterday");
    return t("homeVotdEarlier");
  };

  const goToIndex = useCallback((next: number) => {
    const clamped = Math.max(0, Math.min(verses.length - 1, next));
    if (clamped === indexRef.current) return;
    // Changing slides must kill any in-flight / playing audio.
    stopNarration();
    playingIdRef.current = null;
    setPlayingId(null);
    setIndex(clamped);
    listRef.current?.scrollToIndex({ index: clamped, animated: true });
  }, [verses.length]);

  const onViewableItemsChanged = useRef(
    ({ viewableItems }: { viewableItems: ViewToken[] }) => {
      const first = viewableItems[0];
      if (first?.index == null) return;
      if (first.index === indexRef.current) return;
      // User (or autoplay) landed on a new slide — stop audio so Listen/Stop
      // stays honest and we never stack players.
      stopNarration();
      playingIdRef.current = null;
      setPlayingId(null);
      setIndex(first.index);
    }
  ).current;

  const viewabilityConfig = useRef({
    itemVisiblePercentThreshold: 60,
  }).current;

  const toggleListen = useCallback(
    async (slokaId: number) => {
      if (playingIdRef.current === slokaId) {
        stopNarration();
        setPlaying(null);
        return;
      }

      const verse = verses.find((v) => v.sloka.id === slokaId);
      if (!verse) return;

      // Claim the UI immediately so autoplay cannot advance mid-resolve.
      stopNarration();
      setPlaying(slokaId);

      try {
        const recitation = await resolveRecitationUrl(
          verse.sloka.chapter,
          verse.sloka.verse_number
        );
        // User stopped or switched while we were resolving.
        if (playingIdRef.current !== slokaId) return;

        await playOrSpeak(verse.sloka.sanskrit_devanagari, {
          lang,
          url: recitation,
          onDone: () => {
            if (playingIdRef.current === slokaId) setPlaying(null);
          },
          onStopped: () => {
            if (playingIdRef.current === slokaId) setPlaying(null);
          },
          onError: () => {
            if (playingIdRef.current === slokaId) setPlaying(null);
          },
        });
      } catch {
        if (playingIdRef.current === slokaId) setPlaying(null);
      }
    },
    [verses, lang]
  );

  const pauseBriefly = () => {
    setPaused(true);
    setTimeout(() => setPaused(false), 8000);
  };

  if (!verses.length) {
    return (
      <View style={[styles.band, { borderColor: colors.line }]}>
        <CoverImage source={images.pathExplore} opacity={0.75} />
        <LinearGradient
          colors={["rgba(7,9,15,0.55)", "rgba(7,9,15,0.82)", "rgba(7,9,15,0.94)"]}
          style={StyleSheet.absoluteFillObject}
        />
        <View style={styles.inner}>
          <Text variant="eyebrow" color={colors.brassSoft}>
            {t("homeFeaturedEyebrow")}
          </Text>
          <Text
            variant="title"
            color={colors.onMedia}
            style={{ marginTop: spacing.md }}
          >
            {lang === "hi" ? "आज का श्लोक" : "Today’s verse"}
          </Text>
          <Text
            variant="soft"
            color={colors.onMediaMuted}
            style={{ marginTop: spacing.xs }}
          >
            {error ? t("homeVotdUnavailable") : t("loading")}
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View>
      <View style={styles.headRow}>
        <Text variant="eyebrow" color={colors.brassSoft}>
          {t("homeFeaturedEyebrow")}
        </Text>
        {verses.length > 1 ? (
          <View style={styles.dots}>
            {verses.map((v, i) => (
              <Pressable
                key={v.sloka.id}
                accessibilityRole="button"
                accessibilityLabel={dayLabel(v.offset)}
                onPress={() => {
                  pauseBriefly();
                  goToIndex(i);
                }}
                hitSlop={8}
              >
                <View
                  style={
                    i === index
                      ? [styles.dotActive, { backgroundColor: colors.brass }]
                      : [styles.dot, { backgroundColor: colors.textMuted }]
                  }
                />
              </Pressable>
            ))}
          </View>
        ) : null}
      </View>

      <FlatList
        ref={listRef}
        data={verses}
        keyExtractor={(item) => String(item.sloka.id)}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        decelerationRate="fast"
        snapToInterval={slideWidth}
        snapToAlignment="start"
        disableIntervalMomentum
        initialScrollIndex={0}
        onScrollBeginDrag={() => {
          pauseBriefly();
          // Finger moved the carousel — stop so Stop never lies.
          if (playingIdRef.current != null) {
            stopNarration();
            playingIdRef.current = null;
            setPlayingId(null);
          }
        }}
        onMomentumScrollEnd={(e: NativeSyntheticEvent<NativeScrollEvent>) => {
          const next = Math.round(e.nativeEvent.contentOffset.x / slideWidth);
          const clamped = Math.max(0, Math.min(verses.length - 1, next));
          if (clamped !== indexRef.current) {
            stopNarration();
            playingIdRef.current = null;
            setPlayingId(null);
            setIndex(clamped);
          }
        }}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={viewabilityConfig}
        getItemLayout={(_, i) => ({
          length: slideWidth,
          offset: slideWidth * i,
          index: i,
        })}
        renderItem={({ item }) => {
          const raw =
            lang === "hi"
              ? item.sloka.hindi_translation
              : item.sloka.english_translation;
          const translation = raw ? truncateAtWord(raw, 120) : null;
          const openVerse = () => router.push(`/sloka/${item.sloka.id}`);
          const isPlaying = playingId === item.sloka.id;

          return (
            <View
              style={[styles.band, { width: slideWidth, borderColor: colors.line }]}
            >
              <CoverImage source={images.pathExplore} opacity={0.75} />
              <LinearGradient
                colors={[
                  "rgba(7,9,15,0.5)",
                  "rgba(7,9,15,0.78)",
                  "rgba(7,9,15,0.94)",
                ]}
                locations={[0, 0.5, 1]}
                style={StyleSheet.absoluteFillObject}
              />
              <View style={styles.inner}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`${dayLabel(item.offset)} ${item.sloka.chapter}.${item.sloka.verse_number}`}
                  onPress={openVerse}
                >
                  <View style={styles.meta}>
                    <Text variant="eyebrow" color={colors.brassSoft}>
                      {dayLabel(item.offset)}
                    </Text>
                    <Text variant="eyebrow" color={colors.onMediaMuted}>
                      {item.sloka.chapter}.{item.sloka.verse_number}
                    </Text>
                  </View>
                  <Text
                    variant="sanskrit"
                    color={colors.onMedia}
                    style={styles.sanskrit}
                    numberOfLines={3}
                  >
                    {item.sloka.sanskrit_devanagari}
                  </Text>
                  {translation ? (
                    <Text
                      variant="soft"
                      color="rgba(232,228,220,0.88)"
                      style={styles.translation}
                    >
                      {translation}
                    </Text>
                  ) : null}
                  {item.nakshatra && item.offset === 0 ? (
                    <Text
                      variant="muted"
                      color={colors.onMediaMuted}
                      style={styles.nakshatra}
                    >
                      {t("votdNakshatraLine").replace(
                        "{nakshatra}",
                        item.nakshatra
                      )}
                    </Text>
                  ) : null}
                </Pressable>

                <View style={styles.actions}>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={
                      isPlaying ? t("verseStop") : t("verseListen")
                    }
                    onPress={() => void toggleListen(item.sloka.id)}
                    style={({ pressed }) => [
                      styles.listenBtn,
                      {
                        borderColor: colors.brass,
                        backgroundColor: isPlaying
                          ? "rgba(201,162,39,0.28)"
                          : "rgba(201,162,39,0.14)",
                        opacity: pressed ? 0.85 : 1,
                      },
                    ]}
                  >
                    <Text variant="eyebrow" color={colors.brassSoft}>
                      {isPlaying ? t("verseStop") : t("verseListen")}
                    </Text>
                  </Pressable>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={t("homeFeaturedDetail")}
                    onPress={openVerse}
                    hitSlop={10}
                    style={styles.readMore}
                  >
                    <Text
                      variant="muted"
                      color={colors.brassSoft}
                      style={styles.readMoreText}
                    >
                      {t("homeFeaturedDetail")} →
                    </Text>
                  </Pressable>
                </View>
              </View>
            </View>
          );
        }}
      />

      {error ? (
        <Text
          accessibilityRole="alert"
          variant="muted"
          color={colors.brassSoft}
          style={{ marginTop: spacing.xs }}
        >
          {stale ? t("homeVotdStale") : t("homeVotdOffline")}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  headRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: spacing.sm,
  },
  dots: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  dotActive: {
    width: 16,
    height: 5,
    borderRadius: 3,
  },
  dot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    opacity: 0.35,
  },
  band: {
    minHeight: 280,
    borderRadius: radii.lg,
    overflow: "hidden",
    borderWidth: StyleSheet.hairlineWidth * 2,
    justifyContent: "flex-end",
    backgroundColor: "#0e1420",
    position: "relative",
  },
  inner: {
    padding: spacing.lg,
    paddingBottom: spacing.lg + spacing.sm,
    zIndex: 1,
  },
  meta: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  sanskrit: {
    marginTop: spacing.md,
    fontSize: 18,
    lineHeight: 30,
  },
  translation: {
    marginTop: spacing.sm,
    fontSize: 14,
    lineHeight: 21,
  },
  nakshatra: {
    marginTop: spacing.sm,
    fontSize: 11,
  },
  actions: {
    marginTop: spacing.md,
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: spacing.md,
  },
  listenBtn: {
    borderWidth: StyleSheet.hairlineWidth * 2,
    borderRadius: radii.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    minHeight: 40,
    minWidth: 96,
    justifyContent: "center",
    alignItems: "center",
  },
  readMore: {
    minHeight: 40,
    justifyContent: "center",
    paddingVertical: spacing.sm,
  },
  readMoreText: {
    fontFamily: "Sora_600SemiBold",
    fontSize: 13,
  },
});

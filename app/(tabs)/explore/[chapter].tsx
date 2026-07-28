import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, View } from "react-native";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { Button } from "@/components/Button";
import { Screen } from "@/components/Screen";
import { Text } from "@/components/Text";
import { Panel } from "@/components/Panel";
import { SlokaCard, EmptyState } from "@/components/SlokaCard";
import { ScreenHeader } from "@/components/ScreenHeader";
import { contentApi, progressApi } from "@/api/endpoints";
import {
  chapterMoral,
  chapterSubtitle,
  chapterSummary,
  chapterTitle,
  getChapterMeta,
} from "@/data/chapters";
import { useAuth } from "@/context/AuthContext";
import { useLanguage } from "@/context/LanguageContext";
import { useTheme } from "@/context/ThemeContext";
import { getGuestProgress } from "@/storage/local";
import { radii, spacing } from "@/theme/tokens";
import type { Sloka } from "@/types";

export default function ChapterScreen() {
  const { chapter } = useLocalSearchParams<{ chapter: string }>();
  const router = useRouter();
  const chapterNum = Number(chapter);
  const meta = getChapterMeta(chapterNum);
  const { lang, t } = useLanguage();
  const { colors } = useTheme();
  const { isSignedIn } = useAuth();
  const [slokas, setSlokas] = useState<Sloka[]>([]);
  const [completed, setCompleted] = useState<number[]>([]);
  const [cursorVerse, setCursorVerse] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<ScrollView | null>(null);
  const verseY = useRef<Record<number, number>>({});

  const title = chapterTitle(meta, lang, `${t("chapter")} ${chapterNum}`);
  const subtitle = chapterSubtitle(meta, lang);
  const summary = chapterSummary(meta, lang);
  const moral = chapterMoral(meta, lang);
  const completedSet = useMemo(() => new Set(completed), [completed]);
  const continueSloka =
    cursorVerse != null
      ? slokas.find((sloka) => sloka.verse_number === cursorVerse) ?? null
      : null;
  const showJump = slokas.length >= 24;

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setError(null);
    contentApi
      .slokas({ chapter: chapterNum, limit: 100 })
      .then((res) => {
        if (alive) setSlokas(res.slokas ?? []);
      })
      .catch((e) => {
        if (alive) setError(e.message ?? "Failed to load");
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [chapterNum]);

  useFocusEffect(
    useCallback(() => {
      let alive = true;
      (async () => {
        try {
          const data = isSignedIn ? await progressApi.get() : await getGuestProgress();
          if (!alive) return;
          setCompleted(data.completed ?? []);
          setCursorVerse(
            data.cursor?.chapter === chapterNum ? data.cursor.verse ?? null : null
          );
        } catch {
          if (!alive) return;
          setCompleted([]);
          setCursorVerse(null);
        }
      })();
      return () => {
        alive = false;
      };
    }, [chapterNum, isSignedIn])
  );

  const jumpToVerse = (verse: number) => {
    const y = verseY.current[verse];
    if (y != null) {
      scrollRef.current?.scrollTo({ y: Math.max(0, y - 12), animated: true });
    }
  };

  return (
    <Screen>
      <ScreenHeader
        showBack
        backFallback="/(tabs)/explore"
        title={title}
        subtitle={subtitle || `${t("chapter")} ${chapterNum}`}
      />
      {summary ? (
        <Text variant="soft" style={{ marginBottom: spacing.sm }}>
          {summary}
        </Text>
      ) : null}
      {moral ? (
        <Panel style={{ marginBottom: spacing.sm }}>
          <Text variant="eyebrow" color={colors.brassSoft}>
            {t("chapterMoral")}
          </Text>
          <Text variant="soft" style={{ marginTop: spacing.xs }}>
            {moral}
          </Text>
        </Panel>
      ) : null}
      <View
        style={{
          flexDirection: "row",
          flexWrap: "wrap",
          gap: spacing.sm,
          marginBottom: spacing.sm,
        }}
      >
        <Panel
          style={{
            flex: 1,
            minWidth: 140,
            paddingVertical: spacing.sm,
            paddingHorizontal: spacing.md,
          }}
        >
          <Text variant="eyebrow" color={colors.brassSoft}>
            {t("readingProgress")}
          </Text>
          <Text variant="title" style={{ marginTop: 6, fontSize: 18 }}>
            {completed.filter((id) => slokas.some((sloka) => sloka.id === id)).length}/
            {slokas.length}
          </Text>
          <Text variant="muted" style={{ marginTop: 2 }}>
            {t("progressComplete")}
          </Text>
        </Panel>
        {continueSloka ? (
          <View style={{ flex: 1, minWidth: 180, justifyContent: "center" }}>
            <Button
              label={`${t("continueReading")} · ${continueSloka.chapter}.${continueSloka.verse_number}`}
              onPress={() => router.push(`/sloka/${continueSloka.id}`)}
            />
          </View>
        ) : null}
      </View>
      {showJump ? (
        <View style={{ marginBottom: spacing.sm }}>
          <Text variant="eyebrow" color={colors.textMuted}>
            {t("jumpToVerse")}
          </Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: spacing.xs, paddingTop: spacing.xs }}
          >
            {slokas.map((sloka) => {
              const done = completedSet.has(sloka.id);
              return (
                <Pressable
                  key={sloka.id}
                  onPress={() => jumpToVerse(sloka.verse_number)}
                  style={({ pressed }) => ({
                    minWidth: 38,
                    minHeight: 38,
                    alignItems: "center",
                    justifyContent: "center",
                    borderRadius: radii.md,
                    borderWidth: 1.5,
                    borderColor: done ? colors.brass : colors.line,
                    backgroundColor: pressed
                      ? colors.surfaceHover
                      : done
                        ? colors.surface
                        : "transparent",
                    paddingHorizontal: spacing.sm,
                  })}
                >
                  <Text
                    style={{
                      color: done ? colors.brassSoft : colors.textMuted,
                      fontFamily: "Sora_600SemiBold",
                      fontSize: 12,
                    }}
                  >
                    {sloka.verse_number}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>
      ) : null}

      {loading ? (
        <View style={{ marginTop: spacing.xl }}>
          <ActivityIndicator color={colors.brass} />
        </View>
      ) : error ? (
        <EmptyState title="Couldn’t load" body={error} />
      ) : (
        <ScrollView
          ref={scrollRef}
          contentContainerStyle={{ paddingTop: spacing.md, paddingBottom: 120 }}
          showsVerticalScrollIndicator={false}
        >
          {slokas.length ? (
            slokas.map((item) => (
              <View
                key={item.id}
                onLayout={(event) => {
                  verseY.current[item.verse_number] = event.nativeEvent.layout.y;
                }}
              >
                <SlokaCard sloka={item} lang={lang} />
              </View>
            ))
          ) : (
            <EmptyState
              title={lang === "hi" ? "कोई श्लोक नहीं" : "No verses"}
              body={
                lang === "hi"
                  ? "API से श्लोक नहीं मिले।"
                  : "No verses returned from the API."
              }
            />
          )}
        </ScrollView>
      )}
    </Screen>
  );
}

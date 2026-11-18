import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  SectionList,
  StyleSheet,
  View,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Button } from "@/components/Button";
import { ChapterListenPlayer } from "@/components/ChapterListenPlayer";
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
  chapterTags,
  chapterTitle,
  getChapterMeta,
} from "@/data/chapters";
import {
  formatUnitRange,
  getUnitsForChapter,
  type PassageUnit,
} from "@/data/passages";
import { useAuth } from "@/context/AuthContext";
import { useLanguage } from "@/context/LanguageContext";
import { useTheme } from "@/context/ThemeContext";
import { useFocusRefresh } from "@/hooks/useFocusRefresh";
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
  const [continueSlokaId, setContinueSlokaId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const listRef = useRef<SectionList<Sloka> | null>(null);

  const title = chapterTitle(meta, lang, `${t("chapter")} ${chapterNum}`);
  const subtitle = chapterSubtitle(meta, lang);
  const summary = chapterSummary(meta, lang);
  const summaryParts = useMemo(
    () =>
      summary
        ? summary.split(/\n\n+/).map((p) => p.trim()).filter(Boolean)
        : [],
    [summary]
  );
  const tags = useMemo(() => chapterTags(meta, lang), [meta, lang]);
  const moral = chapterMoral(meta, lang);
  const completedSet = useMemo(() => new Set(completed), [completed]);
  const verseNumbers = useMemo(
    () => slokas.map((s) => s.verse_number),
    [slokas]
  );
  const continueSloka =
    cursorVerse != null
      ? slokas.find((sloka) => sloka.verse_number === cursorVerse) ?? null
      : null;
  const showJump = slokas.length >= 24;

  const sections = useMemo(() => {
    const units = getUnitsForChapter(chapterNum);
    if (!units.length) {
      return [{ title: null as PassageUnit | null, data: slokas }];
    }
    return units
      .map((unit) => ({
        title: unit,
        data: slokas.filter(
          (s) => s.verse_number >= unit.from && s.verse_number <= unit.to
        ),
      }))
      .filter((s) => s.data.length > 0);
  }, [chapterNum, slokas]);

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
  }, [chapterNum, reloadKey]);

  useFocusRefresh(
    "progress",
    async (isActive) => {
      try {
        const data = isSignedIn ? await progressApi.get() : await getGuestProgress();
        if (!isActive()) return;
        setCompleted(data.completed ?? []);
        setContinueSlokaId(data.continueSlokaId ?? null);
        setCursorVerse(
          data.cursor?.chapter === chapterNum ? data.cursor.verse ?? null : null
        );
      } catch (e) {
        throw e;
      }
    },
    { resetKey: `${chapterNum}:${isSignedIn}` }
  );

  // Prefer server continue target when that verse is in this chapter.
  useEffect(() => {
    if (continueSlokaId == null || slokas.length === 0) return;
    const cont = slokas.find((s) => s.id === continueSlokaId);
    if (cont) setCursorVerse(cont.verse_number);
  }, [continueSlokaId, slokas]);

  const jumpToVerse = (verse: number) => {
    let sectionIndex = -1;
    let itemIndex = -1;
    for (let s = 0; s < sections.length; s++) {
      const i = sections[s].data.findIndex((sloka) => sloka.verse_number === verse);
      if (i >= 0) {
        sectionIndex = s;
        itemIndex = i;
        break;
      }
    }
    if (sectionIndex < 0 || itemIndex < 0) return;
    listRef.current?.scrollToLocation({
      sectionIndex,
      itemIndex,
      viewOffset: 12,
      animated: true,
    });
  };

  const listHeader = (
    <>
      {tags.length ? (
        <View
          style={{
            flexDirection: "row",
            flexWrap: "wrap",
            gap: spacing.xs,
            marginBottom: spacing.sm,
          }}
        >
          {tags.map((tag) => (
            <View
              key={tag}
              style={{
                borderWidth: StyleSheet.hairlineWidth * 2,
                borderColor: colors.line,
                paddingHorizontal: spacing.sm,
                paddingVertical: 4,
                borderRadius: radii.sm,
              }}
            >
              <Text
                variant="muted"
                color={colors.brassSoft}
                style={{ fontSize: 11 }}
              >
                {tag}
              </Text>
            </View>
          ))}
        </View>
      ) : null}
      {summaryParts.map((part) => (
        <Text
          key={part.slice(0, 40)}
          variant="soft"
          style={{ marginBottom: spacing.sm }}
        >
          {part}
        </Text>
      ))}
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
      {verseNumbers.length > 0 ? (
        <ChapterListenPlayer
          chapter={chapterNum}
          verseNumbers={verseNumbers}
          onVerseChange={jumpToVerse}
        />
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
            {completed.filter((id) => slokas.some((sloka) => sloka.id === id))
              .length}
            /{slokas.length}
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
        <View style={{ marginBottom: spacing.md }}>
          <Text variant="eyebrow" color={colors.brassSoft}>
            {t("jumpToVerse")}
          </Text>
          <ScrollView
            horizontal
            nestedScrollEnabled
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{
              gap: spacing.xs,
              paddingTop: spacing.xs,
            }}
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
                    borderColor: done ? colors.brass : "rgba(201,162,39,0.4)",
                    backgroundColor: pressed
                      ? colors.surfaceHover
                      : done
                        ? "rgba(201,162,39,0.16)"
                        : colors.surfaceHover,
                    paddingHorizontal: spacing.sm,
                  })}
                >
                  <Text
                    style={{
                      color: done ? colors.brassSoft : colors.text,
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
    </>
  );

  return (
    <Screen testID="screen-chapter">
      <ScreenHeader
        showBack
        backFallback="/(tabs)/explore"
        title={title}
        subtitle={subtitle || `${t("chapter")} ${chapterNum}`}
      />

      {loading ? (
        <View style={{ flex: 1, justifyContent: "center" }}>
          <ActivityIndicator color={colors.brass} />
        </View>
      ) : error ? (
        <EmptyState
          title={t("couldntLoad")}
          body={error}
          actionLabel={t("retry")}
          onAction={() => {
            setError(null);
            setLoading(true);
            setReloadKey((k) => k + 1);
          }}
        />
      ) : (
        <SectionList
          ref={listRef}
          sections={sections}
          keyExtractor={(sloka) => String(sloka.id)}
          initialNumToRender={10}
          stickySectionHeadersEnabled={false}
          renderSectionHeader={({ section }) => {
            const unit = section.title;
            if (!unit) return null;
            const first = section.data[0];
            return (
              <View style={{ marginTop: spacing.md, marginBottom: spacing.sm }}>
                <View
                  style={{
                    flexDirection: "row",
                    flexWrap: "wrap",
                    alignItems: "center",
                    gap: spacing.xs,
                  }}
                >
                  <Text variant="title" color={colors.text} style={{ fontSize: 18 }}>
                    {lang === "hi" ? unit.titleHi : unit.titleEn}
                  </Text>
                  <Text
                    variant="muted"
                    color={colors.brassSoft}
                    style={{ fontSize: 11 }}
                  >
                    {unit.mode === "scene"
                      ? t("unitBadgeScene")
                      : t("unitBadgeTeaching")}{" "}
                    · {formatUnitRange(unit)}
                  </Text>
                </View>
                <Text variant="muted" style={{ marginTop: spacing.xs }}>
                  {lang === "hi" ? unit.themeHi : unit.themeEn}
                </Text>
                {first ? (
                  <Pressable
                    onPress={() => router.push(`/sloka/${first.id}`)}
                    style={{ marginTop: spacing.sm }}
                  >
                    <Text color={colors.brassSoft}>
                      {t("readUnitReflection")} →
                    </Text>
                  </Pressable>
                ) : null}
              </View>
            );
          }}
          renderItem={({ item }) => (
            <SlokaCard
              sloka={item}
              lang={lang}
              completed={completedSet.has(item.id)}
            />
          )}
          ListHeaderComponent={listHeader}
          ListEmptyComponent={
            <EmptyState
              title={t("noVerses")}
              body={t("noVersesBody")}
            />
          }
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingBottom: 120 }}
          showsVerticalScrollIndicator={false}
          nestedScrollEnabled
        />
      )}
    </Screen>
  );
}

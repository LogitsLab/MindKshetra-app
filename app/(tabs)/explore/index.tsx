import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from "react-native";
import { useRouter } from "expo-router";
import { Button } from "@/components/Button";
import { Screen } from "@/components/Screen";
import { fieldInputProps } from "@/components/KeyboardForm";
import { Text } from "@/components/Text";
import { Panel } from "@/components/Panel";
import { ScreenHeader } from "@/components/ScreenHeader";
import { SlokaCard, EmptyState } from "@/components/SlokaCard";
import {
  chapterIdRanges,
  chapterMoral,
  chapterSubtitle,
  chapterTags,
  chapterTitle,
  completedInChapter,
  getChapterMetas,
} from "@/data/chapters";
import { contentApi, progressApi } from "@/api/endpoints";
import { resolveRecitationUrl } from "@/audio/manifest";
import { prefetchAudioUrl } from "@/audio/narration";
import { useAuth } from "@/context/AuthContext";
import { useLanguage } from "@/context/LanguageContext";
import { useTheme } from "@/context/ThemeContext";
import { useFocusRefresh } from "@/hooks/useFocusRefresh";
import { getGuestProgress } from "@/storage/local";
import { radii, spacing } from "@/theme/tokens";
import type { Sloka } from "@/types";

const SEARCH_SUGGESTIONS = [
  "duty",
  "peace",
  "fear",
  "devotion",
  "शांति",
  "2.47",
];

/** Warm recitation cache for the continue verse (fail soft). */
async function prefetchContinueRecitation(
  continueSlokaId: number | null,
  cursor: { chapter: number; verse: number } | null
): Promise<void> {
  try {
    if (cursor?.chapter != null && cursor?.verse != null) {
      const url = await resolveRecitationUrl(cursor.chapter, cursor.verse);
      prefetchAudioUrl(url);
      return;
    }
    if (continueSlokaId == null) return;
    const sloka = await contentApi.sloka(continueSlokaId);
    const url = await resolveRecitationUrl(
      sloka.chapter,
      sloka.verse_number
    );
    prefetchAudioUrl(url);
  } catch {
    /* offline / missing audio — ignore */
  }
}

export default function ExploreScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const { lang, t } = useLanguage();
  const { isSignedIn } = useAuth();
  const [q, setQ] = useState("");
  const [tagFilter, setTagFilter] = useState<string | null>(null);
  const [completed, setCompleted] = useState<number[]>([]);
  const [continueSlokaId, setContinueSlokaId] = useState<number | null>(null);
  const [continueCursor, setContinueCursor] = useState<{
    chapter: number;
    verse: number;
  } | null>(null);
  const [searchResults, setSearchResults] = useState<Sloka[]>([]);
  const [nearest, setNearest] = useState<Sloka[]>([]);
  const [didYouMean, setDidYouMean] = useState<string[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchOffline, setSearchOffline] = useState(false);

  const allMetas = useMemo(() => getChapterMetas(), []);
  const rangesByChapter = useMemo(() => {
    const map = new Map<number, ReturnType<typeof chapterIdRanges>[number]>();
    for (const r of chapterIdRanges(allMetas)) map.set(r.chapter, r);
    return map;
  }, [allMetas]);

  const tagOptions = useMemo(() => {
    const map = new Map<string, string>();
    for (const chapter of allMetas) {
      const en = chapter.tags ?? [];
      const hi = chapter.tags_hi ?? [];
      en.forEach((tag, i) => {
        const key = tag.trim().toLowerCase();
        if (!key || map.has(key)) return;
        map.set(key, lang === "hi" && hi[i] ? hi[i] : tag);
      });
    }
    return Array.from(map.entries())
      .map(([key, label]) => ({ key, label }))
      .sort((a, b) =>
        a.label.localeCompare(b.label, lang === "hi" ? "hi" : "en")
      );
  }, [allMetas, lang]);

  const chapters = useMemo(() => {
    let list = allMetas;
    if (tagFilter) {
      list = list.filter((c) =>
        (c.tags ?? []).some((tag) => tag.trim().toLowerCase() === tagFilter)
      );
    }
    return list;
  }, [allMetas, tagFilter]);

  const chapterFallback = useMemo(() => {
    if (!q.trim() || !searchOffline) return [];
    const needle = q.trim().toLowerCase();
    return allMetas.filter((c) => {
      if (
        c.name.toLowerCase().includes(needle) ||
        (c.name_hi ?? "").includes(q) ||
        c.name_sanskrit.includes(q) ||
        String(c.number).includes(needle)
      ) {
        return true;
      }
      const tags = [...(c.tags ?? []), ...(c.tags_hi ?? [])].map((t) =>
        t.toLowerCase()
      );
      return tags.some((tag) => tag.includes(needle));
    });
  }, [q, allMetas, searchOffline]);

  const searchActive = Boolean(q.trim());

  useEffect(() => {
    const needle = q.trim();
    if (!needle) {
      setSearchResults([]);
      setNearest([]);
      setDidYouMean([]);
      setSearchOffline(false);
      setSearchLoading(false);
      return;
    }
    let alive = true;
    setSearchLoading(true);
    const handle = setTimeout(() => {
      void contentApi
        .searchVerses(needle)
        .then((data) => {
          if (!alive) return;
          setSearchResults(data.results);
          setNearest(data.nearest);
          setDidYouMean(data.didYouMean);
          setSearchOffline(false);
        })
        .catch(() => {
          if (!alive) return;
          setSearchResults([]);
          setNearest([]);
          setDidYouMean([]);
          setSearchOffline(true);
        })
        .finally(() => {
          if (alive) setSearchLoading(false);
        });
    }, 220);
    return () => {
      alive = false;
      clearTimeout(handle);
    };
  }, [q]);

  useFocusRefresh(
    "progress",
    async (isActive) => {
      try {
        const data = isSignedIn
          ? await progressApi.get()
          : await getGuestProgress();
        if (!isActive()) return;
        const nextContinue = data.continueSlokaId ?? null;
        const nextCursor = data.cursor ?? null;
        setCompleted(data.completed ?? []);
        setContinueSlokaId(nextContinue);
        setContinueCursor(nextCursor);
        void prefetchContinueRecitation(nextContinue, nextCursor);
      } catch (e) {
        throw e;
      }
    },
    { resetKey: String(isSignedIn) }
  );

  const onContinue = () => {
    if (continueSlokaId != null) {
      router.push(`/sloka/${continueSlokaId}`);
      return;
    }
    if (continueCursor) {
      router.push(`/(tabs)/explore/${continueCursor.chapter}`);
    }
  };

  return (
    <Screen testID="screen-explore">
      <ScreenHeader
        title={t("exploreTitle")}
        subtitle={t("explorePathLine")}
      />
      <Panel style={{ marginTop: spacing.md, padding: 0 }} padded={false}>
        <TextInput
          value={q}
          onChangeText={setQ}
          placeholder={t("searchPlaceholder")}
          placeholderTextColor={colors.textMuted}
          accessibilityLabel={t("searchLabel")}
          {...fieldInputProps}
          style={[styles.search, { color: colors.text }]}
        />
      </Panel>

      {!searchActive && tagOptions.length ? (
        <View style={{ marginTop: spacing.md }}>
          <Text variant="eyebrow" color={colors.textMuted}>
            {t("chapterFilterLabel")}
          </Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{
              gap: spacing.xs,
              paddingTop: spacing.xs,
              paddingRight: spacing.md,
            }}
          >
            <Pressable
              onPress={() => setTagFilter(null)}
              style={[
                styles.tagChip,
                {
                  borderColor:
                    tagFilter == null ? colors.brass : colors.line,
                  backgroundColor:
                    tagFilter == null
                      ? "rgba(201,162,39,0.16)"
                      : colors.surface,
                },
              ]}
            >
              <Text
                variant="muted"
                color={
                  tagFilter == null ? colors.brassSoft : colors.textMuted
                }
                style={{ fontSize: 11 }}
              >
                {t("chapterFilterAll")}
              </Text>
            </Pressable>
            {tagOptions.map(({ key, label }) => {
              const active = tagFilter === key;
              return (
                <Pressable
                  key={key}
                  onPress={() =>
                    setTagFilter((cur) => (cur === key ? null : key))
                  }
                  style={[
                    styles.tagChip,
                    {
                      borderColor: active ? colors.brass : colors.line,
                      backgroundColor: active
                        ? "rgba(201,162,39,0.16)"
                        : colors.surface,
                    },
                  ]}
                >
                  <Text
                    variant="muted"
                    color={active ? colors.brassSoft : colors.textMuted}
                    style={{ fontSize: 11 }}
                  >
                    {label}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>
      ) : null}

      {!searchActive && (continueSlokaId != null || continueCursor) ? (
        <View style={{ marginTop: spacing.md }}>
          <Button
            label={
              continueCursor
                ? `${t("continueReading")} · ${continueCursor.chapter}.${continueCursor.verse}`
                : t("continueReading")
            }
            onPress={onContinue}
          />
        </View>
      ) : null}

      {!searchActive ? (
        <View style={{ marginTop: spacing.md }}>
          <Text variant="eyebrow" color={colors.textMuted}>
            {t("tryThemes")}
          </Text>
          <View style={styles.suggestRow}>
            {SEARCH_SUGGESTIONS.map((s) => (
              <Pressable
                key={s}
                onPress={() => setQ(s)}
                style={[styles.tagChip, { borderColor: colors.line }]}
              >
                <Text variant="muted" color={colors.textMuted} style={{ fontSize: 11 }}>
                  {s}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>
      ) : null}

      {searchActive ? (
        <ScrollView
          contentContainerStyle={{
            paddingTop: spacing.md,
            paddingBottom: spacing.contentBottom,
            gap: spacing.sm,
          }}
          showsVerticalScrollIndicator={false}
        >
          <Text variant="muted">
            {searchLoading
              ? t("searching")
              : searchOffline
                ? t("searchNeedsConnection")
                : `${searchResults.length} ${
                    searchResults.length === 1 ? t("result") : t("results")
                  }`}
          </Text>
          {searchLoading ? (
            <ActivityIndicator color={colors.brass} />
          ) : null}
          {!searchLoading && searchOffline && chapterFallback.length > 0
            ? chapterFallback.map((item) => (
                <Pressable
                  key={item.number}
                  onPress={() => router.push(`/(tabs)/explore/${item.number}`)}
                  style={[
                    styles.offlineChapter,
                    { borderColor: colors.line, backgroundColor: colors.surface },
                  ]}
                >
                  <Text variant="title" style={{ fontSize: 16 }}>
                    {chapterTitle(item, lang)}
                  </Text>
                  <Text variant="muted">
                    {t("chapter")} {item.number}
                  </Text>
                </Pressable>
              ))
            : null}
          {!searchLoading &&
            searchResults.map((sloka) => (
              <SlokaCard key={sloka.id} sloka={sloka} lang={lang} />
            ))}
          {!searchLoading &&
          !searchOffline &&
          searchResults.length === 0 ? (
            <EmptyState
              title={t("noSearchResults")}
              body={t("searchEmptyHint")}
            />
          ) : null}
          {!searchLoading && didYouMean.length > 0 ? (
            <View style={styles.suggestRow}>
              <Text variant="eyebrow" color={colors.textMuted} style={{ width: "100%" }}>
                {t("didYouMean")}
              </Text>
              {didYouMean.map((term) => (
                <Pressable
                  key={term}
                  onPress={() => setQ(term)}
                  style={[
                    styles.tagChip,
                    {
                      borderColor: colors.brass,
                      backgroundColor: "rgba(201,162,39,0.12)",
                    },
                  ]}
                >
                  <Text variant="muted" color={colors.brassSoft} style={{ fontSize: 11 }}>
                    {term}
                  </Text>
                </Pressable>
              ))}
            </View>
          ) : null}
          {!searchLoading && nearest.length > 0 ? (
            <View style={{ gap: spacing.sm }}>
              <Text variant="muted">{t("nearestVerses")}</Text>
              {nearest.map((sloka) => (
                <SlokaCard key={`n-${sloka.id}`} sloka={sloka} lang={lang} />
              ))}
            </View>
          ) : null}
          {!searchLoading ? (
            <View style={styles.suggestRow}>
              {SEARCH_SUGGESTIONS.map((s) => (
                <Pressable
                  key={`s-${s}`}
                  onPress={() => setQ(s)}
                  style={[styles.tagChip, { borderColor: colors.line }]}
                >
                  <Text variant="muted" color={colors.textMuted} style={{ fontSize: 11 }}>
                    {s}
                  </Text>
                </Pressable>
              ))}
              <Pressable onPress={() => setQ("")}>
                <Text color={colors.brassSoft}>{t("browseChapters")}</Text>
              </Pressable>
            </View>
          ) : null}
        </ScrollView>
      ) : (
        <FlatList
          data={chapters}
          keyExtractor={(c) => String(c.number)}
          numColumns={2}
          columnWrapperStyle={{ gap: spacing.sm }}
          contentContainerStyle={{
            gap: spacing.sm,
            paddingTop: spacing.md,
            paddingBottom: spacing.contentBottom,
          }}
          renderItem={({ item }) => {
            const range = rangesByChapter.get(item.number);
            const done = range
              ? completedInChapter(completed, range)
              : 0;
            const total = item.verses_count;
            const chapterDone = total > 0 && done >= total;
            return (
              <Pressable
                testID={`explore-chapter-${item.number}`}
                onPress={() => router.push(`/(tabs)/explore/${item.number}`)}
                style={({ pressed }) => [
                  styles.tile,
                  {
                    backgroundColor: pressed
                      ? colors.surfaceHover
                      : colors.surface,
                    borderColor: chapterDone ? colors.brass : colors.line,
                  },
                ]}
              >
                <View
                  style={[
                    styles.progress,
                    {
                      borderColor: colors.brass,
                      backgroundColor: chapterDone
                        ? "rgba(201,162,39,0.14)"
                        : "transparent",
                    },
                  ]}
                >
                  <Text
                    color={colors.brassSoft}
                    style={{ fontFamily: "Sora_600SemiBold", fontSize: 13 }}
                  >
                    {chapterDone ? "✓" : item.number}
                  </Text>
                </View>
                <Text
                  variant="title"
                  style={{ fontSize: 16, marginTop: spacing.sm }}
                  numberOfLines={2}
                >
                  {chapterTitle(item, lang)}
                </Text>
                {chapterSubtitle(item, lang) ? (
                  <Text
                    variant="muted"
                    style={{ marginTop: 4 }}
                    numberOfLines={1}
                  >
                    {chapterSubtitle(item, lang)}
                  </Text>
                ) : null}
                {chapterTags(item, lang).length ? (
                  <Text
                    variant="muted"
                    color={colors.brassSoft}
                    style={{ marginTop: spacing.sm, fontSize: 11 }}
                    numberOfLines={2}
                  >
                    {chapterTags(item, lang).slice(0, 3).join(" · ")}
                  </Text>
                ) : null}
                {chapterMoral(item, lang) ? (
                  <Text
                    variant="soft"
                    style={{ marginTop: spacing.sm }}
                    numberOfLines={2}
                  >
                    {chapterMoral(item, lang)}
                  </Text>
                ) : null}
                <Text
                  variant="muted"
                  style={{ marginTop: spacing.sm }}
                  numberOfLines={1}
                >
                  {done > 0
                    ? t("chapterProgressDone")
                        .replace("{done}", String(done))
                        .replace("{total}", String(total))
                    : t("chapterVerseCount").replace("{total}", String(total))}
                </Text>
              </Pressable>
            );
          }}
        />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  search: {
    paddingHorizontal: spacing.md,
    paddingVertical: 14,
    fontFamily: "Sora_400Regular",
    fontSize: 16,
  },
  tagChip: {
    borderWidth: StyleSheet.hairlineWidth * 2,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    borderRadius: radii.sm,
  },
  suggestRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.xs,
    marginTop: spacing.xs,
  },
  offlineChapter: {
    borderWidth: StyleSheet.hairlineWidth * 2,
    borderRadius: radii.lg,
    padding: spacing.md,
  },
  tile: {
    flex: 1,
    minHeight: 180,
    borderRadius: radii.lg,
    borderWidth: StyleSheet.hairlineWidth * 2,
    padding: spacing.md,
  },
  progress: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth * 2,
    alignItems: "center",
    justifyContent: "center",
  },
});

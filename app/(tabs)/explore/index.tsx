import React, { useMemo, useState } from "react";
import {
  FlatList,
  Pressable,
  StyleSheet,
  TextInput,
  View,
} from "react-native";
import { useRouter } from "expo-router";
import { Button } from "@/components/Button";
import { Screen } from "@/components/Screen";
import { Text } from "@/components/Text";
import { Panel } from "@/components/Panel";
import { ScreenHeader } from "@/components/ScreenHeader";
import {
  chapterIdRanges,
  chapterMoral,
  chapterSubtitle,
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
  const [completed, setCompleted] = useState<number[]>([]);
  const [continueSlokaId, setContinueSlokaId] = useState<number | null>(null);
  const [continueCursor, setContinueCursor] = useState<{
    chapter: number;
    verse: number;
  } | null>(null);

  const allMetas = useMemo(() => getChapterMetas(), []);
  const rangesByChapter = useMemo(() => {
    const map = new Map<number, ReturnType<typeof chapterIdRanges>[number]>();
    for (const r of chapterIdRanges(allMetas)) map.set(r.chapter, r);
    return map;
  }, [allMetas]);

  const chapters = useMemo(() => {
    if (!q.trim()) return allMetas;
    const needle = q.trim().toLowerCase();
    return allMetas.filter(
      (c) =>
        c.name.toLowerCase().includes(needle) ||
        (c.name_hi ?? "").includes(q) ||
        c.name_sanskrit.includes(q) ||
        String(c.number).includes(needle)
    );
  }, [q, allMetas]);

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
        // Offline-friendly: warm the continue verse Speaks URL on Explore focus.
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
        title={lang === "hi" ? "अन्वेषण" : "Explore"}
        subtitle={
          lang === "hi" ? "अठारह अध्याय, एक मार्ग" : "Eighteen chapters, one path"
        }
      />
      <Panel style={{ marginTop: spacing.md, padding: 0 }} padded={false}>
        <TextInput
          value={q}
          onChangeText={setQ}
          placeholder={lang === "hi" ? "अध्याय खोजें" : "Search chapters"}
          placeholderTextColor={colors.textMuted}
          style={[styles.search, { color: colors.text }]}
        />
      </Panel>
      {continueSlokaId != null || continueCursor ? (
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
              {chapterMoral(item, lang) ? (
                <Text
                  variant="soft"
                  style={{ marginTop: spacing.sm }}
                  numberOfLines={3}
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
                  ? `${done}/${total} ${lang === "hi" ? "पूर्ण" : "done"} →`
                  : `${total} ${lang === "hi" ? "श्लोक" : "verses"} →`}
              </Text>
            </Pressable>
          );
        }}
      />
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

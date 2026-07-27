import React, { useEffect, useState } from "react";
import { ActivityIndicator, FlatList, View } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { Screen } from "@/components/Screen";
import { Text } from "@/components/Text";
import { SlokaCard, EmptyState } from "@/components/SlokaCard";
import { ScreenHeader } from "@/components/ScreenHeader";
import { contentApi } from "@/api/endpoints";
import { getChapterMeta } from "@/data/chapters";
import { useLanguage } from "@/context/LanguageContext";
import { useTheme } from "@/context/ThemeContext";
import { spacing } from "@/theme/tokens";
import type { Sloka } from "@/types";

export default function ChapterScreen() {
  const { chapter } = useLocalSearchParams<{ chapter: string }>();
  const chapterNum = Number(chapter);
  const meta = getChapterMeta(chapterNum);
  const { lang } = useLanguage();
  const { colors } = useTheme();
  const [slokas, setSlokas] = useState<Sloka[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    setLoading(true);
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

  return (
    <Screen>
      <ScreenHeader
        showBack
        backFallback="/(tabs)/explore"
        title={meta?.name ?? `Chapter ${chapterNum}`}
        subtitle={`Chapter ${chapterNum}`}
      />
      {meta?.summary ? (
        <Text variant="soft" style={{ marginBottom: spacing.sm }}>
          {meta.summary}
        </Text>
      ) : null}

      {loading ? (
        <View style={{ marginTop: spacing.xl }}>
          <ActivityIndicator color={colors.brass} />
        </View>
      ) : error ? (
        <EmptyState title="Couldn’t load" body={error} />
      ) : (
        <FlatList
          data={slokas}
          keyExtractor={(s) => String(s.id)}
          contentContainerStyle={{ paddingTop: spacing.md, paddingBottom: 120 }}
          renderItem={({ item }) => <SlokaCard sloka={item} lang={lang} />}
          ListEmptyComponent={
            <EmptyState
              title={lang === "hi" ? "कोई श्लोक नहीं" : "No verses"}
              body={
                lang === "hi"
                  ? "API से श्लोक नहीं मिले।"
                  : "No verses returned from the API."
              }
            />
          }
        />
      )}
    </Screen>
  );
}

import React, { useEffect, useState } from "react";
import { ActivityIndicator, FlatList, View } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { Screen } from "@/components/Screen";
import { SlokaCard, EmptyState } from "@/components/SlokaCard";
import { ScreenHeader } from "@/components/ScreenHeader";
import { contentApi } from "@/api/endpoints";
import { getMoodById } from "@/data/moods";
import { useLanguage } from "@/context/LanguageContext";
import { useTheme } from "@/context/ThemeContext";
import { spacing } from "@/theme/tokens";
import type { Sloka } from "@/types";

export default function MoodDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const mood = getMoodById(id);
  const { lang } = useLanguage();
  const { colors } = useTheme();
  const [slokas, setSlokas] = useState<Sloka[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    contentApi
      .moodSlokas(id)
      .then((res) => {
        if (alive) setSlokas(res.slokas ?? []);
      })
      .catch((e) => {
        if (alive) setError(e.message ?? "Failed");
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [id]);

  return (
    <Screen>
      <ScreenHeader
        showBack
        backFallback="/(tabs)/mood"
        title={lang === "hi" ? mood?.labelHi : mood?.label ?? id}
      />

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
              title={lang === "hi" ? "कोई श्लोक नहीं" : "No verses yet"}
              body={
                lang === "hi"
                  ? "इस मनोदशा के लिए श्लोक नहीं मिले।"
                  : "No verses for this mood."
              }
            />
          }
        />
      )}
    </Screen>
  );
}

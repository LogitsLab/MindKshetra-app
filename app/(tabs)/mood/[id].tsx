import React, { useEffect, useState } from "react";
import { ActivityIndicator, FlatList, View } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { Screen } from "@/components/Screen";
import { SlokaCard, EmptyState } from "@/components/SlokaCard";
import { ScreenHeader } from "@/components/ScreenHeader";
import { MoodIcon } from "@/components/MoodIcon";
import { contentApi } from "@/api/endpoints";
import { getMoodById } from "@/data/moods";
import { useLanguage } from "@/context/LanguageContext";
import { useTheme } from "@/context/ThemeContext";
import { moodAccent } from "@/theme/assets";
import { spacing } from "@/theme/tokens";
import type { Sloka } from "@/types";

export default function MoodDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const mood = getMoodById(id);
  const { lang, t } = useLanguage();
  const { colors } = useTheme();
  const [slokas, setSlokas] = useState<Sloka[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

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
  }, [id, reloadKey]);

  const accent = moodAccent[id] ?? colors.brass;

  return (
    <Screen testID="screen-mood-detail">
      <ScreenHeader
        showBack
        backFallback="/(tabs)/mood"
        title={lang === "hi" ? mood?.labelHi : mood?.label ?? id}
      />
      {mood ? (
        <View style={{ alignItems: "center", marginTop: spacing.sm }}>
          <MoodIcon id={mood.id} size={40} color={accent} />
        </View>
      ) : null}

      {loading ? (
        <View style={{ marginTop: spacing.xl }}>
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
        <FlatList
          data={slokas}
          keyExtractor={(s) => String(s.id)}
          contentContainerStyle={{ paddingTop: spacing.md, paddingBottom: 120 }}
          renderItem={({ item }) => <SlokaCard sloka={item} lang={lang} />}
          ListEmptyComponent={
            <EmptyState
              title={t("noVersesYet")}
              body={t("noMoodMatch")}
            />
          }
        />
      )}
    </Screen>
  );
}

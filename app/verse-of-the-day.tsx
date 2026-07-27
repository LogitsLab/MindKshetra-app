import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import { useRouter } from "expo-router";
import { Screen } from "@/components/Screen";
import { Text } from "@/components/Text";
import { Button } from "@/components/Button";
import { EmptyState } from "@/components/SlokaCard";
import { contentApi } from "@/api/endpoints";
import { useLanguage } from "@/context/LanguageContext";
import { useTheme } from "@/context/ThemeContext";
import { radii, spacing } from "@/theme/tokens";
import type { Sloka } from "@/types";

export default function VerseOfTheDayScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const { lang } = useLanguage();
  const [sloka, setSloka] = useState<Sloka | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const id = (Math.floor(Date.now() / 86400000) % 701) + 1;

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const data = await contentApi.sloka(id);
        if (alive) setSloka(data);
      } catch (e) {
        try {
          const list = await contentApi.slokas({ limit: 1 });
          if (alive) setSloka(list.slokas?.[0] ?? null);
        } catch {
          if (alive) setError((e as Error).message);
        }
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [id]);

  if (loading) {
    return (
      <Screen>
        <ActivityIndicator color={colors.brass} style={{ marginTop: spacing.xl }} />
      </Screen>
    );
  }

  if (error || !sloka) {
    return (
      <Screen>
        <EmptyState
          title={lang === "hi" ? "श्लोक नहीं मिला" : "Verse unavailable"}
          body={error ?? (lang === "hi" ? "बाद में फिर कोशिश करें।" : "Try again later.")}
        />
      </Screen>
    );
  }

  const translation =
    lang === "hi" ? sloka.hindi_translation : sloka.english_translation;

  return (
    <Screen>
      <ScrollView contentContainerStyle={{ paddingBottom: 120, paddingTop: spacing.md }}>
        <Text variant="eyebrow">Verse of the day</Text>
        <Text variant="display" style={{ marginTop: spacing.sm }}>
          {lang === "hi" ? "आज का श्लोक" : "Today’s verse"}
        </Text>

        <Pressable
          onPress={() => router.push(`/sloka/${sloka.id}`)}
          style={[
            styles.card,
            { backgroundColor: colors.panel, borderColor: colors.line },
          ]}
        >
          <Text variant="eyebrow">
            {sloka.chapter}.{sloka.verse_number}
          </Text>
          <Text variant="sanskrit" style={{ marginTop: spacing.md }}>
            {sloka.sanskrit_devanagari}
          </Text>
          <Text variant="muted" style={{ marginTop: spacing.md }}>
            {sloka.transliteration_iast}
          </Text>
          <Text variant="soft" style={{ marginTop: spacing.lg, fontSize: 17 }}>
            {translation}
          </Text>
        </Pressable>

        <View style={{ marginTop: spacing.lg }}>
          <Button
            label={lang === "hi" ? "पूर्ण श्लोक खोलें" : "Open full verse"}
            onPress={() => router.push(`/sloka/${sloka.id}`)}
          />
        </View>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: {
    marginTop: spacing.lg,
    padding: spacing.lg,
    borderRadius: radii.lg,
    borderWidth: StyleSheet.hairlineWidth * 2,
  },
});

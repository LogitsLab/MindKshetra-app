import React from "react";
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
import { Panel } from "@/components/Panel";
import { Rise } from "@/components/Rise";
import { EmptyState } from "@/components/SlokaCard";
import { useLanguage } from "@/context/LanguageContext";
import { useTheme } from "@/context/ThemeContext";
import { useVotd } from "@/hooks/useVotd";
import { spacing } from "@/theme/tokens";

export default function VerseOfTheDayScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const { lang, t } = useLanguage();
  const { votd: sloka, loading, error, nakshatra } = useVotd();

  if (loading) {
    return (
      <Screen atmosphere="soft">
        <ActivityIndicator color={colors.brass} style={{ marginTop: spacing.xl }} />
      </Screen>
    );
  }

  if (error || !sloka) {
    return (
      <Screen>
        <EmptyState
          title={lang === "hi" ? "श्लोक नहीं मिला" : "Verse unavailable"}
          body={
            error ??
            (lang === "hi" ? "बाद में फिर कोशिश करें।" : "Try again later.")
          }
        />
      </Screen>
    );
  }

  const translation =
    lang === "hi" ? sloka.hindi_translation : sloka.english_translation;

  return (
    <Screen atmosphere="soft">
      <ScrollView contentContainerStyle={{ paddingBottom: 120, paddingTop: spacing.md }}>
        <Rise>
          <Text variant="eyebrow" color={colors.brassSoft}>
            Verse of the day
          </Text>
          <Text variant="display" style={{ marginTop: spacing.sm }}>
            {lang === "hi" ? "आज का श्लोक" : "Today’s verse"}
          </Text>
        </Rise>

        <Pressable onPress={() => router.push(`/sloka/${sloka.id}`)}>
          <Panel style={{ marginTop: spacing.lg }}>
            <Text variant="eyebrow" color={colors.brassSoft}>
              {sloka.chapter}.{sloka.verse_number}
            </Text>
            <Text variant="sanskrit" style={{ marginTop: spacing.md }}>
              {sloka.sanskrit_devanagari}
            </Text>
            <View style={[styles.divider, { backgroundColor: colors.line }]} />
            <Text variant="muted" style={{ marginTop: spacing.md, fontStyle: "italic" }}>
              {sloka.transliteration_iast}
            </Text>
            <Text variant="soft" style={{ marginTop: spacing.lg, fontSize: 17 }}>
              {translation}
            </Text>
          </Panel>
        </Pressable>

        {nakshatra ? (
          <Text variant="muted" style={{ marginTop: spacing.sm }}>
            {t("votdNakshatraLine").replace("{nakshatra}", nakshatra)}
          </Text>
        ) : null}

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
  divider: {
    marginTop: spacing.lg,
    height: StyleSheet.hairlineWidth * 2,
    width: 48,
  },
});

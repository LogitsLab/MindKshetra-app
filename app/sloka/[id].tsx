import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  TextInput,
  View,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import * as Speech from "expo-speech";
import * as Haptics from "expo-haptics";
import { Screen } from "@/components/Screen";
import { Text } from "@/components/Text";
import { Button } from "@/components/Button";
import { EmptyState } from "@/components/SlokaCard";
import { contentApi, progressApi, userApi } from "@/api/endpoints";
import { useAuth } from "@/context/AuthContext";
import { useLanguage } from "@/context/LanguageContext";
import { useMadhav } from "@/context/MadhavContext";
import { useTheme } from "@/context/ThemeContext";
import { cacheVerse, getCachedVerse, markGuestComplete } from "@/storage/local";
import { getApiUrl } from "@/api/client";
import { radii, spacing } from "@/theme/tokens";
import type { Sloka } from "@/types";

export default function SlokaScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const slokaId = Number(id);
  const router = useRouter();
  const { colors } = useTheme();
  const { lang } = useLanguage();
  const { isSignedIn } = useAuth();
  const { askAboutVerse, setVerseContext } = useMadhav();
  const [sloka, setSloka] = useState<Sloka | null>(null);
  const [story, setStory] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [favorited, setFavorited] = useState(false);
  const [journal, setJournal] = useState("");
  const [showJournal, setShowJournal] = useState(false);

  useEffect(() => {
    setVerseContext(slokaId);
    return () => setVerseContext(null);
  }, [slokaId, setVerseContext]);

  useEffect(() => {
    let alive = true;
    (async () => {
      const cached = await getCachedVerse<Sloka>(slokaId);
      if (cached && alive) setSloka(cached);
      try {
        const data = await contentApi.sloka(slokaId);
        if (!alive) return;
        setSloka(data);
        await cacheVerse(slokaId, data);
      } catch (e) {
        if (alive && !cached) setError((e as Error).message);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [slokaId]);

  useEffect(() => {
    if (!sloka) return;
    contentApi
      .story(sloka.id, lang)
      .then((r) => setStory(r.story))
      .catch(() => undefined);
  }, [sloka, lang]);

  if (loading && !sloka) {
    return (
      <Screen>
        <ActivityIndicator color={colors.brass} style={{ marginTop: spacing.xl }} />
      </Screen>
    );
  }

  if (error || !sloka) {
    return (
      <Screen>
        <EmptyState title="Not found" body={error ?? "Verse missing"} />
      </Screen>
    );
  }

  const translation =
    lang === "hi" ? sloka.hindi_translation : sloka.english_translation;
  const meaning =
    lang === "hi"
      ? sloka.hindi_meaning ?? sloka.english_meaning
      : sloka.english_meaning ?? sloka.hindi_meaning;

  return (
    <Screen padded={false}>
      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: spacing.md,
          paddingBottom: 140,
          paddingTop: spacing.sm,
        }}
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
        {meaning ? (
          <Text variant="body" style={{ marginTop: spacing.md, color: colors.textSoft }}>
            {meaning}
          </Text>
        ) : null}
        {story ? (
          <View
            style={[
              styles.story,
              { borderColor: colors.line, backgroundColor: colors.panel },
            ]}
          >
            <Text variant="eyebrow">Story</Text>
            <Text variant="soft" style={{ marginTop: spacing.sm }}>
              {story}
            </Text>
          </View>
        ) : null}

        {showJournal ? (
          <View style={{ marginTop: spacing.lg, gap: spacing.sm }}>
            <TextInput
              value={journal}
              onChangeText={setJournal}
              multiline
              placeholder={lang === "hi" ? "आपका चिन्तन…" : "Your reflection…"}
              placeholderTextColor={colors.textMuted}
              style={[
                styles.input,
                {
                  color: colors.text,
                  borderColor: colors.line,
                  backgroundColor: colors.inputBg,
                },
              ]}
            />
            <Button
              label={lang === "hi" ? "सहेजें" : "Save reflection"}
              onPress={async () => {
                if (!journal.trim()) return;
                if (isSignedIn) {
                  await userApi.addJournal(sloka.id, journal.trim());
                }
                setJournal("");
                setShowJournal(false);
                void Haptics.notificationAsync(
                  Haptics.NotificationFeedbackType.Success
                );
              }}
            />
          </View>
        ) : null}
      </ScrollView>

      <View
        style={[
          styles.toolbar,
          { backgroundColor: colors.navBg, borderTopColor: colors.hairline },
        ]}
      >
        <Tool
          label={favorited ? "★" : "☆"}
          onPress={async () => {
            if (!isSignedIn) {
              router.push("/account");
              return;
            }
            if (favorited) {
              await userApi.removeFavorite(sloka.id);
              setFavorited(false);
            } else {
              await userApi.addFavorite(sloka.id);
              setFavorited(true);
            }
            void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          }}
        />
        <Tool
          label="Speak"
          onPress={() => {
            Speech.stop();
            Speech.speak(translation, { language: lang === "hi" ? "hi-IN" : "en-US" });
          }}
        />
        <Tool
          label="Share"
          onPress={() => {
            Share.share({
              message: `${sloka.chapter}.${sloka.verse_number}\n${sloka.sanskrit_devanagari}\n${translation}\n${getApiUrl()}/sloka/${sloka.id}`,
            });
          }}
        />
        <Tool label="Journal" onPress={() => setShowJournal((v) => !v)} />
        <Tool
          label="Done"
          onPress={async () => {
            await markGuestComplete(sloka.id);
            if (isSignedIn) {
              try {
                await progressApi.complete(sloka.id);
              } catch {
                /* ignore */
              }
            }
            void Haptics.notificationAsync(
              Haptics.NotificationFeedbackType.Success
            );
          }}
        />
        <Tool
          label="Ask"
          onPress={() => {
            askAboutVerse(
              sloka.id,
              `Please reflect on Gita ${sloka.chapter}.${sloka.verse_number}`
            );
            router.push("/madhav");
          }}
        />
      </View>
    </Screen>
  );
}

function Tool({ label, onPress }: { label: string; onPress: () => void }) {
  const { colors } = useTheme();
  return (
    <Pressable onPress={onPress} hitSlop={8}>
      <Text variant="muted" style={{ color: colors.brassSoft, fontSize: 12 }}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  story: {
    marginTop: spacing.lg,
    padding: spacing.md,
    borderRadius: radii.md,
    borderWidth: StyleSheet.hairlineWidth * 2,
  },
  toolbar: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: "row",
    justifyContent: "space-around",
    paddingVertical: spacing.md,
    paddingBottom: spacing.lg,
    borderTopWidth: StyleSheet.hairlineWidth * 2,
  },
  input: {
    minHeight: 100,
    borderWidth: StyleSheet.hairlineWidth * 2,
    borderRadius: radii.md,
    padding: spacing.md,
    textAlignVertical: "top",
    fontFamily: "Sora_400Regular",
  },
});

import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  TextInput,
  View,
  Platform,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { playOrSpeak, stopNarration } from "@/audio/narration";
import { resolveRecitationUrl } from "@/audio/manifest";
import * as Haptics from "expo-haptics";
import { BlurView } from "expo-blur";
import { Screen } from "@/components/Screen";
import { Text } from "@/components/Text";
import { Button } from "@/components/Button";
import { Panel } from "@/components/Panel";
import { Rise } from "@/components/Rise";
import { EmptyState } from "@/components/SlokaCard";
import { contentApi, eventsApi, progressApi, userApi } from "@/api/endpoints";
import { useAuth } from "@/context/AuthContext";
import { useLanguage } from "@/context/LanguageContext";
import { useMadhav } from "@/context/MadhavContext";
import { useTheme } from "@/context/ThemeContext";
import { bumpFocusVersion } from "@/hooks/useFocusRefresh";
import {
  addJournalDraft,
  cacheVerse,
  getCachedVerse,
  markGuestComplete,
  setGuestCursor,
} from "@/storage/local";
import { getApiUrl } from "@/api/client";
import { radii, spacing } from "@/theme/tokens";
import type { Sloka } from "@/types";

export default function SlokaScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const slokaId = Number(id);
  const router = useRouter();
  const { colors, mode } = useTheme();
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
  const [journalNotice, setJournalNotice] = useState<string | null>(null);

  useEffect(() => {
    setVerseContext(slokaId);
    return () => setVerseContext(null);
  }, [slokaId, setVerseContext]);

  // The star used to start empty forever — state was never hydrated, so a
  // saved verse looked unsaved and tapping it re-added the favorite.
  useEffect(() => {
    if (!isSignedIn) {
      setFavorited(false);
      return;
    }
    let alive = true;
    userApi
      .favoriteStatus(slokaId)
      .then((r) => {
        if (alive) setFavorited(Boolean(r.saved));
      })
      .catch(() => undefined);
    return () => {
      alive = false;
    };
  }, [slokaId, isSignedIn]);

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
    // Guest cursor always (offline resilience); the server cursor too when
    // signed in — "Continue reading" reads the server for members and was
    // permanently stale without this.
    void setGuestCursor(sloka.chapter, sloka.verse_number);
    if (isSignedIn) {
      progressApi.setCursor(sloka.id).catch(() => undefined);
    }
    // The cursor moved — "Continue reading" on explore must not serve its
    // TTL-cached copy on the next focus.
    bumpFocusVersion("progress");
    contentApi
      .story(sloka.id, lang)
      .then((r) => setStory(r.story))
      .catch(() => undefined);
  }, [sloka, lang, isSignedIn]);

  if (loading && !sloka) {
    return (
      <Screen atmosphere="strong">
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

  const toolbar = (
    <View style={styles.toolbarInner}>
      <Tool
        glyph={favorited ? "★" : "☆"}
        label={lang === "hi" ? "पसंद" : "Save"}
        onPress={async () => {
          if (!isSignedIn) {
            router.push("/account");
            return;
          }
          const next = !favorited;
          setFavorited(next);
          void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          try {
            if (next) await userApi.addFavorite(sloka.id);
            else await userApi.removeFavorite(sloka.id);
            bumpFocusVersion("favorites");
          } catch {
            setFavorited(!next);
          }
        }}
      />
      <Tool
        glyph="♪"
        label={lang === "hi" ? "सुनें" : "Speak"}
        onPress={() => {
          stopNarration();
          void (async () => {
            // The shloka recitation is the thing worth hearing; the spoken
            // translation (pre-generated or TTS) is the fallback.
            const recitation = await resolveRecitationUrl(
              sloka.chapter,
              sloka.verse_number
            );
            void playOrSpeak(translation, { lang, url: recitation });
          })();
        }}
      />
      <Tool
        glyph="↗"
        label={lang === "hi" ? "साझा" : "Share"}
        onPress={() => {
          void Share.share({
            message: `${sloka.chapter}.${sloka.verse_number}\n${sloka.sanskrit_devanagari}\n${translation}\n${getApiUrl()}/sloka/${sloka.id}`,
          })
            .then((result) => {
              if (result.action === Share.sharedAction) {
                void eventsApi.send("share_card", {
                  method: "sheet",
                  slokaId: sloka.id,
                });
              }
            })
            .catch(() => {});
        }}
      />
      <Tool
        glyph="✎"
        label={lang === "hi" ? "जर्नल" : "Journal"}
        onPress={() => setShowJournal((v) => !v)}
      />
      <Tool
        glyph="✓"
        label={lang === "hi" ? "पूर्ण" : "Done"}
        onPress={async () => {
          await markGuestComplete(sloka.id);
          if (isSignedIn) {
            try {
              await progressApi.complete(sloka.id);
            } catch {
              /* ignore */
            }
          }
          bumpFocusVersion("progress");
          void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }}
      />
      <Tool
        glyph="M"
        label={lang === "hi" ? "पूछें" : "Ask"}
        onPress={() => {
          askAboutVerse(
            sloka.id,
            `Please reflect on Gita ${sloka.chapter}.${sloka.verse_number}`
          );
          router.push("/madhav");
        }}
      />
    </View>
  );

  return (
    <Screen padded={false} atmosphere="strong">
      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: spacing.md,
          paddingBottom: 150,
          paddingTop: spacing.sm,
        }}
      >
        <Rise>
          <Text variant="eyebrow" color={colors.brassSoft}>
            {sloka.chapter}.{sloka.verse_number}
          </Text>
          <Text
            variant="sanskrit"
            style={{ marginTop: spacing.lg, fontSize: 26, lineHeight: 40 }}
          >
            {sloka.sanskrit_devanagari}
          </Text>
        </Rise>
        <View style={[styles.divider, { backgroundColor: colors.line }]} />
        <Text variant="muted" style={{ marginTop: spacing.md, fontStyle: "italic" }}>
          {sloka.transliteration_iast}
        </Text>
        <Text variant="soft" style={{ marginTop: spacing.lg, fontSize: 17, lineHeight: 26 }}>
          {translation}
        </Text>
        {meaning ? (
          <Text variant="body" style={{ marginTop: spacing.md, color: colors.textSoft }}>
            {meaning}
          </Text>
        ) : null}
        {story ? (
          <Panel style={{ marginTop: spacing.xl }}>
            <Text variant="eyebrow" color={colors.brassSoft}>
              Story
            </Text>
            <Text variant="soft" style={{ marginTop: spacing.sm }}>
              {story}
            </Text>
          </Panel>
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
                const text = journal.trim();
                if (!text) return;
                if (isSignedIn) {
                  await userApi.addJournal(sloka.id, text);
                  bumpFocusVersion("journal");
                  setJournalNotice(null);
                  void Haptics.notificationAsync(
                    Haptics.NotificationFeedbackType.Success
                  );
                } else {
                  // Guests used to lose the text silently — the input cleared
                  // with a success haptic and nothing was stored anywhere.
                  await addJournalDraft(sloka.id, text);
                  setJournalNotice(
                    lang === "hi"
                      ? "इस डिवाइस पर सहेजा गया — खाते में रखने के लिए साइन इन करें।"
                      : "Saved on this device — sign in to keep it in your account."
                  );
                  void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                }
                setJournal("");
                setShowJournal(false);
              }}
            />
          </View>
        ) : null}

        {journalNotice ? (
          <Pressable
            onPress={() => router.push("/account")}
            style={{ marginTop: spacing.md }}
          >
            <Panel>
              <Text variant="soft" color={colors.brassSoft}>
                {journalNotice}
              </Text>
            </Panel>
          </Pressable>
        ) : null}
      </ScrollView>

      {Platform.OS === "ios" ? (
        <BlurView
          intensity={mode === "dark" ? 40 : 50}
          tint={mode === "dark" ? "dark" : "light"}
          style={[styles.toolbar, { borderTopColor: colors.hairline }]}
        >
          {toolbar}
        </BlurView>
      ) : (
        <View
          style={[
            styles.toolbar,
            { backgroundColor: colors.navBg, borderTopColor: colors.hairline },
          ]}
        >
          {toolbar}
        </View>
      )}
    </Screen>
  );
}

function Tool({
  glyph,
  label,
  onPress,
}: {
  glyph: string;
  label: string;
  onPress: () => void;
}) {
  const { colors } = useTheme();
  return (
    <Pressable onPress={onPress} hitSlop={10} style={styles.tool}>
      <Text
        style={{
          color: colors.brassSoft,
          fontSize: 16,
          fontFamily: "Fraunces_600SemiBold",
        }}
      >
        {glyph}
      </Text>
      <Text
        variant="muted"
        style={{ color: colors.textMuted, fontSize: 10, marginTop: 2 }}
      >
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  divider: {
    marginTop: spacing.lg,
    height: StyleSheet.hairlineWidth * 2,
    width: 64,
  },
  toolbar: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    borderTopWidth: StyleSheet.hairlineWidth * 2,
    paddingBottom: spacing.md,
  },
  toolbarInner: {
    flexDirection: "row",
    justifyContent: "space-around",
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.xs,
  },
  tool: { alignItems: "center", minWidth: 48 },
  input: {
    minHeight: 100,
    borderWidth: StyleSheet.hairlineWidth * 2,
    borderRadius: radii.md,
    padding: spacing.md,
    textAlignVertical: "top",
    fontFamily: "Sora_400Regular",
  },
});

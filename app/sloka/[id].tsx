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
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { Circle, Path } from "react-native-svg";
import { playOrSpeak, stopNarration } from "@/audio/narration";
import { resolveRecitationUrl } from "@/audio/manifest";
import * as Haptics from "expo-haptics";
import { BlurView } from "expo-blur";
import { Screen } from "@/components/Screen";
import { Text } from "@/components/Text";
import { Button } from "@/components/Button";
import { Panel } from "@/components/Panel";
import { Rise } from "@/components/Rise";
import { MadhavMark } from "@/components/BrandMark";
import { BackButton } from "@/components/ScreenHeader";
import { EmptyState } from "@/components/SlokaCard";
import {
  NotificationPrompt,
  maybeShowNotificationPrompt,
} from "@/components/NotificationPrompt";
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
  queuePendingProgress,
  setGuestCursor,
} from "@/storage/local";
import { getApiUrl } from "@/api/client";
import { radii, spacing } from "@/theme/tokens";
import type { Sloka } from "@/types";

export default function SlokaScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const slokaId = Number(id);
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors, mode } = useTheme();
  const { lang } = useLanguage();
  const { isSignedIn } = useAuth();
  const { askAboutVerse, setVerseContext } = useMadhav();
  const [sloka, setSloka] = useState<Sloka | null>(null);
  const [story, setStory] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showingOfflineCopy, setShowingOfflineCopy] = useState(false);
  const [favorited, setFavorited] = useState(false);
  const [journal, setJournal] = useState("");
  const [showJournal, setShowJournal] = useState(false);
  const [journalNotice, setJournalNotice] = useState<string | null>(null);
  const [journalBusy, setJournalBusy] = useState(false);
  const [progressNotice, setProgressNotice] = useState<string | null>(null);
  const [notifPromptVisible, setNotifPromptVisible] = useState(false);

  // The pre-permission sheet appears only after the first meaningful action
  // succeeds here (verse done, favorite added) — never on launch, and only
  // while OS permission is undetermined and the decline cooldown allows.
  const offerNotifications = () => {
    void maybeShowNotificationPrompt().then((show) => {
      if (show) setNotifPromptVisible(true);
    });
  };

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
        setShowingOfflineCopy(false);
        await cacheVerse(slokaId, data);
      } catch (e) {
        if (alive && !cached) setError((e as Error).message);
        if (alive && cached) setShowingOfflineCopy(true);
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
      <Screen testID="screen-sloka" atmosphere="strong">
        <View
          accessible
          accessibilityLabel={lang === "hi" ? "श्लोक लोड हो रहा है" : "Loading verse"}
          testID="sloka-loading"
          style={styles.centeredState}
        >
          <ActivityIndicator color={colors.brass} />
          <Text variant="muted" style={{ marginTop: spacing.md }}>
            {lang === "hi" ? "श्लोक लोड हो रहा है…" : "Loading verse…"}
          </Text>
        </View>
      </Screen>
    );
  }

  if (error || !sloka) {
    return (
      <Screen testID="screen-sloka" atmosphere="strong">
        <View style={styles.stateHeader}>
          <BackButton fallback="/(tabs)/explore" />
        </View>
        <View testID="sloka-error" style={styles.centeredState}>
          <EmptyState
            title={lang === "hi" ? "श्लोक नहीं मिला" : "Verse not found"}
            body={error ?? (lang === "hi" ? "श्लोक उपलब्ध नहीं है" : "Verse missing")}
          />
        </View>
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
    <View
      accessibilityRole="toolbar"
      accessibilityLabel={lang === "hi" ? "श्लोक क्रियाएँ" : "Verse actions"}
      style={styles.toolbarInner}
    >
      <Tool
        icon="favorite"
        label={lang === "hi" ? "पसंद" : "Save"}
        selected={favorited}
        testID="sloka-favorite"
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
            if (next) offerNotifications();
          } catch {
            setFavorited(!next);
          }
        }}
      />
      <Tool
        icon="speak"
        label={lang === "hi" ? "सुनें" : "Speak"}
        testID="sloka-narration"
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
        icon="share"
        label={lang === "hi" ? "साझा" : "Share"}
        testID="sloka-share"
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
        icon="journal"
        label={lang === "hi" ? "जर्नल" : "Journal"}
        selected={showJournal}
        testID="sloka-journal"
        onPress={() => setShowJournal((v) => !v)}
      />
      <Tool
        icon="complete"
        label={lang === "hi" ? "पूर्ण" : "Mark complete"}
        testID="sloka-complete"
        onPress={async () => {
          await markGuestComplete(sloka.id);
          if (isSignedIn) {
            try {
              await progressApi.complete(sloka.id);
              setProgressNotice(
                lang === "hi" ? "प्रगति खाते में सहेजी गई।" : "Progress saved to your account."
              );
            } catch {
              await queuePendingProgress(sloka.id);
              setProgressNotice(
                lang === "hi"
                  ? "डिवाइस पर कतार में है — ऑनलाइन होने पर खाते से सिंक होगा।"
                  : "Queued on this device — it will sync to your account when online."
              );
            }
          } else {
            setProgressNotice(
              lang === "hi"
                ? "प्रगति अभी इसी डिवाइस पर सहेजी गई।"
                : "Progress saved on this device for now."
            );
          }
          bumpFocusVersion("progress");
          void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          offerNotifications();
        }}
      />
      <Tool
        icon="madhav"
        label={lang === "hi" ? "पूछें" : "Ask Madhav"}
        testID="sloka-ask-madhav"
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
    <Screen testID="screen-sloka" padded={false} atmosphere="strong">
      <View style={styles.readerHeader}>
        <BackButton fallback="/(tabs)/explore" />
        <Text
          variant="eyebrow"
          color={colors.textMuted}
          accessibilityLabel={`Bhagavad Gita ${sloka.chapter}.${sloka.verse_number}`}
          testID="sloka-citation"
          style={styles.headerCitation}
        >
          BG {sloka.chapter}.{sloka.verse_number}
        </Text>
      </View>
      <ScrollView
        testID="sloka-scroll"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.content,
          { paddingBottom: 88 + Math.max(insets.bottom, spacing.md) },
        ]}
      >
        {showingOfflineCopy ? (
          <View
            accessibilityRole="alert"
            testID="sloka-offline-copy"
            style={[styles.offlineBadge, { borderColor: colors.line }]}
          >
            <Text variant="muted" color={colors.brassSoft}>
              {lang === "hi" ? "ऑफ़लाइन प्रति" : "Offline copy"}
            </Text>
          </View>
        ) : null}
        <Rise>
          <Text variant="eyebrow" color={colors.brass} style={styles.verseEyebrow}>
            Chapter {String(sloka.chapter).padStart(2, "0")} · Verse{" "}
            {String(sloka.verse_number).padStart(2, "0")}
          </Text>
          <Text
            variant="sanskrit"
            accessibilityLanguage="sa"
            testID="sloka-sanskrit"
            style={styles.sanskrit}
          >
            {sloka.sanskrit_devanagari}
          </Text>
        </Rise>
        <View style={[styles.divider, { backgroundColor: colors.line }]} />
        <Text
          variant="soft"
          accessibilityLanguage="sa-Latn"
          testID="sloka-transliteration"
          style={[styles.transliteration, { color: colors.textSoft }]}
        >
          {sloka.transliteration_iast}
        </Text>

        <Text
          variant="sanskrit"
          accessibilityLanguage="hi"
          testID="sloka-hindi-translation"
          style={[styles.hindiTranslation, { color: colors.textSoft }]}
        >
          {sloka.hindi_translation}
        </Text>

        <Text
          variant="display"
          accessibilityLanguage="en"
          testID="sloka-english-translation"
          color={colors.brassSoft}
          style={styles.englishTranslation}
        >
          ‘{sloka.english_translation}’
        </Text>
        {meaning ? (
          <Panel blur style={styles.reflectionPanel}>
            <Text variant="eyebrow" color={colors.brass}>
              {lang === "hi" ? "चिन्तन" : "Reflection"}
            </Text>
            <Text variant="soft" style={styles.panelCopy}>
              {meaning}
            </Text>
          </Panel>
        ) : null}
        {story ? (
          <Panel blur style={styles.storyPanel}>
            <Text variant="eyebrow" color={colors.brass}>
              {lang === "hi" ? "कथा" : "Story"}
            </Text>
            <Text variant="soft" style={styles.panelCopy}>
              {story}
            </Text>
          </Panel>
        ) : null}

        {showJournal ? (
          <View
            testID="sloka-journal-editor"
            style={[
              styles.journalSection,
              { borderTopColor: colors.hairline, borderBottomColor: colors.hairline },
            ]}
          >
            <Text variant="eyebrow" color={colors.brass} style={styles.journalLabel}>
              {lang === "hi" ? "निजी चिन्तन" : "Private reflection"}
            </Text>
            <TextInput
              value={journal}
              onChangeText={setJournal}
              multiline
              accessibilityLabel={lang === "hi" ? "आपका निजी चिन्तन" : "Your private reflection"}
              testID="sloka-journal-input"
              placeholder={lang === "hi" ? "आपका चिन्तन…" : "A private note…"}
              placeholderTextColor={colors.textMuted}
              style={[
                styles.input,
                {
                  color: colors.text,
                  backgroundColor: "transparent",
                },
              ]}
            />
            <Button
              label={
                journalBusy
                  ? lang === "hi"
                    ? "सहेज रहे हैं…"
                    : "Saving…"
                  : lang === "hi"
                    ? "सहेजें"
                    : "Save reflection"
              }
              testID="sloka-journal-save"
              disabled={journalBusy}
              onPress={async () => {
                const text = journal.trim();
                if (!text) return;
                setJournalBusy(true);
                try {
                  if (isSignedIn) {
                    await userApi.addJournal(sloka.id, text);
                    bumpFocusVersion("journal");
                    setJournalNotice(null);
                    void Haptics.notificationAsync(
                      Haptics.NotificationFeedbackType.Success
                    );
                  } else {
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
                } catch {
                  setJournalNotice(
                    lang === "hi"
                      ? "चिंतन सहेजा नहीं गया। कनेक्शन जाँचें और फिर कोशिश करें।"
                      : "Reflection was not saved. Check your connection and retry."
                  );
                } finally {
                  setJournalBusy(false);
                }
              }}
            />
          </View>
        ) : null}

        {journalNotice ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={journalNotice}
            testID="sloka-journal-notice"
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
        {progressNotice ? (
          <View
            accessibilityRole="alert"
            testID="sloka-progress-notice"
            style={{ marginTop: spacing.md }}
          >
            <Panel>
              <Text variant="soft" color={colors.brassSoft}>
                {progressNotice}
              </Text>
            </Panel>
          </View>
        ) : null}
      </ScrollView>

      {Platform.OS === "ios" ? (
        <BlurView
          intensity={mode === "dark" ? 40 : 50}
          tint={mode === "dark" ? "dark" : "light"}
          style={[
            styles.toolbar,
            {
              borderTopColor: colors.hairline,
              paddingBottom: Math.max(insets.bottom, spacing.md),
            },
          ]}
        >
          {toolbar}
        </BlurView>
      ) : (
        <View
          style={[
            styles.toolbar,
            {
              backgroundColor: colors.navBg,
              borderTopColor: colors.hairline,
              paddingBottom: Math.max(insets.bottom, spacing.md),
            },
          ]}
        >
          {toolbar}
        </View>
      )}

      <NotificationPrompt
        visible={notifPromptVisible}
        onClose={() => setNotifPromptVisible(false)}
      />
    </Screen>
  );
}

type ToolIcon = "favorite" | "complete" | "speak" | "share" | "journal" | "madhav";

function Tool({
  icon,
  label,
  onPress,
  selected = false,
  testID,
}: {
  icon: ToolIcon;
  label: string;
  onPress: () => void;
  selected?: boolean;
  testID: string;
}) {
  const { colors } = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected }}
      testID={testID}
      onPress={onPress}
      hitSlop={6}
      style={({ pressed }) => [styles.tool, { opacity: pressed ? 0.58 : 1 }]}
    >
      {icon === "madhav" ? (
        <MadhavMark size={26} />
      ) : (
        <ActionIcon icon={icon} color={colors.brassSoft} filled={selected} />
      )}
    </Pressable>
  );
}

function ActionIcon({
  icon,
  color,
  filled,
}: {
  icon: Exclude<ToolIcon, "madhav">;
  color: string;
  filled: boolean;
}) {
  if (icon === "favorite") {
    return (
      <Svg width={25} height={25} viewBox="0 0 24 24" fill="none">
        <Path
          d="M20.8 4.7a5.5 5.5 0 00-7.8 0L12 5.8l-1.1-1.1a5.5 5.5 0 00-7.8 7.8l1.1 1.1L12 21l7.8-7.4 1.1-1.1a5.5 5.5 0 00-.1-7.8z"
          fill={filled ? color : "none"}
          stroke={color}
          strokeWidth={1.5}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </Svg>
    );
  }
  if (icon === "complete") {
    return (
      <Svg width={25} height={25} viewBox="0 0 24 24" fill="none">
        <Circle cx={12} cy={12} r={8.5} stroke={color} strokeWidth={1.5} />
        <Path
          d="M8.2 12.2l2.4 2.4 5.3-5.4"
          stroke={color}
          strokeWidth={1.6}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </Svg>
    );
  }
  if (icon === "speak") {
    return (
      <Svg width={25} height={25} viewBox="0 0 24 24" fill="none">
        <Path
          d="M5 10v4h3l4 3.5v-11L8 10H5zM15.5 9a4.2 4.2 0 010 6M18 6.5a7.7 7.7 0 010 11"
          stroke={color}
          strokeWidth={1.5}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </Svg>
    );
  }
  if (icon === "share") {
    return (
      <Svg width={25} height={25} viewBox="0 0 24 24" fill="none">
        <Circle cx={18} cy={5.5} r={2.25} stroke={color} strokeWidth={1.5} />
        <Circle cx={6} cy={12} r={2.25} stroke={color} strokeWidth={1.5} />
        <Circle cx={18} cy={18.5} r={2.25} stroke={color} strokeWidth={1.5} />
        <Path d="M8 10.9l7.8-4.2M8 13.1l7.8 4.2" stroke={color} strokeWidth={1.5} />
      </Svg>
    );
  }
  return (
    <Svg width={25} height={25} viewBox="0 0 24 24" fill="none">
      <Path
        d="M5 4.5h10a2 2 0 012 2V11M5 4.5a2 2 0 00-2 2v11a2 2 0 002 2h8M5 4.5v15M14.5 17.8l4.8-4.8 1.7 1.7-4.8 4.8-2.7.8.8-2.7z"
        stroke={color}
        strokeWidth={1.45}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

const styles = StyleSheet.create({
  centeredState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingBottom: spacing.xxl,
  },
  stateHeader: {
    minHeight: 56,
    justifyContent: "center",
  },
  readerHeader: {
    minHeight: 72,
    paddingHorizontal: spacing.lg,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  headerCitation: {
    letterSpacing: 1.8,
  },
  content: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
  },
  offlineBadge: {
    alignSelf: "flex-start",
    borderWidth: StyleSheet.hairlineWidth * 2,
    borderRadius: radii.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    marginBottom: spacing.md,
  },
  verseEyebrow: {
    letterSpacing: 2.1,
  },
  sanskrit: {
    marginTop: spacing.lg,
    fontSize: 24,
    lineHeight: 38,
    letterSpacing: 0.35,
  },
  divider: {
    marginTop: spacing.xl,
    height: StyleSheet.hairlineWidth * 2,
    width: "100%",
  },
  transliteration: {
    marginTop: spacing.xl,
    fontStyle: "italic",
    lineHeight: 24,
    opacity: 0.84,
  },
  hindiTranslation: {
    marginTop: 40,
    fontSize: 18,
    lineHeight: 31,
  },
  englishTranslation: {
    marginTop: 40,
    fontSize: 28,
    lineHeight: 36,
    letterSpacing: -0.25,
  },
  reflectionPanel: {
    marginTop: spacing.xxl,
    padding: spacing.lg,
  },
  storyPanel: {
    marginTop: spacing.lg,
    padding: spacing.lg,
  },
  panelCopy: {
    marginTop: spacing.md,
    lineHeight: 24,
  },
  journalSection: {
    marginTop: spacing.xxl,
    paddingVertical: spacing.xl,
    borderTopWidth: StyleSheet.hairlineWidth * 2,
    borderBottomWidth: StyleSheet.hairlineWidth * 2,
  },
  journalLabel: {
    marginBottom: spacing.sm,
  },
  toolbar: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    borderTopWidth: StyleSheet.hairlineWidth * 2,
  },
  toolbarInner: {
    minHeight: 64,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    paddingHorizontal: spacing.md,
  },
  tool: {
    width: 48,
    height: 48,
    alignItems: "center",
    justifyContent: "center",
  },
  input: {
    minHeight: 108,
    paddingVertical: spacing.sm,
    paddingHorizontal: 0,
    textAlignVertical: "top",
    fontFamily: "Sora_400Regular",
    fontSize: 15,
    lineHeight: 23,
  },
});

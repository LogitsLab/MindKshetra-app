import React, { useEffect, useMemo, useState } from "react";
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
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import { Screen } from "@/components/Screen";
import { Text } from "@/components/Text";
import { Button } from "@/components/Button";
import { Panel } from "@/components/Panel";
import { Rise } from "@/components/Rise";
import { SpeakButton } from "@/components/SpeakButton";
import { BackButton } from "@/components/ScreenHeader";
import { EmptyState } from "@/components/SlokaCard";
import {
  NotificationPrompt,
  maybeShowNotificationPrompt,
} from "@/components/NotificationPrompt";
import { contentApi, eventsApi, progressApi, userApi } from "@/api/endpoints";
import { getApiUrl } from "@/api/client";
import { stopNarration } from "@/audio/narration";
import { useAuth } from "@/context/AuthContext";
import { useLanguage } from "@/context/LanguageContext";
import { useMadhav } from "@/context/MadhavContext";
import { useTheme } from "@/context/ThemeContext";
import { chapterTitle, getChapterMeta } from "@/data/chapters";
import { bumpFocusVersion } from "@/hooks/useFocusRefresh";
import {
  addJournalDraft,
  cacheVerse,
  getCachedVerse,
  markGuestComplete,
  queuePendingProgress,
  setGuestCursor,
} from "@/storage/local";
import { radii, spacing } from "@/theme/tokens";
import type { Sloka } from "@/types";
import {
  cleanCommentary,
  hasCommentary,
  splitVerseLines,
} from "@/utils/verseDisplay";

export default function SlokaScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const slokaId = Number(id);
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const { lang, t } = useLanguage();
  const { isSignedIn } = useAuth();
  const { askAboutVerse, setVerseContext } = useMadhav();
  const [sloka, setSloka] = useState<Sloka | null>(null);
  const [story, setStory] = useState<string | null>(null);
  const [storyLoading, setStoryLoading] = useState(false);
  const [storyGenerating, setStoryGenerating] = useState(false);
  const [storyLang, setStoryLang] = useState<"en" | "hi">(
    lang === "hi" ? "hi" : "en"
  );
  const [prev, setPrev] = useState<Sloka | null>(null);
  const [next, setNext] = useState<Sloka | null>(null);
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

  const offerNotifications = () => {
    void maybeShowNotificationPrompt().then((show) => {
      if (show) setNotifPromptVisible(true);
    });
  };

  useEffect(() => {
    setVerseContext(slokaId);
    return () => {
      setVerseContext(null);
      stopNarration();
    };
  }, [slokaId, setVerseContext]);

  useEffect(() => {
    setStoryLang(lang === "hi" ? "hi" : "en");
  }, [lang]);

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
    setLoading(true);
    setError(null);
    setPrev(null);
    setNext(null);
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
    void setGuestCursor(sloka.chapter, sloka.verse_number);
    if (isSignedIn) {
      progressApi.setCursor(sloka.id).catch(() => undefined);
    }
    bumpFocusVersion("progress");

    let alive = true;
    contentApi
      .slokas({ chapter: sloka.chapter, limit: 200 })
      .then(({ slokas: list }) => {
        if (!alive) return;
        const sorted = [...list].sort(
          (a, b) => a.verse_number - b.verse_number
        );
        const idx = sorted.findIndex((s) => s.id === sloka.id);
        setPrev(idx > 0 ? sorted[idx - 1] : null);
        setNext(
          idx >= 0 && idx < sorted.length - 1 ? sorted[idx + 1] : null
        );
      })
      .catch(() => undefined);
    return () => {
      alive = false;
    };
  }, [sloka, isSignedIn]);

  useEffect(() => {
    if (!sloka) return;
    let alive = true;
    setStory(null);
    setStoryLoading(true);
    contentApi
      .story(sloka.id, storyLang)
      .then((r) => {
        if (alive) setStory(r.story?.trim() || null);
      })
      .catch(() => {
        if (alive) setStory(null);
      })
      .finally(() => {
        if (alive) setStoryLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [sloka, storyLang]);

  async function generateStory(regenerate = false) {
    if (!sloka || storyGenerating) return;
    setStoryGenerating(true);
    try {
      const r = await contentApi.generateStory(sloka.id, storyLang, regenerate);
      setStory(r.story?.trim() || null);
    } catch {
      setStory(null);
    } finally {
      setStoryGenerating(false);
    }
  }

  const chapterMeta = useMemo(
    () => (sloka ? getChapterMeta(sloka.chapter) : undefined),
    [sloka]
  );

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
            body={
              error ??
              (lang === "hi" ? "श्लोक उपलब्ध नहीं है" : "Verse missing")
            }
          />
        </View>
      </Screen>
    );
  }

  const translation =
    lang === "hi" ? sloka.hindi_translation : sloka.english_translation;
  const preferredMeaning =
    lang === "hi" ? sloka.hindi_meaning : sloka.english_meaning;
  const commentary = hasCommentary(preferredMeaning)
    ? cleanCommentary(preferredMeaning!)
    : "";
  const sanskritLines = splitVerseLines(sloka.sanskrit_devanagari);
  const iastLines = splitVerseLines(sloka.transliteration_iast);
  const chTitle = chapterTitle(chapterMeta, lang === "hi" ? "hi" : "en");
  const progressLabel = chapterMeta?.verses_count
    ? t("verseOfChapter")
        .replace("{n}", String(sloka.verse_number))
        .replace("{total}", String(chapterMeta.verses_count))
    : null;
  const ref = `${sloka.chapter}.${sloka.verse_number}`;

  const markComplete = async () => {
    await markGuestComplete(sloka.id);
    if (isSignedIn) {
      try {
        await progressApi.complete(sloka.id);
        setProgressNotice(
          lang === "hi"
            ? "प्रगति खाते में सहेजी गई।"
            : "Progress saved to your account."
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
  };

  const toggleFavorite = async () => {
    if (!isSignedIn) {
      router.push("/account");
      return;
    }
    const nextFav = !favorited;
    setFavorited(nextFav);
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    try {
      if (nextFav) await userApi.addFavorite(sloka.id);
      else await userApi.removeFavorite(sloka.id);
      bumpFocusVersion("favorites");
      if (nextFav) offerNotifications();
    } catch {
      setFavorited(!nextFav);
    }
  };

  return (
    <Screen testID="screen-sloka" padded={false} atmosphere="strong">
      <View style={[styles.topBar, { paddingTop: spacing.sm }]}>
        <BackButton fallback={`/(tabs)/explore/${sloka.chapter}`} />
        <Text
          variant="eyebrow"
          color={colors.textMuted}
          testID="sloka-citation"
          style={styles.topCitation}
        >
          BG {ref}
        </Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        testID="sloka-scroll"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.content,
          { paddingBottom: insets.bottom + spacing.xxl },
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
          <View style={styles.headerBlock}>
            <Text
              variant="eyebrow"
              color={colors.brassSoft}
              style={styles.eyebrow}
            >
              {lang === "hi" ? "भगवद्गीता" : "Bhagavad Gita"} · {ref}
              {chTitle ? ` · ${chTitle}` : ""}
              {progressLabel ? ` · ${progressLabel}` : ""}
            </Text>

            <Text
              variant="sanskrit"
              accessibilityRole="header"
              accessibilityLanguage="sa"
              testID="sloka-sanskrit"
              style={[styles.sanskrit, { color: colors.text }]}
            >
              {sanskritLines.map((line, i) => (
                <Text key={i} variant="sanskrit" style={styles.sanskritLine}>
                  {line}
                  {i < sanskritLines.length - 1 ? "।" : " ॥"}
                  {i < sanskritLines.length - 1 ? "\n" : ""}
                </Text>
              ))}
            </Text>

            <View style={styles.iastBlock}>
              {iastLines.map((line, i) => (
                <Text
                  key={i}
                  variant="soft"
                  accessibilityLanguage="sa-Latn"
                  testID={i === 0 ? "sloka-transliteration" : undefined}
                  style={[styles.iast, { color: colors.textMuted }]}
                >
                  {line}
                </Text>
              ))}
            </View>

            <View style={styles.listenBlock}>
              <SpeakButton
                testID="sloka-narration"
                text={sloka.sanskrit_devanagari}
                lang={lang === "hi" ? "hi" : "en"}
                chapter={sloka.chapter}
                verseNumber={sloka.verse_number}
                recitationOnly
                listenLabel={t("verseListen")}
                stopLabel={t("verseStop")}
                unsupportedLabel={t("ttsUnsupported")}
              />
              <Text variant="muted" color={colors.textMuted} style={styles.credit}>
                {t("verseRecitationCredit")}
              </Text>
            </View>

            <View
              accessibilityRole="toolbar"
              accessibilityLabel={t("verseTools")}
              style={styles.tools}
            >
              <QuietTool
                label={lang === "hi" ? "पूर्ण" : "Complete"}
                testID="sloka-complete"
                onPress={() => void markComplete()}
              />
              <Text variant="muted" color={colors.textMuted} style={styles.dot}>
                ·
              </Text>
              <QuietTool
                label={
                  favorited
                    ? lang === "hi"
                      ? "सहेजा"
                      : "Saved"
                    : lang === "hi"
                      ? "पसंद"
                      : "Favorite"
                }
                testID="sloka-favorite"
                onPress={() => void toggleFavorite()}
              />
              <Text variant="muted" color={colors.textMuted} style={styles.dot}>
                ·
              </Text>
              <QuietTool
                label={t("verseShare")}
                testID="sloka-share"
                onPress={() => {
                  void Share.share({
                    message: `${ref}\n${sloka.sanskrit_devanagari}\n${translation ?? ""}\n${getApiUrl()}/sloka/${sloka.id}`,
                  })
                    .then((result) => {
                      if (result.action === Share.sharedAction) {
                        void eventsApi.send("share_card", {
                          method: "sheet",
                          slokaId: sloka.id,
                        });
                      }
                    })
                    .catch(() => undefined);
                }}
              />
              <Text variant="muted" color={colors.textMuted} style={styles.dot}>
                ·
              </Text>
              <QuietTool
                label={lang === "hi" ? "जर्नल" : "Journal"}
                testID="sloka-journal"
                onPress={() => setShowJournal((v) => !v)}
              />
            </View>

            <View style={styles.prevNext}>
              {prev ? (
                <Pressable
                  onPress={() => {
                    stopNarration();
                    router.replace(`/sloka/${prev.id}`);
                  }}
                  hitSlop={8}
                >
                  <Text variant="muted" color={colors.brassSoft}>
                    ← {prev.chapter}.{prev.verse_number}
                  </Text>
                </Pressable>
              ) : (
                <Text variant="muted" color={colors.textMuted} style={{ opacity: 0.35 }}>
                  {lang === "hi" ? "आरंभ" : "Start"}
                </Text>
              )}
              {next ? (
                <Pressable
                  onPress={() => {
                    stopNarration();
                    router.replace(`/sloka/${next.id}`);
                  }}
                  hitSlop={8}
                >
                  <Text variant="muted" color={colors.brassSoft}>
                    {next.chapter}.{next.verse_number} →
                  </Text>
                </Pressable>
              ) : (
                <Text variant="muted" color={colors.textMuted} style={{ opacity: 0.35 }}>
                  {lang === "hi" ? "अंत" : "End"}
                </Text>
              )}
            </View>
          </View>
        </Rise>

        <View style={[styles.rule, { backgroundColor: colors.line }]} />

        <Pressable
          testID="sloka-ask-madhav"
          onPress={() => {
            askAboutVerse(
              sloka.id,
              lang === "hi"
                ? `श्लोक ${ref} के बारे में मुझे समझाइए — आज मेरे जीवन में इसका क्या अर्थ हो सकता है?`
                : `Help me understand verse ${ref} — what might it mean for my life right now?`
            );
            router.push("/madhav");
          }}
          style={({ pressed }) => [
            styles.askMadhav,
            {
              borderColor: "rgba(201,162,39,0.4)",
              opacity: pressed ? 0.9 : 1,
            },
          ]}
        >
          <Text variant="soft" color={colors.brassSoft}>
            {t("askMadhavVerse")}
          </Text>
        </Pressable>

        {translation ? (
          <View style={styles.section}>
            <Text variant="eyebrow" color={colors.brass}>
              {t("translation")}
            </Text>
            <Text
              variant="display"
              color={colors.brassSoft}
              testID={
                lang === "hi"
                  ? "sloka-hindi-translation"
                  : "sloka-english-translation"
              }
              style={styles.translation}
              accessibilityLanguage={lang === "hi" ? "hi" : "en"}
            >
              {lang === "hi" ? translation : `‘${translation}’`}
            </Text>
          </View>
        ) : null}

        {commentary ? (
          <Panel blur style={styles.sectionPanel}>
            <Text variant="eyebrow" color={colors.brass}>
              {t("meaning")}
            </Text>
            <Text variant="soft" style={styles.panelCopy}>
              {commentary}
            </Text>
          </Panel>
        ) : null}

        <Panel blur style={styles.sectionPanel}>
          <View style={styles.storyHead}>
            <View style={{ flex: 1 }}>
              <Text variant="eyebrow" color={colors.brass}>
                {t("reflectiveStory")}
              </Text>
              <Text variant="muted" color={colors.textMuted} style={styles.storyBlurb}>
                {t("storyBlurb")}
              </Text>
            </View>
            <View style={styles.storyControls}>
              <View
                style={[styles.langToggle, { borderColor: colors.line }]}
              >
                {(["en", "hi"] as const).map((code) => (
                  <Pressable
                    key={code}
                    onPress={() => {
                      stopNarration();
                      setStoryLang(code);
                    }}
                    style={[
                      styles.langChip,
                      storyLang === code && {
                        backgroundColor: colors.brass,
                      },
                    ]}
                  >
                    <Text
                      variant="muted"
                      color={
                        storyLang === code ? colors.onBrass : colors.textMuted
                      }
                      style={styles.langChipText}
                    >
                      {code.toUpperCase()}
                    </Text>
                  </Pressable>
                ))}
              </View>
              {story ? (
                <SpeakButton
                  testID="sloka-story-listen"
                  text={story}
                  lang={storyLang}
                  listenLabel={t("verseListenStory")}
                  stopLabel={t("verseStop")}
                  unsupportedLabel={t("ttsUnsupported")}
                />
              ) : null}
            </View>
          </View>
          {storyLoading || storyGenerating ? (
            <View style={styles.storyLoading}>
              <ActivityIndicator color={colors.brass} />
              <Text variant="soft" style={styles.panelCopy}>
                {storyGenerating
                  ? t("writing")
                  : lang === "hi"
                    ? "कथा लोड हो रही है…"
                    : "Loading story…"}
              </Text>
            </View>
          ) : story ? (
            <Text variant="soft" style={styles.panelCopy}>
              {story}
            </Text>
          ) : (
            <View style={styles.storyEmpty}>
              <Text variant="soft" color={colors.textMuted} style={styles.panelCopy}>
                {t("noStoryYet")}
              </Text>
              <Button
                testID="sloka-story-generate"
                label={t("generateStory")}
                onPress={() => void generateStory(false)}
                style={styles.storyGenerate}
              />
            </View>
          )}
        </Panel>

        {showJournal ? (
          <View
            testID="sloka-journal-editor"
            style={[
              styles.journalSection,
              {
                borderTopColor: colors.hairline,
                borderBottomColor: colors.hairline,
              },
            ]}
          >
            <Text
              variant="eyebrow"
              color={colors.brass}
              style={styles.journalLabel}
            >
              {lang === "hi" ? "निजी चिन्तन" : "Private reflection"}
            </Text>
            <TextInput
              value={journal}
              onChangeText={setJournal}
              multiline
              accessibilityLabel={
                lang === "hi" ? "आपका निजी चिन्तन" : "Your private reflection"
              }
              testID="sloka-journal-input"
              placeholder={lang === "hi" ? "आपका चिन्तन…" : "A private note…"}
              placeholderTextColor={colors.textMuted}
              style={[styles.input, { color: colors.text }]}
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
                    void Haptics.impactAsync(
                      Haptics.ImpactFeedbackStyle.Light
                    );
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

      <NotificationPrompt
        visible={notifPromptVisible}
        onClose={() => setNotifPromptVisible(false)}
      />
    </Screen>
  );
}

function QuietTool({
  label,
  onPress,
  testID,
}: {
  label: string;
  onPress: () => void;
  testID: string;
}) {
  const { colors } = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      testID={testID}
      onPress={onPress}
      hitSlop={8}
      style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}
    >
      <Text variant="soft" color={colors.textSoft} style={styles.quietLabel}>
        {label}
      </Text>
    </Pressable>
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
    paddingHorizontal: spacing.lg,
  },
  topBar: {
    minHeight: 56,
    paddingHorizontal: spacing.lg,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  topCitation: {
    letterSpacing: 1.4,
  },
  content: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
  },
  offlineBadge: {
    alignSelf: "center",
    borderWidth: StyleSheet.hairlineWidth * 2,
    borderRadius: radii.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    marginBottom: spacing.md,
  },
  headerBlock: {
    alignItems: "center",
  },
  eyebrow: {
    textAlign: "center",
    lineHeight: 18,
  },
  sanskrit: {
    marginTop: spacing.lg,
    fontSize: 26,
    lineHeight: 42,
    textAlign: "center",
    letterSpacing: 0,
  },
  sanskritLine: {
    fontSize: 26,
    lineHeight: 42,
    textAlign: "center",
  },
  iastBlock: {
    marginTop: spacing.md,
    alignItems: "center",
    gap: 2,
  },
  iast: {
    fontStyle: "italic",
    textAlign: "center",
    fontSize: 15,
    lineHeight: 24,
  },
  listenBlock: {
    marginTop: spacing.lg,
    alignItems: "center",
    gap: spacing.xs,
  },
  credit: {
    fontSize: 11,
    letterSpacing: 1.2,
  },
  tools: {
    marginTop: spacing.md,
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
  },
  quietLabel: {
    fontSize: 14,
  },
  dot: {
    opacity: 0.35,
    fontSize: 14,
  },
  prevNext: {
    marginTop: spacing.lg,
    width: "100%",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  rule: {
    marginTop: spacing.xl,
    height: StyleSheet.hairlineWidth * 2,
    width: "100%",
  },
  askMadhav: {
    marginTop: spacing.md,
    minHeight: 44,
    borderWidth: StyleSheet.hairlineWidth * 2,
    borderRadius: radii.md,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.md,
  },
  section: {
    marginTop: spacing.xl,
  },
  translation: {
    marginTop: spacing.sm,
    fontSize: 24,
    lineHeight: 34,
    letterSpacing: -0.2,
  },
  sectionPanel: {
    marginTop: spacing.lg,
    padding: spacing.lg,
  },
  panelCopy: {
    marginTop: spacing.md,
    lineHeight: 24,
  },
  storyLoading: {
    marginTop: spacing.md,
    gap: spacing.sm,
    alignItems: "flex-start",
  },
  storyEmpty: {
    marginTop: spacing.md,
    gap: spacing.md,
  },
  storyGenerate: {
    alignSelf: "flex-start",
    minHeight: 44,
    paddingHorizontal: spacing.md,
  },
  storyHead: {
    gap: spacing.md,
  },
  storyBlurb: {
    marginTop: 4,
    fontSize: 12,
  },
  storyControls: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    gap: spacing.sm,
  },
  langToggle: {
    flexDirection: "row",
    borderWidth: StyleSheet.hairlineWidth * 2,
    borderRadius: radii.sm,
    padding: 2,
    gap: 2,
  },
  langChip: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radii.sm - 2,
  },
  langChipText: {
    fontSize: 11,
    letterSpacing: 1,
    fontFamily: "Sora_600SemiBold",
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

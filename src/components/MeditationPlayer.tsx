import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  View,
  ActivityIndicator,
} from "react-native";
import { useRouter } from "expo-router";
import * as Linking from "expo-linking";
import { playSoftBell, releaseAmbientPlayers, startAmbient, stopAmbient, type AmbientBed } from "@/audio/ambient";
import { playNarrationIfAvailable, stopNarration } from "@/audio/narration";
import { useKeepAwake } from "expo-keep-awake";
import { Screen } from "@/components/Screen";
import { Text } from "@/components/Text";
import { Button } from "@/components/Button";
import { BrandMark } from "@/components/BrandMark";
import { Rise } from "@/components/Rise";
import { siteUrl } from "@/api/client";
import { meditationApi } from "@/api/endpoints";
import { useAuth } from "@/context/AuthContext";
import { useLanguage } from "@/context/LanguageContext";
import { useTheme } from "@/context/ThemeContext";
import { sessionTranscript, type MeditationSession, type SittingMilestone } from "@/data/meditation";
import { POST_MOOD_CHOICES } from "@/data/meditationCompletion";
import { closingVerseFor } from "@/data/closingVerses";
import {
  markSittingGuestDay,
  queueMeditationGuestCompletion,
} from "@/hooks/useMeditationProgress";
import { uuidv4 } from "@/utils/uuid";
import { radii, spacing } from "@/theme/tokens";

const SUPPORT_URL = siteUrl("/support");

type Stage = "moodBefore" | "play" | "moodAfter" | "done";

function formatClock(sec: number) {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

/**
 * How long to hold a guidance cue on screen when there is no recorded voice —
 * long enough to read calmly, capped so the sit keeps moving. Music-led sits
 * use this instead of waiting on a speaking clock.
 */
function cueHoldMs(text: string): number {
  const words = text.trim().split(/\s+/).filter(Boolean).length;
  return Math.min(18000, Math.max(6000, words * 400));
}

type SitMode = "guided" | "silent";
const BEDS: AmbientBed[] = ["off", "drone", "bowls", "rain"];

function fill(template: string, vars: Record<string, string | number>) {
  return Object.entries(vars).reduce(
    (copy, [key, value]) => copy.replace(`{${key}}`, String(value)),
    template
  );
}

export function MeditationPlayer({
  session,
  daysCount = 45,
}: {
  session: MeditationSession;
  daysCount?: number;
}) {
  useKeepAwake();
  const router = useRouter();
  const { colors } = useTheme();
  const { t, lang } = useLanguage();
  const { isSignedIn } = useAuth();
  const [stage, setStage] = useState<Stage>("moodBefore");
  const [moodBefore, setMoodBefore] = useState<number | null>(null);
  const [moodAfter, setMoodAfter] = useState<number | null>(null);
  const [phaseIdx, setPhaseIdx] = useState(0);
  const [silenceLeft, setSilenceLeft] = useState<number | null>(null);
  const [showTranscript, setShowTranscript] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(false);
  const [guestSaved, setGuestSaved] = useState(false);
  const [milestone, setMilestone] = useState<SittingMilestone | null>(null);
  // The 45-day arc graduates toward unguided practice: deepening days default
  // to a silent sit, earlier tiers to the cued, music-led sit.
  const [sitMode, setSitMode] = useState<SitMode>(
    session.tier === "deepening" ? "silent" : "guided"
  );
  const [bed, setBed] = useState<AmbientBed>("drone");
  const satSecRef = useRef(0);
  const autoAdvance = useRef(true);
  const phaseIdxRef = useRef(0);

  const playPhases = useMemo(
    () =>
      sitMode === "guided"
        ? session.phases
        : [
            {
              type: "silence" as const,
              seconds: Math.max(60, session.duration_minutes * 60),
            },
          ],
    [sitMode, session.phases, session.duration_minutes]
  );
  const phase = playPhases[phaseIdx];
  const title = lang === "hi" ? session.title_hi : session.title_en;
  const theme = lang === "hi" ? session.theme_hi : session.theme_en;
  const nextDay =
    session.tier !== "daily" && session.day_number < daysCount
      ? session.day_number + 1
      : null;
  // A steadying verse to close on — deterministic per session so it feels
  // chosen, and bundled so it appears even offline.
  const closing = useMemo(
    () => closingVerseFor(session.day_number > 0 ? session.day_number : session.id.length),
    [session.day_number, session.id]
  );

  useEffect(() => {
    return () => {
      stopNarration();
      releaseAmbientPlayers();
    };
  }, []);

  // The soundscape leads the whole sit — start it once we enter play and keep
  // it running continuously across cue and silence phases, so there is no gap
  // between them. It only stops when the sit ends or the bed is set to "off".
  useEffect(() => {
    if (stage !== "play" || bed === "off") {
      stopAmbient();
      return;
    }
    void startAmbient(0.35, bed);
    return () => {
      stopAmbient();
    };
  }, [stage, bed]);

  const advancePhase = () => {
    stopNarration();
    stopAmbient();
    setSilenceLeft(null);
    const next = phaseIdxRef.current + 1;
    if (next >= playPhases.length) {
      void playSoftBell();
      setStage("moodAfter");
      return;
    }
    phaseIdxRef.current = next;
    setPhaseIdx(next);
  };

  useEffect(() => {
    if (stage !== "play") return;
    const current = playPhases[phaseIdx];
    if (!current) return;

    if (current.type === "silence") {
      let left = current.seconds;
      setSilenceLeft(left);
      const id = setInterval(() => {
        satSecRef.current += 1;
        left -= 1;
        setSilenceLeft(Math.max(0, left));
        if (left <= 0) {
          clearInterval(id);
          advancePhase();
        }
      }, 1000);
      return () => clearInterval(id);
    }

    // Music-led guidance: show the cue, play a recorded voice if the manifest
    // has one for this line, otherwise just hold the cue on screen for a
    // readable beat and move on. No synthetic voice is ever used.
    autoAdvance.current = true;
    const text = lang === "hi" ? current.text_hi : current.text_en;
    let cancelled = false;
    let holdTimer: ReturnType<typeof setTimeout> | null = null;
    const advanceIfActive = () => {
      if (!cancelled && autoAdvance.current) advancePhase();
    };
    void playNarrationIfAvailable(text, {
      lang,
      onDone: advanceIfActive,
    }).then((played) => {
      if (cancelled || played) return;
      holdTimer = setTimeout(advanceIfActive, cueHoldMs(text));
    });
    return () => {
      cancelled = true;
      autoAdvance.current = false;
      if (holdTimer) clearTimeout(holdTimer);
      stopNarration();
    };
  }, [stage, phaseIdx, lang, playPhases]);

  const finish = async () => {
    setSaving(true);
    setSaveError(false);
    const clientRef = uuidv4();
    const durationSec = Math.max(
      1,
      satSecRef.current || session.duration_minutes * 60
    );
    let timezone: string | undefined;
    try {
      timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    } catch {
      timezone = undefined;
    }
    const body = {
      sessionId: session.id,
      moodBefore,
      moodAfter,
      durationSec,
      clientRef,
      timezone,
    };
    try {
      if (isSignedIn) {
        const res = await meditationApi.complete(body);
        setMilestone(res.milestone ?? null);
      } else {
        await markSittingGuestDay(session.day_number, daysCount);
        await queueMeditationGuestCompletion(body);
        if (
          session.day_number === 7 ||
          session.day_number === 21 ||
          session.day_number === 45
        ) {
          setMilestone(session.day_number as SittingMilestone);
        }
        setGuestSaved(true);
      }
    } catch {
      setSaveError(true);
      setSaving(false);
      return;
    }
    setSaving(false);
    setStage("done");
  };

  return (
    <Screen atmosphere="strong" padded>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.topBar}>
          <View>
            <Text variant="title" color={colors.brassSoft}>{title}</Text>
            <Text variant="eyebrow" color={colors.brassSoft}>
              {session.tier === "daily"
                ? t("medDailiesTitle")
                : fill(t("medDayLabel"), { n: session.day_number })} ·{" "}
              {session.duration_minutes} {t("sadhanaMin")}
            </Text>
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t("medBack")}
            onPress={() => router.push("/meditation")}
            style={[styles.closeButton, { borderColor: colors.line }]}
          >
            <Text color={colors.brassSoft}>×</Text>
          </Pressable>
        </View>

        {stage === "moodBefore" ? (
          <View style={styles.checkIn}>
            <Text variant="eyebrow" color={colors.brassSoft}>
              {t("medBeforeEyebrow")}
            </Text>
            <Text variant="title" style={styles.checkInTitle}>
              {t("medMoodBefore")}
            </Text>
            <Text variant="muted" style={{ marginTop: spacing.xs }}>
              {t("medMoodHint")}
            </Text>
            <View style={styles.moodRow}>
              {[1, 2, 3, 4, 5].map((n) => (
                <Pressable
                  key={n}
                  accessibilityRole="radio"
                  accessibilityLabel={fill(t("medMoodBeforeChoice"), { value: n })}
                  accessibilityState={{ selected: moodBefore === n }}
                  onPress={() => setMoodBefore(n)}
                  style={[
                    styles.numberChip,
                    {
                      borderColor: moodBefore === n ? colors.brass : colors.line,
                      backgroundColor: moodBefore === n ? colors.surfaceHover : colors.field,
                    },
                  ]}
                >
                  <Text color={moodBefore === n ? colors.brassSoft : colors.textMuted}>{n}</Text>
                </Pressable>
              ))}
            </View>
            <Text variant="eyebrow" color={colors.brassSoft} style={{ marginTop: spacing.lg }}>
              {t("medSitModeLabel")}
            </Text>
            <View style={styles.rateRow}>
              {(["guided", "silent"] as const).map((m) => (
                <Pressable
                  key={m}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: sitMode === m }}
                  onPress={() => setSitMode(m)}
                  style={[
                    styles.rateChip,
                    {
                      borderColor: sitMode === m ? colors.brass : colors.line,
                      backgroundColor: sitMode === m ? colors.surface : "transparent",
                    },
                  ]}
                >
                  <Text color={sitMode === m ? colors.brassSoft : colors.textMuted}>
                    {m === "guided" ? t("medSitGuided") : t("medSitSilent")}
                  </Text>
                </Pressable>
              ))}
            </View>
            <Text variant="muted" style={{ marginTop: spacing.xs }}>
              {sitMode === "guided" ? t("medSitGuidedHint") : t("medSitSilentHint")}
            </Text>
            <Text variant="eyebrow" color={colors.brassSoft} style={{ marginTop: spacing.lg }}>
              {t("medAmbientLabel")}
            </Text>
            <View style={styles.rateRow}>
              {BEDS.map((b) => (
                <Pressable
                  key={b}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: bed === b }}
                  onPress={() => setBed(b)}
                  style={[
                    styles.rateChip,
                    {
                      borderColor: bed === b ? colors.brass : colors.line,
                      backgroundColor: bed === b ? colors.surface : "transparent",
                    },
                  ]}
                >
                  <Text color={bed === b ? colors.brassSoft : colors.textMuted}>
                    {b === "off"
                      ? t("medAmbientSilence")
                      : b === "drone"
                        ? t("medAmbientDrone")
                        : b === "bowls"
                          ? t("medAmbientBowls")
                          : t("medAmbientRain")}
                  </Text>
                </Pressable>
              ))}
            </View>
            <Text variant="muted" style={{ marginTop: spacing.xs }}>
              {t("medAmbientCredit")}
            </Text>
            {/* The check-in used to start the sit on tap, so a mis-tap began a
                guided session with no way back to correct it. */}
            <View style={{ marginTop: spacing.lg }}>
              <Button
                label={t("medBeginSit")}
                disabled={moodBefore == null}
                onPress={() => {
                  satSecRef.current = 0;
                  phaseIdxRef.current = 0;
                  setPhaseIdx(0);
                  setStage("play");
                }}
              />
            </View>
          </View>
        ) : null}

        {stage === "play" && phase ? (
          <View style={styles.player}>
            <Text variant="eyebrow" color={colors.brassSoft} style={styles.centerText}>
              {phase.type === "speak"
                ? t("medPhaseSpeak")
                : t("medPhaseSilence")}{" "}
              · {phaseIdx + 1}/{playPhases.length}
            </Text>
            <View style={styles.rateRow}>
              <Text variant="muted">{t("medAmbientLabel")}</Text>
              {BEDS.map((b) => (
                <Pressable
                  key={b}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: bed === b }}
                  onPress={() => setBed(b)}
                  style={[
                    styles.rateChip,
                    {
                      borderColor: bed === b ? colors.brass : colors.line,
                      backgroundColor: bed === b ? colors.surface : "transparent",
                    },
                  ]}
                >
                  <Text
                    variant="muted"
                    color={bed === b ? colors.brassSoft : colors.textMuted}
                  >
                    {b === "off"
                      ? t("medAmbientSilence")
                      : b === "drone"
                        ? t("medAmbientDrone")
                        : b === "bowls"
                          ? t("medAmbientBowls")
                          : t("medAmbientRain")}
                  </Text>
                </Pressable>
              ))}
            </View>
            {phase.type === "speak" ? (
              <View style={[styles.breathRing, { borderColor: colors.line, backgroundColor: colors.panel }]}>
                <View style={[styles.innerRing, { borderColor: colors.line }]}>
                <Text variant="title" color={colors.brassSoft} style={styles.guidance}>
                  {lang === "hi" ? phase.text_hi : phase.text_en}
                </Text>
                </View>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={t("medSkipSpeak")}
                  onPress={() => {
                    autoAdvance.current = false;
                    stopNarration();
                    advancePhase();
                  }}
                  style={styles.playerAction}
                >
                  <Text color={colors.brassSoft}>{t("medSkipSpeak")} →</Text>
                </Pressable>
              </View>
            ) : (
              <View style={[styles.breathRing, { borderColor: colors.line, backgroundColor: colors.panel }]}>
                <View style={[styles.innerRing, { borderColor: colors.line }]}>
                <Text variant="eyebrow" color={colors.brassSoft}>{t("medPhaseSilence")}</Text>
                <Text variant="display" color={colors.brassSoft} style={styles.clock}>
                  {formatClock(silenceLeft ?? phase.seconds)}
                </Text>
                </View>
                <Text variant="muted" style={{ marginTop: spacing.xs }}>
                  {t("medAmbientCredit")}
                </Text>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={t("medNextPhase")}
                  onPress={advancePhase}
                  style={styles.playerAction}
                >
                  <Text color={colors.brassSoft}>{t("medNextPhase")}</Text>
                </Pressable>
              </View>
            )}
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={
                showTranscript ? t("medHideTranscript") : t("medTranscript")
              }
              accessibilityState={{ expanded: showTranscript }}
              onPress={() => setShowTranscript((v) => !v)}
              style={styles.transcriptToggle}
            >
              <Text color={colors.brassSoft}>
                {showTranscript ? t("medHideTranscript") : t("medTranscript")}
              </Text>
            </Pressable>
            {showTranscript ? (
              <Text variant="muted" style={{ marginTop: spacing.sm }}>
                {sessionTranscript(session, lang)}
              </Text>
            ) : null}
          </View>
        ) : null}

        {stage === "moodAfter" ? (
          <Rise style={styles.completeStage}>
            <View
              accessible
              accessibilityLabel={t("medCompletionLotus")}
              style={[
                styles.lotusMark,
                {
                  borderColor: colors.brass,
                  backgroundColor: colors.atmosphereBrass,
                },
              ]}
            >
              <BrandMark size={68} />
            </View>
            <Text variant="eyebrow" color={colors.brassSoft}>
              {t("medSessionComplete")}
            </Text>
            <Text variant="display" color={colors.brassSoft} style={styles.completeTitle}>
              {t("medWellDone")}
            </Text>
            <Text variant="soft" style={styles.centerText}>
              {title} · {session.duration_minutes} {t("sadhanaMin")}
            </Text>
            <View style={[styles.sessionStats, { borderColor: colors.line, backgroundColor: colors.panel }]}>
              <View style={styles.statCell}>
                <Text variant="eyebrow">{t("medDurationLabel")}</Text>
                <Text variant="title">
                  {fill(t("medMinuteShort"), { n: session.duration_minutes })}
                </Text>
              </View>
              <View style={[styles.statCell, styles.statDivider, { borderColor: colors.hairline }]}>
                <Text variant="eyebrow">{t("medPracticeLabel")}</Text>
                <Text variant="title">
                  {session.tier === "daily"
                    ? t("medDailyLabel")
                    : fill(t("medDayLabel"), { n: session.day_number })}
                </Text>
              </View>
            </View>
            <Text variant="soft" style={styles.moodPrompt}>
              {t("medMoodAfter")}
            </Text>
            <View style={styles.postMoodGrid}>
              {POST_MOOD_CHOICES.map(({ value, labelKey }) => {
                const label = t(labelKey);
                return (
                  <Pressable
                    key={value}
                    accessibilityRole="radio"
                    accessibilityLabel={fill(t("medMoodChoice"), {
                      label,
                      value,
                    })}
                    accessibilityState={{ selected: moodAfter === value }}
                    onPress={() => setMoodAfter(value)}
                    style={[
                      styles.postMoodChip,
                      {
                        borderColor: moodAfter === value ? colors.brass : colors.line,
                        backgroundColor: moodAfter === value ? colors.surfaceHover : colors.field,
                      },
                    ]}
                  >
                    <Text
                      variant="eyebrow"
                      color={moodAfter === value ? colors.brassSoft : colors.textSoft}
                    >
                      {label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
            <View style={{ marginTop: spacing.lg }}>
              {saving ? (
                <ActivityIndicator
                  accessibilityLabel={t("medSaving")}
                  color={colors.brass}
                />
              ) : (
                <Button
                  label={t("medComplete")}
                  onPress={() => void finish()}
                  disabled={moodAfter == null}
                />
              )}
            </View>
            {saveError ? (
              <View
                accessibilityRole="alert"
                testID="meditation-completion-error"
                style={{ marginTop: spacing.md, alignItems: "center" }}
              >
                <Text variant="soft" color={colors.danger} style={styles.centerText}>
                  {isSignedIn ? t("medSaveFailedMember") : t("medSaveFailedGuest")}
                </Text>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={t("medRetrySave")}
                  onPress={() => void finish()}
                  style={{ marginTop: spacing.sm }}
                >
                  <Text color={colors.brassSoft}>{t("medRetrySave")}</Text>
                </Pressable>
              </View>
            ) : null}
          </Rise>
        ) : null}

        {stage === "done" ? (
          <Rise style={styles.doneStage}>
            <View
              accessible
              accessibilityLabel={t("medCompletionLotus")}
              style={[
                styles.lotusMark,
                {
                  borderColor: colors.brass,
                  backgroundColor: colors.atmosphereBrass,
                },
              ]}
            >
              <BrandMark size={68} />
            </View>
            <Text variant="title" color={colors.brassSoft} style={styles.doneTitle}>
              {milestone
                ? t("medMilestoneTitle")
                : session.tier === "daily"
                  ? t("medSessionDoneTitle")
                  : t("medDoneTitle")}
            </Text>
            <Text variant="soft" style={{ marginTop: spacing.sm }}>
              {milestone === 7
                ? t("medMilestone7")
                : milestone === 21
                  ? t("medMilestone21")
                  : milestone === 45
                    ? t("medMilestone45")
                    : session.tier === "daily"
                      ? t("medSessionDoneBody")
                      : t("medDoneBody")}
            </Text>
            {guestSaved ? (
              <Text
                variant="muted"
                color={colors.brassSoft}
                style={{ marginTop: spacing.sm }}
              >
                {t("medGuestSaved")}
              </Text>
            ) : null}
            <Pressable
              accessibilityRole="link"
              accessibilityLabel={`${t("medClosingEyebrow")}: ${
                lang === "hi" ? closing.hi : closing.en
              }`}
              onPress={() => router.push(`/(tabs)/explore/${closing.chapter}`)}
              style={[
                styles.closingCard,
                { borderColor: colors.line, backgroundColor: colors.panel },
              ]}
            >
              <Text variant="eyebrow" color={colors.brassSoft}>
                {t("medClosingEyebrow")}
              </Text>
              <Text variant="soft" style={{ marginTop: spacing.xs }}>
                “{lang === "hi" ? closing.hi : closing.en}”
              </Text>
              <Text
                variant="muted"
                color={colors.brassSoft}
                style={{ marginTop: spacing.sm }}
              >
                Gītā {closing.ref} · {t("medClosingOpen")} →
              </Text>
            </Pressable>
            {nextDay && milestone !== 45 ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={fill(t("medNextDay"), { n: nextDay })}
                onPress={() => router.replace(`/meditation/${nextDay}`)}
                style={{ marginTop: spacing.lg }}
              >
                <Text color={colors.brassSoft}>
                  {fill(t("medNextDay"), { n: nextDay })} →
                </Text>
              </Pressable>
            ) : (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={t("medBack")}
                onPress={() => router.push("/meditation")}
                style={{ marginTop: spacing.lg }}
              >
                <Text color={colors.brassSoft}>{t("medBack")} →</Text>
              </Pressable>
            )}
            <Pressable
              accessibilityRole="link"
              accessibilityLabel={t("medBridgeSadhana")}
              onPress={() => router.push("/sadhana")}
              style={{ marginTop: spacing.sm }}
            >
              <Text color={colors.brassSoft}>{t("medBridgeSadhana")} →</Text>
            </Pressable>
            <Pressable
              accessibilityRole="link"
              accessibilityLabel={t("medBridgePaths")}
              onPress={() => router.push("/paths")}
              style={{ marginTop: spacing.sm }}
            >
              <Text color={colors.brassSoft}>{t("medBridgePaths")} →</Text>
            </Pressable>
            <Pressable
              accessibilityRole="link"
              accessibilityLabel={t("medBridgeSupport")}
              onPress={() => void Linking.openURL(SUPPORT_URL)}
              style={{ marginTop: spacing.sm }}
            >
              <Text color={colors.brassSoft}>{t("medBridgeSupport")} →</Text>
            </Pressable>
          </Rise>
        ) : null}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { paddingTop: spacing.sm, paddingBottom: spacing.xxl },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  closeButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: StyleSheet.hairlineWidth * 2,
    alignItems: "center",
    justifyContent: "center",
  },
  checkIn: { marginTop: spacing.md, alignItems: "center" },
  checkInTitle: { marginTop: spacing.sm, fontSize: 24 },
  moodRow: { flexDirection: "row", gap: spacing.sm, marginTop: spacing.lg },
  numberChip: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: StyleSheet.hairlineWidth * 2,
    alignItems: "center",
    justifyContent: "center",
  },
  player: { marginTop: spacing.xl },
  centerText: { textAlign: "center" },
  breathRing: {
    width: 286,
    height: 286,
    borderRadius: 143,
    borderWidth: StyleSheet.hairlineWidth * 2,
    alignSelf: "center",
    alignItems: "center",
    justifyContent: "center",
    marginTop: spacing.xl,
    padding: spacing.xl,
  },
  innerRing: {
    width: 210,
    height: 210,
    borderRadius: 105,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: "center",
    justifyContent: "center",
    padding: spacing.md,
  },
  guidance: { fontSize: 19, lineHeight: 28, textAlign: "center" },
  clock: { marginTop: spacing.sm, fontSize: 38 },
  playerAction: { marginTop: spacing.md },
  transcriptToggle: { marginTop: spacing.xl, alignSelf: "center" },
  completeStage: { marginTop: spacing.xl, alignItems: "center" },
  closingCard: {
    marginTop: spacing.lg,
    alignSelf: "stretch",
    borderWidth: StyleSheet.hairlineWidth * 2,
    borderRadius: radii.md,
    padding: spacing.md,
  },
  lotusMark: {
    width: 88,
    height: 88,
    borderRadius: 44,
    borderWidth: StyleSheet.hairlineWidth * 2,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.lg,
  },
  completeTitle: { marginTop: spacing.xs, marginBottom: spacing.xs },
  sessionStats: {
    width: "100%",
    flexDirection: "row",
    borderWidth: StyleSheet.hairlineWidth * 2,
    borderRadius: radii.md,
    marginTop: spacing.xl,
  },
  statCell: { flex: 1, alignItems: "center", padding: spacing.md },
  statDivider: { borderLeftWidth: StyleSheet.hairlineWidth },
  moodPrompt: { textAlign: "center", marginTop: spacing.xl },
  postMoodGrid: {
    width: "100%",
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  postMoodChip: {
    width: "48%",
    paddingVertical: spacing.md,
    borderRadius: radii.sm,
    borderWidth: StyleSheet.hairlineWidth * 2,
    alignItems: "center",
  },
  doneStage: { marginTop: spacing.xxl, alignItems: "center" },
  doneTitle: { textAlign: "center" },
  rateRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  rateChip: {
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    borderRadius: radii.sm,
    borderWidth: StyleSheet.hairlineWidth * 2,
  },
});

import React, { useEffect, useRef, useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  View,
  ActivityIndicator,
} from "react-native";
import { useRouter } from "expo-router";
import * as Speech from "expo-speech";
import * as Linking from "expo-linking";
import { useKeepAwake } from "expo-keep-awake";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Screen } from "@/components/Screen";
import { Text } from "@/components/Text";
import { Panel } from "@/components/Panel";
import { Button } from "@/components/Button";
import { meditationApi } from "@/api/endpoints";
import { useAuth } from "@/context/AuthContext";
import { useLanguage } from "@/context/LanguageContext";
import { useTheme } from "@/context/ThemeContext";
import { sessionTranscript, type MeditationSession } from "@/data/meditation";
import {
  GUEST_QUEUE_KEY,
  GUEST_RUN_KEY,
} from "@/hooks/useMeditationProgress";
import { uuidv4 } from "@/utils/uuid";
import { radii, spacing } from "@/theme/tokens";

const SUPPORT_URL = "https://mind.logitslab.com/support";

type Stage = "moodBefore" | "play" | "moodAfter" | "done";

function formatClock(sec: number) {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

async function markGuestDay(day: number) {
  if (day < 1) return;
  const raw = await AsyncStorage.getItem(GUEST_RUN_KEY);
  const parsed = raw ? JSON.parse(raw) : {};
  const prior = Array.isArray(parsed.completedDays) ? parsed.completedDays : [];
  const next = Array.from(new Set([...prior, day])).sort(
    (a: number, b: number) => a - b
  );
  await AsyncStorage.setItem(
    GUEST_RUN_KEY,
    JSON.stringify({ completedDays: next })
  );
}

async function queueGuest(row: Record<string, unknown>) {
  const raw = await AsyncStorage.getItem(GUEST_QUEUE_KEY);
  const list = raw ? JSON.parse(raw) : [];
  const next = Array.isArray(list) ? [...list, row].slice(-90) : [row];
  await AsyncStorage.setItem(GUEST_QUEUE_KEY, JSON.stringify(next));
}

export function MeditationPlayer({ session }: { session: MeditationSession }) {
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
  const [guestSaved, setGuestSaved] = useState(false);
  // Matches the web player's three speeds. A guided sit read at one fixed rate
  // is too fast for some and too slow for others, and the phase auto-advances
  // when the voice ends — so the rate sets the pace of the whole sit.
  const [rate, setRate] = useState(1);
  const [speaking, setSpeaking] = useState(false);
  const satSecRef = useRef(0);
  const autoAdvance = useRef(true);
  const phaseIdxRef = useRef(0);

  const phase = session.phases[phaseIdx];
  const title = lang === "hi" ? session.title_hi : session.title_en;
  const theme = lang === "hi" ? session.theme_hi : session.theme_en;

  useEffect(() => {
    return () => {
      Speech.stop();
    };
  }, []);

  const advancePhase = () => {
    Speech.stop();
    setSilenceLeft(null);
    const next = phaseIdxRef.current + 1;
    if (next >= session.phases.length) {
      setStage("moodAfter");
      return;
    }
    phaseIdxRef.current = next;
    setPhaseIdx(next);
  };

  useEffect(() => {
    if (stage !== "play") return;
    const current = session.phases[phaseIdx];
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

    autoAdvance.current = true;
    const text = lang === "hi" ? current.text_hi : current.text_en;
    Speech.speak(text, {
      language: lang === "hi" ? "hi-IN" : "en-IN",
      rate,
      onStart: () => setSpeaking(true),
      onDone: () => {
        setSpeaking(false);
        if (autoAdvance.current) advancePhase();
      },
      onStopped: () => setSpeaking(false),
      onError: () => setSpeaking(false),
    });
    return () => {
      autoAdvance.current = false;
      setSpeaking(false);
      Speech.stop();
    };
    // Changing the rate restarts the current phase at the new speed, which is
    // the only way expo-speech can apply it.
  }, [stage, phaseIdx, lang, rate, session.phases]);

  /** Re-read the current phase without advancing — the web's "Read aloud". */
  const readAloud = () => {
    const current = session.phases[phaseIdxRef.current];
    if (!current || current.type !== "speak") return;
    autoAdvance.current = true;
    Speech.stop();
    Speech.speak(lang === "hi" ? current.text_hi : current.text_en, {
      language: lang === "hi" ? "hi-IN" : "en-IN",
      rate,
      onStart: () => setSpeaking(true),
      onDone: () => {
        setSpeaking(false);
        if (autoAdvance.current) advancePhase();
      },
      onStopped: () => setSpeaking(false),
      onError: () => setSpeaking(false),
    });
  };

  /** Silence the voice but hold the phase — reading the transcript instead. */
  const stopVoice = () => {
    autoAdvance.current = false;
    Speech.stop();
    setSpeaking(false);
  };

  const finish = async () => {
    setSaving(true);
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
        await meditationApi.complete(body);
      } else {
        await markGuestDay(session.day_number);
        await queueGuest(body);
        setGuestSaved(true);
      }
    } catch {
      await markGuestDay(session.day_number);
      await queueGuest(body);
      setGuestSaved(true);
    }
    setSaving(false);
    setStage("done");
  };

  return (
    <Screen atmosphere="soft" padded>
      <ScrollView
        contentContainerStyle={{ paddingBottom: spacing.xxl }}
        showsVerticalScrollIndicator={false}
      >
        <Pressable onPress={() => router.push("/meditation")}>
          <Text color={colors.brassSoft}>← {t("medBack")}</Text>
        </Pressable>
        <Text
          variant="eyebrow"
          color={colors.brassSoft}
          style={{ marginTop: spacing.md }}
        >
          {session.tier === "daily"
            ? t("medDailiesTitle")
            : `Day ${session.day_number}`}{" "}
          · {session.duration_minutes} {t("sadhanaMin")}
        </Text>
        <Text variant="title" style={{ marginTop: spacing.sm, fontSize: 26 }}>
          {title}
        </Text>
        <Text variant="soft" style={{ marginTop: spacing.sm }}>
          {theme}
        </Text>

        {stage === "moodBefore" ? (
          <View style={{ marginTop: spacing.xl }}>
            <Text variant="title" style={{ fontSize: 20 }}>
              {t("medMoodBefore")}
            </Text>
            <Text variant="muted" style={{ marginTop: spacing.xs }}>
              {t("medMoodHint")}
            </Text>
            <View
              style={{
                flexDirection: "row",
                flexWrap: "wrap",
                gap: spacing.sm,
                marginTop: spacing.md,
              }}
            >
              {[1, 2, 3, 4, 5].map((n) => (
                <Pressable key={n} onPress={() => setMoodBefore(n)}>
                  <Panel>
                    <Text color={moodBefore === n ? colors.brassSoft : undefined}>
                      {n}
                    </Text>
                  </Panel>
                </Pressable>
              ))}
            </View>
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
          <View style={{ marginTop: spacing.xl }}>
            <Text variant="eyebrow" color={colors.brassSoft}>
              {phase.type === "speak"
                ? t("medPhaseSpeak")
                : t("medPhaseSilence")}{" "}
              · {phaseIdx + 1}/{session.phases.length}
            </Text>
            <View style={styles.rateRow}>
              <Text variant="muted">{t("medRateLabel")}</Text>
              {(
                [
                  [0.85, t("medRateSlow")],
                  [1, t("medRateNormal")],
                  [1.15, t("medRateFast")],
                ] as const
              ).map(([value, label]) => {
                const active = rate === value;
                return (
                  <Pressable
                    key={String(value)}
                    onPress={() => setRate(value)}
                    style={[
                      styles.rateChip,
                      {
                        borderColor: active ? colors.brass : colors.line,
                        backgroundColor: active ? colors.surface : "transparent",
                      },
                    ]}
                  >
                    <Text
                      variant="muted"
                      color={active ? colors.brassSoft : colors.textMuted}
                    >
                      {label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
            {phase.type === "speak" ? (
              <Panel style={{ marginTop: spacing.md }}>
                <Text variant="soft">
                  {lang === "hi" ? phase.text_hi : phase.text_en}
                </Text>
                <Pressable
                  onPress={speaking ? stopVoice : readAloud}
                  style={{ marginTop: spacing.md }}
                >
                  <Text color={colors.brassSoft}>
                    {speaking ? t("medStopVoice") : t("medReadAloud")}
                  </Text>
                </Pressable>
                <Pressable
                  onPress={() => {
                    autoAdvance.current = false;
                    Speech.stop();
                    advancePhase();
                  }}
                  style={{ marginTop: spacing.sm }}
                >
                  <Text color={colors.brassSoft}>{t("medSkipSpeak")} →</Text>
                </Pressable>
              </Panel>
            ) : (
              <View style={{ marginTop: spacing.lg, alignItems: "center" }}>
                <Text variant="title" style={{ fontSize: 40 }}>
                  {formatClock(silenceLeft ?? phase.seconds)}
                </Text>
                <Pressable
                  onPress={advancePhase}
                  style={{ marginTop: spacing.md }}
                >
                  <Text color={colors.brassSoft}>{t("medNextPhase")}</Text>
                </Pressable>
              </View>
            )}
            <Pressable
              onPress={() => setShowTranscript((v) => !v)}
              style={{ marginTop: spacing.lg }}
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
          <View style={{ marginTop: spacing.xl }}>
            <Text variant="title" style={{ fontSize: 20 }}>
              {t("medMoodAfter")}
            </Text>
            <View
              style={{
                flexDirection: "row",
                flexWrap: "wrap",
                gap: spacing.sm,
                marginTop: spacing.md,
              }}
            >
              {[1, 2, 3, 4, 5].map((n) => (
                <Pressable key={n} onPress={() => setMoodAfter(n)}>
                  <Panel>
                    <Text
                      color={moodAfter === n ? colors.brassSoft : undefined}
                    >
                      {n}
                    </Text>
                  </Panel>
                </Pressable>
              ))}
            </View>
            <View style={{ marginTop: spacing.lg }}>
              {saving ? (
                <ActivityIndicator color={colors.brass} />
              ) : (
                <Button
                  label={t("medComplete")}
                  onPress={() => void finish()}
                  disabled={moodAfter == null}
                />
              )}
            </View>
          </View>
        ) : null}

        {stage === "done" ? (
          <View style={{ marginTop: spacing.xl }}>
            <Text variant="title" style={{ fontSize: 22 }}>
              {t("medDoneTitle")}
            </Text>
            <Text variant="soft" style={{ marginTop: spacing.sm }}>
              {t("medDoneBody")}
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
              onPress={() => router.push("/meditation")}
              style={{ marginTop: spacing.lg }}
            >
              <Text color={colors.brassSoft}>{t("medBack")} →</Text>
            </Pressable>
            <Pressable
              onPress={() => router.push("/sadhana")}
              style={{ marginTop: spacing.sm }}
            >
              <Text color={colors.brassSoft}>{t("medBridgeSadhana")} →</Text>
            </Pressable>
            <Pressable
              onPress={() => void Linking.openURL(SUPPORT_URL)}
              style={{ marginTop: spacing.sm }}
            >
              <Text color={colors.brassSoft}>{t("medBridgeSupport")} →</Text>
            </Pressable>
          </View>
        ) : null}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
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

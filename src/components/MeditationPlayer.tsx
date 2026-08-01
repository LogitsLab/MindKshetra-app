import React, { useEffect, useRef, useState } from "react";
import {
  Pressable,
  ScrollView,
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
import {
  FOUNDATION_PROGRAM_ID,
  sessionTranscript,
  type MeditationSession,
} from "@/data/meditation";
import { uuidv4 } from "@/utils/uuid";
import { spacing } from "@/theme/tokens";

const SUPPORT_URL = "https://mind.logitslab.com/support";
const GUEST_RUN_KEY = `mindkshetra-meditation-run-${FOUNDATION_PROGRAM_ID}`;
const GUEST_QUEUE_KEY = "mindkshetra-meditation-queue";

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
      onDone: () => {
        if (autoAdvance.current) advancePhase();
      },
    });
    return () => {
      autoAdvance.current = false;
      Speech.stop();
    };
  }, [stage, phaseIdx, lang, session.phases]);

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
                <Pressable
                  key={n}
                  onPress={() => {
                    setMoodBefore(n);
                    satSecRef.current = 0;
                    phaseIdxRef.current = 0;
                    setPhaseIdx(0);
                    setStage("play");
                  }}
                >
                  <Panel>
                    <Text>{n}</Text>
                  </Panel>
                </Pressable>
              ))}
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
            {phase.type === "speak" ? (
              <Panel style={{ marginTop: spacing.md }}>
                <Text variant="soft">
                  {lang === "hi" ? phase.text_hi : phase.text_en}
                </Text>
                <Pressable
                  onPress={() => {
                    autoAdvance.current = false;
                    Speech.stop();
                    advancePhase();
                  }}
                  style={{ marginTop: spacing.md }}
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

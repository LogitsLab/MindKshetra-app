import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from "react-native";
import { useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import { useKeepAwake } from "expo-keep-awake";
import { Screen } from "@/components/Screen";
import { Text } from "@/components/Text";
import { Button } from "@/components/Button";
import { Panel } from "@/components/Panel";
import { Rise } from "@/components/Rise";
import { contentApi, sadhanaApi, userApi } from "@/api/endpoints";
import { useAuth } from "@/context/AuthContext";
import { useLanguage } from "@/context/LanguageContext";
import { useTheme } from "@/context/ThemeContext";
import { moods, previewMoodIds } from "@/data/moods";
import {
  addJournalDraft,
  appendSadhanaLog,
  localDayStamp,
} from "@/storage/local";
import { moodAccent } from "@/theme/assets";
import { uuidv4 } from "@/utils/uuid";
import { radii, spacing } from "@/theme/tokens";
import type { Mood, SadhanaStreak, Sloka } from "@/types";

const SIT_PRESETS = [3, 5, 10] as const;

function formatClock(totalSec: number): string {
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

/**
 * One composed practice: name the mind, sit with a verse, sit in silence,
 * leave one line. Staged sections on a single screen — not a wizard.
 */
export default function SadhanaScreen() {
  useKeepAwake();
  const router = useRouter();
  const { colors } = useTheme();
  const { t, lang } = useLanguage();
  const { session, isSignedIn } = useAuth();

  const sadhanaMoods = previewMoodIds
    .map((id) => moods.find((m) => m.id === id))
    .filter((m): m is Mood => Boolean(m));

  // (a) mood
  const [moodId, setMoodId] = useState<string | null>(null);
  // (b) verse
  const [verse, setVerse] = useState<Sloka | null>(null);
  const [verseLoading, setVerseLoading] = useState(false);
  const [verseFailed, setVerseFailed] = useState(false);
  const moodReqRef = useRef(0);
  // (c) sit
  const [presetMin, setPresetMin] = useState<number>(3);
  const [remaining, setRemaining] = useState(3 * 60);
  const [running, setRunning] = useState(false);
  const [sitDone, setSitDone] = useState(false);
  const remainingRef = useRef(3 * 60);
  const satSecRef = useRef(0);
  // (d) reflection + (e) done
  const [reflection, setReflection] = useState("");
  const [saving, setSaving] = useState(false);
  const [streakRes, setStreakRes] = useState<SadhanaStreak | null>(null);
  const [guestSaved, setGuestSaved] = useState(false);
  const doneLoggedRef = useRef(false);

  const pickMood = (id: string) => {
    setMoodId(id);
    setVerse(null);
    setVerseFailed(false);
    setVerseLoading(true);
    const req = ++moodReqRef.current;
    contentApi
      .moodSlokas(id)
      .then((r) => {
        if (moodReqRef.current !== req) return;
        const first = r.slokas?.[0] ?? null;
        setVerse(first);
        setVerseFailed(!first);
      })
      .catch(() => {
        if (moodReqRef.current === req) setVerseFailed(true);
      })
      .finally(() => {
        if (moodReqRef.current === req) setVerseLoading(false);
      });
  };

  const pickPreset = (min: number) => {
    if (running) return;
    setPresetMin(min);
    remainingRef.current = min * 60;
    setRemaining(min * 60);
  };

  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => {
      satSecRef.current += 1;
      remainingRef.current = Math.max(0, remainingRef.current - 1);
      const left = remainingRef.current;
      setRemaining(left);
      if (left <= 0) {
        setRunning(false);
        setSitDone(true);
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    }, 1000);
    return () => clearInterval(id);
  }, [running]);

  const timerLabel = running
    ? t("sadhanaPause")
    : remaining === presetMin * 60
      ? t("sadhanaStart")
      : t("sadhanaResume");

  const finish = async () => {
    if (doneLoggedRef.current) return;
    setSaving(true);
    // The reflection rides along first; a failed send falls back to the same
    // local draft queue the verse journal uses.
    const text = reflection.trim();
    if (text && verse && isSignedIn) {
      try {
        await userApi.addJournal(verse.id, text);
      } catch {
        await addJournalDraft(verse.id, text);
      }
    }
    const durationSec = Math.max(1, satSecRef.current);
    const entry = {
      practice: "flow" as const,
      occurredOn: localDayStamp(),
      durationSec,
      clientRef: uuidv4(),
    };
    let timezone: string | undefined;
    try {
      timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || undefined;
    } catch {
      timezone = undefined;
    }
    if (session) {
      try {
        const res = await sadhanaApi.log({
          practice: "flow",
          durationSec,
          clientRef: entry.clientRef,
          timezone,
        });
        setStreakRes(res.streak);
      } catch {
        await appendSadhanaLog(entry);
        setGuestSaved(true);
      }
    } else {
      await appendSadhanaLog(entry);
      setGuestSaved(true);
    }
    doneLoggedRef.current = true;
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setSaving(false);
  };

  return (
    <Screen>
      <ScrollView
        contentContainerStyle={{
          paddingBottom: spacing.contentBottom,
          paddingTop: spacing.sm,
        }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* (a) Name the mind */}
        <Rise>
          <Text variant="eyebrow" color={colors.brassSoft}>
            {t("homeSadhanaEyebrow")}
          </Text>
          <Text variant="display" style={{ marginTop: spacing.sm }}>
            {t("sadhanaMoodTitle")}
          </Text>
          <View style={styles.moodWrap}>
            {sadhanaMoods.map((mood) => {
              const accent = moodAccent[mood.id] ?? colors.brass;
              const selected = moodId === mood.id;
              return (
                <Pressable
                  key={mood.id}
                  onPress={() => pickMood(mood.id)}
                  style={({ pressed }) => [
                    styles.moodChip,
                    {
                      borderColor: selected ? accent : `${accent}66`,
                      backgroundColor:
                        selected || pressed ? `${accent}28` : `${accent}14`,
                    },
                  ]}
                >
                  <View style={[styles.moodDot, { backgroundColor: accent }]} />
                  <Text
                    variant="body"
                    style={{ fontSize: 14, fontFamily: "Sora_600SemiBold" }}
                  >
                    {lang === "hi" ? mood.labelHi : mood.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </Rise>

        {/* (b) A verse that meets it */}
        {moodId ? (
          <View style={{ marginTop: spacing.xl }}>
            <Text variant="eyebrow" color={colors.brassSoft}>
              {t("sadhanaVerseEyebrow")}
            </Text>
            {verseLoading ? (
              <ActivityIndicator
                color={colors.brass}
                style={{ marginTop: spacing.lg }}
              />
            ) : verse ? (
              <Panel style={{ marginTop: spacing.md }}>
                <Text variant="eyebrow" color={colors.brassSoft}>
                  {verse.chapter}.{verse.verse_number}
                </Text>
                <Text
                  variant="sanskrit"
                  style={{ marginTop: spacing.md, fontSize: 20, lineHeight: 32 }}
                >
                  {verse.sanskrit_devanagari}
                </Text>
                <Text variant="soft" style={{ marginTop: spacing.md }}>
                  {lang === "hi"
                    ? verse.hindi_translation
                    : verse.english_translation}
                </Text>
                <Pressable onPress={() => router.push(`/sloka/${verse.id}`)}>
                  <Text
                    variant="muted"
                    color={colors.brassSoft}
                    style={{ marginTop: spacing.md }}
                  >
                    {t("sadhanaOpenVerse")} →
                  </Text>
                </Pressable>
              </Panel>
            ) : verseFailed ? (
              <Text variant="soft" style={{ marginTop: spacing.md }}>
                {t("sadhanaVerseFailed")}
              </Text>
            ) : null}
          </View>
        ) : null}

        {/* (c) The sit */}
        {verse ? (
          <View style={{ marginTop: spacing.xl }}>
            <Text variant="eyebrow" color={colors.brassSoft}>
              {t("sadhanaSitEyebrow")}
            </Text>
            {!sitDone ? (
              <View style={styles.presetRow}>
                {SIT_PRESETS.map((m) => {
                  const selected = presetMin === m;
                  return (
                    <Pressable
                      key={m}
                      disabled={running}
                      onPress={() => pickPreset(m)}
                      style={[
                        styles.presetChip,
                        {
                          borderColor: selected ? colors.brass : colors.line,
                          backgroundColor: selected
                            ? "rgba(201, 162, 39, 0.14)"
                            : colors.surface,
                          opacity: running && !selected ? 0.4 : 1,
                        },
                      ]}
                    >
                      <Text
                        variant="body"
                        style={{ fontSize: 14, fontFamily: "Sora_600SemiBold" }}
                      >
                        {m} {t("sadhanaMin")}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            ) : null}
            <Text style={[styles.clock, { color: colors.text }]}>
              {formatClock(remaining)}
            </Text>
            {sitDone ? (
              <Text
                variant="soft"
                color={colors.brassSoft}
                style={{ textAlign: "center", marginTop: spacing.sm }}
              >
                {t("sadhanaSitDone")}
              </Text>
            ) : (
              <>
                <View style={{ marginTop: spacing.md }}>
                  <Button
                    label={timerLabel}
                    variant={running ? "ghost" : "primary"}
                    onPress={() => setRunning((r) => !r)}
                  />
                </View>
                <Text
                  variant="muted"
                  style={{ textAlign: "center", marginTop: spacing.sm }}
                >
                  {t("sadhanaSitHint")}
                </Text>
              </>
            )}
          </View>
        ) : null}

        {/* (d) One line */}
        {sitDone ? (
          <View style={{ marginTop: spacing.xl }}>
            <Text variant="eyebrow" color={colors.brassSoft}>
              {t("sadhanaReflectEyebrow")}
            </Text>
            {isSignedIn ? (
              <TextInput
                value={reflection}
                onChangeText={setReflection}
                placeholder={t("sadhanaReflectPlaceholder")}
                placeholderTextColor={colors.textMuted}
                editable={!streakRes && !guestSaved}
                style={[
                  styles.input,
                  {
                    color: colors.text,
                    borderColor: colors.line,
                    backgroundColor: colors.inputBg,
                  },
                ]}
              />
            ) : (
              <Pressable onPress={() => router.push("/account")}>
                <Text
                  variant="soft"
                  color={colors.brassSoft}
                  style={{ marginTop: spacing.md }}
                >
                  {t("sadhanaReflectSignIn")}
                </Text>
              </Pressable>
            )}
          </View>
        ) : null}

        {/* (e) Done for today */}
        {sitDone && !streakRes && !guestSaved ? (
          <View style={{ marginTop: spacing.xl }}>
            <Button label={t("sadhanaDone")} loading={saving} onPress={finish} />
          </View>
        ) : null}

        {streakRes ? (
          <Rise style={{ marginTop: spacing.xl }}>
            <Panel>
              <Text variant="title" style={{ fontSize: 20 }}>
                {t("sadhanaStreakLine").replace(
                  "{n}",
                  String(streakRes.current)
                )}
              </Text>
              {streakRes.graceUsedToday ? (
                <Text variant="soft" style={{ marginTop: spacing.sm }}>
                  {t("sadhanaGrace")}
                </Text>
              ) : null}
            </Panel>
          </Rise>
        ) : null}

        {guestSaved ? (
          <Rise style={{ marginTop: spacing.xl }}>
            <Pressable onPress={() => router.push("/account")}>
              <Panel>
                <Text variant="soft" color={colors.brassSoft}>
                  {t("sadhanaSavedDevice")}
                </Text>
              </Panel>
            </Pressable>
          </Rise>
        ) : null}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  moodWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
    marginTop: spacing.lg,
  },
  moodChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingVertical: spacing.sm + 4,
    paddingHorizontal: spacing.md,
    borderRadius: radii.lg,
    borderWidth: StyleSheet.hairlineWidth * 2,
  },
  moodDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  presetRow: {
    flexDirection: "row",
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  presetChip: {
    paddingVertical: spacing.sm + 4,
    paddingHorizontal: spacing.md,
    borderRadius: radii.lg,
    borderWidth: StyleSheet.hairlineWidth * 2,
  },
  clock: {
    fontFamily: "Fraunces_600SemiBold",
    fontSize: 64,
    lineHeight: 72,
    letterSpacing: -1,
    textAlign: "center",
    marginTop: spacing.lg,
  },
  input: {
    minHeight: 48,
    borderWidth: StyleSheet.hairlineWidth * 2,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    fontFamily: "Sora_400Regular",
    marginTop: spacing.md,
  },
});

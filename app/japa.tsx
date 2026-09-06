import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  AccessibilityInfo,
  Animated,
  Easing,
  Pressable,
  StyleSheet,
  TextInput,
  View,
} from "react-native";
import { useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import { useKeepAwake } from "expo-keep-awake";
import Svg, { Circle, Path } from "react-native-svg";
import { Screen } from "@/components/Screen";
import { Text } from "@/components/Text";
import { Button } from "@/components/Button";
import { PageHero } from "@/components/PageHero";
import { Rise } from "@/components/Rise";
import { MilestoneLine, takeNewMilestone } from "@/components/PracticeMarks";
import {
  KeyboardFormScroll,
  fieldInputProps,
} from "@/components/KeyboardForm";
import { sadhanaApi } from "@/api/endpoints";
import { useAuth } from "@/context/AuthContext";
import { useLanguage } from "@/context/LanguageContext";
import { useTheme } from "@/context/ThemeContext";
import {
  CUSTOM_MANTRA_ID,
  looksDevanagari,
  mantras,
  type Mantra,
} from "@/data/mantras";
import {
  hasJapaChant,
  japaChantDurationMs,
  playJapaChant,
  stopJapaChant,
} from "@/audio/japa";
import type { Milestone } from "@/data/milestones";
import {
  appendSadhanaLog,
  getJapaPrefs,
  getJapaStats,
  localDayStamp,
  recordJapaBeads,
  setJapaPrefs,
  type JapaMode,
  type JapaStats,
  type JapaTarget,
} from "@/storage/local";
import { uuidv4 } from "@/utils/uuid";
import { images } from "@/theme/assets";
import { radii, spacing, type ThemeColors } from "@/theme/tokens";

const RING_SIZE = 248;
const BEAD_R = 2.6;
const GURU_R = 4.5;
const TARGETS: JapaTarget[] = [27, 54, 108];
const DAILY_GOAL = 108;

function customMantra(naam: string): Mantra {
  const trimmed = naam.trim();
  const devanagari = looksDevanagari(trimmed) ? trimmed : "";
  const iast = looksDevanagari(trimmed) ? "" : trimmed;
  return {
    id: CUSTOM_MANTRA_ID,
    devanagari: devanagari || trimmed,
    iast: iast || trimmed,
    meaning_en: "The name you brought to this mala.",
    meaning_hi: "वह नाम जो आप इस माला पर लाए।",
  };
}

export default function JapaScreen() {
  useKeepAwake();
  const router = useRouter();
  const { colors } = useTheme();
  const { t, lang } = useLanguage();
  const { session } = useAuth();

  // One continuous surface: land on the mala; the setup opens inline.
  const [editing, setEditing] = useState(false);
  const [prefsLoaded, setPrefsLoaded] = useState(false);
  const [mantraId, setMantraId] = useState(mantras[0].id);
  const [customNaam, setCustomNaam] = useState("");
  const [target, setTarget] = useState<JapaTarget>(108);
  const [mode, setMode] = useState<JapaMode>("self");
  const [total, setTotal] = useState(0);
  const [milestone, setMilestone] = useState<Milestone | null>(null);
  const [malaFlash, setMalaFlash] = useState(false);
  const [chantPlaying, setChantPlaying] = useState(false);
  const [previewId, setPreviewId] = useState<string | null>(null);
  const [stats, setStats] = useState<JapaStats | null>(null);
  const statsBaseRef = useRef(0);
  const reduceMotion = useRef(false);
  const pulse = useRef(new Animated.Value(1)).current;
  const flashTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const chantTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const previewTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const totalRef = useRef(0);
  const startedAtRef = useRef<number | null>(null);
  const loggedRef = useRef(false);
  const clientRefRef = useRef(uuidv4());
  const sessionRef = useRef(session);
  const modeRef = useRef(mode);
  const mantraRef = useRef<Mantra>(mantras[0]);
  const targetRef = useRef(target);

  useEffect(() => {
    sessionRef.current = session;
  }, [session]);
  useEffect(() => {
    modeRef.current = mode;
  }, [mode]);
  useEffect(() => {
    targetRef.current = target;
  }, [target]);

  const mantra: Mantra = useMemo(() => {
    if (mantraId === CUSTOM_MANTRA_ID) return customMantra(customNaam);
    return mantras.find((m) => m.id === mantraId) ?? mantras[0];
  }, [mantraId, customNaam]);

  useEffect(() => {
    mantraRef.current = mantra;
  }, [mantra]);

  useEffect(() => {
    let alive = true;
    void getJapaPrefs().then((prefs) => {
      if (!alive) return;
      setMantraId(prefs.mantraId);
      setCustomNaam(prefs.customNaam);
      setTarget(prefs.target);
      setMode(prefs.mode);
      setPrefsLoaded(true);
    });
    void getJapaStats().then((s) => {
      if (!alive) return;
      setStats(s);
      statsBaseRef.current = s.dayBeads;
    });
    void AccessibilityInfo.isReduceMotionEnabled().then((enabled) => {
      if (alive) reduceMotion.current = enabled;
    });
    const sub = AccessibilityInfo.addEventListener(
      "reduceMotionChanged",
      (enabled) => {
        reduceMotion.current = enabled;
      }
    );
    return () => {
      alive = false;
      sub.remove();
      if (flashTimer.current) clearTimeout(flashTimer.current);
      if (chantTimer.current) clearTimeout(chantTimer.current);
      if (previewTimer.current) clearTimeout(previewTimer.current);
      stopJapaChant();
    };
  }, []);

  // Persist the setup as it is edited — there is no explicit "begin" step now.
  useEffect(() => {
    if (!prefsLoaded) return;
    void setJapaPrefs({ mantraId, customNaam, target, mode });
  }, [prefsLoaded, mantraId, customNaam, target, mode]);

  // Malas loop: counting past the target opens a fresh round rather than
  // stopping. The ring shows the current round's position; the tally and round
  // count carry the whole session.
  const rounds = Math.floor(total / target);
  const beadInRound = total % target;
  const roundComplete = total > 0 && beadInRound === 0;
  const displayBead = total === 0 ? 0 : roundComplete ? target : beadInRound;
  const currentRound = total === 0 ? 1 : roundComplete ? rounds : rounds + 1;
  const litCount = malaFlash || roundComplete ? target : beadInRound;
  const todayBeads = statsBaseRef.current + total;
  const goalMet = todayBeads >= DAILY_GOAL;
  const meaning = lang === "hi" ? mantra.meaning_hi : mantra.meaning_en;
  const hiEyebrow =
    lang === "hi"
      ? { letterSpacing: 0, textTransform: "none" as const }
      : null;
  const customEmpty = mantraId === CUSTOM_MANTRA_ID && !customNaam.trim();

  const playTapMotion = (nextTotal: number) => {
    if (reduceMotion.current) {
      pulse.setValue(1);
      return;
    }
    const malaDone = nextTotal % targetRef.current === 0;
    Animated.sequence([
      Animated.timing(pulse, {
        toValue: malaDone ? 1.12 : 1.05,
        duration: malaDone ? 120 : 70,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
      Animated.timing(pulse, {
        toValue: 1,
        duration: malaDone ? 220 : 140,
        easing: Easing.inOut(Easing.quad),
        useNativeDriver: true,
      }),
    ]).start();
  };

  const chantAssisted = () => {
    const id = mantraRef.current.id;
    void playJapaChant(id).then((ok) => {
      if (!ok) {
        setChantPlaying(false);
        return;
      }
      setChantPlaying(true);
      if (chantTimer.current) clearTimeout(chantTimer.current);
      chantTimer.current = setTimeout(
        () => setChantPlaying(false),
        japaChantDurationMs(id)
      );
    });
  };

  const previewMantra = (id: string) => {
    if (previewTimer.current) clearTimeout(previewTimer.current);
    if (previewId === id) {
      stopJapaChant();
      setPreviewId(null);
      return;
    }
    void playJapaChant(id, { interrupt: true }).then((ok) => {
      if (!ok) {
        setPreviewId(null);
        return;
      }
      setPreviewId(id);
      previewTimer.current = setTimeout(
        () => setPreviewId(null),
        japaChantDurationMs(id) + 150
      );
    });
  };

  const onTap = () => {
    if (editing) return;
    if (startedAtRef.current == null) startedAtRef.current = Date.now();
    if (modeRef.current === "assisted") chantAssisted();
    const next = totalRef.current + 1;
    totalRef.current = next;
    setTotal(next);
    playTapMotion(next);
    if (next % targetRef.current === 0) {
      // A round just closed — celebrate it, then keep counting into the next.
      setMalaFlash(true);
      if (flashTimer.current) clearTimeout(flashTimer.current);
      flashTimer.current = setTimeout(() => setMalaFlash(false), 420);
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      void takeNewMilestone().then(setMilestone);
    } else {
      void Haptics.selectionAsync();
    }
  };

  const logSession = useCallback(() => {
    if (loggedRef.current) return;
    const count = totalRef.current;
    if (count <= 0) return;
    loggedRef.current = true;
    stopJapaChant();
    const durationSec = startedAtRef.current
      ? Math.max(1, Math.round((Date.now() - startedAtRef.current) / 1000))
      : undefined;
    const entry = {
      practice: "japa" as const,
      occurredOn: localDayStamp(),
      count,
      durationSec,
      clientRef: clientRefRef.current,
    };
    if (sessionRef.current) {
      let timezone: string | undefined;
      try {
        timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || undefined;
      } catch {
        timezone = undefined;
      }
      sadhanaApi
        .log({
          practice: "japa",
          count,
          durationSec,
          clientRef: entry.clientRef,
          timezone,
        })
        .catch(() => {
          void appendSadhanaLog(entry);
        });
    } else {
      void appendSadhanaLog(entry);
    }
    // Device-local tally for lifetime + daily-goal insight (independent of the
    // server log so guests get stats too).
    void recordJapaBeads(count).then(setStats);
  }, []);

  useEffect(() => () => logSession(), [logSession]);

  const openEditor = () => {
    stopJapaChant();
    setChantPlaying(false);
    setEditing(true);
  };

  const closeEditor = () => {
    if (previewTimer.current) clearTimeout(previewTimer.current);
    stopJapaChant();
    setPreviewId(null);
    setEditing(false);
  };

  const summaryTitle = customEmpty
    ? t("japaCustomNaam")
    : mantra.devanagari || mantra.iast;
  const modeLabel = mode === "assisted" ? t("japaModeAssisted") : t("japaModeSelf");

  return (
    <Screen atmosphere="soft" padded={false} edges={["left", "right"]} testID="screen-japa">
      <KeyboardFormScroll
        contentContainerStyle={{
          paddingHorizontal: spacing.md,
          paddingBottom: spacing.xxl,
        }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Rise>
          <PageHero
            fullBleed
            backFallback="/(tabs)/home"
            image={images.krishnaCharan}
            eyebrow={t("homeJapaTitle")}
            title={t("japaSetupTitle")}
            intro={t("japaSetupIntro")}
          />
        </Rise>

        {/* Setup summary — one tap opens the inline editor. */}
        <Rise delay={40}>
          <Pressable
            onPress={() => (editing ? closeEditor() : openEditor())}
            accessibilityRole="button"
            accessibilityLabel={t("japaChangeSetup")}
            style={[
              styles.summaryBar,
              { borderColor: colors.line, backgroundColor: colors.panel },
            ]}
          >
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text variant="eyebrow" color={colors.brassSoft} style={hiEyebrow}>
                {t("japaChangeSetup")}
              </Text>
              <Text
                variant="sanskrit"
                style={{ fontSize: 17, lineHeight: 26, marginTop: 2 }}
                numberOfLines={1}
              >
                {summaryTitle}
              </Text>
              <Text variant="muted" numberOfLines={1} style={{ marginTop: 2 }}>
                {target} · {modeLabel}
                {mode === "assisted" && !hasJapaChant(mantraId)
                  ? ` · ${t("japaNoChant")}`
                  : ""}
              </Text>
            </View>
            <Chevron open={editing} color={colors.brassSoft} />
          </Pressable>
        </Rise>

        {editing ? (
          <Rise delay={60} style={styles.editor}>
            {stats && (stats.lifetimeBeads > 0 || stats.dayBeads > 0) ? (
              <View style={{ marginTop: spacing.md }}>
                {stats.lifetimeBeads > 0 ? (
                  <Text variant="muted">
                    {t("japaLifetime")
                      .replace("{beads}", String(stats.lifetimeBeads))
                      .replace(
                        "{malas}",
                        String(Math.floor(stats.lifetimeBeads / 108))
                      )}
                  </Text>
                ) : null}
                <Text
                  variant="muted"
                  color={colors.brassSoft}
                  style={{ marginTop: spacing.xs }}
                >
                  {stats.dayBeads >= DAILY_GOAL
                    ? t("japaDailyGoalMet").replace("{n}", String(stats.dayBeads))
                    : t("japaDailyToday")
                        .replace("{n}", String(stats.dayBeads))
                        .replace("{goal}", String(DAILY_GOAL))}
                </Text>
              </View>
            ) : null}

            <Text
              variant="eyebrow"
              color={colors.brassSoft}
              style={[{ marginTop: spacing.lg }, hiEyebrow]}
            >
              {t("japaPickTitle")}
            </Text>
            <View style={styles.pickGrid}>
              {mantras.map((m) => {
                const selected = m.id === mantraId;
                const chant = hasJapaChant(m.id);
                return (
                  <Pressable
                    key={m.id}
                    onPress={() => setMantraId(m.id)}
                    accessibilityRole="radio"
                    accessibilityState={{ selected }}
                    style={[
                      styles.pickCard,
                      {
                        borderColor: selected ? colors.brass : colors.line,
                        backgroundColor: selected
                          ? colors.surfaceHover
                          : colors.panel,
                      },
                    ]}
                  >
                    <View style={styles.pickHead}>
                      <Text
                        variant="sanskrit"
                        style={{ fontSize: 18, lineHeight: 28, flex: 1 }}
                        numberOfLines={1}
                      >
                        {m.devanagari}
                      </Text>
                      {chant ? (
                        <Pressable
                          onPress={() => previewMantra(m.id)}
                          hitSlop={10}
                          accessibilityRole="button"
                          accessibilityLabel={t("japaPreview")}
                          style={[
                            styles.previewBtn,
                            {
                              borderColor:
                                previewId === m.id ? colors.brass : colors.line,
                              backgroundColor:
                                previewId === m.id
                                  ? colors.surfaceHover
                                  : "transparent",
                            },
                          ]}
                        >
                          {previewId === m.id ? (
                            <StopIcon color={colors.brassSoft} />
                          ) : (
                            <PlayIcon color={colors.brassSoft} />
                          )}
                        </Pressable>
                      ) : (
                        <Text variant="muted" style={styles.noChantTag}>
                          {t("japaNoChant")}
                        </Text>
                      )}
                    </View>
                    <Text
                      variant="muted"
                      numberOfLines={1}
                      style={{ fontStyle: "italic" }}
                    >
                      {m.iast}
                    </Text>
                    <Text
                      variant="muted"
                      numberOfLines={2}
                      style={{ marginTop: 4, fontSize: 12, lineHeight: 17 }}
                    >
                      {lang === "hi" ? m.meaning_hi : m.meaning_en}
                    </Text>
                  </Pressable>
                );
              })}

              <Pressable
                onPress={() => setMantraId(CUSTOM_MANTRA_ID)}
                accessibilityRole="radio"
                accessibilityState={{ selected: mantraId === CUSTOM_MANTRA_ID }}
                style={[
                  styles.pickCard,
                  {
                    borderColor:
                      mantraId === CUSTOM_MANTRA_ID ? colors.brass : colors.line,
                    backgroundColor:
                      mantraId === CUSTOM_MANTRA_ID
                        ? colors.surfaceHover
                        : colors.panel,
                  },
                ]}
              >
                <Text variant="body">{t("japaCustomNaam")}</Text>
                {mantraId === CUSTOM_MANTRA_ID ? (
                  <TextInput
                    value={customNaam}
                    onChangeText={setCustomNaam}
                    placeholder={t("japaCustomPlaceholder")}
                    placeholderTextColor={colors.textMuted}
                    accessibilityLabel={t("japaCustomNaam")}
                    {...fieldInputProps}
                    style={[
                      styles.customInput,
                      {
                        color: colors.text,
                        borderColor: colors.line,
                        backgroundColor: colors.inputBg,
                      },
                    ]}
                  />
                ) : null}
              </Pressable>
            </View>

            <Text
              variant="eyebrow"
              color={colors.brassSoft}
              style={{ marginTop: spacing.lg }}
            >
              {t("japaTargetLabel")}
            </Text>
            <View style={styles.chipRow}>
              {TARGETS.map((n) => (
                <Pressable
                  key={n}
                  onPress={() => setTarget(n)}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: target === n }}
                  style={[
                    styles.chip,
                    {
                      borderColor: target === n ? colors.brass : colors.line,
                      backgroundColor:
                        target === n ? colors.surfaceHover : "transparent",
                    },
                  ]}
                >
                  <Text color={target === n ? colors.brassSoft : colors.text}>
                    {n}
                  </Text>
                </Pressable>
              ))}
            </View>

            <Text
              variant="eyebrow"
              color={colors.brassSoft}
              style={{ marginTop: spacing.lg }}
            >
              {t("japaModeLabel")}
            </Text>
            <View style={styles.chipRow}>
              {(["assisted", "self"] as const).map((m) => (
                <Pressable
                  key={m}
                  onPress={() => setMode(m)}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: mode === m }}
                  style={[
                    styles.chip,
                    {
                      borderColor: mode === m ? colors.brass : colors.line,
                      backgroundColor:
                        mode === m ? colors.surfaceHover : "transparent",
                    },
                  ]}
                >
                  <Text color={mode === m ? colors.brassSoft : colors.text}>
                    {m === "assisted" ? t("japaModeAssisted") : t("japaModeSelf")}
                  </Text>
                </Pressable>
              ))}
            </View>
            <Text variant="muted" style={{ marginTop: spacing.sm }}>
              {mode === "assisted"
                ? hasJapaChant(mantraId)
                  ? t("japaModeAssistedHint")
                  : t("japaModeAssistedNoneHint")
                : t("japaModeSelfHint")}
            </Text>
            {mode === "assisted" && hasJapaChant(mantraId) ? (
              <Text variant="muted" style={{ marginTop: spacing.xs }}>
                {t("japaChantCredit")}
              </Text>
            ) : null}

            <Button
              label={t("japaSetupDone")}
              onPress={closeEditor}
              disabled={customEmpty}
              style={{ marginTop: spacing.xl }}
            />
          </Rise>
        ) : (
          <Pressable
            style={styles.surface}
            onPress={onTap}
            accessibilityRole="button"
            accessibilityLabel={t("japaTapHint")}
          >
            <View style={styles.counter}>
              {!customEmpty ? (
                <Text
                  variant="sanskrit"
                  style={styles.counterMantra}
                  numberOfLines={2}
                >
                  {mantra.devanagari || mantra.iast}
                </Text>
              ) : null}
              <View style={styles.malaStage}>
                <MalaRing beadCount={target} litCount={litCount} colors={colors} />
                <Animated.View
                  style={[styles.countStack, { transform: [{ scale: pulse }] }]}
                >
                  <Text style={[styles.bead, { color: colors.text }]}>
                    {displayBead}
                  </Text>
                  <Text variant="muted">
                    {t("japaOfTarget").replace("{n}", String(target))}
                  </Text>
                </Animated.View>
              </View>
              {total > 0 ? (
                <Text
                  variant="muted"
                  color={colors.brassSoft}
                  style={{ marginTop: spacing.md }}
                >
                  {t("japaRound").replace("{n}", String(currentRound))}
                </Text>
              ) : null}
              <Text variant="muted" style={{ marginTop: spacing.xs }}>
                {goalMet
                  ? t("japaDailyGoalMet").replace("{n}", String(todayBeads))
                  : t("japaDailyToday")
                      .replace("{n}", String(todayBeads))
                      .replace("{goal}", String(DAILY_GOAL))}
              </Text>
              {roundComplete ? (
                <Text
                  variant="soft"
                  color={colors.brassSoft}
                  style={{ marginTop: spacing.sm, textAlign: "center" }}
                >
                  {t("japaTargetDone")} {t("japaKeepGoing")}
                </Text>
              ) : null}
              {milestone ? <MilestoneLine milestone={milestone} /> : null}
            </View>

            <View style={styles.footer}>
              {mode === "assisted" ? (
                <Text
                  variant="muted"
                  color={colors.brassSoft}
                  style={{ textAlign: "center", marginBottom: spacing.sm }}
                >
                  {hasJapaChant(mantraId)
                    ? chantPlaying
                      ? t("japaAssistedPlaying")
                      : t("japaAssistedReady")
                    : t("japaAssistedMuted")}
                </Text>
              ) : null}
              <Text
                variant="muted"
                style={{ textAlign: "center", marginBottom: spacing.md }}
              >
                {t("japaTapHint")}
              </Text>
              <Button
                variant="ghost"
                label={t("japaFinish")}
                onPress={() => {
                  logSession();
                  router.back();
                }}
              />
            </View>
          </Pressable>
        )}
      </KeyboardFormScroll>
    </Screen>
  );
}

function PlayIcon({ color }: { color: string }) {
  return (
    <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
      <Path d="M8 5v14l11-7z" fill={color} />
    </Svg>
  );
}

function StopIcon({ color }: { color: string }) {
  return (
    <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
      <Path d="M6 6h12v12H6z" fill={color} />
    </Svg>
  );
}

function Chevron({ open, color }: { open: boolean; color: string }) {
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
      <Path
        d={open ? "M6 15l6-6 6 6" : "M9 6l6 6-6 6"}
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function MalaRing({
  beadCount,
  litCount,
  colors,
}: {
  beadCount: number;
  litCount: number;
  colors: ThemeColors;
}) {
  const dots = useMemo(() => {
    const center = RING_SIZE / 2;
    const radius = center - GURU_R - 2;
    return Array.from({ length: beadCount }, (_, i) => {
      const angle = (i / beadCount) * Math.PI * 2 - Math.PI / 2;
      return {
        key: i,
        cx: center + Math.cos(angle) * radius,
        cy: center + Math.sin(angle) * radius,
        r: i === 0 ? GURU_R : BEAD_R,
        guru: i === 0,
      };
    });
  }, [beadCount]);

  return (
    <Svg
      pointerEvents="none"
      width={RING_SIZE}
      height={RING_SIZE}
      style={styles.ring}
    >
      {dots.map((dot) => {
        const filled = litCount > 0 && dot.key < litCount;
        const latest = litCount > 0 && dot.key === litCount - 1;
        return (
          <Circle
            key={dot.key}
            cx={dot.cx}
            cy={dot.cy}
            r={latest ? dot.r + 0.8 : dot.r}
            fill={
              latest
                ? colors.brassSoft
                : filled || dot.guru
                  ? colors.brass
                  : colors.line
            }
            opacity={latest ? 1 : filled ? 0.95 : dot.guru ? 0.75 : 0.4}
          />
        );
      })}
    </Svg>
  );
}

const styles = StyleSheet.create({
  summaryBar: {
    marginTop: spacing.lg,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderWidth: StyleSheet.hairlineWidth * 2,
    borderRadius: radii.lg,
  },
  editor: {
    marginTop: spacing.xs,
  },
  pickGrid: {
    marginTop: spacing.sm,
    gap: spacing.sm,
  },
  pickCard: {
    padding: spacing.md,
    borderWidth: StyleSheet.hairlineWidth * 2,
    borderRadius: radii.lg,
  },
  pickHead: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  previewBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: StyleSheet.hairlineWidth * 2,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  noChantTag: {
    fontSize: 11,
    flexShrink: 0,
  },
  surface: {
    paddingTop: spacing.md,
    paddingBottom: spacing.lg,
    minHeight: 520,
  },
  counter: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: spacing.lg,
  },
  counterMantra: {
    fontSize: 22,
    lineHeight: 34,
    textAlign: "center",
    marginBottom: spacing.lg,
    maxWidth: 340,
  },
  malaStage: {
    width: RING_SIZE,
    height: RING_SIZE,
    alignItems: "center",
    justifyContent: "center",
  },
  ring: {
    position: "absolute",
    left: 0,
    top: 0,
  },
  countStack: {
    alignItems: "center",
    justifyContent: "center",
  },
  bead: {
    fontFamily: "Fraunces_600SemiBold",
    fontSize: 80,
    lineHeight: 88,
    letterSpacing: -1,
  },
  footer: {
    paddingBottom: spacing.sm,
  },
  customInput: {
    marginTop: spacing.sm,
    minHeight: 48,
    borderWidth: StyleSheet.hairlineWidth * 2,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    fontFamily: "Sora_400Regular",
    fontSize: 16,
  },
  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  chip: {
    minHeight: 40,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderWidth: StyleSheet.hairlineWidth * 2,
    borderRadius: radii.md,
    justifyContent: "center",
  },
});

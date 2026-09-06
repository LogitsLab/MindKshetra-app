import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  AccessibilityInfo,
  Animated,
  Easing,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import { useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import { useKeepAwake } from "expo-keep-awake";
import { Screen } from "@/components/Screen";
import { Text } from "@/components/Text";
import { Button } from "@/components/Button";
import { PageHero } from "@/components/PageHero";
import { ScreenHeader } from "@/components/ScreenHeader";
import { Rise } from "@/components/Rise";
import { MilestoneLine, takeNewMilestone } from "@/components/PracticeMarks";
import {
  playSoftBell,
  releaseAmbientPlayers,
  startAmbient,
  stopAmbient,
  type AmbientBed,
} from "@/audio/ambient";
import { sadhanaApi } from "@/api/endpoints";
import { useAuth } from "@/context/AuthContext";
import { useLanguage } from "@/context/LanguageContext";
import { useTheme } from "@/context/ThemeContext";
import type { Milestone } from "@/data/milestones";
import { closingVerseFor } from "@/data/closingVerses";
import { appendSadhanaLog, localDayStamp } from "@/storage/local";
import { uuidv4 } from "@/utils/uuid";
import { images } from "@/theme/assets";
import { radii, spacing, type ThemeColors } from "@/theme/tokens";

const RING = 240;
const MIN_SCALE = 0.55;
const BEDS: AmbientBed[] = ["off", "drone", "bowls", "rain"];

type StepKey = "inhale" | "holdIn" | "exhale" | "holdOut";
type Step = { key: StepKey; sec: number; scaleTo: number; labelKey: DictLabel };
type DictLabel =
  | "pranaInhale"
  | "pranaHoldIn"
  | "pranaExhale"
  | "pranaHoldOut";

type PatternId = "box" | "calm478" | "even";
const PATTERNS: Record<PatternId, [number, number, number, number]> = {
  box: [4, 4, 4, 4],
  calm478: [4, 7, 8, 0],
  even: [5, 0, 5, 0],
};
const PATTERN_ORDER: PatternId[] = ["box", "calm478", "even"];
const DURATIONS = [2, 5, 10] as const;

const STEP_META: Array<Omit<Step, "sec">> = [
  { key: "inhale", scaleTo: 1, labelKey: "pranaInhale" },
  { key: "holdIn", scaleTo: 1, labelKey: "pranaHoldIn" },
  { key: "exhale", scaleTo: MIN_SCALE, labelKey: "pranaExhale" },
  { key: "holdOut", scaleTo: MIN_SCALE, labelKey: "pranaHoldOut" },
];

function buildSteps(pattern: PatternId): Step[] {
  return PATTERNS[pattern]
    .map((sec, i) => ({ ...STEP_META[i], sec }))
    .filter((s) => s.sec > 0);
}

export default function PranayamaScreen() {
  useKeepAwake();
  const router = useRouter();
  const { colors } = useTheme();
  const { t, lang } = useLanguage();
  const { session } = useAuth();

  const [stage, setStage] = useState<"setup" | "breathe" | "done">("setup");
  const [pattern, setPattern] = useState<PatternId>("box");
  const [minutes, setMinutes] = useState<(typeof DURATIONS)[number]>(5);
  const [bed, setBed] = useState<AmbientBed>("drone");
  const [stepIdx, setStepIdx] = useState(0);
  const [secLeft, setSecLeft] = useState(0);
  const [breaths, setBreaths] = useState(0);
  const [milestone, setMilestone] = useState<Milestone | null>(null);

  const ring = useRef(new Animated.Value(MIN_SCALE)).current;
  const reduceMotion = useRef(false);
  const stepIdxRef = useRef(0);
  const elapsedRef = useRef(0);
  const breathsRef = useRef(0);
  const targetRef = useRef(minutes * 60);
  const stepTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const tickTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const startedAtRef = useRef<number | null>(null);
  const loggedRef = useRef(false);
  const clientRefRef = useRef(uuidv4());
  const sessionRef = useRef(session);

  useEffect(() => {
    sessionRef.current = session;
  }, [session]);

  const steps = useMemo(() => buildSteps(pattern), [pattern]);

  useEffect(() => {
    void AccessibilityInfo.isReduceMotionEnabled().then((enabled) => {
      reduceMotion.current = enabled;
    });
    return () => {
      if (stepTimer.current) clearTimeout(stepTimer.current);
      if (tickTimer.current) clearInterval(tickTimer.current);
      stopAmbient();
      releaseAmbientPlayers();
    };
  }, []);

  const clearTimers = () => {
    if (stepTimer.current) clearTimeout(stepTimer.current);
    if (tickTimer.current) clearInterval(tickTimer.current);
    stepTimer.current = null;
    tickTimer.current = null;
  };

  const finish = useCallback(() => {
    clearTimers();
    void playSoftBell();
    stopAmbient();
    logSession();
    void takeNewMilestone().then(setMilestone);
    setStage("done");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const logSession = useCallback(() => {
    if (loggedRef.current) return;
    const durationSec = startedAtRef.current
      ? Math.max(1, Math.round((Date.now() - startedAtRef.current) / 1000))
      : elapsedRef.current;
    if (durationSec <= 0) return;
    loggedRef.current = true;
    const entry = {
      practice: "pranayama" as const,
      occurredOn: localDayStamp(),
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
        .log({ practice: "pranayama", durationSec, clientRef: entry.clientRef, timezone })
        .catch(() => {
          void appendSadhanaLog(entry);
        });
    } else {
      void appendSadhanaLog(entry);
    }
  }, []);

  // Drive one breath step: animate the ring, count down, then advance. Finishes
  // at the end of the step in which the chosen length elapses.
  useEffect(() => {
    if (stage !== "breathe") return;
    const step = steps[stepIdx];
    if (!step) return;

    if (step.key === "inhale") {
      breathsRef.current += 1;
      setBreaths(breathsRef.current);
    }

    void Haptics.selectionAsync();
    if (reduceMotion.current) {
      ring.setValue(step.scaleTo);
    } else {
      Animated.timing(ring, {
        toValue: step.scaleTo,
        duration: step.sec * 1000,
        easing: Easing.inOut(Easing.quad),
        useNativeDriver: true,
      }).start();
    }

    let left = step.sec;
    setSecLeft(left);
    tickTimer.current = setInterval(() => {
      left -= 1;
      setSecLeft(Math.max(0, left));
    }, 1000);

    stepTimer.current = setTimeout(() => {
      if (tickTimer.current) clearInterval(tickTimer.current);
      elapsedRef.current += step.sec;
      if (elapsedRef.current >= targetRef.current) {
        finish();
        return;
      }
      const next = (stepIdxRef.current + 1) % steps.length;
      stepIdxRef.current = next;
      setStepIdx(next);
    }, step.sec * 1000);

    return () => {
      if (stepTimer.current) clearTimeout(stepTimer.current);
      if (tickTimer.current) clearInterval(tickTimer.current);
    };
  }, [stage, stepIdx, steps, ring, finish]);

  const begin = () => {
    targetRef.current = minutes * 60;
    elapsedRef.current = 0;
    breathsRef.current = 0;
    stepIdxRef.current = 0;
    loggedRef.current = false;
    clientRefRef.current = uuidv4();
    startedAtRef.current = Date.now();
    ring.setValue(MIN_SCALE);
    setBreaths(0);
    setStepIdx(0);
    setMilestone(null);
    setStage("breathe");
    if (bed !== "off") void startAmbient(0.35, bed);
  };

  const stop = () => {
    logSession();
    clearTimers();
    stopAmbient();
    router.back();
  };

  if (stage === "setup") {
    return (
      <Screen atmosphere="soft" padded={false} edges={["left", "right"]} testID="screen-pranayama">
        <ScrollView
          contentContainerStyle={{ paddingHorizontal: spacing.md, paddingBottom: spacing.xxl }}
          showsVerticalScrollIndicator={false}
        >
          <Rise>
            <PageHero
              fullBleed
              backFallback="/meditation"
              image={images.krishnaGlade}
              eyebrow={t("pranaEyebrow")}
              title={t("pranaTitle")}
              intro={t("pranaIntro")}
            />
          </Rise>

          <Text variant="eyebrow" color={colors.brassSoft} style={{ marginTop: spacing.lg }}>
            {t("pranaPatternLabel")}
          </Text>
          <View style={{ gap: spacing.sm, marginTop: spacing.sm }}>
            {PATTERN_ORDER.map((p) => {
              const active = pattern === p;
              const label =
                p === "box"
                  ? t("pranaPatternBox")
                  : p === "calm478"
                    ? t("pranaPattern478")
                    : t("pranaPatternEven");
              const hint =
                p === "box"
                  ? t("pranaPatternBoxHint")
                  : p === "calm478"
                    ? t("pranaPattern478Hint")
                    : t("pranaPatternEvenHint");
              return (
                <Pressable
                  key={p}
                  onPress={() => setPattern(p)}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: active }}
                  style={[
                    styles.patternRow,
                    {
                      borderColor: active ? colors.brass : colors.line,
                      backgroundColor: active ? colors.surfaceHover : "transparent",
                    },
                  ]}
                >
                  <Text color={active ? colors.brassSoft : colors.text}>{label}</Text>
                  <Text variant="muted" style={{ marginTop: 2 }}>
                    {hint}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <Text variant="eyebrow" color={colors.brassSoft} style={{ marginTop: spacing.lg }}>
            {t("pranaDurationLabel")}
          </Text>
          <View style={styles.chipRow}>
            {DURATIONS.map((m) => (
              <Pressable
                key={m}
                onPress={() => setMinutes(m)}
                accessibilityRole="radio"
                accessibilityState={{ selected: minutes === m }}
                style={[
                  styles.chip,
                  {
                    borderColor: minutes === m ? colors.brass : colors.line,
                    backgroundColor: minutes === m ? colors.surfaceHover : "transparent",
                  },
                ]}
              >
                <Text color={minutes === m ? colors.brassSoft : colors.text}>
                  {t("pranaMin").replace("{n}", String(m))}
                </Text>
              </Pressable>
            ))}
          </View>

          <Text variant="eyebrow" color={colors.brassSoft} style={{ marginTop: spacing.lg }}>
            {t("medAmbientLabel")}
          </Text>
          <View style={styles.chipRow}>
            {BEDS.map((b) => (
              <Pressable
                key={b}
                onPress={() => setBed(b)}
                accessibilityRole="radio"
                accessibilityState={{ selected: bed === b }}
                style={[
                  styles.chip,
                  {
                    borderColor: bed === b ? colors.brass : colors.line,
                    backgroundColor: bed === b ? colors.surfaceHover : "transparent",
                  },
                ]}
              >
                <Text color={bed === b ? colors.brassSoft : colors.text}>
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

          <Button label={t("pranaBegin")} onPress={begin} style={{ marginTop: spacing.xl }} />
        </ScrollView>
      </Screen>
    );
  }

  if (stage === "done") {
    return (
      <Screen atmosphere="strong" padded testID="screen-pranayama">
        <ScreenHeader showBack backFallback="/meditation" />
        <View style={styles.doneWrap}>
          <Rise>
            <Text variant="eyebrow" color={colors.brassSoft}>
              {t("pranaDone")}
            </Text>
            <Text variant="display" color={colors.brassSoft} style={{ marginTop: spacing.sm }}>
              {t("pranaTitle")}
            </Text>
            <Text variant="soft" style={{ marginTop: spacing.sm, textAlign: "center" }}>
              {t("pranaBreathsDone")
                .replace("{n}", String(breaths))
                .replace("{min}", String(minutes))}
            </Text>
            <Text variant="muted" style={{ marginTop: spacing.md, textAlign: "center" }}>
              {t("pranaDoneBody")}
            </Text>
            {milestone ? <MilestoneLine milestone={milestone} /> : null}
            {(() => {
              const closing = closingVerseFor(breaths + minutes);
              return (
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
                  <Text variant="muted" color={colors.brassSoft} style={{ marginTop: spacing.sm }}>
                    Gītā {closing.ref} · {t("medClosingOpen")} →
                  </Text>
                </Pressable>
              );
            })()}
            <Button
              label={t("pranaClose")}
              onPress={() => router.back()}
              style={{ marginTop: spacing.xl }}
            />
          </Rise>
        </View>
      </Screen>
    );
  }

  const step = steps[stepIdx];
  return (
    <Screen atmosphere="strong" padded testID="screen-pranayama">
      <View style={styles.breatheWrap}>
        <Text variant="eyebrow" color={colors.brassSoft}>
          {t("pranaBreaths").replace("{n}", String(breaths))}
        </Text>
        <View style={styles.ringStage}>
          <BreathRing scale={ring} colors={colors} />
          <View style={styles.ringLabel} pointerEvents="none">
            <Text variant="title" color={colors.brassSoft}>
              {step ? t(step.labelKey) : ""}
            </Text>
            <Text variant="display" color={colors.brassSoft} style={styles.count}>
              {secLeft}
            </Text>
          </View>
        </View>
        <Text variant="muted" style={{ marginTop: spacing.lg, textAlign: "center" }}>
          {t("pranaTapHint")}
        </Text>
        <Button
          variant="ghost"
          label={t("pranaFinish")}
          onPress={stop}
          style={{ marginTop: spacing.md }}
        />
      </View>
    </Screen>
  );
}

function BreathRing({
  scale,
  colors,
}: {
  scale: Animated.Value;
  colors: ThemeColors;
}) {
  return (
    <View style={styles.ringGuide}>
      <View style={[styles.guideCircle, { borderColor: colors.line }]} />
      <Animated.View
        style={[
          styles.breathCircle,
          {
            borderColor: colors.brass,
            backgroundColor: colors.atmosphereBrass,
            transform: [{ scale }],
          },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  patternRow: {
    padding: spacing.md,
    borderWidth: StyleSheet.hairlineWidth * 2,
    borderRadius: radii.md,
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
  breatheWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  ringStage: {
    width: RING,
    height: RING,
    marginTop: spacing.xl,
    alignItems: "center",
    justifyContent: "center",
  },
  ringGuide: {
    width: RING,
    height: RING,
    alignItems: "center",
    justifyContent: "center",
  },
  guideCircle: {
    position: "absolute",
    width: RING,
    height: RING,
    borderRadius: RING / 2,
    borderWidth: StyleSheet.hairlineWidth * 2,
    opacity: 0.5,
  },
  breathCircle: {
    width: RING,
    height: RING,
    borderRadius: RING / 2,
    borderWidth: StyleSheet.hairlineWidth * 3,
  },
  ringLabel: {
    position: "absolute",
    alignItems: "center",
    justifyContent: "center",
  },
  count: {
    marginTop: spacing.xs,
  },
  doneWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.lg,
  },
  closingCard: {
    marginTop: spacing.lg,
    alignSelf: "stretch",
    borderWidth: StyleSheet.hairlineWidth * 2,
    borderRadius: radii.md,
    padding: spacing.md,
  },
});

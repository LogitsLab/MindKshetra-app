import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  AccessibilityInfo,
  Animated,
  Easing,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from "react-native";
import { useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import { useKeepAwake } from "expo-keep-awake";
import Svg, { Circle } from "react-native-svg";
import { Screen } from "@/components/Screen";
import { Text } from "@/components/Text";
import { Button } from "@/components/Button";
import { Panel } from "@/components/Panel";
import { PageHero } from "@/components/PageHero";
import { ScreenHeader } from "@/components/ScreenHeader";
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
import { hasJapaChant, playJapaChant, stopJapaChant } from "@/audio/japa";
import type { Milestone } from "@/data/milestones";
import {
  appendSadhanaLog,
  getJapaPrefs,
  localDayStamp,
  setJapaPrefs,
  type JapaMode,
  type JapaTarget,
} from "@/storage/local";
import { uuidv4 } from "@/utils/uuid";
import { images } from "@/theme/assets";
import { radii, spacing, type ThemeColors } from "@/theme/tokens";

const RING_SIZE = 248;
const BEAD_R = 2.6;
const GURU_R = 4.5;
const TARGETS: JapaTarget[] = [27, 54, 108];

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

  const [stage, setStage] = useState<"setup" | "count">("setup");
  const [mantraId, setMantraId] = useState(mantras[0].id);
  const [customNaam, setCustomNaam] = useState("");
  const [target, setTarget] = useState<JapaTarget>(108);
  const [mode, setMode] = useState<JapaMode>("self");
  const [total, setTotal] = useState(0);
  const [milestone, setMilestone] = useState<Milestone | null>(null);
  const [malaFlash, setMalaFlash] = useState(false);
  const [chantPlaying, setChantPlaying] = useState(false);
  const reduceMotion = useRef(false);
  const pulse = useRef(new Animated.Value(1)).current;
  const flashTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const chantTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

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
      stopJapaChant();
    };
  }, []);

  const bead = total;
  const complete = total >= target;
  const litCount = malaFlash ? target : Math.min(bead, target);

  const playTapMotion = (nextTotal: number) => {
    if (reduceMotion.current) {
      pulse.setValue(1);
      return;
    }
    const malaDone = nextTotal >= targetRef.current;
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
    void playJapaChant(mantraRef.current.id).then((ok) => {
      if (!ok) {
        setChantPlaying(false);
        return;
      }
      setChantPlaying(true);
      if (chantTimer.current) clearTimeout(chantTimer.current);
      chantTimer.current = setTimeout(() => setChantPlaying(false), 2200);
    });
  };

  const onTap = () => {
    if (totalRef.current >= targetRef.current) return;
    if (startedAtRef.current == null) startedAtRef.current = Date.now();
    if (modeRef.current === "assisted") chantAssisted();
    const next = totalRef.current + 1;
    totalRef.current = next;
    setTotal(next);
    playTapMotion(next);
    if (next >= targetRef.current) {
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
  }, []);

  useEffect(() => () => logSession(), [logSession]);

  const beginCount = () => {
    const chosen =
      mantraId === CUSTOM_MANTRA_ID && !customNaam.trim()
        ? mantras[0].id
        : mantraId;
    setMantraId(chosen);
    void setJapaPrefs({
      mantraId: chosen,
      customNaam,
      target,
      mode,
    });
    totalRef.current = 0;
    startedAtRef.current = null;
    loggedRef.current = false;
    clientRefRef.current = uuidv4();
    setTotal(0);
    setMilestone(null);
    setStage("count");
  };

  const meaning = lang === "hi" ? mantra.meaning_hi : mantra.meaning_en;
  const hiEyebrow =
    lang === "hi"
      ? { letterSpacing: 0, textTransform: "none" as const }
      : null;

  if (stage === "setup") {
    const canBegin =
      mantraId !== CUSTOM_MANTRA_ID || customNaam.trim().length > 0;
    return (
      <Screen atmosphere="soft" padded testID="screen-japa">
        <KeyboardFormScroll
          contentContainerStyle={{ paddingBottom: spacing.xxl }}
          keyboardShouldPersistTaps="handled"
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

          <Text
            variant="eyebrow"
            color={colors.brassSoft}
            style={[{ marginTop: spacing.lg }, hiEyebrow]}
          >
            {t("japaPickTitle")}
          </Text>
          {mantras.map((m) => (
            <Pressable
              key={m.id}
              onPress={() => setMantraId(m.id)}
              style={[
                styles.mantraRow,
                {
                  borderColor: colors.hairline,
                  backgroundColor:
                    m.id === mantraId ? colors.surfaceHover : "transparent",
                },
              ]}
            >
              <Text variant="sanskrit" style={{ fontSize: 17, lineHeight: 26 }}>
                {m.devanagari}
              </Text>
              <Text
                variant="muted"
                numberOfLines={1}
                style={{ marginTop: 2, fontStyle: "italic" }}
              >
                {m.iast}
              </Text>
            </Pressable>
          ))}
          <Pressable
            onPress={() => setMantraId(CUSTOM_MANTRA_ID)}
            style={[
              styles.mantraRow,
              {
                borderColor: colors.hairline,
                backgroundColor:
                  mantraId === CUSTOM_MANTRA_ID
                    ? colors.surfaceHover
                    : "transparent",
              },
            ]}
          >
            <Text variant="body">{t("japaCustomNaam")}</Text>
          </Pressable>
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
            label={t("japaBegin")}
            onPress={beginCount}
            disabled={!canBegin}
            style={{ marginTop: spacing.xl }}
          />
        </KeyboardFormScroll>
      </Screen>
    );
  }

  return (
    <Screen atmosphere="soft" padded testID="screen-japa">
      <ScreenHeader showBack backFallback="/(tabs)/home" />
      <ScrollView
        contentContainerStyle={{ flexGrow: 1, paddingBottom: spacing.lg }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
      <Rise>
        <PageHero
          image={images.krishnaCharan}
          eyebrow={t("homeJapaTitle")}
          title={t("homeJapaTitle")}
          intro={t("homeJapaBody")}
          compact
        />
      </Rise>
      <Pressable
        style={styles.surface}
        onPress={onTap}
        accessibilityRole="button"
        accessibilityLabel={t("japaTapHint")}
      >
        <Rise delay={40}>
          <Pressable
            onPress={() => {
              stopJapaChant();
              setStage("setup");
            }}
          >
            <Panel>
              <Text
                variant="sanskrit"
                style={{ fontSize: 20, lineHeight: 32 }}
                numberOfLines={2}
              >
                {mantra.devanagari || mantra.iast}
              </Text>
              {mantra.iast ? (
                <Text
                  variant="muted"
                  style={{ marginTop: spacing.sm, fontStyle: "italic" }}
                  numberOfLines={2}
                >
                  {mantra.iast}
                </Text>
              ) : null}
              <Text variant="soft" style={{ marginTop: spacing.sm }}>
                {meaning}
              </Text>
              <Text
                variant="muted"
                color={colors.brassSoft}
                style={{ marginTop: spacing.md }}
              >
                {t("japaChangeSetup")} →
              </Text>
            </Panel>
          </Pressable>
        </Rise>

        <View style={styles.counter}>
          <View style={styles.malaStage}>
            <MalaRing
              beadCount={target}
              litCount={litCount}
              colors={colors}
            />
            <Animated.View
              style={[styles.countStack, { transform: [{ scale: pulse }] }]}
            >
              <Text style={[styles.bead, { color: colors.text }]}>{bead}</Text>
              <Text variant="muted">
                {t("japaOfTarget").replace("{n}", String(target))}
              </Text>
            </Animated.View>
          </View>
          {complete ? (
            <Text
              variant="soft"
              color={colors.brassSoft}
              style={{ marginTop: spacing.md }}
            >
              {t("japaTargetDone")}
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
      </ScrollView>
    </Screen>
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
  surface: {
    paddingTop: spacing.sm,
    paddingBottom: spacing.lg,
    minHeight: 520,
  },
  counter: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: spacing.lg,
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
  mantraRow: {
    paddingVertical: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth * 2,
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

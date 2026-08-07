import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  AccessibilityInfo,
  Animated,
  Easing,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
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
import { Rise } from "@/components/Rise";
import { MilestoneLine, takeNewMilestone } from "@/components/PracticeMarks";
import { sadhanaApi } from "@/api/endpoints";
import { useAuth } from "@/context/AuthContext";
import { useLanguage } from "@/context/LanguageContext";
import { useTheme } from "@/context/ThemeContext";
import { mantras, type Mantra } from "@/data/mantras";
import type { Milestone } from "@/data/milestones";
import { appendSadhanaLog, localDayStamp } from "@/storage/local";
import { uuidv4 } from "@/utils/uuid";
import { images } from "@/theme/assets";
import { spacing, type ThemeColors } from "@/theme/tokens";

const BEADS_PER_MALA = 108;
const RING_SIZE = 248;
const BEAD_R = 2.6;
const GURU_R = 4.5;

export default function JapaScreen() {
  useKeepAwake();
  const router = useRouter();
  const { colors } = useTheme();
  const { t, lang } = useLanguage();
  const { session } = useAuth();

  const [mantra, setMantra] = useState<Mantra>(mantras[0]);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [total, setTotal] = useState(0);
  const [milestone, setMilestone] = useState<Milestone | null>(null);
  /** Brief full-ring light when a mala completes (count has already wrapped to 0). */
  const [malaFlash, setMalaFlash] = useState(false);
  const reduceMotion = useRef(false);
  const pulse = useRef(new Animated.Value(1)).current;
  const flashTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Everything the leave-time log needs lives in refs so the unmount effect
  // never re-runs — a re-run's cleanup would log mid-practice.
  const totalRef = useRef(0);
  const startedAtRef = useRef<number | null>(null);
  const loggedRef = useRef(false);
  const clientRefRef = useRef(uuidv4());
  const sessionRef = useRef(session);

  useEffect(() => {
    sessionRef.current = session;
  }, [session]);

  useEffect(() => {
    let alive = true;
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
    };
  }, []);

  const bead = total % BEADS_PER_MALA;
  const malas = Math.floor(total / BEADS_PER_MALA);
  const litCount = malaFlash ? BEADS_PER_MALA : bead;

  const playTapMotion = (nextTotal: number) => {
    // Ring stays still — beads light up in place. Only the count pulses.
    if (reduceMotion.current) {
      pulse.setValue(1);
      return;
    }
    const malaDone = nextTotal % BEADS_PER_MALA === 0;
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

  const onTap = () => {
    if (startedAtRef.current == null) startedAtRef.current = Date.now();
    const next = totalRef.current + 1;
    totalRef.current = next;
    setTotal(next);
    playTapMotion(next);
    if (next % BEADS_PER_MALA === 0) {
      // One full mala — light every bead briefly, then clear for the next round.
      setMalaFlash(true);
      if (flashTimer.current) clearTimeout(flashTimer.current);
      flashTimer.current = setTimeout(() => setMalaFlash(false), 420);
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      // The mala-completion moment: at most one newly-crossed mark. This is
      // where japa gets its quiet line — the screen has no done stage, it
      // returns straight to where it came from.
      void takeNewMilestone().then(setMilestone);
    } else {
      void Haptics.selectionAsync();
    }
  };

  /** Log once per visit — from Finish or from leaving the screen. */
  const logSession = useCallback(() => {
    if (loggedRef.current) return;
    const count = totalRef.current;
    if (count <= 0) return;
    loggedRef.current = true;
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
      // Any Supabase session — anonymous included — persists server-side.
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
          // Offline — queue on-device; /api/sadhana/merge replays it later
          // and clientRef keeps a double landing harmless.
          void appendSadhanaLog(entry);
        });
    } else {
      void appendSadhanaLog(entry);
    }
  }, []);

  useEffect(() => () => logSession(), [logSession]);

  const meaning = lang === "hi" ? mantra.meaning_hi : mantra.meaning_en;
  // A letter-spaced eyebrow breaks Devanagari matra shaping — zero tracking
  // for the Hindi picker title (docs/design/VISUAL_SYSTEM.md).
  const hiEyebrow =
    lang === "hi"
      ? { letterSpacing: 0, textTransform: "none" as const }
      : null;

  return (
    <Screen atmosphere="soft" padded>
      <Rise>
        <PageHero
          image={images.krishnaCharan}
          eyebrow={lang === "hi" ? "जप" : "Japa"}
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
          <Pressable onPress={() => setPickerOpen(true)}>
            <Panel>
              <Text
                variant="sanskrit"
                style={{ fontSize: 20, lineHeight: 32 }}
                numberOfLines={2}
              >
                {mantra.devanagari}
              </Text>
              <Text
                variant="muted"
                style={{ marginTop: spacing.sm, fontStyle: "italic" }}
                numberOfLines={2}
              >
                {mantra.iast}
              </Text>
              <Text variant="soft" style={{ marginTop: spacing.sm }}>
                {meaning}
              </Text>
              <Text
                variant="muted"
                color={colors.brassSoft}
                style={{ marginTop: spacing.md }}
              >
                {t("japaChangeMantra")} →
              </Text>
            </Panel>
          </Pressable>
        </Rise>

        <View style={styles.counter}>
          <View style={styles.malaStage}>
            <MalaRing litCount={litCount} colors={colors} />
            <Animated.View
              style={[
                styles.countStack,
                { transform: [{ scale: pulse }] },
              ]}
            >
              <Text style={[styles.bead, { color: colors.text }]}>{bead}</Text>
              <Text variant="muted">{t("japaOf108")}</Text>
            </Animated.View>
          </View>
          {malas > 0 ? (
            <Text
              variant="soft"
              color={colors.brassSoft}
              style={{ marginTop: spacing.md }}
            >
              {malas === 1
                ? t("japaMalaOne")
                : t("japaMalaMany").replace("{n}", String(malas))}
            </Text>
          ) : null}
          {milestone ? <MilestoneLine milestone={milestone} /> : null}
        </View>

        <View style={styles.footer}>
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

      <Modal
        visible={pickerOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setPickerOpen(false)}
      >
        <Pressable
          style={[styles.scrim, { backgroundColor: colors.scrim }]}
          onPress={() => setPickerOpen(false)}
        >
          {/* Swallow taps on the sheet so only the scrim dismisses. */}
          <Pressable onPress={() => undefined}>
            <Panel strong padded={false}>
              <Text
                variant="eyebrow"
                color={colors.brassSoft}
                style={[
                  {
                    paddingHorizontal: spacing.md,
                    paddingTop: spacing.md,
                    paddingBottom: spacing.sm,
                  },
                  hiEyebrow,
                ]}
              >
                {t("japaPickTitle")}
              </Text>
              <ScrollView style={{ maxHeight: 440 }}>
                {mantras.map((m, i) => (
                  <Pressable
                    key={m.id}
                    onPress={() => {
                      setMantra(m);
                      setPickerOpen(false);
                      void Haptics.selectionAsync();
                    }}
                    style={[
                      styles.mantraRow,
                      {
                        borderBottomColor: colors.hairline,
                        borderBottomWidth:
                          i === mantras.length - 1
                            ? 0
                            : StyleSheet.hairlineWidth * 2,
                        backgroundColor:
                          m.id === mantra.id
                            ? colors.surfaceHover
                            : "transparent",
                      },
                    ]}
                  >
                    <Text
                      variant="sanskrit"
                      style={{ fontSize: 17, lineHeight: 26 }}
                      numberOfLines={2}
                    >
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
              </ScrollView>
            </Panel>
          </Pressable>
        </Pressable>
      </Modal>
    </Screen>
  );
}

/**
 * Stationary 108-bead jap mala (option 3). Each tap lights the next bead
 * in place — the ring does not rotate.
 */
function MalaRing({
  litCount,
  colors,
}: {
  litCount: number;
  colors: ThemeColors;
}) {
  const dots = useMemo(() => {
    const center = RING_SIZE / 2;
    const radius = center - GURU_R - 2;
    return Array.from({ length: BEADS_PER_MALA }, (_, i) => {
      const angle = (i / BEADS_PER_MALA) * Math.PI * 2 - Math.PI / 2;
      return {
        key: i,
        cx: center + Math.cos(angle) * radius,
        cy: center + Math.sin(angle) * radius,
        r: i === 0 ? GURU_R : BEAD_R,
        guru: i === 0,
      };
    });
  }, []);

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
    flex: 1,
    paddingTop: spacing.sm,
    paddingBottom: spacing.lg,
  },
  counter: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
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
  scrim: {
    flex: 1,
    justifyContent: "center",
    padding: spacing.lg,
  },
  mantraRow: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
});

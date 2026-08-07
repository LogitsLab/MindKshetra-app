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
/** Visual beads on the ring — fewer than 108 so each stays readable. */
const RING_BEADS = 36;
const RING_SIZE = 228;
const BEAD_DOT = 7;
const GURU_DOT = 11;
const DEGREES_PER_BEAD = 360 / BEADS_PER_MALA;

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
  const reduceMotion = useRef(false);
  const rotation = useRef(new Animated.Value(0)).current;
  const pulse = useRef(new Animated.Value(1)).current;

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
    };
  }, []);

  const bead = total % BEADS_PER_MALA;
  const malas = Math.floor(total / BEADS_PER_MALA);

  const playTapMotion = (nextTotal: number) => {
    // Cumulative degrees so a full mala keeps turning forward — no snap-back
    // when the count wraps, and rapid taps never reverse the ring.
    const angle = nextTotal * DEGREES_PER_BEAD;
    if (reduceMotion.current) {
      rotation.setValue(angle);
      pulse.setValue(1);
      return;
    }
    const malaDone = nextTotal % BEADS_PER_MALA === 0;
    Animated.parallel([
      Animated.timing(rotation, {
        toValue: angle,
        duration: malaDone ? 320 : 160,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: malaDone ? 1.12 : 1.06,
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
      ]),
    ]).start();
  };

  const onTap = () => {
    if (startedAtRef.current == null) startedAtRef.current = Date.now();
    const next = totalRef.current + 1;
    totalRef.current = next;
    setTotal(next);
    playTapMotion(next);
    if (next % BEADS_PER_MALA === 0) {
      // One full mala — a heavier tick, then the bead count starts over.
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
            <MalaRing rotation={rotation} colors={colors} />
            {/* Fixed thumb mark — beads advance past this point on each tap. */}
            <View
              pointerEvents="none"
              style={[styles.thumbMark, { backgroundColor: colors.brass }]}
            />
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

/** Quiet ring of beads that advances one step with each tap. */
function MalaRing({
  rotation,
  colors,
}: {
  rotation: Animated.Value;
  colors: ThemeColors;
}) {
  const dots = useMemo(() => {
    const radius = (RING_SIZE - GURU_DOT) / 2;
    const center = RING_SIZE / 2;
    return Array.from({ length: RING_BEADS }, (_, i) => {
      const angle = (i / RING_BEADS) * Math.PI * 2 - Math.PI / 2;
      const size = i === 0 ? GURU_DOT : BEAD_DOT;
      return {
        key: i,
        size,
        left: center + Math.cos(angle) * radius - size / 2,
        top: center + Math.sin(angle) * radius - size / 2,
        guru: i === 0,
      };
    });
  }, []);

  const rotate = rotation.interpolate({
    inputRange: [0, 360],
    outputRange: ["0deg", "360deg"],
  });

  return (
    <Animated.View
      pointerEvents="none"
      style={[styles.ring, { transform: [{ rotate }] }]}
    >
      {dots.map((dot) => (
        <View
          key={dot.key}
          style={[
            styles.beadDot,
            {
              width: dot.size,
              height: dot.size,
              borderRadius: dot.size / 2,
              left: dot.left,
              top: dot.top,
              backgroundColor: dot.guru ? colors.brass : colors.brassSoft,
              opacity: dot.guru ? 0.95 : 0.42,
            },
          ]}
        />
      ))}
    </Animated.View>
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
    ...StyleSheet.absoluteFillObject,
  },
  beadDot: {
    position: "absolute",
  },
  thumbMark: {
    position: "absolute",
    bottom: 2,
    width: 5,
    height: 5,
    borderRadius: 2.5,
    opacity: 0.9,
  },
  countStack: {
    alignItems: "center",
    justifyContent: "center",
  },
  bead: {
    fontFamily: "Fraunces_600SemiBold",
    fontSize: 84,
    lineHeight: 92,
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

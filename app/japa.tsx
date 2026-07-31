import React, { useCallback, useEffect, useRef, useState } from "react";
import { Modal, Pressable, ScrollView, StyleSheet, View } from "react-native";
import { useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import { useKeepAwake } from "expo-keep-awake";
import { Screen } from "@/components/Screen";
import { Text } from "@/components/Text";
import { Button } from "@/components/Button";
import { Panel } from "@/components/Panel";
import { Rise } from "@/components/Rise";
import { sadhanaApi } from "@/api/endpoints";
import { useAuth } from "@/context/AuthContext";
import { useLanguage } from "@/context/LanguageContext";
import { useTheme } from "@/context/ThemeContext";
import { mantras, type Mantra } from "@/data/mantras";
import { appendSadhanaLog, localDayStamp } from "@/storage/local";
import { uuidv4 } from "@/utils/uuid";
import { spacing } from "@/theme/tokens";

const BEADS_PER_MALA = 108;

export default function JapaScreen() {
  useKeepAwake();
  const router = useRouter();
  const { colors } = useTheme();
  const { t, lang } = useLanguage();
  const { session } = useAuth();

  const [mantra, setMantra] = useState<Mantra>(mantras[0]);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [total, setTotal] = useState(0);

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

  const bead = total % BEADS_PER_MALA;
  const malas = Math.floor(total / BEADS_PER_MALA);

  const onTap = () => {
    if (startedAtRef.current == null) startedAtRef.current = Date.now();
    const next = totalRef.current + 1;
    totalRef.current = next;
    setTotal(next);
    if (next % BEADS_PER_MALA === 0) {
      // One full mala — a heavier tick, then the bead count starts over.
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
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
    <Screen>
      <Pressable
        style={styles.surface}
        onPress={onTap}
        accessibilityRole="button"
        accessibilityLabel={t("japaTapHint")}
      >
        <Rise>
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
          <Text style={[styles.bead, { color: colors.text }]}>{bead}</Text>
          <Text variant="muted">{t("japaOf108")}</Text>
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
  bead: {
    fontFamily: "Fraunces_600SemiBold",
    fontSize: 96,
    lineHeight: 104,
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

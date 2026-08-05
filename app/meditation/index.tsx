import React, { useEffect, useMemo } from "react";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import { useRouter } from "expo-router";
import * as Linking from "expo-linking";
import { Screen } from "@/components/Screen";
import { Text } from "@/components/Text";
import { Button } from "@/components/Button";
import { PageHero } from "@/components/PageHero";
import { Rise } from "@/components/Rise";
import { siteUrl } from "@/api/client";
import { meditationApi } from "@/api/endpoints";
import { useAuth } from "@/context/AuthContext";
import { useLanguage } from "@/context/LanguageContext";
import { useTheme } from "@/context/ThemeContext";
import {
  dailySitsCatalog,
  isDayUnlocked,
  sittingProgram,
  sittingSectionForDay,
  type MeditationSession,
} from "@/data/meditation";
import {
  GUEST_QUEUE_KEY,
  useMeditationProgress,
} from "@/hooks/useMeditationProgress";
import { images } from "@/theme/assets";
import { radii, spacing } from "@/theme/tokens";
import AsyncStorage from "@react-native-async-storage/async-storage";

const SUPPORT_URL = siteUrl("/support");

function fill(template: string, vars: Record<string, string | number>) {
  return Object.entries(vars).reduce(
    (s, [k, v]) => s.replace(`{${k}}`, String(v)),
    template
  );
}

export default function MeditationHubScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const { t, lang } = useLanguage();
  const { isSignedIn } = useAuth();
  const { completedDays, currentDay, streak, reload } = useMeditationProgress();

  useEffect(() => {
    if (!isSignedIn) return;
    void (async () => {
      const raw = await AsyncStorage.getItem(GUEST_QUEUE_KEY);
      if (!raw) return;
      try {
        const completions = JSON.parse(raw);
        if (!Array.isArray(completions) || !completions.length) return;
        await meditationApi.merge(completions);
        await AsyncStorage.removeItem(GUEST_QUEUE_KEY);
        reload();
      } catch {
        /* keep queue */
      }
    })();
  }, [isSignedIn, reload]);

  const program = sittingProgram;
  const continueDay = Math.min(program.days_count, Math.max(1, currentDay));

  const sections = useMemo(() => {
    const groups: Array<{
      id: "foundation" | "habit" | "deepening";
      days: MeditationSession[];
    }> = [];
    for (const day of program.days) {
      const sec = sittingSectionForDay(day.day_number);
      const last = groups[groups.length - 1];
      if (!last || last.id !== sec.id) {
        groups.push({ id: sec.id, days: [day] });
      } else {
        last.days.push(day);
      }
    }
    return groups;
  }, [program.days]);

  function sectionLabel(id: "foundation" | "habit" | "deepening") {
    if (id === "foundation") return t("medSectionFoundation");
    if (id === "habit") return t("medSectionHabit");
    return t("medSectionDeepening");
  }

  return (
    <Screen atmosphere="soft" padded>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <Rise>
          <PageHero
            image={images.pathMeditation}
            eyebrow={t("medEyebrow")}
            title={t("medInnerTemple")}
            intro={lang === "hi" ? program.intro_hi : program.intro_en}
            meta={
              <View>
                <Text variant="muted" color={colors.onMediaMuted}>
                  {fill(t("medProgress"), {
                    done: completedDays.length,
                    total: program.days_count,
                  })}{" "}
                  · {fill(t("medDayLabel"), { n: continueDay })}
                </Text>
                <View style={[styles.pathTrack, { backgroundColor: "rgba(255,255,255,0.15)" }]}>
                  <View
                    style={[
                      styles.pathFill,
                      {
                        width: `${Math.min(
                          100,
                          (completedDays.length / program.days_count) * 100
                        )}%`,
                        backgroundColor: colors.brass,
                      },
                    ]}
                  />
                </View>
              </View>
            }
            actions={
              <Button
                label={
                  completedDays.length === 0
                    ? t("medHeroBegin")
                    : t("medHeroContinue")
                }
                onPress={() => router.push(`/meditation/${continueDay}`)}
              />
            }
          />

          <View style={styles.sectionHeader}>
            <Text variant="eyebrow" color={colors.brassSoft}>
              {t("medQuickTitle")}
            </Text>
            <Text variant="muted" color={colors.brassSoft}>
              {streak > 0 ? fill(t("medStreak"), { n: streak }) : t("medStreakNone")}
            </Text>
          </View>
          <View style={styles.quickRow}>
            {dailySitsCatalog.sessions.map((session) => {
              const sessionTitle =
                lang === "hi" ? session.title_hi : session.title_en;
              return (
                <Pressable
                  key={session.id}
                  accessibilityRole="button"
                  accessibilityLabel={fill(t("medOpenSession"), {
                    title: sessionTitle,
                    minutes: session.duration_minutes,
                  })}
                  onPress={() =>
                    router.push(`/meditation/daily/${session.id}`)
                  }
                  style={[
                    styles.quickTile,
                    {
                      borderColor: colors.line,
                      backgroundColor: colors.field,
                    },
                  ]}
                >
                  <Text variant="title" color={colors.brassSoft}>
                    {session.duration_minutes}
                  </Text>
                  <Text variant="eyebrow">{t("sadhanaMin")}</Text>
                  <Text variant="muted" style={styles.quickTitle}>
                    {sessionTitle}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </Rise>

        {sections.map((section) => (
          <View key={section.id} style={styles.programSection}>
            <Text variant="eyebrow" color={colors.brassSoft}>
              {sectionLabel(section.id)}
            </Text>
            {section.days.map((day) => {
              const done = completedDays.includes(day.day_number);
              const unlocked = isDayUnlocked(
                day.day_number,
                completedDays,
                program.days_count
              );
              const title = lang === "hi" ? day.title_hi : day.title_en;
              return (
                <Rise key={day.id}>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={fill(t("medDayA11y"), {
                      n: day.day_number,
                      title,
                      minutes: day.duration_minutes,
                    }) + `, ${
                      done
                        ? t("medDayComplete")
                        : unlocked
                          ? t("medDayAvailable")
                          : t("medDayLocked")
                    }`}
                    accessibilityState={{ disabled: !unlocked }}
                    disabled={!unlocked}
                    onPress={() =>
                      router.push(`/meditation/${day.day_number}`)
                    }
                  >
                    <View
                      style={[
                        styles.sessionRow,
                        { borderColor: colors.line, backgroundColor: colors.panel },
                        { opacity: unlocked ? 1 : 0.5 },
                      ]}
                    >
                      <View style={[styles.dayMark, { borderColor: colors.line }]}>
                        <Text variant="title" color={done ? colors.brassSoft : colors.text}>
                          {day.day_number}
                        </Text>
                      </View>
                      <View style={styles.sessionCopy}>
                        <Text variant="title" style={styles.sessionTitle}>{title}</Text>
                        <Text variant="muted">
                          {day.duration_minutes} {t("sadhanaMin")} ·{" "}
                        {done
                          ? t("medDayComplete")
                          : unlocked
                            ? t("medDayAvailable")
                            : t("medDayLocked")}
                        </Text>
                      </View>
                      <Text color={colors.brassSoft}>→</Text>
                    </View>
                  </Pressable>
                </Rise>
              );
            })}
          </View>
        ))}

        <Pressable
          accessibilityRole="link"
          accessibilityLabel={t("medBridgePaths")}
          onPress={() => router.push("/paths")}
          style={styles.footerLink}
        >
          <Text color={colors.brassSoft}>{t("medBridgePaths")} →</Text>
        </Pressable>
        <Pressable
          accessibilityRole="link"
          accessibilityLabel={t("medBridgeSupport")}
          onPress={() => void Linking.openURL(SUPPORT_URL)}
          style={styles.supportLink}
        >
          <Text color={colors.brassSoft}>{t("medBridgeSupport")} →</Text>
        </Pressable>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { paddingTop: spacing.md, paddingBottom: spacing.xxl },
  pathTrack: {
    height: 4,
    borderRadius: 2,
    marginTop: spacing.sm,
    overflow: "hidden",
  },
  pathFill: { height: 4, borderRadius: 2 },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: spacing.xl,
    marginBottom: spacing.md,
  },
  quickRow: { flexDirection: "row", gap: spacing.sm },
  quickTile: {
    flex: 1,
    minHeight: 132,
    borderWidth: StyleSheet.hairlineWidth * 2,
    borderRadius: radii.sm,
    alignItems: "center",
    justifyContent: "center",
    padding: spacing.sm,
  },
  quickTitle: { marginTop: spacing.xs, textAlign: "center" },
  programSection: { marginTop: spacing.xl, gap: spacing.sm },
  sessionRow: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: StyleSheet.hairlineWidth * 2,
    borderRadius: radii.md,
    padding: spacing.md,
  },
  dayMark: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: StyleSheet.hairlineWidth * 2,
    alignItems: "center",
    justifyContent: "center",
  },
  sessionCopy: { flex: 1, marginHorizontal: spacing.md },
  sessionTitle: { fontSize: 18, lineHeight: 23, marginBottom: spacing.xs },
  footerLink: { marginTop: spacing.xl },
  supportLink: { marginTop: spacing.md },
});

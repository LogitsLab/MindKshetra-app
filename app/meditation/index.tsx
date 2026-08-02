import React, { useEffect, useMemo } from "react";
import { Pressable, ScrollView, View } from "react-native";
import { useRouter } from "expo-router";
import * as Linking from "expo-linking";
import { Screen } from "@/components/Screen";
import { Text } from "@/components/Text";
import { Panel } from "@/components/Panel";
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
import { spacing } from "@/theme/tokens";
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
        contentContainerStyle={{ paddingBottom: spacing.xxl }}
        showsVerticalScrollIndicator={false}
      >
        <Rise>
          <PageHero
            image={images.pathMeditation}
            eyebrow={t("medEyebrow")}
            title={lang === "hi" ? program.title_hi : program.title_en}
            body={lang === "hi" ? program.intro_hi : program.intro_en}
          />
          <Text
            variant="muted"
            color={colors.brassSoft}
            style={{ marginTop: spacing.md }}
          >
            {fill(t("medProgress"), {
              done: completedDays.length,
              total: program.days_count,
            })}
            {streak > 0
              ? ` · ${fill(t("medStreak"), { n: streak })}`
              : ` · ${t("medStreakNone")}`}
          </Text>
          <Pressable
            onPress={() => router.push(`/meditation/${continueDay}`)}
            style={{ marginTop: spacing.md }}
          >
            <Text color={colors.brassSoft}>
              {completedDays.length === 0
                ? t("medStart")
                : fill(t("medContinue"), { n: continueDay })}{" "}
              →
            </Text>
          </Pressable>
        </Rise>

        {sections.map((section) => (
          <View key={section.id} style={{ marginTop: spacing.xl, gap: spacing.sm }}>
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
                    disabled={!unlocked}
                    onPress={() =>
                      router.push(`/meditation/${day.day_number}`)
                    }
                  >
                    <Panel style={{ opacity: unlocked ? 1 : 0.55 }}>
                      <Text variant="eyebrow" color={colors.brassSoft}>
                        Day {day.day_number} · {day.duration_minutes}{" "}
                        {t("sadhanaMin")}
                      </Text>
                      <Text
                        variant="title"
                        style={{ marginTop: spacing.xs, fontSize: 18 }}
                      >
                        {title}
                      </Text>
                      <Text variant="muted" style={{ marginTop: spacing.xs }}>
                        {done
                          ? t("medDayComplete")
                          : unlocked
                            ? t("medDayAvailable")
                            : t("medDayLocked")}
                      </Text>
                    </Panel>
                  </Pressable>
                </Rise>
              );
            })}
          </View>
        ))}

        <Rise style={{ marginTop: spacing.xl }}>
          <Text variant="title" style={{ fontSize: 22 }}>
            {lang === "hi"
              ? dailySitsCatalog.title_hi
              : dailySitsCatalog.title_en}
          </Text>
          <Text variant="muted" style={{ marginTop: spacing.xs }}>
            {lang === "hi"
              ? dailySitsCatalog.intro_hi
              : dailySitsCatalog.intro_en}
          </Text>
          {dailySitsCatalog.sessions.map((s) => (
            <Pressable
              key={s.id}
              onPress={() => router.push(`/meditation/daily/${s.id}`)}
              style={{ marginTop: spacing.sm }}
            >
              <Panel>
                <Text variant="eyebrow" color={colors.brassSoft}>
                  {s.duration_minutes} {t("sadhanaMin")}
                </Text>
                <Text
                  variant="title"
                  style={{ marginTop: spacing.xs, fontSize: 18 }}
                >
                  {lang === "hi" ? s.title_hi : s.title_en}
                </Text>
              </Panel>
            </Pressable>
          ))}
        </Rise>

        <Pressable
          onPress={() => router.push("/paths")}
          style={{ marginTop: spacing.xl }}
        >
          <Text color={colors.brassSoft}>{t("medBridgePaths")} →</Text>
        </Pressable>
        <Pressable
          onPress={() => void Linking.openURL(SUPPORT_URL)}
          style={{ marginTop: spacing.md }}
        >
          <Text color={colors.brassSoft}>{t("medBridgeSupport")} →</Text>
        </Pressable>
      </ScrollView>
    </Screen>
  );
}

import React, { useCallback, useEffect, useState } from "react";
import { Pressable, ScrollView, View } from "react-native";
import { useRouter } from "expo-router";
import * as Linking from "expo-linking";
import { Screen } from "@/components/Screen";
import { Text } from "@/components/Text";
import { Panel } from "@/components/Panel";
import { PageHero } from "@/components/PageHero";
import { Rise } from "@/components/Rise";
import { meditationApi } from "@/api/endpoints";
import { useAuth } from "@/context/AuthContext";
import { useLanguage } from "@/context/LanguageContext";
import { useTheme } from "@/context/ThemeContext";
import {
  FOUNDATION_PROGRAM_ID,
  dailySitsCatalog,
  foundationProgram,
  isDayUnlocked,
} from "@/data/meditation";
import { images } from "@/theme/assets";
import { spacing } from "@/theme/tokens";
import AsyncStorage from "@react-native-async-storage/async-storage";

const SUPPORT_URL = "https://mind.logitslab.com/support";
const GUEST_RUN_KEY = `mindkshetra-meditation-run-${FOUNDATION_PROGRAM_ID}`;
const GUEST_QUEUE_KEY = "mindkshetra-meditation-queue";

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
  const [completedDays, setCompletedDays] = useState<number[]>([]);
  const [streak, setStreak] = useState(0);

  const load = useCallback(async () => {
    try {
      const data = await meditationApi.progress(FOUNDATION_PROGRAM_ID);
      if (data.guest) {
        const raw = await AsyncStorage.getItem(GUEST_RUN_KEY);
        const parsed = raw ? JSON.parse(raw) : {};
        const days = Array.isArray(parsed.completedDays)
          ? parsed.completedDays
          : [];
        setCompletedDays(days);
        setStreak(0);
        return;
      }
      setCompletedDays(data.completedDays ?? []);
      setStreak(data.streak?.current ?? 0);
    } catch {
      const raw = await AsyncStorage.getItem(GUEST_RUN_KEY);
      const parsed = raw ? JSON.parse(raw) : {};
      setCompletedDays(
        Array.isArray(parsed.completedDays) ? parsed.completedDays : []
      );
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load, isSignedIn]);

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
        void load();
      } catch {
        /* keep queue */
      }
    })();
  }, [isSignedIn, load]);

  const program = foundationProgram;
  const continueDay = Math.min(
    program.days_count,
    Math.max(1, (completedDays[completedDays.length - 1] ?? 0) + 1)
  );

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

        <View style={{ marginTop: spacing.xl, gap: spacing.sm }}>
          {program.days.map((day) => {
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
                  onPress={() => router.push(`/meditation/${day.day_number}`)}
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
          onPress={() => void Linking.openURL(SUPPORT_URL)}
          style={{ marginTop: spacing.xl }}
        >
          <Text color={colors.brassSoft}>{t("medBridgeSupport")} →</Text>
        </Pressable>
      </ScrollView>
    </Screen>
  );
}

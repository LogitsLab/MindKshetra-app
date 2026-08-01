import React, { useMemo } from "react";
import { Pressable, ScrollView, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Screen } from "@/components/Screen";
import { Text } from "@/components/Text";
import { Panel } from "@/components/Panel";
import { PageHero } from "@/components/PageHero";
import { Rise } from "@/components/Rise";
import { getPracticePath } from "@/data/paths";
import { useLanguage } from "@/context/LanguageContext";
import { useTheme } from "@/context/ThemeContext";
import { useJourneyRun } from "@/hooks/useJourneyRun";
import { refKey, useSlokaRefs } from "@/hooks/useSlokaRefs";
import { images } from "@/theme/assets";
import { spacing } from "@/theme/tokens";

function fill(template: string, vars: Record<string, string | number>) {
  return Object.entries(vars).reduce(
    (s, [k, v]) => s.replace(`{${k}}`, String(v)),
    template
  );
}

export default function PathDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { colors } = useTheme();
  const { t, lang } = useLanguage();
  const path = useMemo(
    () => (typeof id === "string" ? getPracticePath(id) : undefined),
    [id]
  );

  // Themed paths are "open" journeys: every day stays reachable.
  const run = useJourneyRun(path?.id, path?.days_count ?? 0, "open");
  const refs = useMemo(() => path?.days.map((d) => d.ref) ?? [], [path]);
  const slokaIds = useSlokaRefs(refs);

  if (!path) {
    return (
      <Screen atmosphere="soft" padded>
        <Text variant="title">{t("notFoundTitle")}</Text>
        <Text variant="muted" style={{ marginTop: spacing.sm }}>
          {t("notFoundBody")}
        </Text>
      </Screen>
    );
  }

  const title = lang === "hi" ? path.title_hi : path.title_en;
  const intro = lang === "hi" ? path.intro_hi : path.intro_en;
  const pathDone = run.completedDays.length >= path.days_count;

  return (
    <Screen atmosphere="soft" padded>
      <ScrollView
        contentContainerStyle={{ paddingBottom: spacing.xxl }}
        showsVerticalScrollIndicator={false}
      >
        <Rise>
          <PageHero
            image={images.pathPaths}
            eyebrow={`${path.days_count} ${lang === "hi" ? "दिन" : "days"}`}
            title={title}
            body={intro}
          />
          {run.completedDays.length > 0 ? (
            <Text
              variant="muted"
              color={colors.brassSoft}
              style={{ marginTop: spacing.md }}
            >
              {pathDone
                ? t("pathRunDone")
                : fill(t("pathRunProgress"), {
                    n: run.currentDay,
                    total: path.days_count,
                  })}
            </Text>
          ) : null}
          {run.guest && run.completedDays.length > 0 ? (
            <Pressable onPress={() => router.push("/account")}>
              <Text variant="muted" style={{ marginTop: spacing.xs }}>
                {t("pathSignInProgress")}
              </Text>
            </Pressable>
          ) : null}
        </Rise>

        <View style={{ marginTop: spacing.xl, gap: spacing.md }}>
          {path.days.map((day, i) => {
            const dayTitle = lang === "hi" ? day.title_hi : day.title_en;
            const prompt = lang === "hi" ? day.prompt_hi : day.prompt_en;
            const marked = run.completedDays.includes(day.day);
            const slokaId = slokaIds[refKey(day.ref)];
            return (
              <Rise key={day.day} delay={40 * (i + 1)}>
                <Panel>
                  <Text variant="eyebrow" color={colors.brassSoft}>
                    {lang === "hi" ? `दिन ${day.day}` : `Day ${day.day}`} ·{" "}
                    {day.practice} · {day.minutes} {t("sadhanaMin")}
                  </Text>
                  <Text
                    variant="title"
                    style={{ marginTop: spacing.xs, fontSize: 18 }}
                  >
                    {dayTitle}
                  </Text>
                  <Text variant="muted" style={{ marginTop: spacing.xs }}>
                    {prompt}
                  </Text>
                  <Pressable
                    disabled={!slokaId}
                    onPress={() => router.push(`/sloka/${slokaId}`)}
                    style={{ marginTop: spacing.sm }}
                  >
                    <Text variant="muted" color={colors.brassSoft}>
                      {day.ref.chapter}.{day.ref.verse}
                      {slokaId ? ` · ${t("pathOpenVerse")} →` : ""}
                    </Text>
                  </Pressable>
                  <Pressable
                    onPress={() =>
                      router.push({
                        pathname: "/sadhana",
                        params: {
                          pathId: path.id,
                          pathDay: String(day.day),
                          // The total closes the loop: the done screen can only
                          // name tomorrow's day if it knows where the path ends.
                          pathTotal: String(path.days_count),
                          ...(slokaId
                            ? { slokaId: String(slokaId) }
                            : {
                                chapter: String(day.ref.chapter),
                                verse: String(day.ref.verse),
                              }),
                          minutes: String(day.minutes),
                        },
                      })
                    }
                    style={{ marginTop: spacing.sm }}
                  >
                    <Text color={colors.brassSoft}>
                      {t("pathBeginPractice")} →
                    </Text>
                  </Pressable>
                  {/* Marking straight from the list is the escape hatch for a
                      day practised away from the phone. */}
                  <Pressable
                    disabled={marked}
                    onPress={() => void run.markDay(day.day)}
                    style={{ marginTop: spacing.sm }}
                  >
                    <Text
                      variant="muted"
                      color={marked ? colors.textMuted : colors.brassSoft}
                    >
                      {marked ? t("pathMarked") : t("pathMarkDone")}
                    </Text>
                  </Pressable>
                </Panel>
              </Rise>
            );
          })}
        </View>
      </ScrollView>
    </Screen>
  );
}

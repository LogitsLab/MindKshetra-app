import React, { useMemo } from "react";
import { Pressable, ScrollView, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Screen } from "@/components/Screen";
import { Text } from "@/components/Text";
import { Panel } from "@/components/Panel";
import { Rise } from "@/components/Rise";
import { getPracticePath } from "@/data/paths";
import { useLanguage } from "@/context/LanguageContext";
import { useTheme } from "@/context/ThemeContext";
import { spacing } from "@/theme/tokens";

export default function PathDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { colors } = useTheme();
  const { t, lang } = useLanguage();
  const path = useMemo(
    () => (typeof id === "string" ? getPracticePath(id) : undefined),
    [id]
  );

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

  return (
    <Screen atmosphere="soft" padded>
      <ScrollView
        contentContainerStyle={{ paddingBottom: spacing.xxl }}
        showsVerticalScrollIndicator={false}
      >
        <Rise>
          <Text variant="eyebrow" color={colors.brassSoft}>
            {path.days_count} {lang === "hi" ? "दिन" : "days"}
          </Text>
          <Text variant="title" style={{ marginTop: spacing.sm, fontSize: 28 }}>
            {title}
          </Text>
          <Text variant="soft" style={{ marginTop: spacing.sm }}>
            {intro}
          </Text>
        </Rise>

        <View style={{ marginTop: spacing.xl, gap: spacing.md }}>
          {path.days.map((day, i) => {
            const dayTitle = lang === "hi" ? day.title_hi : day.title_en;
            const prompt = lang === "hi" ? day.prompt_hi : day.prompt_en;
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
                  <Text variant="muted" style={{ marginTop: spacing.sm }}>
                    {day.ref.chapter}.{day.ref.verse}
                  </Text>
                  <Pressable
                    onPress={() =>
                      router.push({
                        pathname: "/sadhana",
                        params: {
                          pathId: path.id,
                          pathDay: String(day.day),
                          chapter: String(day.ref.chapter),
                          verse: String(day.ref.verse),
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
                </Panel>
              </Rise>
            );
          })}
        </View>
      </ScrollView>
    </Screen>
  );
}

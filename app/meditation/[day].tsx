import React from "react";
import { ActivityIndicator, Pressable } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Screen } from "@/components/Screen";
import { Text } from "@/components/Text";
import { EmptyState } from "@/components/SlokaCard";
import { MeditationPlayer } from "@/components/MeditationPlayer";
import { useLanguage } from "@/context/LanguageContext";
import { useTheme } from "@/context/ThemeContext";
import {
  getSittingDay,
  isDayUnlocked,
  sittingProgram,
} from "@/data/meditation";
import { useMeditationProgress } from "@/hooks/useMeditationProgress";
import { spacing } from "@/theme/tokens";

export default function MeditationDayScreen() {
  const { day } = useLocalSearchParams<{ day: string }>();
  const router = useRouter();
  const { colors } = useTheme();
  const { t } = useLanguage();
  const progress = useMeditationProgress();
  const dayNumber = Number(day);
  const session = getSittingDay(dayNumber);

  if (!session) {
    return (
      <Screen atmosphere="soft" padded>
        <EmptyState title={t("notFoundTitle")} body={t("notFoundBody")} />
      </Screen>
    );
  }

  if (progress.loading) {
    return (
      <Screen atmosphere="soft" padded>
        <ActivityIndicator color={colors.brass} style={{ marginTop: spacing.xl }} />
      </Screen>
    );
  }

  if (
    !isDayUnlocked(
      dayNumber,
      progress.completedDays,
      sittingProgram.days_count
    )
  ) {
    return (
      <Screen atmosphere="soft" padded>
        <EmptyState
          title={t("medLockedTitle")}
          body={t("medLockedBody")}
          actionLabel={t("medContinue").replace("{n}", String(progress.currentDay))}
          onAction={() => router.replace(`/meditation/${progress.currentDay}`)}
        />
        <Pressable
          onPress={() => router.push("/meditation")}
          accessibilityRole="button"
          accessibilityLabel={t("medBack")}
          style={{ marginTop: spacing.md, alignItems: "center" }}
        >
          <Text color={colors.brassSoft}>{t("medBack")} →</Text>
        </Pressable>
      </Screen>
    );
  }

  return (
    <MeditationPlayer
      session={session}
      daysCount={sittingProgram.days_count}
    />
  );
}

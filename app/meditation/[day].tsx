import React from "react";
import { ActivityIndicator, Pressable } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Screen } from "@/components/Screen";
import { Text } from "@/components/Text";
import { MeditationPlayer } from "@/components/MeditationPlayer";
import { useLanguage } from "@/context/LanguageContext";
import { useTheme } from "@/context/ThemeContext";
import {
  foundationProgram,
  getFoundationDay,
  isDayUnlocked,
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
  const session = getFoundationDay(dayNumber);

  if (!session) {
    return (
      <Screen atmosphere="soft" padded>
        <Text variant="title">{t("notFoundTitle")}</Text>
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

  /*
   * The chain was enforced only by disabling the hub's list item, so opening
   * /meditation/7 directly — a deep link, a notification, a back-stack entry —
   * played day 7 on day one. The gate belongs here, where the session is
   * actually handed to the player.
   */
  if (
    !isDayUnlocked(
      dayNumber,
      progress.completedDays,
      foundationProgram.days_count
    )
  ) {
    return (
      <Screen atmosphere="soft" padded>
        <Text variant="eyebrow" color={colors.brassSoft}>
          {t("medDayLocked")}
        </Text>
        <Text variant="title" style={{ marginTop: spacing.sm, fontSize: 22 }}>
          {t("medLockedTitle")}
        </Text>
        <Text variant="soft" style={{ marginTop: spacing.sm }}>
          {t("medLockedBody")}
        </Text>
        <Pressable
          onPress={() => router.replace(`/meditation/${progress.currentDay}`)}
          style={{ marginTop: spacing.lg }}
        >
          <Text color={colors.brassSoft}>
            {t("medContinue").replace("{n}", String(progress.currentDay))} →
          </Text>
        </Pressable>
        <Pressable
          onPress={() => router.push("/meditation")}
          style={{ marginTop: spacing.md }}
        >
          <Text color={colors.brassSoft}>{t("medBack")} →</Text>
        </Pressable>
      </Screen>
    );
  }

  return <MeditationPlayer session={session} />;
}

import React from "react";
import { useLocalSearchParams } from "expo-router";
import { Screen } from "@/components/Screen";
import { Text } from "@/components/Text";
import { MeditationPlayer } from "@/components/MeditationPlayer";
import { useLanguage } from "@/context/LanguageContext";
import { getFoundationDay } from "@/data/meditation";

export default function MeditationDayScreen() {
  const { day } = useLocalSearchParams<{ day: string }>();
  const { t } = useLanguage();
  const session = getFoundationDay(Number(day));

  if (!session) {
    return (
      <Screen atmosphere="soft" padded>
        <Text variant="title">{t("notFoundTitle")}</Text>
      </Screen>
    );
  }

  return <MeditationPlayer session={session} />;
}

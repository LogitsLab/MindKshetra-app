import React from "react";
import { useLocalSearchParams } from "expo-router";
import { Screen } from "@/components/Screen";
import { Text } from "@/components/Text";
import { MeditationPlayer } from "@/components/MeditationPlayer";
import { useLanguage } from "@/context/LanguageContext";
import { getSessionById } from "@/data/meditation";

export default function MeditationDailyScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t } = useLanguage();
  const session = typeof id === "string" ? getSessionById(id) : undefined;

  if (!session || session.tier !== "daily") {
    return (
      <Screen atmosphere="soft" padded>
        <Text variant="title">{t("notFoundTitle")}</Text>
      </Screen>
    );
  }

  return <MeditationPlayer session={session} />;
}

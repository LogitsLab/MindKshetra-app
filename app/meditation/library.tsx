import React, { useEffect, useState } from "react";
import { View } from "react-native";
import { useRouter } from "expo-router";
import { Button } from "@/components/Button";
import { Screen } from "@/components/Screen";
import { Text } from "@/components/Text";
import { meditationApi } from "@/api/endpoints";
import { useAuth } from "@/context/AuthContext";
import { useLanguage } from "@/context/LanguageContext";
import { sleepTracks } from "@/data/meditationAudio";
import { nextSleepEvening, readSleepEvenings } from "@/storage/meditationStats";
import { spacing } from "@/theme/tokens";

export default function SleepLibraryScreen() {
  const { lang, t } = useLanguage();
  const { isSignedIn } = useAuth();
  const router = useRouter();
  const [night, setNight] = useState(1);

  useEffect(() => {
    if (!isSignedIn) {
      void readSleepEvenings().then((done) => setNight(nextSleepEvening(done)));
      return;
    }
    void meditationApi
      .progress("sleep-7")
      .then((data) => setNight(data.currentDay || 1))
      .catch(() => undefined);
  }, [isSignedIn]);

  return (
    <Screen atmosphere="soft" padded>
      <View style={{ gap: spacing.md, paddingTop: spacing.lg }}>
        <Text variant="title">{t("medSleepShelf")}</Text>
        <Button
          label={t("medSevenEvenings")}
          variant="ghost"
          onPress={() => router.push(`/meditation/sleep/${night}`)}
        />
        {sleepTracks().map((track) => (
          <Button
            key={track.id}
            label={`${lang === "hi" ? track.title_hi : track.title_en} · ${Math.round(track.durationSec / 60)}`}
            variant="ghost"
            onPress={() => router.push(`/meditation/library/${track.id}`)}
          />
        ))}
      </View>
    </Screen>
  );
}

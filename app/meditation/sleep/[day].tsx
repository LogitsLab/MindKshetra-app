import React, { useEffect, useState } from "react";
import { useLocalSearchParams } from "expo-router";
import { OpenSit } from "@/components/OpenSit";
import { Screen } from "@/components/Screen";
import { Text } from "@/components/Text";
import { sleepAudioUrl, sleepEvening } from "@/data/meditationAudio";
import { useAuth } from "@/context/AuthContext";
import { useLanguage } from "@/context/LanguageContext";
import { meditationApi } from "@/api/endpoints";
import { markSleepEvening, readSleepEvenings } from "@/storage/meditationStats";

export default function SleepEveningScreen() {
  const { day } = useLocalSearchParams<{ day: string }>();
  const n = Number(day);
  const session = sleepEvening(n);
  const { lang, t } = useLanguage();
  const { isSignedIn } = useAuth();
  const [locked, setLocked] = useState(false);

  useEffect(() => {
    if (isSignedIn) {
      void meditationApi
        .progress("sleep-7")
        .then((data) => {
          const done = data.completedDays ?? [];
          setLocked(n > 1 && !done.includes(n - 1));
        })
        .catch(() => setLocked(n > 1));
      return;
    }
    void readSleepEvenings().then((done) => {
      setLocked(n > 1 && !done.includes(n - 1));
    });
  }, [n, isSignedIn]);

  if (!session || !session.audio_url) {
    return (
      <Screen atmosphere="soft" padded>
        <Text>{t("notFoundTitle")}</Text>
      </Screen>
    );
  }

  if (locked) {
    return (
      <Screen atmosphere="soft" padded>
        <Text>{t("medDayLocked")}</Text>
      </Screen>
    );
  }

  const script = session.phases
    .filter((p) => p.type === "speak")
    .map((p) => (p.type === "speak" ? (lang === "hi" ? p.text_hi : p.text_en) : ""))
    .join("\n\n");

  return (
    <OpenSit
      title={lang === "hi" ? session.title_hi : session.title_en}
      sessionId={session.id}
      seconds={session.duration_minutes * 60}
      streamUrl={sleepAudioUrl(session.audio_url)}
      fadeOut
      skipMoodIfUntouched
      before={<Text>{script}</Text>}
      onSaved={() => {
        void markSleepEvening(n);
      }}
    />
  );
}

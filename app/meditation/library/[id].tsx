import React, { useState } from "react";
import { View } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { OpenSit } from "@/components/OpenSit";
import { Button } from "@/components/Button";
import { Screen } from "@/components/Screen";
import { Text } from "@/components/Text";
import { sleepAudioUrl, sleepTrackById } from "@/data/meditationAudio";
import { spacing } from "@/theme/tokens";

const CHOICES = [15, 30, 45, "full"] as const;

export default function SleepTrackScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const track = typeof id === "string" ? sleepTrackById(id) : undefined;
  const [choice, setChoice] = useState<(typeof CHOICES)[number]>(30);

  if (!track) {
    return (
      <Screen atmosphere="soft" padded>
        <Text>Missing</Text>
      </Screen>
    );
  }

  const seconds = choice === "full" ? track.durationSec : Math.min(choice * 60, track.durationSec);

  return (
    <OpenSit
      title={track.title_en}
      sessionId={`sleep-bed-${track.id}-${choice}`}
      seconds={seconds}
      streamUrl={sleepAudioUrl(track.src)}
      fadeOut
      skipMoodIfUntouched
      before={
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.sm }}>
          {CHOICES.map((c) => (
            <Button
              key={String(c)}
              label={String(c)}
              variant={choice === c ? "primary" : "ghost"}
              onPress={() => setChoice(c)}
            />
          ))}
        </View>
      }
    />
  );
}

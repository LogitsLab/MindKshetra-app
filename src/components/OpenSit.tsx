import React, { useEffect, useRef, useState } from "react";
import { View } from "react-native";
import { useRouter } from "expo-router";
import { createAudioPlayer, type AudioPlayer } from "expo-audio";
import { playSoftBell, prepareSleepPlayback, startAmbient, stopAmbient, type AmbientBed } from "@/audio/ambient";
import { Button } from "@/components/Button";
import { Screen } from "@/components/Screen";
import { Text } from "@/components/Text";
import { meditationApi } from "@/api/endpoints";
import { useAuth } from "@/context/AuthContext";
import { useLanguage } from "@/context/LanguageContext";
import { queueMeditationGuestCompletion } from "@/storage/meditationQueue";
import { recordMeditationSit, type MeditationStats } from "@/storage/meditationStats";
import { uuidv4 } from "@/utils/uuid";
import { spacing } from "@/theme/tokens";

function clock(sec: number) {
  const m = Math.floor(Math.max(0, sec) / 60);
  const s = Math.max(0, sec) % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export function OpenSit({
  title,
  sessionId,
  seconds,
  bed = "off",
  intervalMin = 0,
  streamUrl,
  fadeOut = false,
  skipMoodIfUntouched = false,
  before,
  onSaved,
}: {
  title: string;
  sessionId: string;
  seconds: number;
  bed?: AmbientBed;
  intervalMin?: number;
  streamUrl?: string;
  fadeOut?: boolean;
  skipMoodIfUntouched?: boolean;
  before?: React.ReactNode;
  onSaved?: () => void;
}) {
  const { t } = useLanguage();
  const { isSignedIn } = useAuth();
  const router = useRouter();
  const [stage, setStage] = useState<"ready" | "play" | "mood" | "done">("ready");
  const [left, setLeft] = useState(seconds);
  const [mood, setMood] = useState<number | null>(null);
  const [line, setLine] = useState("");
  const touched = useRef(false);
  const player = useRef<AudioPlayer | null>(null);

  useEffect(() => {
    return () => {
      player.current?.pause();
      player.current?.remove();
      stopAmbient();
    };
  }, []);

  const begin = () => {
    touched.current = false;
    setLeft(seconds);
    setStage("play");
    if (streamUrl) {
      void (async () => {
        await prepareSleepPlayback();
        const p = createAudioPlayer({ uri: streamUrl });
        p.loop = false;
        p.volume = 0.7;
        p.play();
        player.current = p;
      })();
    } else {
      void playSoftBell();
      void startAmbient(0.35, bed);
    }
  };

  useEffect(() => {
    if (stage !== "play") return;
    const started = Date.now();
    const id = setInterval(() => {
      const elapsed = Math.floor((Date.now() - started) / 1000);
      const remain = seconds - elapsed;
      setLeft(remain);
      if (!streamUrl && intervalMin > 0 && elapsed > 0 && elapsed % (intervalMin * 60) === 0 && remain > 0) {
        void playSoftBell();
      }
      if (fadeOut && player.current && remain <= 15) {
        player.current.volume = Math.max(0, (remain / 15) * 0.7);
      }
      if (remain <= 0) {
        clearInterval(id);
        player.current?.pause();
        stopAmbient();
        if (!streamUrl) void playSoftBell();
        if (skipMoodIfUntouched && !touched.current) void save(false);
        else setStage("mood");
      }
    }, 250);
    return () => clearInterval(id);
  }, [stage, seconds, intervalMin, streamUrl, fadeOut, skipMoodIfUntouched]);

  const save = async (askMood: boolean) => {
    const stats: MeditationStats = await recordMeditationSit(seconds);
    const body = {
      sessionId,
      durationSec: seconds,
      clientRef: uuidv4(),
      ...(askMood && mood != null ? { moodAfter: mood } : {}),
    };
    try {
      if (isSignedIn) await meditationApi.complete(body);
      else await queueMeditationGuestCompletion(body);
    } catch (err) {
      const message = err instanceof Error ? err.message : "";
      if (!/locked/i.test(message)) await queueMeditationGuestCompletion(body);
    }
    onSaved?.();
    setLine(
      t("medCloseLine").replace("{min}", String(stats.dayMinutes)).replace("{sits}", String(stats.lifetimeSits))
    );
    setStage("done");
  };

  return (
    <Screen atmosphere="soft" padded>
      <View
        style={{ gap: spacing.md, paddingTop: spacing.lg }}
        onTouchStart={() => {
          if (stage === "play") touched.current = true;
        }}
      >
        <Text variant="title">{title}</Text>
        {stage === "ready" ? (
          <>
            {before}
            <Button label={t("medBeginSit")} onPress={begin} />
          </>
        ) : null}
        {stage === "play" ? <Text variant="display">{clock(left)}</Text> : null}
        {stage === "mood" ? (
          <>
            <View style={{ flexDirection: "row", gap: spacing.sm }}>
              {[1, 2, 3, 4, 5].map((n) => (
                <Button key={n} label={String(n)} variant={mood === n ? "primary" : "ghost"} onPress={() => setMood(n)} />
              ))}
            </View>
            <Button label={t("medComplete")} onPress={() => void save(true)} />
          </>
        ) : null}
        {stage === "done" ? (
          <>
            <Text>{line}</Text>
            <Button label={t("medBack")} variant="ghost" onPress={() => router.push("/meditation")} />
          </>
        ) : null}
      </View>
    </Screen>
  );
}

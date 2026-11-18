import React, { useEffect, useState } from "react";
import { View } from "react-native";
import { useKeepAwake } from "expo-keep-awake";
import { OpenSit } from "@/components/OpenSit";
import { Button } from "@/components/Button";
import { Screen } from "@/components/Screen";
import { Text } from "@/components/Text";
import { useLanguage } from "@/context/LanguageContext";
import {
  SILENT_PRESETS,
  readSilentSetup,
  writeSilentSetup,
  type SilentSetup,
} from "@/storage/meditationStats";
import type { AmbientBed } from "@/audio/ambient";
import { spacing } from "@/theme/tokens";

export default function SilentTimerScreen() {
  useKeepAwake("silent-sit");
  const { t } = useLanguage();
  const [setup, setSetup] = useState<SilentSetup | null>(null);

  useEffect(() => {
    void readSilentSetup().then(setSetup);
  }, []);

  if (!setup) {
    return (
      <Screen atmosphere="soft" padded>
        <Text>{t("medSilentTimer")}</Text>
      </Screen>
    );
  }

  return (
    <OpenSit
      title={t("medSitAgain").replace("{n}", String(setup.minutes))}
      sessionId={`silent-${setup.minutes}`}
      seconds={setup.minutes * 60}
      bed={setup.bed}
      intervalMin={setup.intervalMin}
      before={
        <View style={{ gap: spacing.sm }}>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.sm }}>
            {SILENT_PRESETS.map((n) => (
              <Button
                key={n}
                label={String(n)}
                variant={setup.minutes === n ? "primary" : "ghost"}
                onPress={() => {
                  const next = { ...setup, minutes: n };
                  setSetup(next);
                  void writeSilentSetup(next);
                }}
              />
            ))}
          </View>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.sm }}>
            {(["off", "drone", "bowls", "rain"] as AmbientBed[]).map((bed) => (
              <Button
                key={bed}
                label={bed}
                variant={setup.bed === bed ? "primary" : "ghost"}
                onPress={() => {
                  const next = { ...setup, bed };
                  setSetup(next);
                  void writeSilentSetup(next);
                }}
              />
            ))}
          </View>
          <View style={{ flexDirection: "row", gap: spacing.sm }}>
            {([0, 5, 10] as const).map((n) => (
              <Button
                key={n}
                label={n === 0 ? "—" : `${n}m`}
                variant={setup.intervalMin === n ? "primary" : "ghost"}
                onPress={() => {
                  const next = { ...setup, intervalMin: n };
                  setSetup(next);
                  void writeSilentSetup(next);
                }}
              />
            ))}
          </View>
        </View>
      }
    />
  );
}

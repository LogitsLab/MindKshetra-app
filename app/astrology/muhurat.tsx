import React, { useEffect, useState } from "react";
import { ActivityIndicator, ScrollView, StyleSheet, View } from "react-native";
import { Screen } from "@/components/Screen";
import { Text } from "@/components/Text";
import { Panel } from "@/components/Panel";
import { useLanguage } from "@/context/LanguageContext";
import { useTheme } from "@/context/ThemeContext";
import { astrologyApi } from "@/api/endpoints";
import { spacing } from "@/theme/tokens";

type Payload = {
  date: string;
  disclaimer: string;
  muhurats: Array<{
    nameEn: string;
    nameHi: string;
    startIso: string;
    endIso: string;
    tag: string;
  }>;
  choghadiya: Array<{
    kind: string;
    startIso: string;
    endIso: string;
    quality: string;
  }>;
};

function fmt(iso: string) {
  return new Date(iso).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function MuhuratScreen() {
  const { colors } = useTheme();
  const { lang } = useLanguage();
  const L = lang === "hi" ? "hi" : "en";
  const [data, setData] = useState<Payload | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void astrologyApi
      .muhurat()
      .then(setData)
      .catch((e) => setError((e as Error).message));
  }, []);

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.pad}>
        <Text variant="display">{L === "hi" ? "मुहूर्त" : "Muhurats"}</Text>
        <Text variant="soft" style={{ marginTop: spacing.sm }}>
          {L === "hi"
            ? "सूचनात्मक अनुमान — शास्त्रीय मुहूर्त निर्णय नहीं।"
            : "Informational approximations — not a classical ruling."}
        </Text>
        {error ? (
          <Text variant="soft" color={colors.danger} style={{ marginTop: spacing.lg }}>
            {error}
          </Text>
        ) : !data ? (
          <ActivityIndicator color={colors.brass} style={{ marginTop: spacing.xl }} />
        ) : (
          <View style={{ marginTop: spacing.lg, gap: spacing.sm }}>
            <Text variant="muted">{data.date}</Text>
            {data.muhurats.map((m) => (
              <Panel key={m.nameEn}>
                <Text variant="title">
                  {L === "hi" ? m.nameHi : m.nameEn}
                </Text>
                <Text variant="soft" style={{ marginTop: spacing.xs }}>
                  {fmt(m.startIso)} – {fmt(m.endIso)} · {m.tag}
                </Text>
              </Panel>
            ))}
            <Text variant="eyebrow" style={{ marginTop: spacing.md }}>
              Choghadiya
            </Text>
            {data.choghadiya.map((c) => (
              <Panel key={c.startIso}>
                <Text variant="body">
                  {c.kind}{" "}
                  <Text variant="muted">({c.quality})</Text>
                </Text>
                <Text variant="muted" style={{ marginTop: 4 }}>
                  {fmt(c.startIso)}–{fmt(c.endIso)}
                </Text>
              </Panel>
            ))}
          </View>
        )}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  pad: { padding: spacing.lg, paddingBottom: spacing.xxl },
});

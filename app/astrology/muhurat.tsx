import React, { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from "react-native";
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

function fmt(iso: string, locale: string) {
  return new Date(iso).toLocaleTimeString(locale, {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function MuhuratScreen() {
  const { colors } = useTheme();
  const { lang, t } = useLanguage();
  const L = lang === "hi" ? "hi" : "en";
  const locale = lang === "hi" ? "hi-IN" : "en-IN";
  const [data, setData] = useState<Payload | null>(null);
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    setError(false);
    setLoading(true);
    setData(null);
    void astrologyApi
      .muhurat()
      .then(setData)
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const qualityLabel = (quality: string): string => {
    if (quality === "good") return t("astroChoghQualityGood");
    if (quality === "neutral") return t("astroChoghQualityNeutral");
    if (quality === "avoid") return t("astroChoghQualityAvoid");
    return quality;
  };

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.pad}>
        <Text variant="display">{t("astroMuhuratTitle")}</Text>
        <Text variant="soft" style={{ marginTop: spacing.sm }}>
          {t("astroMuhuratApprox")}
        </Text>
        {error ? (
          <View style={{ marginTop: spacing.lg, gap: spacing.sm }}>
            <Text variant="muted">{t("astroMuhuratUnavailable")}</Text>
            <Text variant="soft">{t("astroMuhuratUnavailableBody")}</Text>
            <Pressable
              onPress={load}
              style={[styles.retry, { borderColor: colors.brass }]}
            >
              <Text variant="body" color={colors.brass}>
                {t("astroMuhuratRetry")}
              </Text>
            </Pressable>
          </View>
        ) : loading || !data ? (
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
                  {fmt(m.startIso, locale)} – {fmt(m.endIso, locale)} · {m.tag}
                </Text>
              </Panel>
            ))}
            <Text variant="eyebrow" style={{ marginTop: spacing.md }}>
              {t("astroChoghadiya")}
            </Text>
            {data.choghadiya.map((c) => (
              <Panel key={c.startIso}>
                <Text variant="body">
                  {c.kind}{" "}
                  <Text variant="muted">({qualityLabel(c.quality)})</Text>
                </Text>
                <Text variant="muted" style={{ marginTop: 4 }}>
                  {fmt(c.startIso, locale)}–{fmt(c.endIso, locale)}
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
  retry: {
    alignSelf: "flex-start",
    borderWidth: StyleSheet.hairlineWidth * 2,
    borderRadius: 6,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    marginTop: spacing.xs,
  },
});

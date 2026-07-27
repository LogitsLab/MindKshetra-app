import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Screen } from "@/components/Screen";
import { Text } from "@/components/Text";
import { Button } from "@/components/Button";
import { EmptyState } from "@/components/SlokaCard";
import { astrologyApi } from "@/api/endpoints";
import { useLanguage } from "@/context/LanguageContext";
import { useMadhav } from "@/context/MadhavContext";
import { useTheme } from "@/context/ThemeContext";
import { radii, spacing } from "@/theme/tokens";
import type { AstrologyMember } from "@/types";

type Tab = "chart" | "dasha" | "predictions";

export default function AstrologyMemberDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { colors } = useTheme();
  const { lang, t } = useLanguage();
  const { askAboutChart } = useMadhav();

  const [member, setMember] = useState<AstrologyMember | null>(null);
  const [chart, setChart] = useState<Record<string, unknown> | null>(null);
  const [predictions, setPredictions] = useState<unknown>(null);
  const [tab, setTab] = useState<Tab>("chart");
  const [loading, setLoading] = useState(true);
  const [predBusy, setPredBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const [mRes, cRes] = await Promise.all([
          astrologyApi.member(id),
          astrologyApi.chart(id).catch(() =>
            astrologyApi.compute({ memberId: id })
          ),
        ]);
        if (!alive) return;
        setMember(mRes.member);
        setChart(cRes.chart ?? null);
      } catch (e) {
        if (alive) setError((e as Error).message);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [id]);

  async function loadPredictions() {
    setPredBusy(true);
    try {
      const res = await astrologyApi.predictions({ memberId: id });
      setPredictions(res.predictions);
      setTab("predictions");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setPredBusy(false);
    }
  }

  if (loading) {
    return (
      <Screen>
        <ActivityIndicator color={colors.brass} style={{ marginTop: spacing.xl }} />
      </Screen>
    );
  }

  if (error && !member) {
    return (
      <Screen>
        <EmptyState title={lang === "hi" ? "त्रुटि" : "Couldn’t load"} body={error} />
      </Screen>
    );
  }

  const overview = (chart?.overview as Record<string, unknown> | undefined) ?? undefined;
  const planets = (chart?.planets as unknown[] | undefined) ?? [];
  const dasha =
    (chart?.dasha as Record<string, unknown> | undefined) ??
    (overview
      ? {
          currentMaha: overview.currentMaha,
          currentAntar: overview.currentAntar,
        }
      : null);

  return (
    <Screen>
      <ScrollView contentContainerStyle={{ paddingBottom: 140, paddingTop: spacing.md }}>
        <Text variant="eyebrow">{t("astroEyebrow")}</Text>
        <Text variant="display" style={{ marginTop: spacing.sm }}>
          {member?.name ?? "Chart"}
        </Text>
        <Text variant="muted" style={{ marginTop: spacing.xs }}>
          {member?.placeLabel ?? member?.dob}
        </Text>

        <View style={styles.tabs}>
          {(
            [
              ["chart", t("astroTabChart")],
              ["dasha", t("astroTabDasha")],
              ["predictions", t("astroTabPredictions")],
            ] as const
          ).map(([key, label]) => (
            <Pressable
              key={key}
              onPress={() => {
                if (key === "predictions" && predictions == null) {
                  void loadPredictions();
                } else {
                  setTab(key);
                }
              }}
              style={[
                styles.tab,
                {
                  borderColor: colors.line,
                  backgroundColor: tab === key ? colors.surfaceHover : colors.surface,
                },
              ]}
            >
              <Text
                variant="muted"
                style={{ color: tab === key ? colors.brassSoft : colors.textMuted }}
              >
                {label}
              </Text>
            </Pressable>
          ))}
        </View>

        {error ? (
          <Text variant="muted" style={{ marginTop: spacing.sm, color: colors.danger }}>
            {error}
          </Text>
        ) : null}

        <View
          style={[
            styles.panel,
            { borderColor: colors.line, backgroundColor: colors.panel },
          ]}
        >
          {tab === "chart" ? (
            <>
              {overview ? (
                <View style={{ gap: 4 }}>
                  <Text variant="soft">
                    {t("astroAsc")}: {String(overview.ascendantSign ?? "—")}
                  </Text>
                  <Text variant="soft">
                    {t("astroMoon")}: {String(overview.moonSign ?? "—")}
                  </Text>
                  <Text variant="soft">
                    {t("astroSun")}: {String(overview.sunSign ?? "—")}
                  </Text>
                </View>
              ) : null}
              <Text variant="eyebrow" style={{ marginTop: spacing.md }}>
                {t("astroPlanet")}
              </Text>
              {planets.length ? (
                planets.slice(0, 14).map((p, i) => {
                  const row = p as Record<string, unknown>;
                  return (
                    <Text key={i} variant="muted" style={{ marginTop: 4 }}>
                      {String(row.id ?? row.name ?? "p")}:{" "}
                      {String(row.sign ?? "—")}
                      {row.house != null ? ` · H${row.house}` : ""}
                      {row.nakshatra ? ` · ${String(row.nakshatra)}` : ""}
                    </Text>
                  );
                })
              ) : (
                <Text variant="muted" style={{ marginTop: spacing.sm }}>
                  {chart
                    ? JSON.stringify(chart, null, 2).slice(0, 1200)
                    : lang === "hi"
                      ? "कुंडली उपलब्ध नहीं"
                      : "No chart payload"}
                </Text>
              )}
            </>
          ) : null}

          {tab === "dasha" ? (
            <Text variant="soft" style={{ fontFamily: "Sora_400Regular" }}>
              {dasha
                ? JSON.stringify(dasha, null, 2)
                : lang === "hi"
                  ? "दशा डेटा नहीं"
                  : "No dasha data"}
            </Text>
          ) : null}

          {tab === "predictions" ? (
            predBusy ? (
              <ActivityIndicator color={colors.brass} />
            ) : (
              <Text variant="soft">
                {predictions
                  ? typeof predictions === "string"
                    ? predictions
                    : JSON.stringify(predictions, null, 2).slice(0, 2000)
                  : t("astroPredBlurb")}
              </Text>
            )
          ) : null}
        </View>

        <View style={{ marginTop: spacing.lg, gap: spacing.sm }}>
          <Button
            label={t("askMadhavAbout")}
            onPress={() => {
              askAboutChart(
                id,
                lang === "hi"
                  ? "इस कुंडली के आधार पर आज क्या चिंतन करूँ?"
                  : "What does my chart suggest I should reflect on today?"
              );
              router.push("/madhav");
            }}
          />
          {tab !== "predictions" ? (
            <Button
              label={t("astroGeneratePred")}
              variant="ghost"
              loading={predBusy}
              onPress={() => void loadPredictions()}
            />
          ) : null}
        </View>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  tabs: {
    flexDirection: "row",
    gap: spacing.xs,
    marginTop: spacing.lg,
    flexWrap: "wrap",
  },
  tab: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radii.md,
    borderWidth: StyleSheet.hairlineWidth * 2,
  },
  panel: {
    marginTop: spacing.md,
    padding: spacing.md,
    borderRadius: radii.lg,
    borderWidth: StyleSheet.hairlineWidth * 2,
  },
});

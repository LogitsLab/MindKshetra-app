import React, { useEffect, useRef, useState } from "react";
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
import { ChartOverviewPanel } from "@/components/astrology/ChartOverviewPanel";
import { DashaTimelinePanel } from "@/components/astrology/DashaTimelinePanel";
import { PredictionsPanel } from "@/components/astrology/PredictionsPanel";
import { astrologyApi } from "@/api/endpoints";
import { useLanguage } from "@/context/LanguageContext";
import { useMadhav } from "@/context/MadhavContext";
import { useTheme } from "@/context/ThemeContext";
import { radii, spacing } from "@/theme/tokens";
import type { AstrologyMember } from "@/types";
import {
  featuredAreaFromChart,
  type ChartOverview,
  type ChartPlanet,
  type DashaPeriodNode,
  type LifeArea,
  type PredictionsText,
} from "@/types/astrology";

type Tab = "chart" | "dasha" | "predictions";

export default function AstrologyMemberDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { colors } = useTheme();
  const { lang, t } = useLanguage();
  const { askAboutChart } = useMadhav();

  const [member, setMember] = useState<AstrologyMember | null>(null);
  const [chart, setChart] = useState<Record<string, unknown> | null>(null);
  const [predictions, setPredictions] = useState<PredictionsText | null>(null);
  const [tab, setTab] = useState<Tab>("chart");
  const [loading, setLoading] = useState(true);
  const [predBusy, setPredBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const autoPred = useRef(false);

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
        const nextChart = cRes.chart ?? null;
        setChart(nextChart);
        const existing = nextChart?.predictionsText as PredictionsText | undefined;
        if (existing?.portrait) setPredictions(existing);
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

  async function loadPredictions(force = false) {
    setPredBusy(true);
    setError(null);
    try {
      const res = await astrologyApi.predictions({
        memberId: id,
        language: lang,
        force,
      });
      if (res.chart) setChart(res.chart);
      setPredictions(res.predictionsText);
      setTab("predictions");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setPredBusy(false);
    }
  }

  useEffect(() => {
    if (tab !== "predictions" || predictions || predBusy || autoPred.current) {
      return;
    }
    autoPred.current = true;
    void loadPredictions(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, predictions, predBusy]);

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

  const overview = (chart?.overview as ChartOverview | undefined) ?? undefined;
  const planets = (chart?.planets as ChartPlanet[] | undefined) ?? [];
  const dashaTree =
    ((chart?.dasha as { tree?: DashaPeriodNode[] } | undefined)?.tree) ?? null;
  const blended = (chart?.verdicts as { blended?: { theme?: string }[] } | undefined)
    ?.blended;
  const themeLine = blended?.[0]?.theme ?? null;

  const areaLabel = (a: LifeArea) => {
    const key = `astroArea_${a}` as const;
    try {
      return t(key as never);
    } catch {
      return a;
    }
  };

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
              onPress={() => setTab(key)}
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
            <ChartOverviewPanel
              overview={overview}
              planets={planets}
              tobUnknown={Boolean(chart?.tobUnknown)}
              themeLine={themeLine}
              labels={{
                asc: t("astroAsc"),
                moon: t("astroMoon"),
                sun: t("astroSun"),
                dasha: t("astroCurrentDasha"),
                planet: t("astroPlanet"),
                tobUnknown: t("astroTobUnknown"),
                atAGlance: t("astroAtAGlance"),
              }}
            />
          ) : null}

          {tab === "dasha" ? (
            <DashaTimelinePanel
              tree={dashaTree}
              currentMaha={overview?.currentMaha}
              currentAntar={overview?.currentAntar}
              emptyLabel={lang === "hi" ? "दशा डेटा नहीं" : "No dasha data"}
              currentLabel={t("astroCurrentDasha")}
            />
          ) : null}

          {tab === "predictions" ? (
            predBusy && !predictions ? (
              <View style={{ gap: spacing.sm, alignItems: "center", paddingVertical: spacing.lg }}>
                <ActivityIndicator color={colors.brass} />
                <Text variant="muted">{t("astroWorking")}</Text>
              </View>
            ) : predictions ? (
              <PredictionsPanel
                predictions={predictions}
                featuredArea={featuredAreaFromChart(chart)}
                detailed
                labels={{
                  portrait: t("astroPortrait"),
                  rulesBanner: t("astroPredRulesBanner"),
                  regenerateHint: t("astroPredRegenerateHint"),
                  strengths: t("astroStrengths"),
                  watchouts: t("astroWatchouts"),
                  now: t("astroNowPeriod"),
                  nearTerm: t("astroNearTerm"),
                  guidance: t("astroPredTryThis"),
                  featured: t("astroFeaturedArea"),
                  area: areaLabel,
                }}
              />
            ) : (
              <Text variant="soft">{t("astroPredBlurb")}</Text>
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
          <Button
            label={
              predictions ? t("astroRegeneratePred") : t("astroGeneratePred")
            }
            variant="ghost"
            loading={predBusy}
            onPress={() => void loadPredictions(Boolean(predictions))}
          />
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

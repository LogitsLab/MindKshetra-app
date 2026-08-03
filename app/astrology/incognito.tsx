import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import { useRouter } from "expo-router";
import { Screen } from "@/components/Screen";
import { Text } from "@/components/Text";
import { Button } from "@/components/Button";
import { BirthDetailsForm } from "@/components/astrology/BirthDetailsForm";
import {
  birthPayloadFromDetails,
  emptyBirthDetails,
  hasValidDob,
  type BirthDetails,
} from "@/components/astrology/birthDetails";
import { ChartOverviewPanel } from "@/components/astrology/ChartOverviewPanel";
import { DashaTimelinePanel } from "@/components/astrology/DashaTimelinePanel";
import { PredictionsPanel } from "@/components/astrology/PredictionsPanel";
import { PredictionsStatus } from "@/components/astrology/PredictionsStatus";
import { astrologyApi } from "@/api/endpoints";
import { usePredictions } from "@/hooks/usePredictions";
import { useLanguage } from "@/context/LanguageContext";
import { useMadhav } from "@/context/MadhavContext";
import { useTheme } from "@/context/ThemeContext";
import { radii, spacing } from "@/theme/tokens";
import {
  featuredAreaFromChart,
  type ChartOverview,
  type ChartPlanet,
  type DashaPeriodNode,
  type LifeArea,
} from "@/types/astrology";

type Tab = "chart" | "dasha" | "predictions";

export default function IncognitoChartScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const { lang, t } = useLanguage();
  const { ask, setChartSession } = useMadhav();

  const [details, setDetails] = useState<BirthDetails>(emptyBirthDetails);
  const [chart, setChart] = useState<Record<string, unknown> | null>(null);
  const [chartSessionId, setLocalSession] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>("chart");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const birthBody = useMemo(() => birthPayloadFromDetails(details), [details]);

  // Refs so the predictions prefetch fired inside compute() sees the fresh
  // session id / birth payload before React state has re-rendered.
  const sessionRef = useRef<string | null>(null);
  const birthRef = useRef<Record<string, unknown> | null>(null);

  const predictions = usePredictions({
    language: lang,
    getRequest: () =>
      sessionRef.current || birthRef.current
        ? {
            chartSessionId: sessionRef.current ?? undefined,
            birth: birthRef.current,
          }
        : null,
    onChart: (c) => setChart(c),
  });

  async function compute() {
    if (!birthBody) {
      setError(hasValidDob(details) ? t("astroPlaceRequired") : t("astroDobRequired"));
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await astrologyApi.compute(birthBody);
      setChart(res.chart ?? null);
      // chartSessionId is server-minted only; the client never generates one.
      const sid = res.chartSessionId ?? null;
      setLocalSession(sid);
      if (sid) setChartSession(sid, birthBody);
      setTab("chart");
      predictions.reset();
      sessionRef.current = sid;
      birthRef.current = birthBody;
      // Prefetch so the predictions tab is warm by the time it is opened.
      void predictions.load();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  // Load when the tab opens cold, and again after an EN↔HI switch — the
  // hook caches per language, so the other language's reading stays intact.
  useEffect(() => {
    if (
      tab === "predictions" &&
      chart &&
      !predictions.predictions &&
      !predictions.busy &&
      !predictions.errorKind
    ) {
      void predictions.load();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, lang, chart, predictions.predictions, predictions.busy, predictions.errorKind]);

  const overview = (chart?.overview as ChartOverview | undefined) ?? undefined;
  const planets = (chart?.planets as ChartPlanet[] | undefined) ?? [];
  const dashaTree =
    ((chart?.dasha as { tree?: DashaPeriodNode[] } | undefined)?.tree) ?? null;
  const themeLine = (
    chart?.verdicts as { blended?: { theme?: string }[] } | undefined
  )?.blended?.[0]?.theme;

  const areaLabel = (a: LifeArea) => {
    try {
      return t(`astroArea_${a}` as never);
    } catch {
      return a;
    }
  };

  return (
    <Screen>
      <ScrollView
        contentContainerStyle={{ paddingBottom: 120, paddingTop: spacing.md }}
        keyboardShouldPersistTaps="handled"
      >
        <Text variant="eyebrow">{t("astroEyebrow")}</Text>
        <Text variant="display" style={{ marginTop: spacing.sm }}>
          {t("astroIncognito")}
        </Text>
        <Text variant="soft" style={{ marginTop: spacing.sm }}>
          {t("astroIncognitoBanner")}
        </Text>

        <View style={{ marginTop: spacing.lg, gap: spacing.sm }}>
          <BirthDetailsForm value={details} onChange={setDetails} />

          <Button
            label={t("astroCast")}
            loading={busy}
            onPress={() => void compute()}
          />
        </View>

        {error ? (
          <Text variant="muted" style={{ marginTop: spacing.md, color: colors.danger }}>
            {error}
          </Text>
        ) : null}

        {chart ? (
          <View
            style={[
              styles.summary,
              { borderColor: colors.line, backgroundColor: colors.panel },
            ]}
          >
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
                      backgroundColor:
                        tab === key ? colors.surfaceHover : colors.surface,
                    },
                  ]}
                >
                  <Text
                    variant="muted"
                    style={{
                      color: tab === key ? colors.brassSoft : colors.textMuted,
                    }}
                  >
                    {label}
                  </Text>
                </Pressable>
              ))}
            </View>

            <View style={{ marginTop: spacing.md }}>
              {tab === "chart" ? (
                <ChartOverviewPanel
                  overview={overview}
                  planets={planets}
                  tobUnknown={Boolean(chart.tobUnknown)}
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
                predictions.predictions ? (
                  <PredictionsPanel
                    predictions={predictions.predictions}
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
                  <PredictionsStatus
                    busy={predictions.busy}
                    stage={predictions.stage}
                    error={predictions.error}
                    errorKind={predictions.errorKind}
                    retryAfterSec={predictions.retryAfterSec}
                    onRetry={() => void predictions.load()}
                  />
                )
              ) : null}
            </View>

            <View style={{ marginTop: spacing.lg, gap: spacing.sm }}>
              <Button
                label={t("askMadhavAbout")}
                onPress={() => {
                  if (chartSessionId) setChartSession(chartSessionId, birthRef.current);
                  ask(
                    lang === "hi"
                      ? "इस गुप्त कुंडली के आधार पर आज क्या चिंतन करूँ?"
                      : "What does this session chart suggest I reflect on today?"
                  );
                  router.push("/madhav");
                }}
              />
              <Button
                label={
                  predictions.predictions
                    ? t("astroRegeneratePred")
                    : t("astroGeneratePred")
                }
                variant="ghost"
                loading={predictions.busy}
                onPress={() => {
                  setTab("predictions");
                  void predictions.load(Boolean(predictions.predictions));
                }}
              />
            </View>
          </View>
        ) : busy ? (
          <ActivityIndicator color={colors.brass} style={{ marginTop: spacing.xl }} />
        ) : null}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  summary: {
    marginTop: spacing.xl,
    padding: spacing.md,
    borderRadius: radii.lg,
    borderWidth: StyleSheet.hairlineWidth * 2,
  },
  tabs: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.xs,
  },
  tab: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radii.md,
    borderWidth: StyleSheet.hairlineWidth * 2,
  },
});

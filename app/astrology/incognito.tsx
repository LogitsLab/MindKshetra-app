import React, { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from "react-native";
import { useRouter } from "expo-router";
import { Screen } from "@/components/Screen";
import { Text } from "@/components/Text";
import { Button } from "@/components/Button";
import { ChartOverviewPanel } from "@/components/astrology/ChartOverviewPanel";
import { DashaTimelinePanel } from "@/components/astrology/DashaTimelinePanel";
import { PredictionsPanel } from "@/components/astrology/PredictionsPanel";
import { astrologyApi } from "@/api/endpoints";
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
  type PredictionsText,
} from "@/types/astrology";

type GeoResult = { label: string; lat: number; lng: number; ianaTz: string };
type Tab = "chart" | "dasha" | "predictions";

export default function IncognitoChartScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const { lang, t } = useLanguage();
  const { ask, setChartSession } = useMadhav();

  const [dob, setDob] = useState("");
  const [tob, setTob] = useState("12:00");
  const [placeQuery, setPlaceQuery] = useState("");
  const [place, setPlace] = useState<GeoResult | null>(null);
  const [suggestions, setSuggestions] = useState<GeoResult[]>([]);
  const [chart, setChart] = useState<Record<string, unknown> | null>(null);
  const [chartSessionId, setLocalSession] = useState<string | null>(null);
  const [birth, setBirth] = useState<Record<string, unknown> | null>(null);
  const [predictions, setPredictions] = useState<PredictionsText | null>(null);
  const [tab, setTab] = useState<Tab>("chart");
  const [busy, setBusy] = useState(false);
  const [predBusy, setPredBusy] = useState(false);
  const [geoBusy, setGeoBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const birthBody = useMemo(() => {
    if (!place || !/^\d{4}-\d{2}-\d{2}$/.test(dob)) return null;
    return {
      dob,
      tob,
      tobUnknown: false,
      placeLabel: place.label,
      lat: place.lat,
      lng: place.lng,
      ianaTz: place.ianaTz,
    };
  }, [dob, tob, place]);

  async function searchPlace() {
    const q = placeQuery.trim();
    if (q.length < 2) return;
    setGeoBusy(true);
    setError(null);
    try {
      const res = await astrologyApi.geocode(q);
      setSuggestions(res.results ?? []);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setGeoBusy(false);
    }
  }

  async function compute() {
    if (!birthBody) {
      setError(t("astroDobRequired"));
      return;
    }
    setBusy(true);
    setError(null);
    setPredictions(null);
    try {
      const res = await astrologyApi.compute(birthBody);
      setChart(res.chart ?? null);
      setBirth(birthBody);
      const sid = res.chartSessionId ?? null;
      setLocalSession(sid);
      if (sid) setChartSession(sid, birthBody);
      setTab("chart");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function loadPredictions(force = false) {
    if (!chartSessionId && !birthBody) return;
    setPredBusy(true);
    setError(null);
    try {
      const res = await astrologyApi.predictions({
        chartSessionId: chartSessionId ?? undefined,
        birth: birth ?? birthBody ?? undefined,
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
          <Text variant="eyebrow">{t("astroDob")}</Text>
          <TextInput
            value={dob}
            onChangeText={setDob}
            placeholder="YYYY-MM-DD"
            placeholderTextColor={colors.textMuted}
            style={inputStyle(colors)}
          />
          <Text variant="eyebrow">{t("astroTob")}</Text>
          <TextInput
            value={tob}
            onChangeText={setTob}
            placeholder="HH:MM"
            placeholderTextColor={colors.textMuted}
            style={inputStyle(colors)}
          />
          <Text variant="eyebrow">{t("astroPlace")}</Text>
          <View style={{ flexDirection: "row", gap: spacing.sm }}>
            <TextInput
              value={placeQuery}
              onChangeText={setPlaceQuery}
              placeholder={t("astroPlacePh")}
              placeholderTextColor={colors.textMuted}
              style={[inputStyle(colors), { flex: 1 }]}
            />
            <Button
              label={t("astroSearch")}
              variant="ghost"
              loading={geoBusy}
              onPress={() => void searchPlace()}
            />
          </View>
          {suggestions.map((s) => (
            <Pressable
              key={`${s.lat}-${s.lng}-${s.label}`}
              onPress={() => {
                setPlace(s);
                setPlaceQuery(s.label);
                setSuggestions([]);
              }}
              style={[styles.suggest, { borderBottomColor: colors.hairline }]}
            >
              <Text variant="soft">{s.label}</Text>
            </Pressable>
          ))}
          {place ? (
            <Text variant="muted" style={{ color: colors.brassSoft }}>
              {t("astroPlaceConfirm")}: {place.label}
            </Text>
          ) : null}

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
                  onPress={() => {
                    setTab(key);
                    if (key === "predictions" && !predictions && !predBusy) {
                      void loadPredictions(false);
                    }
                  }}
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
                predBusy && !predictions ? (
                  <View style={{ alignItems: "center", gap: spacing.sm }}>
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
                  if (chartSessionId) setChartSession(chartSessionId, birth);
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
                  predictions ? t("astroRegeneratePred") : t("astroGeneratePred")
                }
                variant="ghost"
                loading={predBusy}
                onPress={() => void loadPredictions(Boolean(predictions))}
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

function inputStyle(colors: ReturnType<typeof useTheme>["colors"]) {
  return {
    minHeight: 48,
    borderWidth: StyleSheet.hairlineWidth * 2,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    color: colors.text,
    borderColor: colors.line,
    backgroundColor: colors.inputBg,
    fontFamily: "Sora_400Regular" as const,
  };
}

const styles = StyleSheet.create({
  suggest: {
    paddingVertical: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth * 2,
  },
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

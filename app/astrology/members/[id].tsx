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
import { ChartOverviewPanel } from "@/components/astrology/ChartOverviewPanel";
import { DashaTimelinePanel } from "@/components/astrology/DashaTimelinePanel";
import { PredictionsPanel } from "@/components/astrology/PredictionsPanel";
import { PredictionsStatus } from "@/components/astrology/PredictionsStatus";
import { PressurePracticeCard } from "@/components/astrology/PressurePracticeCard";
import { astrologyApi } from "@/api/endpoints";
import { usePredictions } from "@/hooks/usePredictions";
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
  const [tab, setTab] = useState<Tab>("chart");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const predictions = usePredictions({
    language: lang,
    getRequest: () => ({ memberId: id }),
    onChart: (c) => setChart(c),
  });

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
        if (existing?.portrait) {
          predictions.seed(lang, existing);
        } else {
          // Prefetch so the predictions tab is warm when it is opened.
          void predictions.load();
        }
      } catch (e) {
        if (alive) setError((e as Error).message);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  // Load when the tab opens cold, and again after an EN↔HI switch — the
  // hook caches per language, so switching back is instant and lossless.
  useEffect(() => {
    if (
      tab === "predictions" &&
      !loading &&
      !predictions.predictions &&
      !predictions.busy &&
      !predictions.errorKind
    ) {
      void predictions.load();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, lang, loading, predictions.predictions, predictions.busy, predictions.errorKind]);

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
    <Screen padded={false} atmosphere="soft">
      <View
        style={[
          styles.chrome,
          { borderBottomColor: colors.line, backgroundColor: colors.navBg },
        ]}
      >
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Back"
          onPress={() => router.back()}
          style={({ pressed }) => [styles.back, { opacity: pressed ? 0.5 : 1 }]}
        >
          <Text style={{ color: colors.brassSoft, fontSize: 30, lineHeight: 30 }}>‹</Text>
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text variant="title" numberOfLines={1} style={styles.memberTitle}>
            {member?.name ?? "Chart"}
          </Text>
          <Text variant="muted" numberOfLines={1} style={styles.memberMeta}>
            {[member?.placeLabel, member?.dob, member?.tob].filter(Boolean).join(" · ")}
          </Text>
        </View>
        <View style={[styles.avatar, { borderColor: colors.line }]}>
          <Text style={{ color: colors.brassSoft, fontFamily: "Fraunces_500Medium" }}>
            {(member?.name ?? "C").charAt(0).toUpperCase()}
          </Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Text variant="eyebrow" color={colors.brassSoft}>
          {t("astroEyebrow")}
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

        {tab === "chart" || tab === "predictions" ? (
          <PressurePracticeCard memberId={id} />
        ) : null}

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
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  chrome: {
    minHeight: 72,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth * 2,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  back: {
    width: 34,
    height: 44,
    alignItems: "flex-start",
    justifyContent: "center",
  },
  memberTitle: {
    fontFamily: "Fraunces_500Medium",
    fontSize: 22,
    lineHeight: 27,
  },
  memberMeta: {
    marginTop: 2,
    fontSize: 10,
    lineHeight: 14,
    textTransform: "uppercase",
    letterSpacing: 0.7,
  },
  avatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: StyleSheet.hairlineWidth * 2,
    alignItems: "center",
    justifyContent: "center",
  },
  scrollContent: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.lg,
    paddingBottom: 140,
  },
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

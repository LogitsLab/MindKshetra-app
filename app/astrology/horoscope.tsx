import React, { useCallback, useEffect, useMemo, useState } from "react";
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
import { PredictionsPanel } from "@/components/astrology/PredictionsPanel";
import { PredictionsStatus } from "@/components/astrology/PredictionsStatus";
import { EmptyState } from "@/components/SlokaCard";
import { astrologyApi } from "@/api/endpoints";
import { usePredictions } from "@/hooks/usePredictions";
import { useAuth } from "@/context/AuthContext";
import { useLanguage } from "@/context/LanguageContext";
import { useTheme } from "@/context/ThemeContext";
import { radii, spacing } from "@/theme/tokens";
import type { AstrologyMember } from "@/types";
import {
  featuredAreaFromChart,
  type LifeArea,
  type PredictionsText,
} from "@/types/astrology";

type RangeTab = "overall" | LifeArea;

const RANGE_TABS: RangeTab[] = [
  "overall",
  "marriage",
  "career",
  "health",
  "finance",
];

function areaLabel(area: RangeTab, hi: boolean): string {
  const en: Record<string, string> = {
    overall: "Overall",
    marriage: "Love",
    career: "Career",
    health: "Health",
    finance: "Finance",
    education: "Education",
    travel: "Travel",
  };
  const hiMap: Record<string, string> = {
    overall: "समग्र",
    marriage: "प्रेम",
    career: "करियर",
    health: "स्वास्थ्य",
    finance: "वित्त",
    education: "शिक्षा",
    travel: "यात्रा",
  };
  return (hi ? hiMap : en)[area] ?? area;
}

export default function HoroscopeScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const { lang, t } = useLanguage();
  const { user } = useAuth();
  const hi = lang === "hi";
  const signedIn = Boolean(user && !user.is_anonymous);

  const [members, setMembers] = useState<AstrologyMember[]>([]);
  const [memberId, setMemberId] = useState<string | null>(null);
  const [chart, setChart] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [range, setRange] = useState<RangeTab>("overall");

  const predictions = usePredictions({
    language: lang,
    getRequest: () => (memberId ? { memberId } : null),
    onChart: (c) => setChart(c),
  });

  useEffect(() => {
    let alive = true;
    (async () => {
      if (!signedIn) {
        setLoading(false);
        return;
      }
      try {
        const res = await astrologyApi.members();
        if (!alive) return;
        const list = res.members ?? [];
        setMembers(list);
        if (list[0]) setMemberId(list[0].id);
        else setLoading(false);
      } catch (e) {
        if (alive) {
          setError((e as Error).message);
          setLoading(false);
        }
      }
    })();
    return () => {
      alive = false;
    };
  }, [signedIn]);

  const loadMemberChart = useCallback(
    async (id: string) => {
      setLoading(true);
      setError(null);
      try {
        const cRes = await astrologyApi.chart(id).catch(() =>
          astrologyApi.compute({ memberId: id })
        );
        const next = cRes.chart ?? null;
        setChart(next);
        const existing = next?.predictionsText as PredictionsText | undefined;
        if (existing?.portrait) {
          predictions.seed(lang, existing);
        } else {
          void predictions.load();
        }
      } catch (e) {
        setError((e as Error).message);
      } finally {
        setLoading(false);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [lang]
  );

  useEffect(() => {
    if (!memberId) return;
    void loadMemberChart(memberId);
  }, [memberId, loadMemberChart]);

  const featured = useMemo(() => featuredAreaFromChart(chart), [chart]);

  const areaLabels = useMemo(
    () => ({
      portrait: hi ? "चित्र" : "Portrait",
      rulesBanner: t("astroPredRulesBanner"),
      regenerateHint: t("astroPredRegenerateHint"),
      strengths: hi ? "शक्तियाँ" : "Strengths",
      watchouts: hi ? "सावधानियाँ" : "Watchouts",
      now: hi ? "अभी" : "Now",
      nearTerm: hi ? "निकट भविष्य" : "Near term",
      guidance: hi ? "मार्गदर्शन" : "Guidance",
      featured: hi ? "मुख्य" : "Featured",
      area: (id: LifeArea) => areaLabel(id, hi),
    }),
    [hi, t]
  );

  if (!signedIn) {
    return (
      <Screen>
        <ScrollView contentContainerStyle={styles.pad}>
          <Text variant="display">{hi ? "राशिफल" : "Horoscope"}</Text>
          <Text variant="soft" style={{ marginTop: spacing.sm }}>
            {hi
              ? "सहेजे चार्ट से अंतर्दृष्टि पढ़ने के लिए साइन इन करें, या गुप्त कुंडली बनाएँ।"
              : "Sign in to read insights from a saved chart, or cast an incognito chart."}
          </Text>
          <View style={{ marginTop: spacing.xl, gap: spacing.sm }}>
            <Button
              label={hi ? "गुप्त कुंडली" : "Incognito chart"}
              onPress={() => router.push("/astrology/incognito")}
            />
            <Button
              label={hi ? "खाता" : "Account"}
              variant="ghost"
              onPress={() => router.push("/account")}
            />
          </View>
        </ScrollView>
      </Screen>
    );
  }

  if (loading && !chart) {
    return (
      <Screen>
        <ActivityIndicator
          color={colors.brass}
          style={{ marginTop: spacing.xl }}
        />
      </Screen>
    );
  }

  if (!memberId && !loading) {
    return (
      <Screen>
        <ScrollView contentContainerStyle={styles.pad}>
          <Text variant="display">{hi ? "राशिफल" : "Horoscope"}</Text>
          <Text variant="soft" style={{ marginTop: spacing.sm }}>
            {hi
              ? "पढ़ने के लिए सदस्य चार्ट सहेजें।"
              : "Save a member chart to read horoscope insights."}
          </Text>
          <View style={{ marginTop: spacing.xl, gap: spacing.sm }}>
            <Button
              label={hi ? "सदस्य जोड़ें" : "Add member"}
              onPress={() => router.push("/astrology/members/new")}
            />
            <Button
              label={hi ? "गुप्त कुंडली" : "Incognito chart"}
              variant="ghost"
              onPress={() => router.push("/astrology/incognito")}
            />
          </View>
        </ScrollView>
      </Screen>
    );
  }

  if (error && !chart) {
    return (
      <Screen>
        <EmptyState title={hi ? "त्रुटि" : "Couldn’t load"} body={error} />
      </Screen>
    );
  }

  const areaRow =
    range !== "overall" && predictions.predictions
      ? predictions.predictions.areas[range]
      : null;

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.pad}>
        <Text variant="display">{hi ? "राशिफल" : "Horoscope"}</Text>
        <Text variant="soft" style={{ marginTop: spacing.sm }}>
          {hi
            ? "मार्गदर्शन आपके चार्ट तथ्यों से आता है — कल्पित ग्रह नहीं।"
            : "Guidance is narrated from your chart facts — never invented placements."}
        </Text>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={{ marginTop: spacing.md }}
          contentContainerStyle={{ gap: spacing.xs }}
        >
          {members.map((m) => (
            <Pressable
              key={m.id}
              onPress={() => setMemberId(m.id)}
              style={[
                styles.chip,
                {
                  borderColor:
                    memberId === m.id ? colors.brass : colors.line,
                  backgroundColor:
                    memberId === m.id ? colors.brass + "22" : "transparent",
                },
              ]}
            >
              <Text
                variant="muted"
                style={{
                  color: memberId === m.id ? colors.brassSoft : colors.textMuted,
                }}
              >
                {m.name}
              </Text>
            </Pressable>
          ))}
        </ScrollView>

        <View style={[styles.rangeRow, { borderColor: colors.line }]}>
          {RANGE_TABS.map((tab) => (
            <Pressable
              key={tab}
              onPress={() => setRange(tab)}
              style={[
                styles.rangeTab,
                range === tab && { backgroundColor: colors.brass },
              ]}
            >
              <Text
                variant="muted"
                style={{
                  color: range === tab ? colors.onBrass : colors.textMuted,
                  fontSize: 11,
                }}
              >
                {areaLabel(tab, hi)}
              </Text>
            </Pressable>
          ))}
        </View>

        {predictions.busy && !predictions.predictions ? (
          <PredictionsStatus
            busy
            stage={predictions.stage}
            error={null}
            errorKind={null}
            retryAfterSec={null}
            onRetry={() => void predictions.load()}
          />
        ) : !predictions.predictions ? (
          <View style={{ marginTop: spacing.lg, gap: spacing.sm }}>
            <Text variant="soft">
              {predictions.error ||
                (hi
                  ? "चार्ट तथ्यों से अंतर्दृष्टि बनाएँ।"
                  : "Generate insights from chart facts.")}
            </Text>
            <Button
              label={hi ? "राशिफल बनाएँ" : "Generate horoscope"}
              onPress={() => void predictions.load()}
            />
          </View>
        ) : range === "overall" ? (
          <View style={{ marginTop: spacing.lg }}>
            <PredictionsPanel
              predictions={predictions.predictions}
              featuredArea={featured}
              detailed
              labels={areaLabels}
            />
          </View>
        ) : areaRow ? (
          <View style={{ marginTop: spacing.lg, gap: spacing.sm }}>
            <Text variant="title">
              {areaRow.headline || areaLabel(range, hi)}
            </Text>
            <Text variant="soft">{areaRow.overview}</Text>
            <Text variant="eyebrow">{areaLabels.now}</Text>
            <Text variant="body">{areaRow.now}</Text>
            <Text variant="eyebrow">{areaLabels.nearTerm}</Text>
            <Text variant="body">{areaRow.nearTerm}</Text>
            {areaRow.guidance ? (
              <Text variant="soft" style={{ color: colors.brassSoft }}>
                {areaRow.guidance}
              </Text>
            ) : null}
          </View>
        ) : (
          <Text variant="muted" style={{ marginTop: spacing.lg }}>
            {hi
              ? "इस क्षेत्र के लिए अभी पाठ उपलब्ध नहीं।"
              : "No reading for this area yet."}
          </Text>
        )}

        <Button
          label={hi ? "पूर्ण चार्ट" : "Open full chart"}
          variant="ghost"
          style={{ marginTop: spacing.xl }}
          onPress={() =>
            memberId
              ? router.push(`/astrology/members/${memberId}`)
              : router.push("/(tabs)/astrology")
          }
        />
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  pad: { padding: spacing.lg, paddingBottom: spacing.xxl },
  chip: {
    borderWidth: 1,
    borderRadius: radii.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  rangeRow: {
    marginTop: spacing.md,
    flexDirection: "row",
    flexWrap: "wrap",
    borderWidth: 1,
    borderRadius: radii.sm,
    overflow: "hidden",
  },
  rangeTab: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs + 2,
  },
});

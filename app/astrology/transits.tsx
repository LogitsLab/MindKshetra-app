import React, { useCallback, useEffect, useState } from "react";
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
import { EmptyState } from "@/components/SlokaCard";
import { astrologyApi } from "@/api/endpoints";
import { useAuth } from "@/context/AuthContext";
import { useLanguage } from "@/context/LanguageContext";
import { useTheme } from "@/context/ThemeContext";
import { radii, spacing } from "@/theme/tokens";
import type { AstrologyMember } from "@/types";
import type { ChartPlanet } from "@/types/astrology";

type TransitHit = {
  transitPlanet?: string;
  natalPlanet?: string;
  orb?: number;
};

type TransitSnapshot = {
  asOfDate?: string;
  planets?: Array<{
    id?: string;
    sign?: string;
    degreeInSign?: number;
    retrograde?: boolean;
    house?: number | null;
  }>;
  hits?: TransitHit[];
  emphasis?: string[];
};

export default function TransitsScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const { lang } = useLanguage();
  const { user } = useAuth();
  const hi = lang === "hi";
  const signedIn = Boolean(user && !user.is_anonymous);

  const [members, setMembers] = useState<AstrologyMember[]>([]);
  const [memberId, setMemberId] = useState<string | null>(null);
  const [chart, setChart] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

  const loadMemberChart = useCallback(async (id: string) => {
    setLoading(true);
    setError(null);
    try {
      const cRes = await astrologyApi.chart(id).catch(() =>
        astrologyApi.compute({ memberId: id })
      );
      setChart(cRes.chart ?? null);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!memberId) return;
    void loadMemberChart(memberId);
  }, [memberId, loadMemberChart]);

  if (!signedIn) {
    return (
      <Screen>
        <ScrollView contentContainerStyle={styles.pad}>
          <Text variant="display">{hi ? "गोचर" : "Transits"}</Text>
          <Text variant="soft" style={{ marginTop: spacing.sm }}>
            {hi
              ? "सहेजे चार्ट से गोचर पढ़ने के लिए साइन इन करें।"
              : "Sign in to read transits against a saved natal chart."}
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
          <Text variant="display">{hi ? "गोचर" : "Transits"}</Text>
          <Text variant="soft" style={{ marginTop: spacing.sm }}>
            {hi
              ? "गोचर पढ़ने के लिए सदस्य चार्ट सहेजें।"
              : "Save a member chart to read transit hits."}
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

  const transits = (chart?.transits as TransitSnapshot | undefined) ?? null;
  const natalPlanets = (chart?.planets as ChartPlanet[] | undefined) ?? [];

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.pad}>
        <Text variant="display">{hi ? "गोचर" : "Transits"}</Text>
        <Text variant="soft" style={{ marginTop: spacing.sm }}>
          {hi
            ? "गोचर हिट जन्म कुंडली के विरुद्ध गणना होते हैं।"
            : "Transit hits are computed against a natal chart."}
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
                  color:
                    memberId === m.id ? colors.brassSoft : colors.textMuted,
                }}
              >
                {m.name}
              </Text>
            </Pressable>
          ))}
        </ScrollView>

        {!transits ? (
          <Text variant="muted" style={{ marginTop: spacing.lg }}>
            {hi
              ? "इस चार्ट के लिए गोचर उपलब्ध नहीं।"
              : "No transit snapshot for this chart."}
          </Text>
        ) : (
          <View style={{ marginTop: spacing.lg, gap: spacing.md }}>
            {transits.asOfDate ? (
              <Text variant="muted">
                {hi ? "तिथि" : "As of"} {transits.asOfDate}
              </Text>
            ) : null}

            {(transits.planets ?? []).map((p) => (
              <View
                key={p.id ?? String(p.sign)}
                style={[styles.row, { borderBottomColor: colors.hairline }]}
              >
                <Text variant="body" style={{ flex: 1 }}>
                  {p.id ?? "—"}
                </Text>
                <Text variant="soft" style={{ flex: 1 }}>
                  {p.sign ?? "—"}
                  {p.degreeInSign != null
                    ? ` ${p.degreeInSign.toFixed(1)}°`
                    : ""}
                </Text>
                <Text variant="muted" style={{ width: 36 }}>
                  {p.house != null ? `H${p.house}` : ""}
                </Text>
                <Text variant="muted" style={{ width: 16 }}>
                  {p.retrograde ? "R" : ""}
                </Text>
              </View>
            ))}

            {(transits.hits ?? []).length > 0 ? (
              <View style={{ gap: spacing.xs }}>
                {(transits.hits ?? []).map((h, i) => (
                  <Text key={`${h.transitPlanet}-${h.natalPlanet}-${i}`} variant="soft">
                    {hi ? "गोचर" : "Transit"}: {h.transitPlanet} ≈{" "}
                    {h.natalPlanet}
                    {h.orb != null ? ` (${h.orb}°)` : ""}
                  </Text>
                ))}
              </View>
            ) : (
              <Text variant="muted">
                {hi
                  ? "अभी कोई निकट गोचर हिट नहीं।"
                  : "No close transit hits right now."}
              </Text>
            )}

            {(transits.emphasis ?? []).map((line) => (
              <Text key={line} variant="soft">
                {line}
              </Text>
            ))}

            {natalPlanets.length > 0 ? (
              <Text variant="muted">
                {hi
                  ? `${natalPlanets.length} जन्म ग्रह लोड`
                  : `${natalPlanets.length} natal planets loaded`}
              </Text>
            ) : null}
          </View>
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
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: spacing.xs,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
});

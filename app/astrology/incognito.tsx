import React, { useState } from "react";
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
import { astrologyApi } from "@/api/endpoints";
import { useLanguage } from "@/context/LanguageContext";
import { useMadhav } from "@/context/MadhavContext";
import { useTheme } from "@/context/ThemeContext";
import { radii, spacing } from "@/theme/tokens";

type GeoResult = { label: string; lat: number; lng: number; ianaTz: string };

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
  const [busy, setBusy] = useState(false);
  const [geoBusy, setGeoBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
    if (!place || !/^\d{4}-\d{2}-\d{2}$/.test(dob)) {
      setError(t("astroDobRequired"));
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await astrologyApi.compute({
        dob,
        tob,
        tobUnknown: false,
        placeLabel: place.label,
        lat: place.lat,
        lng: place.lng,
        ianaTz: place.ianaTz,
      });
      setChart(res.chart ?? null);
      if (res.chartSessionId) setChartSession(res.chartSessionId);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  const overview = (chart?.overview as Record<string, unknown> | undefined) ?? undefined;
  const planets = (chart?.planets as unknown[] | undefined) ?? [];

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
              style={[styles.suggest, { borderColor: colors.hairline }]}
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
            <Text variant="eyebrow">{t("astroAtAGlance")}</Text>
            {overview ? (
              <View style={{ marginTop: spacing.sm, gap: 4 }}>
                <Text variant="soft">
                  {t("astroAsc")}: {String(overview.ascendantSign ?? "—")}
                </Text>
                <Text variant="soft">
                  {t("astroMoon")}: {String(overview.moonSign ?? "—")}
                </Text>
                <Text variant="soft">
                  {t("astroSun")}: {String(overview.sunSign ?? "—")}
                </Text>
                {overview.currentMaha ? (
                  <Text variant="soft">
                    {t("astroCurrentDasha")}:{" "}
                    {JSON.stringify(overview.currentMaha)}
                  </Text>
                ) : null}
              </View>
            ) : null}
            {planets.length > 0 ? (
              <View style={{ marginTop: spacing.md }}>
                <Text variant="eyebrow">{t("astroPlanet")}</Text>
                {planets.slice(0, 12).map((p, i) => {
                  const row = p as Record<string, unknown>;
                  return (
                    <Text key={i} variant="muted" style={{ marginTop: 4 }}>
                      {String(row.id ?? row.name ?? "planet")}:{" "}
                      {String(row.sign ?? row.rasi ?? "—")}
                      {row.house != null ? ` · H${row.house}` : ""}
                    </Text>
                  );
                })}
              </View>
            ) : (
              <Text variant="muted" style={{ marginTop: spacing.sm }}>
                {JSON.stringify(
                  {
                    keys: Object.keys(chart),
                    overview: chart.overview,
                  },
                  null,
                  2
                ).slice(0, 800)}
              </Text>
            )}
            <View style={{ marginTop: spacing.lg }}>
              <Button
                label={t("askMadhavAbout")}
                onPress={() => {
                  ask(
                    lang === "hi"
                      ? "इस गुप्त कुंडली के आधार पर आज क्या चिंतन करूँ?"
                      : "What does this session chart suggest I reflect on today?"
                  );
                  router.push("/madhav");
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
});

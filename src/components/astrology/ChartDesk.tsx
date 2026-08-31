import React, { useEffect, useMemo, useState } from "react";
import { Pressable, ScrollView, View } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Text } from "@/components/Text";
import { useLanguage } from "@/context/LanguageContext";
import { useTheme } from "@/context/ThemeContext";
import { radii, spacing } from "@/theme/tokens";
import { ChartOverviewPanel } from "@/components/astrology/ChartOverviewPanel";
import { CircularChart } from "@/components/astrology/CircularChart";
import { NorthIndianChart } from "@/components/astrology/NorthIndianChart";
import { SouthIndianChart } from "@/components/astrology/SouthIndianChart";
import { PlanetSheet } from "@/components/astrology/PlanetSheet";
import { ChartChatPanel } from "@/components/astrology/ChartChatPanel";
import {
  deskChartFromBlob,
  formatDmsInSign,
  vargaOf,
  type ChartStyle,
  type ChartSystem,
  type DeskPlanet,
  type VargaKind,
  type WheelMode,
} from "@/components/astrology/chartModel";
import type { ChartOverview, ChartPlanet } from "@/types/astrology";

const STYLE_KEY = "mindkshetra-astro-chart-style";
const SYSTEM_KEY = "mindkshetra-astro-chart-system";

export type DeskTab =
  | "chart"
  | "dasha"
  | "vargas"
  | "kp"
  | "yogas"
  | "predictions"
  | "chat";

type Props = {
  chart: Record<string, unknown>;
  title: string;
  tab: DeskTab;
  onTab: (tab: DeskTab) => void;
  memberId?: string;
  chartSessionId?: string;
  birth?: Record<string, unknown> | null;
  overview?: ChartOverview | null;
  planets?: ChartPlanet[];
  themeLine?: string | null;
  dashaNode?: React.ReactNode;
  predictionsNode?: React.ReactNode;
};

function Chip({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  const { colors } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      style={{
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm,
        borderRadius: radii.md,
        borderWidth: 1,
        borderColor: colors.line,
        backgroundColor: active ? colors.surfaceHover : colors.surface,
      }}
    >
      <Text
        variant="muted"
        style={{ color: active ? colors.brassSoft : colors.textMuted }}
      >
        {label}
      </Text>
    </Pressable>
  );
}

export function ChartDesk({
  chart,
  title,
  tab,
  onTab,
  memberId,
  chartSessionId,
  birth,
  overview,
  planets = [],
  themeLine,
  dashaNode,
  predictionsNode,
}: Props) {
  const { colors } = useTheme();
  const { lang, t } = useLanguage();
  const desk = useMemo(() => deskChartFromBlob(chart), [chart]);
  const [style, setStyle] = useState<ChartStyle>("circular");
  const [system, setSystem] = useState<ChartSystem>("vedic");
  const [wheel, setWheel] = useState<WheelMode>("rashi");
  const [vargaKind, setVargaKind] = useState<VargaKind>("d1");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [pendingChat, setPendingChat] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      const stored = await AsyncStorage.getItem(STYLE_KEY);
      if (stored === "north" || stored === "south" || stored === "circular") {
        setStyle(stored);
      }
      const sys = await AsyncStorage.getItem(SYSTEM_KEY);
      if (sys === "vedic" || sys === "kp") {
        setSystem(sys);
        setWheel(sys === "kp" ? "bhav" : "rashi");
      }
    })();
  }, []);

  function persistStyle(next: ChartStyle) {
    setStyle(next);
    void AsyncStorage.setItem(STYLE_KEY, next);
  }

  function persistSystem(next: ChartSystem) {
    setSystem(next);
    setWheel(next === "kp" ? "bhav" : "rashi");
    void AsyncStorage.setItem(SYSTEM_KEY, next);
  }

  const labelPlanet = (id: string) => {
    const map: Record<string, { en: string; hi: string }> = {
      sun: { en: "Sun", hi: "सूर्य" },
      moon: { en: "Moon", hi: "चन्द्र" },
      mars: { en: "Mars", hi: "मंगल" },
      mercury: { en: "Mercury", hi: "बुध" },
      jupiter: { en: "Jupiter", hi: "गुरु" },
      venus: { en: "Venus", hi: "शुक्र" },
      saturn: { en: "Saturn", hi: "शनि" },
      rahu: { en: "Rahu", hi: "राहु" },
      ketu: { en: "Ketu", hi: "केतु" },
      ascendant: { en: "Ascendant", hi: "लग्न" },
    };
    const row = map[id];
    return row ? (lang === "hi" ? row.hi : row.en) : id;
  };

  const labelSign = (s: string) =>
    s ? s.charAt(0).toUpperCase() + s.slice(1) : "—";

  const facePlanets: DeskPlanet[] =
    system === "kp" && desk?.kp ? desk.kp.planets : desk?.planets ?? [];
  const faceAsc = desk?.ascendant ?? null;
  const selectedPlanet = selectedId
    ? facePlanets.find((p) => p.id === selectedId) ??
      (selectedId === "ascendant" ? faceAsc : null) ??
      desk?.planets.find((p) => p.id === selectedId) ??
      null
    : null;

  const viewStarters = useMemo(() => {
    if (tab === "kp") return [t("astroStarterKp7"), t("astroStarterLagna")];
    if (tab === "vargas") return [t("astroStarterVarga"), t("astroStarterLagna")];
    if (tab === "dasha") return [t("astroStarterDasha"), t("astroStarterLagna")];
    return [t("astroStarterLagna"), t("astroStarterDasha"), t("astroStarterKp7")];
  }, [tab, t]);

  const tabs: Array<[DeskTab, string]> = [
    ["chart", t("astroTabChart")],
    ["dasha", t("astroTabDasha")],
    ["vargas", t("astroTabVargas")],
    ["kp", t("astroTabKp")],
    ["yogas", t("astroTabYogas")],
    ["predictions", t("astroTabPredictions")],
    ["chat", t("astroTabChat")],
  ];

  const varga = desk ? vargaOf(desk, vargaKind) : null;

  function openChat(prompt?: string) {
    if (prompt) setPendingChat(prompt);
    onTab("chat");
  }

  function renderWheel(planetsIn: DeskPlanet[], asc: DeskPlanet | null, wheelMode: WheelMode) {
    const empty = t("astroChartEmptyTob");
    const gateTob =
      Boolean(desk?.tobUnknown) &&
      (tab === "chart" || (tab === "vargas" && vargaKind === "d1"));
    const common = {
      planets: planetsIn,
      ascendant: asc,
      tobUnknown: gateTob,
      emptyLabel: empty,
      onPlanetPress: setSelectedId,
    };
    if (style === "south") return <SouthIndianChart {...common} />;
    if (style === "north") return <NorthIndianChart {...common} />;
    return (
      <CircularChart
        {...common}
        cusps={desk?.placidusCusps}
        mode={wheelMode}
      />
    );
  }

  if (!desk) return null;

  return (
    <View style={{ gap: spacing.md }}>
      {desk.ephemerisMode && desk.ephemerisMode !== "swiss" ? (
        <Text variant="muted" style={{ color: colors.brassSoft }}>
          {t("astroEpheCaution")}
        </Text>
      ) : (
        <Text variant="muted">
          {desk.ephemerisMode === "swiss" ? t("astroEpheSwiss") : ""}
          {desk.ayanamsa != null ? ` · ${t("astroAyanamsa")} ${desk.ayanamsa.toFixed(4)}°` : ""}
        </Text>
      )}

      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.xs }}>
        {tabs.map(([key, label]) => (
          <Chip key={key} label={label} active={tab === key} onPress={() => onTab(key)} />
        ))}
      </View>

      {tab !== "chat" ? (
        <View
          style={{
            borderWidth: 1,
            borderColor: colors.line,
            borderRadius: radii.md,
            padding: spacing.sm,
            gap: spacing.xs,
          }}
        >
          <Text variant="muted">
            {t("astroChartAttached")}:{" "}
            <Text variant="soft" color={colors.brassSoft}>
              {title}
            </Text>
          </Text>
          <Pressable onPress={() => openChat()}>
            <Text variant="soft" color={colors.brassSoft}>
              {t("astroAskThisChart")}
            </Text>
          </Pressable>
          {viewStarters.map((s) => (
            <Pressable key={s} onPress={() => openChat(s)}>
              <Text variant="muted">{s}</Text>
            </Pressable>
          ))}
        </View>
      ) : null}

      {tab === "chart" || tab === "vargas" || tab === "kp" ? (
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.xs }}>
          <Chip
            label={t("astroSystemVedic")}
            active={system === "vedic"}
            onPress={() => persistSystem("vedic")}
          />
          <Chip
            label={t("astroSystemKp")}
            active={system === "kp"}
            onPress={() => persistSystem("kp")}
          />
          <Chip
            label={t("astroChartStyleCircular")}
            active={style === "circular"}
            onPress={() => persistStyle("circular")}
          />
          <Chip
            label={t("astroChartStyleNorth")}
            active={style === "north"}
            onPress={() => persistStyle("north")}
          />
          <Chip
            label={t("astroChartStyleSouth")}
            active={style === "south"}
            onPress={() => persistStyle("south")}
          />
          {style === "circular" ? (
            <>
              <Chip
                label={t("astroWheelRashi")}
                active={wheel === "rashi"}
                onPress={() => setWheel("rashi")}
              />
              <Chip
                label={t("astroWheelBhav")}
                active={wheel === "bhav"}
                onPress={() => setWheel("bhav")}
              />
              <Chip
                label={t("astroWheelCombine")}
                active={wheel === "combine"}
                onPress={() => setWheel("combine")}
              />
            </>
          ) : null}
        </View>
      ) : null}

      {tab === "chart" ? (
        <View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={{ minWidth: 320 }}>
              {renderWheel(facePlanets, faceAsc, wheel)}
            </View>
          </ScrollView>
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
          <View style={{ marginTop: spacing.md, gap: spacing.xs }}>
            <Text variant="eyebrow">{t("astroPlanet")}</Text>
            {(faceAsc ? [faceAsc, ...facePlanets] : facePlanets).map((p) => (
              <Pressable key={p.id} onPress={() => setSelectedId(p.id)}>
                <Text variant="muted" style={{ marginTop: 4 }}>
                  {labelPlanet(p.id)}: {formatDmsInSign(p.degreeInSign, p.sign)}
                  {p.house != null ? ` · H${p.house}` : ""} · {p.nakshatra}{" "}
                  {t("astroPada")} {p.pada}
                  {p.nakshatraLord ? ` · ${labelPlanet(p.nakshatraLord)}` : ""}
                  {p.retrograde ? " · R" : ""}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>
      ) : null}

      {tab === "dasha" ? dashaNode : null}

      {tab === "vargas" ? (
        <View style={{ gap: spacing.sm }}>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.xs }}>
            {(
              [
                ["d1", t("astroVargaD1")],
                ["d3", t("astroVargaD3")],
                ["d7", t("astroVargaD7")],
                ["d9", t("astroVargaD9")],
                ["d10", t("astroVargaD10")],
                ["d12", t("astroVargaD12")],
              ] as const
            ).map(([kind, label]) => (
              <Chip
                key={kind}
                label={label}
                active={vargaKind === kind}
                onPress={() => setVargaKind(kind)}
              />
            ))}
          </View>
          {varga ? (
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={{ minWidth: 320 }}>
                {renderWheel(varga.planets, varga.ascendant, "rashi")}
              </View>
            </ScrollView>
          ) : (
            <Text variant="muted">—</Text>
          )}
        </View>
      ) : null}

      {tab === "kp" ? (
        desk.kp && !desk.tobUnknown ? (
          <View style={{ gap: spacing.sm }}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={{ minWidth: 320 }}>
                <CircularChart
                  planets={desk.kp.planets}
                  ascendant={desk.ascendant}
                  cusps={desk.placidusCusps}
                  mode="bhav"
                  emptyLabel={t("astroChartEmptyTob")}
                  legend={t("astroWheelBhav")}
                  onPlanetPress={setSelectedId}
                />
              </View>
            </ScrollView>
            {desk.ayanamsaKp != null ? (
              <Text variant="muted">
                {t("astroAyanamsa")} KP {desk.ayanamsaKp.toFixed(4)}°
              </Text>
            ) : null}
            {desk.kp.cusps.map((c) => (
              <Text key={c.house} variant="muted">
                H{c.house} {c.longitude.toFixed(2)}° · {t("astroStarLord")}{" "}
                {c.starLord ? labelPlanet(c.starLord) : "—"} · {t("astroSubLord")}{" "}
                {c.subLord ? labelPlanet(c.subLord) : "—"}
              </Text>
            ))}
            <Text variant="eyebrow" style={{ marginTop: spacing.sm }}>
              {t("astroSignificators")}
            </Text>
            {desk.kp.significators.map((row) => (
              <Text key={row.house} variant="muted">
                H{row.house}: {row.significators.map(labelPlanet).join(", ") || "—"}
              </Text>
            ))}
          </View>
        ) : (
          <Text variant="muted">{t("astroTobBanner")}</Text>
        )
      ) : null}

      {tab === "yogas" ? (
        <View style={{ gap: spacing.sm }}>
          {desk.yogas.filter((y) => y.present).length === 0 ? (
            <Text variant="muted">{t("astroNoPresentYogas")}</Text>
          ) : (
            desk.yogas
              .filter((y) => y.present)
              .map((y) => (
                <View key={y.id} style={{ gap: 2 }}>
                  <Text variant="soft" color={colors.brassSoft}>
                    {y.name}
                  </Text>
                  {y.detail ? <Text variant="muted">{y.detail}</Text> : null}
                </View>
              ))
          )}
        </View>
      ) : null}

      {tab === "predictions" ? predictionsNode : null}

      {tab === "chat" ? (
        <ChartChatPanel
          title={title}
          memberId={memberId}
          chartSessionId={chartSessionId}
          birth={birth}
          starters={viewStarters}
          pendingPrompt={pendingChat}
          onPendingConsumed={() => setPendingChat(null)}
        />
      ) : null}

      <PlanetSheet
        planet={selectedPlanet}
        onClose={() => setSelectedId(null)}
        labelPlanet={labelPlanet}
        labelSign={labelSign}
      />
    </View>
  );
}

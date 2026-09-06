import React, { useEffect, useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { Text } from "@/components/Text";
import { useLanguage } from "@/context/LanguageContext";
import { useTheme } from "@/context/ThemeContext";
import { radii, spacing } from "@/theme/tokens";
import { astrologyApi } from "@/api/endpoints";
import type { HouseReading } from "@/types/astrology";
import {
  formatDmsInSign,
  glyphFor,
  houseLordPlacement,
  type DeskChart,
  type DeskPlanet,
} from "@/components/astrology/chartModel";
import {
  houseStrength,
  type StrengthLevel,
  type StrengthReason,
} from "@/components/astrology/houseStrength";
import { StrengthBadge, strengthWhy } from "@/components/astrology/StrengthMeter";
import { houseSignification } from "@/data/houseSignifications";

type Props = {
  desk: DeskChart;
  labelPlanet: (id: string) => string;
  labelSign: (s: string) => string;
  onPlanetPress: (id: string) => void;
  /** Chart context so the panel can fetch the LLM-reasoned reading. */
  memberId?: string;
  chartSessionId?: string;
  birth?: Record<string, unknown> | null;
};

export function HousesPanel({
  desk,
  labelPlanet,
  labelSign,
  onPlanetPress,
  memberId,
  chartSessionId,
  birth,
}: Props) {
  const { t, lang } = useLanguage();
  const gated = desk.tobUnknown || !desk.ascendant;

  // LLM reading (grounded, cached server-side). While it loads — or if the
  // backend is older and has no /houses route — the deterministic view shows.
  const [readings, setReadings] = useState<Record<number, HouseReading> | null>(null);

  useEffect(() => {
    if (gated) return;
    const hasContext = Boolean(memberId || chartSessionId || birth);
    if (!hasContext) return;
    const controller = new AbortController();
    const body: Record<string, unknown> = { language: lang };
    if (memberId) body.memberId = memberId;
    else if (chartSessionId) {
      body.chartSessionId = chartSessionId;
      if (birth) body.birth = birth;
    } else if (birth) body.birth = birth;

    astrologyApi
      .houses(body, controller.signal)
      .then((res) => {
        if (!res.housesText?.houses) return;
        const map: Record<number, HouseReading> = {};
        for (const h of res.housesText.houses) map[h.house] = h;
        setReadings(map);
      })
      .catch(() => {
        /* stale backend / offline → keep deterministic view */
      });
    return () => controller.abort();
  }, [gated, memberId, chartSessionId, birth, lang]);

  if (gated) {
    return <Text variant="muted">{t("astroTobBanner")}</Text>;
  }

  return (
    <View style={{ gap: spacing.sm }}>
      {Array.from({ length: 12 }, (_, i) => i + 1).map((house) => {
        const occupants = desk.planets.filter((p) => p.house === house);
        const lord = houseLordPlacement(desk, house);
        const strength = houseStrength(house, {
          occupants,
          lordInHouse: lord?.inHouse ?? null,
          dignities: desk.dignities,
          aspects: desk.aspects,
          planets: desk.planets,
        });
        return (
          <HouseCard
            key={house}
            house={house}
            occupants={occupants}
            lord={lord}
            level={strength.level}
            reasons={strength.reasons}
            reading={readings?.[house]}
            labelPlanet={labelPlanet}
            labelSign={labelSign}
            onPlanetPress={onPlanetPress}
          />
        );
      })}
    </View>
  );
}

function HouseCard({
  house,
  occupants,
  lord,
  level,
  reasons,
  reading,
  labelPlanet,
  labelSign,
  onPlanetPress,
}: {
  house: number;
  occupants: DeskPlanet[];
  lord: ReturnType<typeof houseLordPlacement>;
  level: StrengthLevel;
  reasons: StrengthReason[];
  reading?: HouseReading;
  labelPlanet: (id: string) => string;
  labelSign: (s: string) => string;
  onPlanetPress: (id: string) => void;
}) {
  const { t, lang } = useLanguage();
  const { colors } = useTheme();
  const [open, setOpen] = useState(false);
  const sig = houseSignification(house);
  const title = sig ? (lang === "hi" ? sig.title.hi : sig.title.en) : `House ${house}`;

  // Prefer the LLM reading; fall back to the deterministic model.
  const effectiveLevel: StrengthLevel = reading?.strength ?? level;
  const meaning =
    reading?.meaning || (sig ? (lang === "hi" ? sig.meaning.hi : sig.meaning.en) : "");
  const why = reading?.why || strengthWhy(reasons, t, labelPlanet);

  return (
    <View style={[styles.card, { borderColor: colors.line, backgroundColor: colors.panel }]}>
      <View style={styles.headerRow}>
        <Text variant="eyebrow" style={{ color: colors.brassSoft }}>
          {house}
        </Text>
        <Text variant="body" style={styles.title}>
          {title}
        </Text>
        <View style={{ flex: 1 }} />
        <StrengthBadge level={effectiveLevel} />
      </View>

      <Text variant="muted" style={{ marginTop: 2 }}>
        {meaning}
      </Text>

      {occupants.length > 0 ? (
        <View style={styles.chipRow}>
          {occupants.map((p) => (
            <Pressable
              key={p.id}
              onPress={() => onPlanetPress(p.id)}
              style={[styles.planetChip, { borderColor: colors.line, backgroundColor: colors.surface }]}
            >
              <Text variant="muted" style={{ color: colors.brassSoft }}>
                {glyphFor(p.id, p.retrograde)} {labelPlanet(p.id)}
              </Text>
            </Pressable>
          ))}
        </View>
      ) : (
        <Text variant="muted" style={{ marginTop: spacing.xs, fontStyle: "italic" }}>
          {t("astroNoPlanetsHere")}
        </Text>
      )}

      {lord ? (
        <Text variant="muted" style={{ marginTop: spacing.xs }}>
          {t("astroHouseLord")}: {labelPlanet(lord.lord)}
          {lord.inHouse != null ? ` · H${lord.inHouse}` : ""}
          {lord.inSign ? ` (${labelSign(lord.inSign)})` : ""}
        </Text>
      ) : null}

      {why ? (
        <Text variant="muted" style={{ marginTop: spacing.xs, color: colors.textSoft }}>
          {t("astroWhy")}: {why}
        </Text>
      ) : null}

      {occupants.length > 0 ? (
        <>
          <Pressable onPress={() => setOpen((v) => !v)} hitSlop={8} style={{ marginTop: spacing.xs }}>
            <Text variant="muted" style={{ color: colors.brassSoft }}>
              {t("astroDetails")} {open ? "▾" : "▸"}
            </Text>
          </Pressable>
          {open ? (
            <View style={{ marginTop: spacing.xs, gap: 2 }}>
              {occupants.map((p) => (
                <Text key={p.id} variant="muted">
                  {labelPlanet(p.id)}: {formatDmsInSign(p.degreeInSign, labelSign(p.sign))} ·{" "}
                  {p.nakshatra} {t("astroPada")} {p.pada}
                  {p.nakshatraLord ? ` · ${labelPlanet(p.nakshatraLord)}` : ""}
                  {p.retrograde ? " · R" : ""}
                </Text>
              ))}
            </View>
          ) : null}
        </>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: StyleSheet.hairlineWidth * 2,
    borderRadius: radii.md,
    padding: spacing.md,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  title: {
    fontFamily: "Sora_600SemiBold",
    fontSize: 15,
  },
  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.xs,
    marginTop: spacing.sm,
  },
  planetChip: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radii.sm,
    borderWidth: StyleSheet.hairlineWidth * 2,
  },
});

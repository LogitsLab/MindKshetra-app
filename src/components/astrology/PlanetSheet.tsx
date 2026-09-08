import React, { useState } from "react";
import { Modal, Pressable, ScrollView, View } from "react-native";
import { Text } from "@/components/Text";
import { useLanguage } from "@/context/LanguageContext";
import { useTheme } from "@/context/ThemeContext";
import { radii, spacing } from "@/theme/tokens";
import {
  formatDmsInSign,
  type DeskPlanet,
} from "@/components/astrology/chartModel";
import { StrengthBadge, strengthWhy } from "@/components/astrology/StrengthMeter";
import type { Strength } from "@/components/astrology/houseStrength";

type Props = {
  planet: DeskPlanet | null;
  onClose: () => void;
  labelPlanet: (id: string) => string;
  labelSign: (s: string) => string;
  /** Natal strength of this planet (omitted for varga/ascendant). */
  strength?: Strength | null;
  /** Plain-language house context for where the planet sits. */
  houseTitle?: string | null;
  houseMeaning?: string | null;
};

export function PlanetSheet({
  planet,
  onClose,
  labelPlanet,
  labelSign,
  strength,
  houseTitle,
  houseMeaning,
}: Props) {
  const { colors } = useTheme();
  const { t } = useLanguage();
  const [showDetails, setShowDetails] = useState(false);
  if (!planet) return null;

  const rows: Array<[string, string]> = [
    [t("astroLongitude"), `${planet.longitude.toFixed(2)}°`],
    [t("astroSign"), formatDmsInSign(planet.degreeInSign, labelSign(planet.sign))],
    [t("astroNakshatra"), `${planet.nakshatra} · ${t("astroPada")} ${planet.pada}`],
    [
      t("astroNakshatraLord"),
      planet.nakshatraLord ? labelPlanet(planet.nakshatraLord) : "—",
    ],
    [t("astroHouse"), planet.house != null ? String(planet.house) : "—"],
  ];
  if (planet.starLord) {
    rows.push([t("astroStarLord"), labelPlanet(planet.starLord)]);
  }
  if (planet.subLord) {
    rows.push([t("astroSubLord"), labelPlanet(planet.subLord)]);
  }

  const why = strength ? strengthWhy(strength.reasons, t, labelPlanet) : "";

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <Pressable
        onPress={onClose}
        style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.4)", justifyContent: "flex-end" }}
      >
        <Pressable
          onPress={(e) => e.stopPropagation()}
          style={{
            maxHeight: "85%",
            backgroundColor: colors.panelStrong,
            borderTopLeftRadius: radii.lg,
            borderTopRightRadius: radii.lg,
            borderWidth: 1,
            borderColor: colors.line,
            padding: spacing.lg,
          }}
        >
          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <Text variant="title" color={colors.brassSoft}>
              {labelPlanet(planet.id)}
              {planet.retrograde ? "  R" : ""}
            </Text>
            <Pressable onPress={onClose} hitSlop={12}>
              <Text variant="muted">{t("astroClose")}</Text>
            </Pressable>
          </View>

          <ScrollView style={{ marginTop: spacing.md }}>
            {strength ? (
              <View style={{ marginBottom: spacing.md, gap: spacing.xs }}>
                <StrengthBadge level={strength.level} />
                {why ? (
                  <Text variant="soft" style={{ color: colors.textSoft }}>
                    {why}
                  </Text>
                ) : null}
              </View>
            ) : null}

            {houseMeaning ? (
              <View style={{ marginBottom: spacing.md }}>
                <Text variant="eyebrow">
                  {planet.house != null ? `H${planet.house}` : ""} {houseTitle ?? ""}
                </Text>
                <Text variant="soft" style={{ marginTop: 2 }}>
                  {houseMeaning}
                </Text>
              </View>
            ) : null}

            <Pressable onPress={() => setShowDetails((v) => !v)} hitSlop={8}>
              <Text variant="muted" style={{ color: colors.brassSoft }}>
                {t("astroDetails")} {showDetails ? "▾" : "▸"}
              </Text>
            </Pressable>

            {showDetails ? (
              <View style={{ marginTop: spacing.sm }}>
                {rows.map(([label, value]) => (
                  <View key={label} style={{ marginBottom: spacing.sm }}>
                    <Text variant="eyebrow">{label}</Text>
                    <Text variant="soft" style={{ marginTop: 2 }}>
                      {value}
                    </Text>
                  </View>
                ))}
              </View>
            ) : null}
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

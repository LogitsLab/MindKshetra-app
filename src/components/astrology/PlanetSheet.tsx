import React from "react";
import { Modal, Pressable, ScrollView, View } from "react-native";
import { Text } from "@/components/Text";
import { useTheme } from "@/context/ThemeContext";
import { radii, spacing } from "@/theme/tokens";
import {
  formatDmsInSign,
  type DeskPlanet,
} from "@/components/astrology/chartModel";

type Props = {
  planet: DeskPlanet | null;
  onClose: () => void;
  labelPlanet: (id: string) => string;
  labelSign: (s: string) => string;
};

export function PlanetSheet({ planet, onClose, labelPlanet, labelSign }: Props) {
  const { colors } = useTheme();
  if (!planet) return null;

  const rows: Array<[string, string]> = [
    ["Longitude", `${planet.longitude.toFixed(2)}°`],
    ["Sign", formatDmsInSign(planet.degreeInSign, labelSign(planet.sign))],
    ["Nakshatra", `${planet.nakshatra} · pada ${planet.pada}`],
    [
      "Nakshatra lord",
      planet.nakshatraLord ? labelPlanet(planet.nakshatraLord) : "—",
    ],
    ["House", planet.house != null ? String(planet.house) : "—"],
  ];
  if (planet.starLord) {
    rows.push(["Star lord", labelPlanet(planet.starLord)]);
  }
  if (planet.subLord) {
    rows.push(["Sub lord", labelPlanet(planet.subLord)]);
  }

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
              <Text variant="muted">Close</Text>
            </Pressable>
          </View>
          <ScrollView style={{ marginTop: spacing.md }}>
            {rows.map(([label, value]) => (
              <View key={label} style={{ marginBottom: spacing.sm }}>
                <Text variant="eyebrow">{label}</Text>
                <Text variant="soft" style={{ marginTop: 2 }}>
                  {value}
                </Text>
              </View>
            ))}
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

import React from "react";
import { View } from "react-native";
import { Text } from "@/components/Text";
import { useTheme } from "@/context/ThemeContext";
import { spacing } from "@/theme/tokens";
import {
  formatDashaLord,
  type ChartOverview,
  type ChartPlanet,
} from "@/types/astrology";

type Props = {
  overview?: ChartOverview | null;
  planets?: ChartPlanet[];
  tobUnknown?: boolean;
  themeLine?: string | null;
  labels: {
    asc: string;
    moon: string;
    sun: string;
    dasha: string;
    planet: string;
    tobUnknown: string;
    atAGlance: string;
  };
};

export function ChartOverviewPanel({
  overview,
  planets = [],
  tobUnknown,
  themeLine,
  labels,
}: Props) {
  const { colors } = useTheme();

  return (
    <View style={{ gap: spacing.sm }}>
      <Text variant="eyebrow">{labels.atAGlance}</Text>
      {tobUnknown ? (
        <Text variant="muted" style={{ color: colors.brassSoft }}>
          {labels.tobUnknown}
        </Text>
      ) : null}
      {themeLine ? (
        <Text variant="soft" style={{ marginTop: spacing.xs }}>
          {themeLine}
        </Text>
      ) : null}
      {overview ? (
        <View style={{ gap: 4, marginTop: spacing.xs }}>
          <Text variant="soft">
            {labels.asc}: {String(overview.ascendantSign ?? "—")}
          </Text>
          <Text variant="soft">
            {labels.moon}: {String(overview.moonSign ?? "—")}
          </Text>
          <Text variant="soft">
            {labels.sun}: {String(overview.sunSign ?? "—")}
          </Text>
          <Text variant="soft">
            {labels.dasha}: {formatDashaLord(overview.currentMaha)}
            {overview.currentAntar?.lord
              ? ` · ${formatDashaLord(overview.currentAntar)}`
              : ""}
          </Text>
        </View>
      ) : (
        <Text variant="muted">—</Text>
      )}
      {planets.length > 0 ? (
        <View style={{ marginTop: spacing.md }}>
          <Text variant="eyebrow">{labels.planet}</Text>
          {planets.slice(0, 14).map((row, i) => (
            <Text key={i} variant="muted" style={{ marginTop: 4 }}>
              {String(row.id ?? row.name ?? "p")}: {String(row.sign ?? "—")}
              {row.house != null ? ` · H${row.house}` : ""}
              {row.nakshatra ? ` · ${row.nakshatra}` : ""}
              {row.retrograde ? " · R" : ""}
            </Text>
          ))}
        </View>
      ) : null}
    </View>
  );
}

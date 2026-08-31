import React from "react";
import { View } from "react-native";
import Svg, { Line, Polygon, Rect, Text as SvgText } from "react-native-svg";
import { Text } from "@/components/Text";
import { useTheme } from "@/context/ThemeContext";
import { spacing } from "@/theme/tokens";
import { glyphFor, type DeskPlanet } from "@/components/astrology/chartModel";

const CENTROIDS: Record<number, { x: number; y: number }> = {
  1: { x: 50, y: 22 },
  2: { x: 22, y: 12 },
  3: { x: 12, y: 38 },
  4: { x: 22, y: 72 },
  5: { x: 50, y: 88 },
  6: { x: 78, y: 72 },
  7: { x: 78, y: 50 },
  8: { x: 88, y: 28 },
  9: { x: 72, y: 12 },
  10: { x: 50, y: 62 },
  11: { x: 28, y: 28 },
  12: { x: 28, y: 50 },
};

const HOUSE_NUM: Record<number, { x: number; y: number }> = {
  1: { x: 50, y: 8 },
  2: { x: 14, y: 8 },
  3: { x: 6, y: 38 },
  4: { x: 14, y: 92 },
  5: { x: 50, y: 96 },
  6: { x: 86, y: 92 },
  7: { x: 94, y: 50 },
  8: { x: 94, y: 14 },
  9: { x: 78, y: 6 },
  10: { x: 50, y: 52 },
  11: { x: 22, y: 18 },
  12: { x: 18, y: 52 },
};

const SIZE = 320;

type Props = {
  planets: DeskPlanet[];
  ascendant: DeskPlanet | null;
  tobUnknown?: boolean;
  emptyLabel: string;
  legend?: string;
  onPlanetPress?: (id: string) => void;
};

export function NorthIndianChart({
  planets,
  ascendant,
  tobUnknown,
  emptyLabel,
  legend,
  onPlanetPress,
}: Props) {
  const { colors } = useTheme();

  if (tobUnknown && !ascendant) {
    return (
      <View
        style={{
          aspectRatio: 1,
          maxWidth: SIZE,
          borderWidth: 1,
          borderColor: colors.line,
          alignItems: "center",
          justifyContent: "center",
          padding: spacing.md,
        }}
      >
        <Text variant="muted" style={{ textAlign: "center" }}>
          {emptyLabel}
        </Text>
      </View>
    );
  }

  const byHouse: Record<number, Array<{ id: string; glyph: string }>> = {};
  for (let h = 1; h <= 12; h++) byHouse[h] = [];
  if (ascendant?.house) {
    byHouse[ascendant.house].push({ id: "ascendant", glyph: "As" });
  }
  for (const p of planets) {
    if (p.house) {
      byHouse[p.house].push({ id: p.id, glyph: glyphFor(p.id, p.retrograde) });
    }
  }

  return (
    <View>
      <Svg width="100%" height={SIZE} viewBox="0 0 100 100">
        <Rect
          x="0.5"
          y="0.5"
          width="99"
          height="99"
          fill={colors.panel}
          stroke={colors.brass}
          strokeWidth="0.8"
        />
        <Line x1="0" y1="0" x2="100" y2="100" stroke={colors.line} strokeWidth="0.4" />
        <Line x1="100" y1="0" x2="0" y2="100" stroke={colors.line} strokeWidth="0.4" />
        <Line x1="50" y1="0" x2="0" y2="50" stroke={colors.line} strokeWidth="0.4" />
        <Line x1="50" y1="0" x2="100" y2="50" stroke={colors.line} strokeWidth="0.4" />
        <Line x1="0" y1="50" x2="50" y2="100" stroke={colors.line} strokeWidth="0.4" />
        <Line x1="100" y1="50" x2="50" y2="100" stroke={colors.line} strokeWidth="0.4" />
        <Polygon
          points="50,0 100,50 50,100 0,50"
          fill="none"
          stroke={colors.brass}
          strokeWidth="0.7"
        />
        {Object.entries(HOUSE_NUM).map(([house, c]) => (
          <SvgText
            key={`hn-${house}`}
            x={c.x}
            y={c.y + 1}
            textAnchor="middle"
            fontSize="2.6"
            fill={colors.textMuted}
          >
            {house}
          </SvgText>
        ))}
        {Object.entries(byHouse).map(([house, items]) => {
          const c = CENTROIDS[Number(house)];
          if (!c || items.length === 0) return null;
          const lineH = 3.4;
          const startY = c.y - ((items.length - 1) * lineH) / 2;
          return items.map((item, i) => (
            <SvgText
              key={`${house}-${item.id}-${i}`}
              x={c.x}
              y={startY + i * lineH + 1}
              textAnchor="middle"
              fontSize="3.1"
              fill={colors.brassSoft}
              onPress={onPlanetPress ? () => onPlanetPress(item.id) : undefined}
            >
              {item.glyph}
            </SvgText>
          ));
        })}
      </Svg>
      {legend ? (
        <Text variant="muted" style={{ marginTop: spacing.xs }}>
          {legend}
        </Text>
      ) : null}
    </View>
  );
}

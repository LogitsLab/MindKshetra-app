import React from "react";
import { Pressable, View } from "react-native";
import { Text } from "@/components/Text";
import { useTheme } from "@/context/ThemeContext";
import { spacing } from "@/theme/tokens";
import {
  SIGN_ABBR,
  SIGNS,
  glyphFor,
  type DeskPlanet,
} from "@/components/astrology/chartModel";

const SI_CELLS: Array<{ signIndex: number; col: number; row: number }> = [
  { signIndex: 11, col: 1, row: 1 },
  { signIndex: 0, col: 2, row: 1 },
  { signIndex: 1, col: 3, row: 1 },
  { signIndex: 2, col: 4, row: 1 },
  { signIndex: 10, col: 1, row: 2 },
  { signIndex: 3, col: 4, row: 2 },
  { signIndex: 9, col: 1, row: 3 },
  { signIndex: 4, col: 4, row: 3 },
  { signIndex: 8, col: 1, row: 4 },
  { signIndex: 7, col: 2, row: 4 },
  { signIndex: 6, col: 3, row: 4 },
  { signIndex: 5, col: 4, row: 4 },
];

type Props = {
  planets: DeskPlanet[];
  ascendant: DeskPlanet | null;
  tobUnknown?: boolean;
  emptyLabel: string;
  legend?: string;
  onPlanetPress?: (id: string) => void;
};

export function SouthIndianChart({
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
          maxWidth: 320,
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

  const bySign: Record<number, Array<{ id: string; glyph: string }>> = {};
  for (let i = 0; i < 12; i++) bySign[i] = [];
  if (ascendant) {
    bySign[ascendant.signIndex].push({ id: "ascendant", glyph: "As" });
  }
  for (const p of planets) {
    bySign[p.signIndex]?.push({ id: p.id, glyph: glyphFor(p.id, p.retrograde) });
  }
  const lagnaSign = ascendant?.signIndex ?? -1;

  return (
    <View>
      <View
        style={{
          aspectRatio: 1,
          maxWidth: 320,
          borderWidth: 1,
          borderColor: colors.brass,
          backgroundColor: colors.panel,
        }}
      >
        {SI_CELLS.map(({ signIndex, col, row }) => {
          const sign = SIGNS[signIndex];
          const items = bySign[signIndex] ?? [];
          const isLagna = signIndex === lagnaSign;
          return (
            <View
              key={signIndex}
              style={{
                position: "absolute",
                left: `${(col - 1) * 25}%`,
                top: `${(row - 1) * 25}%`,
                width: "25%",
                height: "25%",
                borderWidth: 0.5,
                borderColor: colors.line,
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: isLagna ? "rgba(201,162,39,0.12)" : "transparent",
                padding: 4,
              }}
            >
              <Text
                variant="muted"
                style={{
                  position: "absolute",
                  left: 4,
                  top: 2,
                  fontSize: 9,
                  lineHeight: 12,
                }}
              >
                {SIGN_ABBR[sign]}
              </Text>
              <View
                style={{
                  flexDirection: "row",
                  flexWrap: "wrap",
                  justifyContent: "center",
                  gap: 4,
                  paddingTop: 10,
                }}
              >
                {items.map((item, i) => (
                  <Pressable
                    key={`${item.id}-${i}`}
                    onPress={onPlanetPress ? () => onPlanetPress(item.id) : undefined}
                  >
                    <Text variant="soft" style={{ color: colors.brassSoft, fontSize: 12 }}>
                      {item.glyph}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>
          );
        })}
        <View
          style={{
            position: "absolute",
            left: "25%",
            top: "25%",
            width: "50%",
            height: "50%",
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: colors.panel,
            borderWidth: 0.5,
            borderColor: colors.line,
          }}
        >
          <Text variant="eyebrow">Rasi</Text>
        </View>
      </View>
      {legend ? (
        <Text variant="muted" style={{ marginTop: spacing.xs }}>
          {legend}
        </Text>
      ) : null}
    </View>
  );
}

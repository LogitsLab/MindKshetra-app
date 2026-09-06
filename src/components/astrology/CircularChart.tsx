import React from "react";
import { View } from "react-native";
import Svg, { Circle, G, Line, Path, Polygon, Text as SvgText } from "react-native-svg";
import { Text } from "@/components/Text";
import { useTheme } from "@/context/ThemeContext";
import { spacing } from "@/theme/tokens";
import {
  SIGN_ABBR,
  SIGNS,
  glyphFor,
  type DeskCusp,
  type DeskPlanet,
  type WheelMode,
} from "@/components/astrology/chartModel";

const CX = 50;
const CY = 50;
const OUTER = 46;
const INNER = 18;
const LABEL_R = 41;
const PLANET_R = 32;
const SIZE = 320;

function polar(lon: number, r: number) {
  const rad = ((180 + lon) * Math.PI) / 180;
  return { x: CX + r * Math.cos(rad), y: CY - r * Math.sin(rad) };
}

function wedgePath(startLon: number, endLon: number, rInner: number, rOuter: number) {
  const a0 = polar(startLon, rOuter);
  const a1 = polar(endLon, rOuter);
  const b1 = polar(endLon, rInner);
  const b0 = polar(startLon, rInner);
  return `M ${a0.x.toFixed(3)} ${a0.y.toFixed(3)} A ${rOuter} ${rOuter} 0 0 1 ${a1.x.toFixed(3)} ${a1.y.toFixed(3)} L ${b1.x.toFixed(3)} ${b1.y.toFixed(3)} A ${rInner} ${rInner} 0 0 0 ${b0.x.toFixed(3)} ${b0.y.toFixed(3)} Z`;
}

type Props = {
  planets: DeskPlanet[];
  ascendant: DeskPlanet | null;
  cusps?: DeskCusp[];
  mode?: WheelMode;
  tobUnknown?: boolean;
  emptyLabel: string;
  legend?: string;
  onPlanetPress?: (id: string) => void;
};

export function CircularChart({
  planets,
  ascendant,
  cusps = [],
  mode = "rashi",
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

  const showBhav = (mode === "bhav" || mode === "combine") && cusps.length > 0;
  const showRashi = mode !== "bhav" || !showBhav;
  const lagnaLon = ascendant?.longitude ?? cusps[0]?.longitude ?? null;
  const lagnaSign =
    ascendant?.signIndex ??
    (lagnaLon != null ? Math.floor((((lagnaLon % 360) + 360) % 360) / 30) : -1);

  const bodies: Array<{ id: string; longitude: number; glyph: string }> = [];
  if (ascendant && lagnaLon != null) {
    bodies.push({ id: "ascendant", longitude: lagnaLon, glyph: "As" });
  }
  for (const p of planets) {
    bodies.push({
      id: p.id,
      longitude: p.longitude,
      glyph: glyphFor(p.id, p.retrograde),
    });
  }

  const buckets = new Map<string, typeof bodies>();
  for (const b of bodies) {
    const key = String(Math.round(b.longitude * 2) / 2);
    const arr = buckets.get(key) ?? [];
    arr.push(b);
    buckets.set(key, arr);
  }

  return (
    <View>
      <Svg width="100%" height={SIZE} viewBox="0 0 100 100">
        <Circle
          cx={CX}
          cy={CY}
          r={OUTER}
          fill={colors.panel}
          stroke={colors.brass}
          strokeWidth="0.7"
        />
        <Circle
          cx={CX}
          cy={CY}
          r={INNER}
          fill={colors.void}
          stroke={colors.line}
          strokeWidth="0.35"
        />
        {showRashi
          ? SIGNS.map((sign, i) => {
              const start = i * 30;
              const mid = start + 15;
              const label = polar(mid, LABEL_R);
              const isLagna = i === lagnaSign;
              return (
                <G key={sign}>
                  <Path
                    d={wedgePath(start, start + 30, INNER, OUTER)}
                    fill={isLagna ? colors.brass : "transparent"}
                    fillOpacity={isLagna ? 0.12 : 0}
                    stroke={colors.line}
                    strokeWidth="0.35"
                  />
                  <SvgText
                    x={label.x}
                    y={label.y + 1}
                    textAnchor="middle"
                    fontSize="2.6"
                    fill={colors.textMuted}
                  >
                    {SIGN_ABBR[sign]}
                  </SvgText>
                </G>
              );
            })
          : null}
        {showBhav
          ? cusps.map((c, i) => {
              const next = cusps[(i + 1) % cusps.length];
              const start = c.longitude;
              let span = (next.longitude - start + 360) % 360;
              if (span < 1) span = 30;
              const mid = (start + span / 2) % 360;
              const tick = polar(start, OUTER);
              const tickIn = polar(start, mode === "combine" ? OUTER - 5 : INNER);
              const num = polar(mid, mode === "bhav" ? (INNER + OUTER) / 2 : OUTER - 8);
              return (
                <G key={`h-${c.house}`}>
                  {mode === "bhav" ? (
                    <Path
                      d={wedgePath(start, start + span, INNER, OUTER)}
                      fill="transparent"
                      stroke={colors.brass}
                      strokeWidth="0.45"
                      strokeOpacity="0.55"
                    />
                  ) : (
                    <Line
                      x1={tickIn.x}
                      y1={tickIn.y}
                      x2={tick.x}
                      y2={tick.y}
                      stroke={colors.brassSoft}
                      strokeWidth="0.7"
                    />
                  )}
                  <SvgText
                    x={num.x}
                    y={num.y + 1}
                    textAnchor="middle"
                    fontSize="2.4"
                    fill={colors.brassSoft}
                  >
                    {String(c.house)}
                  </SvgText>
                </G>
              );
            })
          : null}
        {lagnaLon != null
          ? (() => {
              const tip = polar(lagnaLon, OUTER + 5.5);
              const left = polar(lagnaLon - 4, OUTER + 1.2);
              const right = polar(lagnaLon + 4, OUTER + 1.2);
              return (
                <Polygon
                  points={`${tip.x},${tip.y} ${left.x},${left.y} ${right.x},${right.y}`}
                  fill={colors.brass}
                />
              );
            })()
          : null}
        {Array.from(buckets.values()).flatMap((cluster) =>
          cluster.map((item, i) => {
            const slot = i - (cluster.length - 1) / 2;
            const r = PLANET_R - slot * 4.2;
            const pt = polar(item.longitude, r);
            return (
              <SvgText
                key={`${item.id}-${i}`}
                x={pt.x}
                y={pt.y + 1}
                textAnchor="middle"
                fontSize="3.2"
                fontWeight={item.id === "ascendant" ? "600" : "400"}
                fill={colors.brassSoft}
                onPress={onPlanetPress ? () => onPlanetPress(item.id) : undefined}
              >
                {item.glyph}
              </SvgText>
            );
          })
        )}
        <SvgText
          x={CX}
          y={CY + 1}
          textAnchor="middle"
          fontSize="2.4"
          fill={colors.textMuted}
        >
          {mode === "bhav" ? "Bhav" : mode === "combine" ? "Mix" : "Rasi"}
        </SvgText>
      </Svg>
      {legend ? (
        <Text variant="muted" style={{ marginTop: spacing.xs }}>
          {legend}
        </Text>
      ) : null}
    </View>
  );
}

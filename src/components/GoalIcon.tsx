import React from "react";
import Svg, { Circle, Path } from "react-native-svg";
import type { GoalId } from "@/data/personalization";

type Props = {
  id: GoalId;
  color: string;
  size?: number;
};

/** Distinct line icons for onboarding goals (replaces ambiguous glyphs). */
export function GoalIcon({ id, color, size = 26 }: Props) {
  switch (id) {
    case "inner_peace":
      return (
        <Svg width={size} height={size} viewBox="0 0 28 28" fill="none">
          <Circle cx="14" cy="14" r="9" stroke={color} strokeWidth="1.4" />
          <Path
            d="M14 5v18M5 14c3.5 2.5 6.5 2.5 9 0s5.5-2.5 9 0"
            stroke={color}
            strokeWidth="1.3"
            strokeLinecap="round"
          />
        </Svg>
      );
    case "stress_relief":
      return (
        <Svg width={size} height={size} viewBox="0 0 28 28" fill="none">
          <Path
            d="M4 10c2.5-3 5-3 7.5 0s5 3 7.5 0 5-3 7.5 0"
            stroke={color}
            strokeWidth="1.4"
            strokeLinecap="round"
          />
          <Path
            d="M4 16c2.5-3 5-3 7.5 0s5 3 7.5 0 5-3 7.5 0"
            stroke={color}
            strokeWidth="1.4"
            strokeLinecap="round"
            opacity={0.7}
          />
          <Path
            d="M4 22c2.5-3 5-3 7.5 0s5 3 7.5 0 5-3 7.5 0"
            stroke={color}
            strokeWidth="1.4"
            strokeLinecap="round"
            opacity={0.4}
          />
        </Svg>
      );
    case "self_realization":
      return (
        <Svg width={size} height={size} viewBox="0 0 28 28" fill="none">
          <Circle cx="14" cy="14" r="4" stroke={color} strokeWidth="1.4" />
          <Circle cx="14" cy="14" r="9" stroke={color} strokeWidth="1.2" opacity={0.55} />
          <Path
            d="M14 3v3M14 22v3M3 14h3M22 14h3"
            stroke={color}
            strokeWidth="1.3"
            strokeLinecap="round"
          />
        </Svg>
      );
    case "devotion":
      return (
        <Svg width={size} height={size} viewBox="0 0 28 28" fill="none">
          <Path
            d="M14 24c-5.5-4-8.5-8-8.5-12.5a5.5 5.5 0 0111 0 5.5 5.5 0 0111 0C27.5 16 24.5 20 14 24z"
            stroke={color}
            strokeWidth="1.4"
            strokeLinejoin="round"
          />
          <Path
            d="M14 9.5c0 2 .8 3.2 2.2 4"
            stroke={color}
            strokeWidth="1.2"
            strokeLinecap="round"
            opacity={0.6}
          />
        </Svg>
      );
    case "purpose":
      return (
        <Svg width={size} height={size} viewBox="0 0 28 28" fill="none">
          <Circle cx="14" cy="14" r="3.5" stroke={color} strokeWidth="1.4" />
          <Circle cx="14" cy="14" r="8" stroke={color} strokeWidth="1.2" opacity={0.5} />
          <Path
            d="M14 2v4M14 22v4M2 14h4M22 14h4"
            stroke={color}
            strokeWidth="1.3"
            strokeLinecap="round"
          />
        </Svg>
      );
    case "healing":
      return (
        <Svg width={size} height={size} viewBox="0 0 28 28" fill="none">
          <Path
            d="M14 4v20M8 10h12M10 22c2-4 3.5-6 4-6s2 2 4 6"
            stroke={color}
            strokeWidth="1.4"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <Path
            d="M9 8c1.5-2 3-3 5-3s3.5 1 5 3"
            stroke={color}
            strokeWidth="1.2"
            strokeLinecap="round"
            opacity={0.55}
          />
        </Svg>
      );
    case "knowledge":
      return (
        <Svg width={size} height={size} viewBox="0 0 28 28" fill="none">
          <Path
            d="M5 7.5c3-.8 5.5-.8 9 1.2 3.5-2 6-2 9-1.2v14c-3-.8-5.5-.8-9 1.2-3.5-2-6-2-9-1.2v-14z"
            stroke={color}
            strokeWidth="1.35"
            strokeLinejoin="round"
          />
          <Path d="M14 8.7v14" stroke={color} strokeWidth="1.2" opacity={0.5} />
        </Svg>
      );
    case "relationships":
      return (
        <Svg width={size} height={size} viewBox="0 0 28 28" fill="none">
          <Circle cx="10" cy="11" r="4" stroke={color} strokeWidth="1.35" />
          <Circle cx="18.5" cy="11" r="4" stroke={color} strokeWidth="1.35" />
          <Path
            d="M4.5 22c1.2-4 3.5-6 5.5-6s3.5 1.2 4.5 3.5c1-2.3 2.8-3.5 4.5-3.5s4.3 2 5.5 6"
            stroke={color}
            strokeWidth="1.3"
            strokeLinecap="round"
          />
        </Svg>
      );
    case "other":
    default:
      return (
        <Svg width={size} height={size} viewBox="0 0 28 28" fill="none">
          <Circle cx="7" cy="14" r="2" fill={color} />
          <Circle cx="14" cy="14" r="2" fill={color} />
          <Circle cx="21" cy="14" r="2" fill={color} />
        </Svg>
      );
  }
}

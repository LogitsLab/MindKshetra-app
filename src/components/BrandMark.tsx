import React from "react";
import Svg, { Circle, Path } from "react-native-svg";
import { useTheme } from "@/context/ThemeContext";

type Props = {
  size?: number;
};

/** Lotus/leaf brand mark — ports public/brand/mark.svg */
export function BrandMark({ size = 28 }: Props) {
  const { colors } = useTheme();
  return (
    <Svg width={size} height={size} viewBox="0 0 64 64" fill="none">
      <Circle
        cx="32"
        cy="32"
        r="30"
        stroke={colors.brass}
        strokeWidth="1"
        opacity={0.45}
      />
      <Circle
        cx="32"
        cy="32"
        r="22"
        stroke={colors.brass}
        strokeWidth="0.75"
        opacity={0.3}
      />
      <Path
        d="M32 14c2.8 6.2 8.5 10.5 15.2 11.8C40.5 28.2 36 34.4 34.2 41.2 32.8 34.2 28.2 28.4 21.5 25.8 27.8 24.2 32.2 19.8 32 14z"
        fill={colors.brass}
        opacity={0.85}
      />
      <Path
        d="M32 22c1.6 3.6 4.9 6.1 8.8 6.9-3.9 1.3-6.6 4.8-7.6 8.8-.8-4.1-3.5-7.5-7.4-9 3.8-1 6.9-3.5 6.2-6.7z"
        fill={colors.brassSoft}
        opacity={0.7}
      />
      <Path
        d="M18 46h28"
        stroke={colors.brass}
        strokeWidth="1"
        opacity={0.5}
      />
      <Path
        d="M22 50h20"
        stroke={colors.brass}
        strokeWidth="0.75"
        opacity={0.35}
      />
    </Svg>
  );
}

/** Ports public/brand/madhav.svg — crowned figure (not a map pin). */
export function MadhavMark({ size = 28 }: Props) {
  const { colors } = useTheme();
  return (
    <Svg width={size} height={size} viewBox="0 0 80 80" fill="none">
      <Circle
        cx="40"
        cy="40"
        r="38"
        stroke={colors.onBrass}
        strokeWidth="1"
        opacity={0.35}
      />
      <Circle
        cx="40"
        cy="40"
        r="30"
        fill="rgba(7,9,15,0.12)"
        stroke={colors.onBrass}
        strokeWidth="1"
        opacity={0.7}
      />
      <Circle cx="40" cy="34" r="11" stroke={colors.onBrass} strokeWidth="1.6" />
      <Path
        d="M22 62c3-12 9.5-18 18-18s15 6 18 18"
        stroke={colors.onBrass}
        strokeWidth="1.6"
        strokeLinecap="round"
      />
      <Path
        d="M40 14v5M33 16.5l2.5 3.5M47 16.5l-2.5 3.5"
        stroke={colors.onBrass}
        strokeWidth="1.2"
        opacity={0.75}
      />
      <Circle cx="40" cy="13" r="2" fill={colors.onBrass} />
    </Svg>
  );
}

type TabIconProps = { focused: boolean; size?: number };

export function TabHomeIcon({ focused, size = 22 }: TabIconProps) {
  const { colors } = useTheme();
  const c = focused ? colors.brassSoft : colors.textMuted;
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M4 11.5L12 5l8 6.5V20a1 1 0 01-1 1h-5v-6H10v6H5a1 1 0 01-1-1v-8.5z"
        stroke={c}
        strokeWidth="1.5"
      />
    </Svg>
  );
}

export function TabExploreIcon({ focused, size = 22 }: TabIconProps) {
  const { colors } = useTheme();
  const c = focused ? colors.brassSoft : colors.textMuted;
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx="12" cy="12" r="8" stroke={c} strokeWidth="1.5" />
      <Path d="M12 4v16M4 12h16" stroke={c} strokeWidth="1.2" opacity={0.6} />
    </Svg>
  );
}

export function TabMoodIcon({ focused, size = 22 }: TabIconProps) {
  const { colors } = useTheme();
  const c = focused ? colors.brassSoft : colors.textMuted;
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx="12" cy="12" r="8" stroke={c} strokeWidth="1.5" />
      <Path
        d="M8.5 14.5c1.2 1.4 2.7 2 3.5 2s2.3-.6 3.5-2"
        stroke={c}
        strokeWidth="1.4"
        strokeLinecap="round"
      />
      <Circle cx="9" cy="10" r="1" fill={c} />
      <Circle cx="15" cy="10" r="1" fill={c} />
    </Svg>
  );
}

export function TabAstrologyIcon({ focused, size = 22 }: TabIconProps) {
  const { colors } = useTheme();
  const c = focused ? colors.brassSoft : colors.textMuted;
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx="12" cy="12" r="7" stroke={c} strokeWidth="1.5" />
      <Path d="M12 5v2M12 17v2M5 12h2M17 12h2" stroke={c} strokeWidth="1.2" />
      <Circle cx="12" cy="12" r="2" fill={c} opacity={0.7} />
    </Svg>
  );
}

import React from "react";
import Svg, { Circle, G, Path } from "react-native-svg";
import { useTheme } from "@/context/ThemeContext";
import type { MilestoneMotif } from "@/data/milestones";

/**
 * The thin brass-stroke motifs, ported from the web's components/MilestoneMarks
 * to react-native-svg — the same approach BrandMark takes with the brand mark
 * and the tab icons. Geometry is copied path-for-path so a mark looks the same
 * on both surfaces: currentColor strokes around 1px, no fills, no
 * circles-with-icons-in-them.
 */

const MOTIF_PATHS: Record<MilestoneMotif, React.ReactNode> = {
  lotus: (
    <>
      <Path d="M12 12.5C10.6 9.8 10.6 6.7 12 4c1.4 2.7 1.4 5.8 0 8.5z" />
      <Path d="M12 12.5c-2.2-.6-4.2-2.2-5.4-4.6 2.7.2 4.7 1.7 5.4 4.6z" />
      <Path d="M12 12.5c2.2-.6 4.2-2.2 5.4-4.6-2.7.2-4.7 1.7-5.4 4.6z" />
      <Path d="M4.5 14.5c2 3.2 4.6 4.8 7.5 4.8s5.5-1.6 7.5-4.8" />
    </>
  ),
  conch: (
    <>
      <Path d="M14.8 4.8c3 1.5 4.7 4.2 4.3 7.3-.5 3.9-3.8 6.7-7.7 6.7-3.1 0-5.7-2-6.4-4.9-.5-2.4.8-4.8 3-5.6 1.9-.7 3.9 0 4.8 1.6.8 1.3.5 2.9-.7 3.8" />
      <Path d="M6 17.5 4.2 19.8" />
    </>
  ),
  wheel: (
    <>
      <Circle cx="12" cy="12" r="8" />
      <Circle cx="12" cy="12" r="2.2" />
      <Path d="M12 4v5.8M12 14.2V20M4 12h5.8M14.2 12H20M6.3 6.3l4.1 4.1M13.6 13.6l4.1 4.1M17.7 6.3l-4.1 4.1M10.4 13.6l-4.1 4.1" />
    </>
  ),
  diya: (
    <>
      <Path d="M5 13.5h14c-.5 3.2-3.4 5.5-7 5.5s-6.5-2.3-7-5.5z" />
      <Path d="M12 10.8c-1.5-1.3-1.5-3.4 0-5.6 1.5 2.2 1.5 4.3 0 5.6z" />
    </>
  ),
  veena: (
    <>
      <Path d="M8.6 15.4 17 7" />
      <Circle cx="7.2" cy="16.8" r="2.9" />
      <Circle cx="17.6" cy="6.4" r="2.1" />
      <Path d="M11.4 12.2l1.4 1.4M13.8 9.8l1.4 1.4" />
    </>
  ),
  peacock: (
    <>
      <Path d="M11 20c0-6 1.6-10.6 4.4-13.8" />
      <Circle cx="16.6" cy="5.4" r="2.6" />
      <Circle cx="16.6" cy="5.4" r="0.9" />
      <Path d="M8.6 15.6c1.6-.6 3.2-.6 4.8-.1M9.8 11.4c1.3-.5 2.7-.5 4-.1" />
    </>
  ),
  mala: (
    <>
      <Circle cx="12" cy="4.8" r="1.3" />
      <Circle cx="17.1" cy="6.9" r="1.3" />
      <Circle cx="19.2" cy="12" r="1.3" />
      <Circle cx="17.1" cy="17.1" r="1.3" />
      <Circle cx="6.9" cy="17.1" r="1.3" />
      <Circle cx="4.8" cy="12" r="1.3" />
      <Circle cx="6.9" cy="6.9" r="1.3" />
      <Circle cx="12" cy="19" r="1.8" />
      <Path d="M12 20.8v1.4" />
    </>
  ),
  surya: (
    <>
      <Circle cx="12" cy="12" r="4.2" />
      <Path d="M12 2.5V5M12 19v2.5M2.5 12H5M19 12h2.5M5.3 5.3l1.8 1.8M16.9 16.9l1.8 1.8M18.7 5.3l-1.8 1.8M7.1 16.9l-1.8 1.8" />
    </>
  ),
  kalasha: (
    <>
      <Path d="M8.6 9.5c-2.2 1.2-3.6 3.2-3.6 5.2 0 3.1 3.1 5.3 7 5.3s7-2.2 7-5.3c0-2-1.4-4-3.6-5.2" />
      <Path d="M8.2 9.5h7.6M9.2 6.8h5.6M9.2 6.8l-.6 2.7M14.8 6.8l.6 2.7" />
      <Path d="M12 6.8V4.6M10.2 5c.6-.9 1.2-1.3 1.8-1.3S13.2 4.1 13.8 5" />
    </>
  ),
  patha: (
    <>
      <Path d="M8 20c1-6.5 3.2-11.8 7-16" />
      <Path d="M14 20c.4-5.6 1.9-10.8 4.6-15.6" />
      <Path d="M10.6 16.2h2.9M11.9 11.4h2.4" />
    </>
  ),
};

export function MilestoneMark({
  motif,
  size = 28,
  color,
  opacity = 1,
}: {
  motif: MilestoneMotif;
  size?: number;
  color?: string;
  opacity?: number;
}) {
  const { colors } = useTheme();
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <G
        stroke={color ?? colors.brass}
        strokeWidth="1.1"
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity={opacity}
      >
        {MOTIF_PATHS[motif]}
      </G>
    </Svg>
  );
}

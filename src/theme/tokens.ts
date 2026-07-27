export type ThemeMode = "dark" | "light";

export type ThemeColors = {
  void: string;
  field: string;
  mist: string;
  text: string;
  textSoft: string;
  textMuted: string;
  brass: string;
  brassSoft: string;
  tealGlow: string;
  onBrass: string;
  line: string;
  surface: string;
  surfaceHover: string;
  panel: string;
  panelStrong: string;
  inputBg: string;
  hairline: string;
  scrim: string;
  danger: string;
  dangerBg: string;
  navBg: string;
};

export const darkColors: ThemeColors = {
  void: "#07090f",
  field: "#0e1420",
  mist: "#182234",
  text: "#eef2f7",
  textSoft: "#c3ccd9",
  textMuted: "#9aa8bc",
  brass: "#c9a227",
  brassSoft: "#e2c45a",
  tealGlow: "#3d7a6a",
  onBrass: "#07090f",
  line: "rgba(201, 162, 39, 0.22)",
  surface: "rgba(238, 242, 247, 0.04)",
  surfaceHover: "rgba(238, 242, 247, 0.08)",
  panel: "rgba(14, 20, 32, 0.85)",
  panelStrong: "rgba(14, 20, 32, 0.92)",
  inputBg: "rgba(0, 0, 0, 0.28)",
  hairline: "rgba(255, 255, 255, 0.06)",
  scrim: "rgba(7, 9, 15, 0.72)",
  danger: "#f0c4c8",
  dangerBg: "rgba(140, 60, 70, 0.2)",
  navBg: "rgba(7, 9, 15, 0.92)",
};

export const lightColors: ThemeColors = {
  void: "#e8eef5",
  field: "#f4f7fb",
  mist: "#d5deea",
  text: "#0c1220",
  textSoft: "#2b3a4f",
  textMuted: "#334155",
  brass: "#c9a227",
  brassSoft: "#8a6410",
  tealGlow: "#0f766e",
  onBrass: "#0c1220",
  line: "rgba(107, 78, 10, 0.28)",
  surface: "rgba(255, 255, 255, 0.55)",
  surfaceHover: "rgba(255, 255, 255, 0.72)",
  panel: "rgba(255, 255, 255, 0.85)",
  panelStrong: "rgba(255, 255, 255, 0.92)",
  inputBg: "rgba(255, 255, 255, 0.4)",
  hairline: "rgba(12, 18, 32, 0.14)",
  scrim: "rgba(12, 18, 32, 0.18)",
  danger: "#9f1239",
  dangerBg: "rgba(159, 18, 57, 0.1)",
  navBg: "rgba(248, 250, 252, 0.92)",
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  fab: 56,
  // Must match tabBarStyle.height in app/(tabs)/_layout.tsx. MadhavFab positions
  // itself off this token; when the two drifted (56 here, 64 there) the FAB sat
  // 8px low and crowded the tab bar. See /autoplan finding F5.
  tabBar: 64,
  fabInset: 20,
} as const;

export const radii = {
  sm: 8,
  md: 12,
  lg: 16,
  fab: 28,
} as const;

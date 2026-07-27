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
  glass: string;
  inputBg: string;
  hairline: string;
  scrim: string;
  danger: string;
  dangerBg: string;
  navBg: string;
  onMedia: string;
  onMediaMuted: string;
  atmosphereTeal: string;
  atmosphereBrass: string;
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
  panel: "rgba(14, 20, 32, 0.55)",
  panelStrong: "rgba(14, 20, 32, 0.78)",
  glass: "rgba(14, 20, 32, 0.55)",
  inputBg: "rgba(0, 0, 0, 0.28)",
  hairline: "rgba(255, 255, 255, 0.06)",
  scrim: "rgba(7, 9, 15, 0.72)",
  danger: "#f0c4c8",
  dangerBg: "rgba(140, 60, 70, 0.2)",
  navBg: "rgba(7, 9, 15, 0.85)",
  onMedia: "#f4f6fa",
  onMediaMuted: "rgba(238, 242, 247, 0.78)",
  atmosphereTeal: "rgba(61, 122, 106, 0.22)",
  atmosphereBrass: "rgba(201, 162, 39, 0.08)",
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
  panel: "rgba(255, 255, 255, 0.55)",
  panelStrong: "rgba(255, 255, 255, 0.72)",
  glass: "rgba(255, 255, 255, 0.82)",
  inputBg: "rgba(255, 255, 255, 0.4)",
  hairline: "rgba(12, 18, 32, 0.14)",
  scrim: "rgba(12, 18, 32, 0.18)",
  danger: "#9f1239",
  dangerBg: "rgba(159, 18, 57, 0.1)",
  navBg: "rgba(248, 250, 252, 0.55)",
  onMedia: "#f8fafc",
  onMediaMuted: "rgba(248, 250, 252, 0.82)",
  atmosphereTeal: "rgba(15, 118, 110, 0.08)",
  atmosphereBrass: "rgba(201, 162, 39, 0.1)",
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
  fab: 56,
  tabBar: 64,
  fabInset: 20,
  contentBottom: 140,
} as const;

export const radii = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  fab: 28,
} as const;

export const motion = {
  enterMs: 700,
  riseY: 18,
  staggerMs: 120,
  fabPulseMs: 700,
} as const;

export const typeScale = {
  display: { size: 32, line: 38 },
  title: { size: 22, line: 28 },
  sanskrit: { size: 24, line: 36 },
  body: { size: 16, line: 24 },
  soft: { size: 15, line: 22 },
  muted: { size: 13, line: 18 },
  eyebrow: { size: 11, line: 14 },
} as const;

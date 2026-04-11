export const colors = {
  background: "#0B0F14",
  surface: "#11161D",
  surfaceElevated: "#161C24",
  surfaceSoft: "#1B2330",
  textPrimary: "#FFFFFF",
  textSecondary: "#A3AAB8",
  textMuted: "#7C8798",
  accent: "#22C55E",
  accentSoft: "rgba(34, 197, 94, 0.14)",
  live: "#EF4444",
  liveSoft: "rgba(239, 68, 68, 0.14)",
  warning: "#F59E0B",
  warningSoft: "rgba(245, 158, 11, 0.14)",
  border: "rgba(255,255,255,0.08)",
  borderStrong: "rgba(255,255,255,0.14)",
  overlayHeroTop: "rgba(11,15,20,0.18)",
  overlayHeroBottom: "rgba(11,15,20,0.92)",
} as const;

export const spacing = {
  0: "0px",
  1: "4px",
  2: "8px",
  3: "12px",
  4: "16px",
  5: "20px",
  6: "24px",
  8: "32px",
  10: "40px",
  12: "48px",
  16: "64px",
} as const;

export const radius = {
  xs: "10px",
  sm: "14px",
  md: "20px",
  lg: "28px",
  pill: "999px",
} as const;

export const shadows = {
  sm: "0 8px 24px rgba(0,0,0,0.24)",
  md: "0 16px 40px rgba(0,0,0,0.28)",
  lg: "0 24px 64px rgba(0,0,0,0.36)",
} as const;

export const typeScale = {
  heroTitle: "clamp(2.25rem, 4vw, 4rem)",
  sectionTitle: "clamp(1.25rem, 2vw, 1.75rem)",
  cardTitle: "1rem",
  body: "0.95rem",
  meta: "0.8125rem",
} as const;

export const motion = {
  fast: "160ms ease",
  base: "220ms ease",
  slow: "320ms ease",
  hoverLift: "translateY(-4px)",
  hoverScale: "scale(1.015)",
} as const;

export const layout = {
  contentMaxWidth: "1440px",
  pagePaddingX: "clamp(16px, 2vw, 32px)",
  sectionGap: "40px",
  railGap: "18px",
} as const;

export const zIndex = {
  base: 0,
  content: 1,
  overlay: 2,
  nav: 10,
  hero: 20,
} as const;

export const designTokens = {
  colors,
  spacing,
  radius,
  shadows,
  typeScale,
  motion,
  layout,
  zIndex,
} as const;

export type DesignTokens = typeof designTokens;
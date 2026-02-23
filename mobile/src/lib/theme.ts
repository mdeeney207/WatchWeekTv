// mobile/src/lib/theme.ts
export const THEME = {
  // Background
  bgSolid: "#070812",
  bgGradient: ["#070812", "#140b2e", "#0b1535"],

  // Glass panels
  panel: "rgba(18, 16, 34, 0.62)",
  panelStrong: "rgba(18, 16, 34, 0.82)",

  // Borders
  borderSoft: "rgba(255, 255, 255, 0.10)",

  // Text
  text: "rgba(255,255,255,0.92)",
  textMuted: "rgba(255,255,255,0.62)",
  textDim: "rgba(255,255,255,0.45)",

  // Accents
  accent: "#A78BFA",
  accentSoft: "rgba(167, 139, 250, 0.20)",

  // Status
  success: "#34D399",
  danger: "#FB7185",

  // Radii (YOUR APP EXPECTS THIS SHAPE)
  r: {
    sm: 14,
    md: 18,
    lg: 24,
  },

  // Shadow tokens (YOUR APP EXPECTS shadow.card)
  shadow: {
    card: {
      shadowColor: "#000",
      shadowOpacity: 0.25,
      shadowRadius: 14,
      shadowOffset: { width: 0, height: 10 },
      elevation: 6,
    },
  },

  // Spacing tokens (optional but useful)
  pagePad: 18,
  cardPad: 14,
} as const;

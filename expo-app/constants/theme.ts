export const colors = {
  bgPrimary: "#16161a",
  bgSecondary: "#1e1e24",
  bgTertiary: "#282830",
  bgElevated: "#2e2e36",
  borderSubtle: "rgba(255, 255, 255, 0.08)",
  borderMedium: "rgba(255, 255, 255, 0.12)",
  // borderDefault is the web-aligned name; same value as borderMedium.
  // New code uses borderDefault; existing borderMedium usages keep working.
  borderDefault: "rgba(255, 255, 255, 0.12)",
  textPrimary: "rgba(255, 255, 255, 0.95)",
  textSecondary: "rgba(255, 255, 255, 0.6)",
  textTertiary: "rgba(255, 255, 255, 0.4)",
  accentPurple: "#8b5cf6",
  accentPurpleHover: "#7c4fee",
  accentRed: "#e53935",
  accentGreen: "#3d9b4f",
  accentOrange: "#f59e0b",
  inputBg: "rgba(255, 255, 255, 0.05)",
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
};

export const radius = {
  sm: 4,
  md: 6,
  lg: 8,
  xl: 12,
};

// DM Sans is loaded in app/_layout.tsx. React Native cannot synthesize weights
// from a numeric fontWeight for custom fonts, so weight is always expressed by
// picking the right family here.
export const fontFamily = {
  regular: "DMSans_400Regular",
  medium: "DMSans_500Medium",
  semibold: "DMSans_600SemiBold",
  bold: "DMSans_700Bold",
} as const;

// Typography scale mirrored from the web design system (components/ui/typography.tsx),
// rem -> px at a 16px base. letterSpacing is in px (RN does not support em).
export const typography = {
  pageTitle: {
    fontSize: 24,
    lineHeight: 30,
    fontFamily: fontFamily.bold,
    letterSpacing: -0.5,
  },
  titleLg: {
    fontSize: 20,
    lineHeight: 26,
    fontFamily: fontFamily.semibold,
  },
  titleMd: {
    fontSize: 18,
    lineHeight: 24,
    fontFamily: fontFamily.semibold,
  },
  body: {
    fontSize: 14,
    lineHeight: 21,
    fontFamily: fontFamily.regular,
  },
  bodySm: {
    fontSize: 13,
    lineHeight: 19,
    fontFamily: fontFamily.regular,
  },
  caption: {
    fontSize: 13,
    lineHeight: 18,
    fontFamily: fontFamily.regular,
  },
  label: {
    fontSize: 12,
    lineHeight: 16,
    fontFamily: fontFamily.semibold,
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  overline: {
    fontSize: 11,
    lineHeight: 14,
    fontFamily: fontFamily.semibold,
    textTransform: "uppercase",
    letterSpacing: 0.7,
  },
} as const;

export const tones = {
  primary: colors.textPrimary,
  secondary: colors.textSecondary,
  tertiary: colors.textTertiary,
  danger: colors.accentRed,
  success: colors.accentGreen,
} as const;

export type TypographyVariant = keyof typeof typography;
export type Tone = keyof typeof tones;
export type FontWeight = keyof typeof fontFamily;

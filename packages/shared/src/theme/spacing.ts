export const spacing = {
  0: 0,
  1: 4,
  2: 8,
  3: 12,
  4: 16,
  5: 20,
  6: 24,
  8: 32,
  10: 40,
  12: 48,
  16: 64,
  20: 80,
  24: 96,
} as const

export const layoutGrid = {
  insetPhone: spacing[4],
  insetTablet: spacing[6],
  panelGap: spacing[4],
  sectionGap: spacing[3],
} as const

export const borderRadius = {
  none: 0,
  sm: 2,
  md: 4,
  lg: 8,
  xl: 12,
  full: 9999,
} as const

export const typographyScale = {
  xs: { fontSize: 12, lineHeight: 16 },
  sm: { fontSize: 14, lineHeight: 20 },
  base: { fontSize: 16, lineHeight: 24 },
  lg: { fontSize: 18, lineHeight: 28 },
  xl: { fontSize: 20, lineHeight: 28 },
  '2xl': { fontSize: 24, lineHeight: 32 },
  '3xl': { fontSize: 30, lineHeight: 36 },
  '4xl': { fontSize: 36, lineHeight: 40 },
} as const

export const fontFamilyTokens = {
  display: 'pd-display',
  body: 'pd-sans',
  mono: 'pd-mono',
  // React Native uses PostScript names, not CSS aliases
  displayNative: 'Stardom-Regular',
  bodyNative: 'Geist',
} as const

export const semanticTypography = {
  display: {
    fontSize: 36,
    lineHeight: 40,
    letterSpacing: -1.1,
  },
  screenTitle: {
    fontSize: 30,
    lineHeight: 34,
    letterSpacing: -0.8,
  },
  sectionTitle: {
    fontSize: 12,
    lineHeight: 16,
    letterSpacing: 1.3,
  },
  labelStrong: {
    fontSize: 13,
    lineHeight: 18,
    letterSpacing: 0.6,
  },
  body: {
    fontSize: 16,
    lineHeight: 24,
  },
  bodySmall: {
    fontSize: 14,
    lineHeight: 20,
  },
  meta: {
    fontSize: 12,
    lineHeight: 16,
    letterSpacing: 0.5,
  },
  button: {
    fontSize: 15,
    lineHeight: 20,
    letterSpacing: 0.4,
  },
} as const

import type { CSSProperties } from 'react'
import {
  borderRadius,
  fontFamilyTokens,
  lightTheme,
  palette,
  semanticTypography,
  spacing,
  typographyScale,
} from '@pocketdev/shared/theme'

function px(value: number) {
  return `${value}px`
}

function textStyle(style: { fontSize: number; lineHeight: number; letterSpacing?: number }) {
  return {
    fontSize: px(style.fontSize),
    lineHeight: px(style.lineHeight),
    ...(style.letterSpacing !== undefined ? { letterSpacing: px(style.letterSpacing) } : {}),
  } satisfies CSSProperties
}

export const architectureFonts = {
  display: `${fontFamilyTokens.display}, ${fontFamilyTokens.displayFallback}, var(--font-sans), sans-serif`,
  body: `${fontFamilyTokens.body}, var(--font-sans), sans-serif`,
  mono: `${fontFamilyTokens.mono}, ui-monospace, monospace`,
} as const

export const architectureTokens = {
  colors: {
    blue: palette.bauhaus.blue,
    red: palette.bauhaus.red,
    yellow: palette.bauhaus.yellow,
    black: palette.bauhaus.black,
    paper: lightTheme.background,
    panel: lightTheme.panel,
    panelAlt: lightTheme.panelAlt,
    text: lightTheme.text,
    textSecondary: lightTheme.textSecondary,
    border: lightTheme.border,
  },
  spacing,
  borderRadius,
} as const

export const architectureTextStyles = {
  heroTitle: {
    ...textStyle(semanticTypography.display),
    fontFamily: architectureFonts.display,
    fontWeight: 700,
  } satisfies CSSProperties,
  heroLead: {
    ...textStyle(typographyScale.lg),
    fontFamily: architectureFonts.body,
  } satisfies CSSProperties,
  sectionEyebrow: {
    ...textStyle(semanticTypography.sectionTitle),
    fontFamily: architectureFonts.display,
    textTransform: 'uppercase',
  } satisfies CSSProperties,
  sectionLead: {
    ...textStyle(typographyScale.lg),
    fontFamily: architectureFonts.body,
  } satisfies CSSProperties,
  cardTitle: {
    ...textStyle(typographyScale.base),
    fontFamily: architectureFonts.display,
    fontWeight: 600,
    letterSpacing: '-0.02em',
  } satisfies CSSProperties,
  mono: {
    fontFamily: architectureFonts.mono,
  } satisfies CSSProperties,
} as const

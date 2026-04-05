import type { CSSProperties } from 'react'
import {
  borderRadius,
  fontFamilyTokens,
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
    paper: '#f7f1e3',
    panel: 'rgba(255,255,255,0)',
    panelAlt: '#efe5cb',
    text: '#201d18',
    textSecondary: '#5c5549',
    border: '#b7aa91',
  },
  spacing,
  borderRadius,
} as const

export const architectureTextStyles = {
  heroTitle: {
    ...textStyle(semanticTypography.display),
    fontFamily: architectureFonts.display,
    fontWeight: 700,
    color: architectureTokens.colors.text,
  } satisfies CSSProperties,
  heroLead: {
    ...textStyle(typographyScale.lg),
    fontFamily: architectureFonts.body,
    color: architectureTokens.colors.textSecondary,
  } satisfies CSSProperties,
  sectionEyebrow: {
    ...textStyle(semanticTypography.sectionTitle),
    fontFamily: architectureFonts.display,
    textTransform: 'uppercase',
    color: architectureTokens.colors.textSecondary,
  } satisfies CSSProperties,
  sectionLead: {
    ...textStyle(typographyScale.lg),
    fontFamily: architectureFonts.body,
    color: architectureTokens.colors.textSecondary,
  } satisfies CSSProperties,
  cardTitle: {
    ...textStyle(typographyScale.base),
    fontFamily: architectureFonts.display,
    fontWeight: 600,
    letterSpacing: '-0.02em',
    color: architectureTokens.colors.text,
  } satisfies CSSProperties,
  bodyText: {
    color: architectureTokens.colors.textSecondary,
  } satisfies CSSProperties,
  strongText: {
    color: architectureTokens.colors.text,
  } satisfies CSSProperties,
  surface: {
    borderColor: architectureTokens.colors.border,
    backgroundColor: 'transparent',
  } satisfies CSSProperties,
  mono: {
    fontFamily: architectureFonts.mono,
    color: architectureTokens.colors.textSecondary,
  } satisfies CSSProperties,
} as const

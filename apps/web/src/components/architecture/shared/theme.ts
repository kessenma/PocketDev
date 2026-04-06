import type { CSSProperties } from 'react'
import {
  borderRadius,
  lightTheme,
  palette,
  semanticTypography,
  spacing,
  typographyScale,
  type SemanticTheme,
  webFontStacks,
} from '@pocketdev/shared/theme'

type ThemeTokenMap = { [K in keyof SemanticTheme]: string }

function px(value: number) {
  return `${value}px`
}

export const architectureTheme = {
  ...lightTheme,
  canvas: '#f7f1e3',
  background: '#f7f1e3',
  surface: 'rgba(255,255,255,0)',
  panel: 'rgba(255,255,255,0)',
  panelAlt: '#efe5cb',
  text: '#201d18',
  textSecondary: '#5c5549',
  border: '#b7aa91',
  borderStrong: '#8d8476',
} satisfies ThemeTokenMap

function textStyle(style: { fontSize: number; lineHeight: number; letterSpacing?: number }) {
  return {
    fontSize: px(style.fontSize),
    lineHeight: px(style.lineHeight),
    ...(style.letterSpacing !== undefined ? { letterSpacing: px(style.letterSpacing) } : {}),
  } satisfies CSSProperties
}

export const architectureFonts = {
  display: webFontStacks.display,
  body: webFontStacks.body,
  mono: webFontStacks.mono,
} as const

export const architectureTokens = {
  colors: {
    blue: palette.bauhaus.blue,
    red: palette.bauhaus.red,
    yellow: palette.bauhaus.yellow,
    black: palette.bauhaus.black,
    paper: `var(--architecture-paper, ${architectureTheme.background})`,
    panel: `var(--architecture-surface, ${architectureTheme.panel})`,
    panelAlt: `var(--architecture-panel-alt, ${architectureTheme.panelAlt})`,
    text: `var(--architecture-text, ${architectureTheme.text})`,
    textSecondary: `var(--architecture-text-secondary, ${architectureTheme.textSecondary})`,
    border: `var(--architecture-border, ${architectureTheme.border})`,
    borderStrong: `var(--architecture-border-strong, ${architectureTheme.borderStrong})`,
  },
  spacing,
  borderRadius,
} as const

export function blendHexColors(from: string, to: string, progress: number) {
  const clamped = Math.max(0, Math.min(1, progress))
  const fromValue = Number.parseInt(from.slice(1), 16)
  const toValue = Number.parseInt(to.slice(1), 16)
  const fromRgb = {
    r: (fromValue >> 16) & 0xff,
    g: (fromValue >> 8) & 0xff,
    b: fromValue & 0xff,
  }
  const toRgb = {
    r: (toValue >> 16) & 0xff,
    g: (toValue >> 8) & 0xff,
    b: toValue & 0xff,
  }
  const mix = (start: number, end: number) =>
    Math.round(start + (end - start) * clamped)

  return `rgb(${mix(fromRgb.r, toRgb.r)}, ${mix(fromRgb.g, toRgb.g)}, ${mix(fromRgb.b, toRgb.b)})`
}

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
    backgroundColor: architectureTokens.colors.panel,
  } satisfies CSSProperties,
  mono: {
    fontFamily: architectureFonts.mono,
    color: architectureTokens.colors.textSecondary,
  } satisfies CSSProperties,
} as const

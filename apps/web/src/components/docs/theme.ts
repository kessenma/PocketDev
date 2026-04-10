import type { CSSProperties } from 'react'
import {
  darkTheme,
  spacing,
  borderRadius,
  typographyScale,
  semanticTypography,
  webFontStacks,
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

export const docsFonts = {
  display: webFontStacks.display,
  body: webFontStacks.body,
  mono: webFontStacks.mono,
} as const

export const docsTokens = {
  colors: {
    background: darkTheme.background,
    surface: darkTheme.surface,
    surfaceHover: darkTheme.surfaceHover,
    text: darkTheme.text,
    textSecondary: darkTheme.textSecondary,
    textTertiary: darkTheme.textTertiary,
    border: darkTheme.border,
    borderStrong: darkTheme.borderStrong,
    primary: darkTheme.primary,
    primaryHover: darkTheme.primaryHover,
    accent: darkTheme.accent,
  },
  spacing,
  borderRadius,
} as const

export const docsTextStyles = {
  h1: {
    ...textStyle(typographyScale['3xl']),
    fontFamily: docsFonts.display,
    fontWeight: 700,
    letterSpacing: '-0.02em',
    color: docsTokens.colors.text,
  } satisfies CSSProperties,
  h2: {
    ...textStyle(typographyScale.xl),
    fontFamily: docsFonts.body,
    fontWeight: 600,
    letterSpacing: '-0.01em',
    color: docsTokens.colors.text,
  } satisfies CSSProperties,
  h3: {
    ...textStyle(typographyScale.lg),
    fontFamily: docsFonts.body,
    fontWeight: 600,
    color: docsTokens.colors.text,
  } satisfies CSSProperties,
  body: {
    ...textStyle(semanticTypography.body),
    fontFamily: docsFonts.body,
    color: docsTokens.colors.textSecondary,
  } satisfies CSSProperties,
  bodySmall: {
    ...textStyle(semanticTypography.bodySmall),
    fontFamily: docsFonts.body,
    color: docsTokens.colors.textSecondary,
  } satisfies CSSProperties,
  sectionLabel: {
    ...textStyle(semanticTypography.sectionTitle),
    fontFamily: docsFonts.body,
    textTransform: 'uppercase',
    color: docsTokens.colors.textTertiary,
  } satisfies CSSProperties,
  code: {
    fontFamily: docsFonts.mono,
    ...textStyle(typographyScale.sm),
  } satisfies CSSProperties,
  link: {
    color: docsTokens.colors.primary,
    textDecoration: 'underline',
    textUnderlineOffset: '4px',
  } satisfies CSSProperties,
} as const

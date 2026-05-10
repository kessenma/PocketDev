import { Platform, type TextStyle } from 'react-native'
import { fontFamilyTokens, semanticTypography, typographyScale } from '@pocketdev/shared/theme'

function getDisplayFontFamily() {
  return Platform.select({
    ios: fontFamilyTokens.displayNative,
    android: fontFamilyTokens.displayNative,
    default: 'sans-serif',
  })
}

function getBodyFontFamily() {
  return Platform.select({
    ios: fontFamilyTokens.bodyNative,
    android: fontFamilyTokens.bodyNative,
    default: fontFamilyTokens.body,
  })
}

function getDisplayItalicFontFamily() {
  return Platform.select({
    ios: fontFamilyTokens.displayItalicNative,
    android: fontFamilyTokens.displayNative,
    default: fontFamilyTokens.display,
  })
}

function getBodyItalicFontFamily() {
  return Platform.select({
    ios: fontFamilyTokens.bodyItalicNative,
    android: fontFamilyTokens.bodyItalicNative,
    default: fontFamilyTokens.body,
  })
}

export function getMonoFontFamily() {
  return Platform.select({
    ios: fontFamilyTokens.monoNative,
    android: fontFamilyTokens.monoNative,
    default: fontFamilyTokens.mono,
  })
}

export function createTypeStyle(
  role: keyof typeof semanticTypography,
  family: 'display' | 'body' = 'body',
): TextStyle {
  return {
    ...semanticTypography[role],
    fontFamily: family === 'display' ? getDisplayFontFamily() : getBodyFontFamily(),
    fontWeight: family === 'display' ? '800' : '500',
  }
}

function createDisplayItalicStyle(role: keyof typeof semanticTypography): TextStyle {
  return {
    ...semanticTypography[role],
    fontFamily: getDisplayItalicFontFamily(),
    fontWeight: '800',
    // Android has no separate italic font file — synthesize from the regular family
    ...Platform.select({ android: { fontStyle: 'italic' as const } }),
  }
}

export const typeStyles = {
  display: createTypeStyle('display', 'display'),
  displayItalic: createDisplayItalicStyle('display'),
  screenTitle: createTypeStyle('screenTitle', 'display'),
  screenTitleItalic: createDisplayItalicStyle('screenTitle'),
  cardTitle: createTypeStyle('cardTitle', 'display'),
  sectionTitle: {
    ...createTypeStyle('sectionTitle', 'display'),
    textTransform: 'uppercase',
  } satisfies TextStyle,
  sectionTitleItalic: {
    ...createDisplayItalicStyle('sectionTitle'),
    textTransform: 'uppercase',
  } satisfies TextStyle,
  labelStrong: {
    ...createTypeStyle('labelStrong', 'display'),
    textTransform: 'uppercase',
  } satisfies TextStyle,
  heading: {
    ...typographyScale['2xl'],
    fontFamily: getDisplayFontFamily(),
    fontWeight: '800',
  } satisfies TextStyle,
  headingItalic: {
    ...typographyScale['2xl'],
    fontFamily: getDisplayItalicFontFamily(),
    fontWeight: '800',
    ...Platform.select({ android: { fontStyle: 'italic' as const } }),
  } satisfies TextStyle,
  body: {
    ...createTypeStyle('body'),
    fontWeight: '400',
  } satisfies TextStyle,
  bodyItalic: {
    ...createTypeStyle('body'),
    fontFamily: getBodyItalicFontFamily(),
    fontStyle: 'italic',
    fontWeight: '400',
  } satisfies TextStyle,
  bodyStrong: createTypeStyle('body'),
  bodyStrongItalic: {
    ...createTypeStyle('body'),
    fontFamily: getBodyItalicFontFamily(),
    fontStyle: 'italic',
  } satisfies TextStyle,
  bodyBold: {
    ...createTypeStyle('body'),
    fontWeight: '700',
  } satisfies TextStyle,
  bodyLarge: {
    ...typographyScale.lg,
    fontFamily: getBodyFontFamily(),
    fontWeight: '400',
  } satisfies TextStyle,
  bodySmall: {
    ...createTypeStyle('bodySmall'),
    fontWeight: '400',
  } satisfies TextStyle,
  meta: {
    ...createTypeStyle('meta'),
    fontWeight: '600',
    textTransform: 'uppercase',
  } satisfies TextStyle,
  button: createTypeStyle('button'),
  mono: {
    fontFamily: getMonoFontFamily(),
    fontSize: 13,
    lineHeight: 20,
  } satisfies TextStyle,
  monoLabel: {
    fontFamily: getMonoFontFamily(),
    fontSize: 11,
    lineHeight: 16,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  } satisfies TextStyle,
} as const

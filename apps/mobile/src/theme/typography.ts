import { Platform, type TextStyle } from 'react-native'
import { fontFamilyTokens, semanticTypography } from '@pocketdev/shared/theme'

function getDisplayFontFamily() {
  return Platform.select({
    ios: 'AvenirNextCondensed-Heavy',
    android: 'sans-serif-condensed',
    default: fontFamilyTokens.displayFallback,
  })
}

function getBodyFontFamily() {
  return Platform.select({
    ios: 'System',
    android: 'sans-serif',
    default: fontFamilyTokens.body,
  })
}

export function getMonoFontFamily() {
  return Platform.select({
    ios: 'Menlo',
    android: 'monospace',
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

export const typeStyles = {
  display: createTypeStyle('display', 'display'),
  screenTitle: createTypeStyle('screenTitle', 'display'),
  sectionTitle: {
    ...createTypeStyle('sectionTitle', 'display'),
    textTransform: 'uppercase',
  } satisfies TextStyle,
  labelStrong: {
    ...createTypeStyle('labelStrong', 'display'),
    textTransform: 'uppercase',
  } satisfies TextStyle,
  body: {
    ...createTypeStyle('body'),
    fontWeight: '400',
  } satisfies TextStyle,
  bodyStrong: createTypeStyle('body'),
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
} as const

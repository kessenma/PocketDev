import { palette } from './palette.ts'

export const lightTheme = {
  background: palette.neutral[50],
  backgroundSecondary: palette.neutral[100],
  surface: '#ffffff',
  surfaceHover: palette.neutral[100],
  text: palette.neutral[900],
  textSecondary: palette.neutral[600],
  textTertiary: palette.neutral[400],
  border: palette.neutral[200],
  borderStrong: palette.neutral[300],
  primary: palette.primary[600],
  primaryHover: palette.primary[700],
  primaryText: '#ffffff',
  accent: palette.accent[600],
  accentText: '#ffffff',
  success: palette.success[600],
  successBackground: palette.success[50],
  warning: palette.warning[600],
  warningBackground: palette.warning[50],
  error: palette.error[600],
  errorBackground: palette.error[50],
} as const

export const darkTheme = {
  background: palette.neutral[950],
  backgroundSecondary: palette.neutral[900],
  surface: palette.neutral[800],
  surfaceHover: palette.neutral[700],
  text: palette.neutral[50],
  textSecondary: palette.neutral[400],
  textTertiary: palette.neutral[500],
  border: palette.neutral[700],
  borderStrong: palette.neutral[600],
  primary: palette.primary[500],
  primaryHover: palette.primary[400],
  primaryText: '#ffffff',
  accent: palette.accent[500],
  accentText: '#ffffff',
  success: palette.success[500],
  successBackground: palette.success[700],
  warning: palette.warning[500],
  warningBackground: palette.warning[700],
  error: palette.error[500],
  errorBackground: palette.error[700],
} as const

export type SemanticTheme = typeof lightTheme

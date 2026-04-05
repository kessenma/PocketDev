import {
  palette,
  darkTheme,
  spacing,
  borderRadius,
  typographyScale,
} from '@pocketdev/shared/theme'

export function applyConsoleTheme() {
  const root = document.documentElement

  root.style.setProperty('--background', darkTheme.background)
  root.style.setProperty('--foreground', darkTheme.text)
  root.style.setProperty('--card', darkTheme.panel)
  root.style.setProperty('--card-foreground', darkTheme.text)
  root.style.setProperty('--popover', darkTheme.panel)
  root.style.setProperty('--popover-foreground', darkTheme.text)
  root.style.setProperty('--primary', darkTheme.primary)
  root.style.setProperty('--primary-foreground', darkTheme.primaryText)
  root.style.setProperty('--secondary', darkTheme.panelAlt)
  root.style.setProperty('--secondary-foreground', darkTheme.text)
  root.style.setProperty('--muted', darkTheme.backgroundSecondary)
  root.style.setProperty('--muted-foreground', darkTheme.textSecondary)
  root.style.setProperty('--accent', darkTheme.accent)
  root.style.setProperty('--accent-foreground', darkTheme.accentText)
  root.style.setProperty('--destructive', darkTheme.error)
  root.style.setProperty('--border', `${darkTheme.border}`)
  root.style.setProperty('--input', `${darkTheme.border}aa`)
  root.style.setProperty('--ring', darkTheme.focusFrame)
  root.style.setProperty('--radius', `${borderRadius.lg / 16}rem`)

  root.style.setProperty('--surface-strong', palette.neutral[950])
  root.style.setProperty('--surface-soft', palette.neutral[900])
  root.style.setProperty('--surface-paper', palette.neutral[50])
  root.style.setProperty('--text-soft', darkTheme.textSecondary)

  root.style.setProperty('--bauhaus-blue', palette.bauhaus.blue)
  root.style.setProperty('--bauhaus-red', palette.bauhaus.red)
  root.style.setProperty('--bauhaus-yellow', palette.bauhaus.yellow)
  root.style.setProperty('--bauhaus-black', palette.bauhaus.black)

  root.style.setProperty('--space-4', `${spacing[4] / 16}rem`)
  root.style.setProperty('--space-6', `${spacing[6] / 16}rem`)
  root.style.setProperty('--space-8', `${spacing[8] / 16}rem`)
  root.style.setProperty('--text-base-size', `${typographyScale.base.fontSize / 16}rem`)
  root.style.setProperty('--text-base-line', `${typographyScale.base.lineHeight / 16}rem`)
  root.style.setProperty('--text-2xl-size', `${typographyScale['2xl'].fontSize / 16}rem`)
  root.style.setProperty('--text-2xl-line', `${typographyScale['2xl'].lineHeight / 16}rem`)
}

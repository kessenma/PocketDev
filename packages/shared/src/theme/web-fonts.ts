import { fontFamilyTokens } from './spacing.js'

export const webFontStacks = {
  body: `${fontFamilyTokens.body}, Inter, system-ui, sans-serif`,
  display: `${fontFamilyTokens.display}, "Avenir Next Condensed", "Arial Narrow", sans-serif`,
  mono: `${fontFamilyTokens.mono}, "JetBrains Mono", Menlo, monospace`,
} as const

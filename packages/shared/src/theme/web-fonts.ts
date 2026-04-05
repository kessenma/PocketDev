import { fontFamilyTokens } from './spacing.js'

export const webFontStacks = {
  body: `${fontFamilyTokens.body}, "Geist Variable", "Inter Variable", Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`,
  display: `${fontFamilyTokens.display}, ${fontFamilyTokens.displayFallback}, "Avenir Next Condensed", "Futura Condensed ExtraBold", "Arial Narrow", "Geist Variable", sans-serif`,
  mono: `${fontFamilyTokens.mono}, "JetBrains Mono", "SFMono-Regular", Menlo, Monaco, Consolas, monospace`,
} as const

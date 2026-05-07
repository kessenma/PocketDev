import { fontFamilyTokens } from './spacing.js'

export const webFontStacks = {
  body: `${fontFamilyTokens.body}, Inter, system-ui, sans-serif`,
  display: `${fontFamilyTokens.display}, Georgia, "Times New Roman", serif`,
  displayItalic: `${fontFamilyTokens.display}, Georgia, "Times New Roman", serif`,
  mono: `${fontFamilyTokens.mono}, "JetBrains Mono", Menlo, monospace`,
} as const

export function generateFontFaceCSS(basePath: string): string {
  const base = basePath.replace(/\/$/, '')
  return [
    `@font-face{font-family:'pd-display';src:url('${base}/AncizarSerif-VariableFont_wght.ttf') format('truetype');font-weight:100 900;font-style:normal;}`,
    `@font-face{font-family:'pd-display';src:url('${base}/AncizarSerif-Italic-VariableFont_wght.ttf') format('truetype');font-weight:100 900;font-style:italic;}`,
    `@font-face{font-family:'pd-sans';src:url('${base}/Geist-VariableFont_wght.ttf') format('truetype');font-weight:100 900;font-style:normal;}`,
    `@font-face{font-family:'pd-mono';src:url('${base}/GeistMono-VariableFont_wght.ttf') format('truetype');font-weight:100 900;font-style:normal;}`,
  ].join('')
}

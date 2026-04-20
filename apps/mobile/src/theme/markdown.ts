import type { SemanticTheme } from '@pocketdev/shared/theme'

/**
 * Builds a fully dark-mode-aware markdownStyle for EnrichedMarkdownText.
 * The library defaults list.color and all heading colors to near-black (#1F2937),
 * which is invisible on dark panel backgrounds — this overrides them all.
 */
export function buildMarkdownStyle(colors: SemanticTheme, fontSize = 14, lineHeight = 20) {
  return {
    paragraph: { color: colors.text, fontSize, lineHeight },
    strong: { color: colors.text },
    em: { color: colors.text },
    link: { color: colors.primary },
    code: { color: colors.primary, backgroundColor: colors.panelAlt },
    list: {
      color: colors.text,
      fontSize,
      lineHeight,
      bulletColor: colors.textSecondary,
      markerColor: colors.textSecondary,
    },
    h1: { color: colors.text },
    h2: { color: colors.text },
    h3: { color: colors.text },
    h4: { color: colors.text },
    h5: { color: colors.text },
    h6: { color: colors.text },
    blockquote: {
      color: colors.textSecondary,
      backgroundColor: colors.panelAlt,
      borderColor: colors.border,
    },
    codeBlock: {
      color: colors.text,
      backgroundColor: colors.panelAlt,
      borderColor: colors.border,
    },
  } as const
}

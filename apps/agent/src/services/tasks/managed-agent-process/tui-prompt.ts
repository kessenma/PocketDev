interface TuiPrompt {
  prompt: string
  options: Array<{ value: string; label: string }>
}

export function parseTuiPrompt(pane: string): TuiPrompt | null {
  // Numbered menu style: ❯ 1. Yes  2. No
  if (/❯\s*\d+\./.test(pane)) {
    const questionMatch = pane.match(
      /(Do you want to (?:allow|proceed|continue|run)[^\n]*\?|Is this a project[^\n]+\?|Quick safety check[^\n]*|Allow (?:Claude|this)[^\n]*\?|This action requires[^\n]*\?|Would you like to[^\n]*\?)/i,
    )
    const prompt = questionMatch?.[1]?.trim() ?? 'Permission required'
    const optionMatches = [...pane.matchAll(/\d+\.\s+([^\n]+)/g)]
    if (optionMatches.length < 2) return null
    const options = optionMatches.map((m, i) => ({
      value: String(i + 1),
      label: m[1].trim(),
    }))
    return { prompt, options }
  }

  // Two-button style: "Allow for this session" / "Deny"
  if (/Allow\s+for\s+this\s+session/i.test(pane)) {
    const questionMatch = pane.match(
      /(Do you want to (?:allow|proceed|continue|run)[^\n]*\?|Allow (?:Claude|this)[^\n]*\?|This action requires[^\n]*\?|Would you like to[^\n]*\?)/i,
    )
    const prompt = questionMatch?.[1]?.trim() ?? 'Permission required'
    return {
      prompt,
      options: [
        { value: '1', label: 'Allow for this session' },
        { value: '2', label: 'Deny' },
      ],
    }
  }

  return null
}

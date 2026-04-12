import { describe, expect, test } from 'bun:test'
import { __test } from './copilot-models.ts'

describe('copilot model picker parsing', () => {
  test('parses picker rows with defaults, previews, and decimal multipliers', () => {
    const rows = __test.parsePickerRows([
      'Select Model',
      '',
      '❯ Claude Sonnet 4.6 (default) ✓                1x',
      '  Claude Haiku 4.5                          0.33x',
      '  Claude Opus 4.6 (fast mode) (Preview)       30x',
      '  GPT-5.3-Codex                                1x',
    ].join('\n'))

    expect(rows).toEqual([
      { name: 'Claude Sonnet 4.6', premiumMultiplier: 1 },
      { name: 'Claude Haiku 4.5', premiumMultiplier: 0.33 },
      { name: 'Claude Opus 4.6 (fast mode)', premiumMultiplier: 30 },
      { name: 'GPT-5.3-Codex', premiumMultiplier: 1 },
    ])
  })

  test('normalizes picker display names to CLI model ids', () => {
    expect(__test.displayNameToModelId('Claude Sonnet 4.6')).toBe('claude-sonnet-4.6')
    expect(__test.displayNameToModelId('Claude Opus 4.6 (fast mode)')).toBe('claude-opus-4.6-fast')
    expect(__test.displayNameToModelId('GPT-5.3-Codex')).toBe('gpt-5.3-codex')
    expect(__test.displayNameToModelId('GPT-5 mini')).toBe('gpt-5-mini')
  })

  test('ships a curated fallback catalog with expected copilot model ids', () => {
    expect(__test.FALLBACK_COPILOT_MODELS.map((model) => model.cliModelId)).toEqual([
      'claude-sonnet-4.6',
      'claude-sonnet-4.5',
      'claude-haiku-4.5',
      'claude-opus-4.6',
      'claude-opus-4.6-fast',
      'claude-opus-4.5',
      'claude-sonnet-4',
      'gpt-5.4',
      'gpt-5.3-codex',
      'gpt-5.2-codex',
      'gpt-5.2',
      'gpt-5.1',
      'gpt-5-mini',
      'gpt-4.1',
    ])
  })
})

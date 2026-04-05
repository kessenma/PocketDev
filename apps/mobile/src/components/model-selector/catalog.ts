import type { ServerCapabilities } from '@pocketdev/shared/types'
import type { ModelProvider, ModelProviderId, SelectableModel } from './model'

export const MODEL_PROVIDERS: ModelProvider[] = [
  {
    id: 'claude',
    label: 'Claude',
    summary: 'Anthropic models tuned for coding, planning, and long-context review.',
    models: [
      {
        id: 'claude-opus',
        cliModelId: 'opus',
        name: 'Claude Opus 4.6',
        headline: 'Deep reasoning for harder refactors',
        description: 'Use when the task needs stronger planning or higher-confidence architectural work.',
        contextWindow: '200K context',
      },
      {
        id: 'claude-opus-1m',
        cliModelId: 'claude-opus-4-6[1m]',
        name: 'Claude Opus 4.6 (1M)',
        headline: 'Extended context for large codebases',
        description: 'Full 1M context window for tasks that span many files or large repositories.',
        contextWindow: '1M context',
      },
      {
        id: 'claude-sonnet',
        cliModelId: 'sonnet',
        name: 'Claude Sonnet 4.6',
        headline: 'Balanced default for most coding sessions',
        description: 'Good fit for day-to-day implementation, review, and bug fixing.',
        contextWindow: '200K context',
      },
      {
        id: 'claude-sonnet-1m',
        cliModelId: 'claude-sonnet-4-6[1m]',
        name: 'Claude Sonnet 4.6 (1M)',
        headline: 'Extended context with balanced speed',
        description: 'Sonnet speed with full 1M context window for larger tasks.',
        contextWindow: '1M context',
      },
      {
        id: 'claude-haiku',
        cliModelId: 'haiku',
        name: 'Claude Haiku',
        headline: 'Fast responses for lighter tasks',
        description: 'Useful for short edits, summaries, or lightweight debugging loops.',
        contextWindow: '200K context',
      },
    ],
  },
  {
    id: 'codex',
    label: 'Codex',
    summary: 'OpenAI coding agents and model variants for implementation-focused work.',
    models: [
      {
        id: 'codex-gpt-5.4',
        cliModelId: 'gpt-5.4',
        name: 'GPT-5.4',
        headline: 'Frontier coding model for complex implementation',
        description: 'Strong default for multi-file changes, debugging, and repository-aware work.',
        contextWindow: 'Large context',
      },
      {
        id: 'codex-gpt-5.3',
        cliModelId: 'gpt-5.3',
        name: 'GPT-5.3',
        headline: 'Reliable general-purpose coding',
        description: 'A solid option for most coding tasks with good speed and reasoning.',
        contextWindow: 'Large context',
      },
      {
        id: 'codex-gpt-5.3-codex',
        cliModelId: 'gpt-5.3-codex',
        name: 'GPT-5.3 Codex',
        headline: 'Code-optimized variant of GPT-5.3',
        description: 'Tuned for code generation and editing workflows.',
        contextWindow: 'Large context',
      },
      {
        id: 'codex-gpt-5.2-codex',
        cliModelId: 'gpt-5.2-codex',
        name: 'GPT-5.2 Codex',
        headline: 'Stable code-focused model',
        description: 'Dependable for routine coding and inspection workflows.',
        contextWindow: 'Large context',
      },
      {
        id: 'codex-gpt-5.2',
        cliModelId: 'gpt-5.2',
        name: 'GPT-5.2',
        headline: 'Steady general-purpose fallback',
        description: 'A stable option for routine coding and review tasks.',
        contextWindow: 'Large context',
      },
      {
        id: 'codex-gpt-5.1-codex-mini',
        cliModelId: 'gpt-5.1-codex-mini',
        name: 'GPT-5.1 Codex Mini',
        headline: 'Fast and lightweight',
        description: 'Good for quick iterations when latency matters more than reasoning depth.',
        contextWindow: 'Large context',
      },
    ],
  },
]

export function getProviderById(providerId: ModelProviderId): ModelProvider {
  return MODEL_PROVIDERS.find((provider) => provider.id === providerId) ?? MODEL_PROVIDERS[0]
}

export function getModelById(
  providerId: ModelProviderId,
  modelId: string,
): SelectableModel {
  const provider = getProviderById(providerId)
  return provider.models.find((model) => model.id === modelId) ?? provider.models[0]
}

export function getDefaultModelSelection() {
  const provider = MODEL_PROVIDERS[0]
  const model = provider.models[0]

  return {
    selectedProviderId: provider.id,
    selectedModelId: model.id,
  }
}

export function getCliModelId(
  providerId: ModelProviderId,
  modelId: string,
): string {
  const model = getModelById(providerId, modelId)
  return model.cliModelId
}

export function mergeServerAvailability(capabilities: ServerCapabilities): ModelProvider[] {
  return MODEL_PROVIDERS.map((provider) => {
    const serverProvider = capabilities.providers.find((sp) => sp.id === provider.id)
    return {
      ...provider,
      availability: serverProvider?.availability ?? 'not_installed',
    }
  })
}

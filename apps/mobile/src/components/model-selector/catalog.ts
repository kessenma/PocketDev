import type { ServerCapabilities } from '@pocketdev/shared/types'
import type { ModelProvider, ModelProviderId, SelectableModel } from './model'

export const MODEL_PROVIDERS: ModelProvider[] = [
  {
    id: 'claude',
    label: 'Claude',
    summary: 'Anthropic models tuned for coding, planning, and long-context review.',
    models: [
      {
        id: 'claude-sonnet-4',
        name: 'Claude Sonnet 4',
        headline: 'Balanced default for most coding sessions',
        description: 'Good fit for day-to-day implementation, review, and bug fixing on mobile.',
        contextWindow: '200K context',
      },
      {
        id: 'claude-opus-4.1',
        name: 'Claude Opus 4.1',
        headline: 'Deep reasoning for harder refactors',
        description: 'Use when the task needs stronger planning or higher-confidence architectural work.',
        contextWindow: '200K context',
      },
      {
        id: 'claude-haiku-3.5',
        name: 'Claude Haiku 3.5',
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
        name: 'GPT-5.4 Codex',
        headline: 'Frontier coding model for complex implementation',
        description: 'Strong default for multi-file changes, debugging, and repository-aware work.',
        contextWindow: 'Large context',
      },
      {
        id: 'codex-gpt-5.4-mini',
        name: 'GPT-5.4 Mini',
        headline: 'Faster prototype loop with lower overhead',
        description: 'Good for quick iterations when latency matters more than maximum reasoning depth.',
        contextWindow: 'Large context',
      },
      {
        id: 'codex-gpt-5.2',
        name: 'GPT-5.2',
        headline: 'Steady general-purpose coding fallback',
        description: 'A stable option for routine coding and inspection workflows.',
        contextWindow: 'Large context',
      },
    ],
  },
  {
    id: 'copilot',
    label: 'GitHub Copilot',
    summary: 'GitHub-hosted coding models and agent-style workflows surfaced through Copilot.',
    models: [
      {
        id: 'copilot-claude-sonnet',
        name: 'Copilot Claude Sonnet',
        headline: 'Copilot surface with Claude-style reasoning',
        description: 'Prototype how a hosted Copilot-backed Claude option could appear in PocketDev.',
        contextWindow: 'Hosted model',
      },
      {
        id: 'copilot-gpt-4.1',
        name: 'Copilot GPT-4.1',
        headline: 'General coding assistant in the Copilot family',
        description: 'Represents a practical hosted option for editing, chat, and review tasks.',
        contextWindow: 'Hosted model',
      },
      {
        id: 'copilot-o3-mini',
        name: 'Copilot o3-mini',
        headline: 'Quick reasoning for focused edits',
        description: 'Useful for fast turnaround when the task is narrower and speed matters.',
        contextWindow: 'Hosted model',
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

export function mergeServerAvailability(capabilities: ServerCapabilities): ModelProvider[] {
  return MODEL_PROVIDERS.map((provider) => {
    const serverProvider = capabilities.providers.find((sp) => sp.id === provider.id)
    return {
      ...provider,
      availability: serverProvider?.availability ?? 'not_installed',
    }
  })
}

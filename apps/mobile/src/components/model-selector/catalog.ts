import type {
  ServerCapabilities,
  ServerProvider,
  ServerSelectableModel,
} from '@pocketdev/shared/types'
import type { ModelProvider, ModelProviderId, SelectableModel } from './model'

export const MODEL_PROVIDERS: ModelProvider[] = [
  {
    id: 'claude',
    label: 'Claude',
    summary: 'Anthropic models tuned for coding, planning, and long-context review.',
    models: [
      {
        id: 'claude-opus-4-7',
        cliModelId: 'claude-opus-4-7',
        name: 'Claude Opus 4.7',
        headline: 'Deep reasoning for harder refactors',
        description: 'Use when the task needs stronger planning or higher-confidence architectural work.',
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
  {
    id: 'copilot',
    label: 'GitHub Copilot',
    summary: 'GitHub Copilot coding agent running as a TUI session via tmux.',
    models: [
      {
        id: 'copilot-default',
        cliModelId: 'default',
        name: 'GitHub Copilot',
        headline: 'GitHub\'s AI coding agent',
        description: 'Runs as a TUI inside tmux. Model selection is managed by GitHub.',
        contextWindow: 'Managed by GitHub',
      },
    ],
  },
  {
    id: 'minimax',
    label: 'Minimax',
    summary: 'Minimax AI models via OpenCode. Requires OpenCode installed and a Minimax API key.',
    models: [
      {
        id: 'minimax-m2.7',
        cliModelId: 'minimax/MiniMax-M2.7',
        name: 'MiniMax M2.7',
        headline: 'Latest Minimax model',
        contextWindow: 'Large context',
      },
    ],
  },
]

export function getProviderById(
  providerId: ModelProviderId,
  providers: ModelProvider[] = MODEL_PROVIDERS,
): ModelProvider {
  return getProviderByIdFromList(providers, providerId)
}

export function getModelById(
  providerId: ModelProviderId,
  modelId: string,
  providers: ModelProvider[] = MODEL_PROVIDERS,
): SelectableModel {
  const provider = getProviderByIdFromList(providers, providerId)
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
  providers: ModelProvider[] = MODEL_PROVIDERS,
): string {
  const model = getModelById(providerId, modelId, providers)
  return model.cliModelId
}

export function mergeServerAvailability(capabilities: ServerCapabilities): ModelProvider[] {
  return MODEL_PROVIDERS.map((provider) => {
    const serverProvider = capabilities.providers.find((sp) => sp.id === provider.id)
    return {
      ...provider,
      models: mergeProviderModels(provider, serverProvider),
      availability: serverProvider?.availability ?? 'not_installed',
      modelDiscovery: serverProvider?.modelDiscovery,
    }
  })
}

function getProviderByIdFromList(providers: ModelProvider[], providerId: ModelProviderId): ModelProvider {
  return providers.find((provider) => provider.id === providerId) ?? providers[0]
}

function mergeProviderModels(
  provider: ModelProvider,
  serverProvider: ServerProvider | undefined,
): SelectableModel[] {
  if (provider.id !== 'copilot' && provider.id !== 'claude' && provider.id !== 'minimax') return provider.models
  if (!serverProvider?.models?.length) return provider.models
  return serverProvider.models.map(serverModelToSelectableModel)
}

function serverModelToSelectableModel(model: ServerSelectableModel): SelectableModel {
  return {
    id: model.id,
    cliModelId: model.cliModelId,
    name: model.name,
    headline: model.headline,
    description: model.description,
    contextWindow: model.contextWindow,
    premiumMultiplier: model.premiumMultiplier ?? null,
  }
}

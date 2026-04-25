import type { ProviderAvailability, ServerModelDiscovery } from '@pocketdev/shared/types'

export type ModelProviderId = 'claude' | 'codex' | 'copilot' | 'minimax'

export type SelectableModel = {
  id: string
  cliModelId: string
  name: string
  headline: string
  description?: string
  contextWindow: string
  premiumMultiplier?: number | null
}

export type ModelProvider = {
  id: ModelProviderId
  label: string
  summary: string
  models: SelectableModel[]
  availability?: ProviderAvailability
  modelDiscovery?: ServerModelDiscovery
}

import type { ProviderAvailability } from '@pocketdev/shared/types'

export type ModelProviderId = 'claude' | 'codex' | 'copilot'

export type SelectableModel = {
  id: string
  name: string
  headline: string
  description: string
  contextWindow: string
}

export type ModelProvider = {
  id: ModelProviderId
  label: string
  summary: string
  models: SelectableModel[]
  availability?: ProviderAvailability
}

import type { ProviderAvailability } from '@pocketdev/shared/types'

export type ModelProviderId = 'claude' | 'codex'

export type SelectableModel = {
  id: string
  cliModelId: string
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

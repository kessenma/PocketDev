export type ProviderAvailability = 'available' | 'installed_no_auth' | 'not_installed'

export type ServerProviderId = 'claude' | 'codex' | 'copilot'

export type ServerModelDiscoverySource = 'picker' | 'fallback' | null

export interface ServerSelectableModel {
  id: string
  cliModelId: string
  name: string
  headline: string
  description: string
  contextWindow: string
  premiumMultiplier?: number | null
}

export interface ServerModelDiscovery {
  available: boolean
  discoveredCount: number
  source: ServerModelDiscoverySource
  error?: string
}

export interface ServerProvider {
  id: ServerProviderId
  label: string
  availability: ProviderAvailability
  version: string | null
  models?: ServerSelectableModel[]
  modelDiscovery?: ServerModelDiscovery
}

export interface ServerCapabilities {
  providers: ServerProvider[]
  defaultProviderId: ServerProviderId | null
}

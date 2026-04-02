export type ProviderAvailability = 'available' | 'installed_no_auth' | 'not_installed'

export type ServerProviderId = 'claude' | 'codex'

export interface ServerProvider {
  id: ServerProviderId
  label: string
  availability: ProviderAvailability
  version: string | null
}

export interface ServerCapabilities {
  providers: ServerProvider[]
  defaultProviderId: ServerProviderId | null
}

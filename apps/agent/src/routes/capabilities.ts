import { Elysia } from 'elysia'
import type { ServerCapabilities, ServerProvider, ProviderAvailability, ServerProviderId } from '@pocketdev/shared/types'
import { authenticateRequest } from '../services/auth.ts'
import { getToolRecord, type ToolPathRow } from '../db/index.ts'

function toAvailability(row: ToolPathRow | undefined): ProviderAvailability {
  if (!row?.path) return 'not_installed'
  if (row.authenticated) return 'available'
  return 'installed_no_auth'
}

function buildProviders(): ServerProvider[] {
  const claude = getToolRecord('claude_cli')
  const codex = getToolRecord('codex_cli')
  const copilot = getToolRecord('copilot_cli')

  return [
    {
      id: 'claude',
      label: 'Claude',
      availability: toAvailability(claude),
      version: claude?.version ?? null,
    },
    {
      id: 'codex',
      label: 'Codex',
      availability: toAvailability(codex),
      version: codex?.version ?? null,
    },
    {
      id: 'copilot',
      label: 'GitHub Copilot',
      availability: toAvailability(copilot),
      version: copilot?.version ?? null,
    },
  ]
}

function pickDefault(providers: ServerProvider[]): ServerProviderId | null {
  const available = providers.find((p) => p.availability === 'available')
  return available?.id ?? null
}

export const capabilitiesRoutes = new Elysia()
  .get('/capabilities', async ({ request, set }) => {
    const deviceId = await authenticateRequest(request.headers.get('authorization'))
    if (!deviceId) {
      set.status = 401
      return { error: 'Unauthorized' }
    }

    console.log('[capabilities] GET /capabilities')
    const providers = buildProviders()
    const result: ServerCapabilities = {
      providers,
      defaultProviderId: pickDefault(providers),
    }

    return result
  })

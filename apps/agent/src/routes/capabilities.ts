import { Elysia } from 'elysia'
import type { ServerCapabilities, ServerProvider, ProviderAvailability, ServerProviderId } from '@pocketdev/shared/types'
import { authenticateRequest } from '../services/auth/auth.ts'
import { getToolRecord, type ToolPathRow } from '../db/index.ts'
import { discoverCopilotModels } from '../services/cli-setup/copilot-models.ts'
import { discoverClaudeModels } from '../services/cli-setup/claude-models.ts'
import { checkMinimaxStatus } from '../services/cli-setup/minimax-setup.ts'

function toAvailability(row: ToolPathRow | undefined): ProviderAvailability {
  if (!row?.path) return 'not_installed'
  if (row.authenticated) return 'available'
  return 'installed_no_auth'
}

async function buildProviders(): Promise<ServerProvider[]> {
  const claude = getToolRecord('claude_cli')
  const codex = getToolRecord('codex_cli')
  const copilot = getToolRecord('copilot_cli')
  const [claudeModels, copilotModels, minimaxStatus] = await Promise.all([
    discoverClaudeModels(),
    discoverCopilotModels(),
    checkMinimaxStatus(),
  ])

  const minimaxAvailability: ProviderAvailability = minimaxStatus.api_key_configured && minimaxStatus.opencode_installed
    ? 'available'
    : 'not_installed'

  return [
    {
      id: 'claude',
      label: 'Claude',
      availability: toAvailability(claude),
      version: claude?.version ?? null,
      models: claudeModels.models,
      modelDiscovery: claudeModels.modelDiscovery,
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
      models: copilotModels.models,
      modelDiscovery: copilotModels.modelDiscovery,
    },
    {
      id: 'minimax',
      label: 'Minimax',
      availability: minimaxAvailability,
      version: minimaxStatus.opencode_version ?? null,
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
    const providers = await buildProviders()
    const result: ServerCapabilities = {
      providers,
      defaultProviderId: pickDefault(providers),
    }

    return result
  })

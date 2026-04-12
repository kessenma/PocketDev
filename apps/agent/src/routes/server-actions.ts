import { Elysia } from 'elysia'
import { authenticateRequest } from '../services/auth/auth.ts'
import {
  ServerActionsError,
  getSystemSummary,
  getListeningPorts,
  getNetworkStats,
  getRecentErrors,
  getActionCatalog,
  runNamedAction,
} from '../services/tasks/server-actions.ts'

function handleError(error: unknown, set: { status?: number | string }) {
  const message = error instanceof Error ? error.message : 'Server actions operation failed'
  set.status = error instanceof ServerActionsError ? error.statusCode : 500
  return { error: message }
}

export const serverActionsRoutes = new Elysia({ prefix: '/server-actions' })
  .get('/summary', async ({ request, set }) => {
    const deviceId = await authenticateRequest(request.headers.get('authorization'))
    if (!deviceId) { set.status = 401; return { error: 'Unauthorized' } }

    try {
      console.log('[server-actions] GET /server-actions/summary')
      return await getSystemSummary()
    } catch (error) {
      return handleError(error, set)
    }
  })

  .get('/ports', async ({ request, set }) => {
    const deviceId = await authenticateRequest(request.headers.get('authorization'))
    if (!deviceId) { set.status = 401; return { error: 'Unauthorized' } }

    try {
      return { ports: await getListeningPorts() }
    } catch (error) {
      return handleError(error, set)
    }
  })

  .get('/network', async ({ request, set }) => {
    const deviceId = await authenticateRequest(request.headers.get('authorization'))
    if (!deviceId) { set.status = 401; return { error: 'Unauthorized' } }

    try {
      return { entries: await getNetworkStats() }
    } catch (error) {
      return handleError(error, set)
    }
  })

  .get('/errors', async ({ request, set }) => {
    const deviceId = await authenticateRequest(request.headers.get('authorization'))
    if (!deviceId) { set.status = 401; return { error: 'Unauthorized' } }

    try {
      return { errors: await getRecentErrors() }
    } catch (error) {
      return handleError(error, set)
    }
  })

  .get('/actions', async ({ request, set }) => {
    const deviceId = await authenticateRequest(request.headers.get('authorization'))
    if (!deviceId) { set.status = 401; return { error: 'Unauthorized' } }

    return { actions: getActionCatalog() }
  })

  .post('/actions/:actionId/run', async ({ request, params, set }) => {
    const deviceId = await authenticateRequest(request.headers.get('authorization'))
    if (!deviceId) { set.status = 401; return { error: 'Unauthorized' } }

    try {
      return await runNamedAction(params.actionId)
    } catch (error) {
      return handleError(error, set)
    }
  })

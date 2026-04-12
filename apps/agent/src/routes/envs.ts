import { Elysia, t } from 'elysia'
import { authenticateRequest } from '../services/auth/auth.ts'
import {
  listEnvVars,
  createEnvVar,
  updateEnvVarById,
  deleteEnvVarById,
  bulkUpsertEnvVars,
} from '../services/system/env-vars.ts'

export const envRoutes = new Elysia({ prefix: '/envs' })
  .get('', async ({ request, query, set }) => {
    const deviceId = await authenticateRequest(request.headers.get('authorization'))
    if (!deviceId) { set.status = 401; return { error: 'Unauthorized' } }
    return { envVars: listEnvVars(query.projectPath) }
  }, {
    query: t.Object({ projectPath: t.String() }),
  })
  .post('', async ({ request, body, set }) => {
    const deviceId = await authenticateRequest(request.headers.get('authorization'))
    if (!deviceId) { set.status = 401; return { error: 'Unauthorized' } }
    try {
      return createEnvVar(body)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to create env var'
      if (message.includes('UNIQUE')) {
        set.status = 409
        return { error: 'A variable with this key already exists for this project' }
      }
      set.status = 500
      return { error: message }
    }
  }, {
    body: t.Object({
      projectPath: t.String(),
      key: t.String(),
      value: t.Optional(t.Nullable(t.String())),
      comment: t.Optional(t.Nullable(t.String())),
      isSecret: t.Optional(t.Boolean()),
      isMultiline: t.Optional(t.Boolean()),
    }),
  })
  // /bulk MUST be registered before /:id to avoid greedy param matching
  .patch('/bulk', async ({ request, body, set }) => {
    const deviceId = await authenticateRequest(request.headers.get('authorization'))
    if (!deviceId) { set.status = 401; return { error: 'Unauthorized' } }
    return { envVars: bulkUpsertEnvVars(body.projectPath, body.data) }
  }, {
    body: t.Object({
      projectPath: t.String(),
      data: t.Array(t.Object({
        key: t.String(),
        value: t.Optional(t.Nullable(t.String())),
        comment: t.Optional(t.Nullable(t.String())),
        isSecret: t.Optional(t.Boolean()),
        isMultiline: t.Optional(t.Boolean()),
      })),
    }),
  })
  .patch('/:id', async ({ request, params, body, set }) => {
    const deviceId = await authenticateRequest(request.headers.get('authorization'))
    if (!deviceId) { set.status = 401; return { error: 'Unauthorized' } }
    const result = updateEnvVarById(params.id, body)
    if (!result) { set.status = 404; return { error: 'Env var not found' } }
    return result
  }, {
    body: t.Object({
      key: t.Optional(t.String()),
      value: t.Optional(t.Nullable(t.String())),
      comment: t.Optional(t.Nullable(t.String())),
      isSecret: t.Optional(t.Boolean()),
      isMultiline: t.Optional(t.Boolean()),
      order: t.Optional(t.Number()),
    }),
  })
  .delete('/:id', async ({ request, params, set }) => {
    const deviceId = await authenticateRequest(request.headers.get('authorization'))
    if (!deviceId) { set.status = 401; return { error: 'Unauthorized' } }
    deleteEnvVarById(params.id)
    set.status = 204
    return null
  })

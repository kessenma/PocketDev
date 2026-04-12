import { Elysia, t } from 'elysia'
import { authenticateRequest } from '../services/auth/auth.ts'
import {
  cloneProject,
  createBranchForProject,
  listProjects,
  selectProject,
} from '../services/system/projects.ts'
import { GitServiceError } from '../services/git/git.ts'

function handleError(error: unknown, set: { status?: number | string }) {
  const message = error instanceof Error ? error.message : 'Project operation failed'
  if (error instanceof GitServiceError) {
    set.status = error.statusCode
    return { error: message, code: error.code }
  }
  set.status = 500
  return { error: message, code: 'command_failed' }
}

export const projectRoutes = new Elysia({ prefix: '/projects' })
  .get('', async ({ request, set }) => {
    const deviceId = await authenticateRequest(request.headers.get('authorization'))
    if (!deviceId) { set.status = 401; return { error: 'Unauthorized' } }

    try {
      return await listProjects()
    } catch (error) {
      return handleError(error, set)
    }
  })
  .post('/select', async ({ request, body, set }) => {
    const deviceId = await authenticateRequest(request.headers.get('authorization'))
    if (!deviceId) { set.status = 401; return { error: 'Unauthorized' } }

    try {
      return await selectProject(body.projectId, body.pullLatest ?? false)
    } catch (error) {
      return handleError(error, set)
    }
  }, {
    body: t.Object({
      projectId: t.String(),
      pullLatest: t.Optional(t.Boolean()),
    }),
  })
  .post('/clone', async ({ request, body, set }) => {
    const deviceId = await authenticateRequest(request.headers.get('authorization'))
    if (!deviceId) { set.status = 401; return { error: 'Unauthorized' } }

    try {
      return await cloneProject(body.projectId, body.branchMode, body.newBranchName)
    } catch (error) {
      return handleError(error, set)
    }
  }, {
    body: t.Object({
      projectId: t.String(),
      branchMode: t.Optional(t.Union([t.Literal('default'), t.Literal('new')])),
      newBranchName: t.Optional(t.String()),
    }),
  })
  .post('/branch', async ({ request, body, set }) => {
    const deviceId = await authenticateRequest(request.headers.get('authorization'))
    if (!deviceId) { set.status = 401; return { error: 'Unauthorized' } }

    try {
      return await createBranchForProject(body.projectId, body.branchName)
    } catch (error) {
      return handleError(error, set)
    }
  }, {
    body: t.Object({
      projectId: t.String(),
      branchName: t.String(),
    }),
  })

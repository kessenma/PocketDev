import { Elysia, t } from 'elysia'
import { authenticateRequest } from '../services/auth.ts'
import { checkPkgManagerStatus, installPkgTool, verifyPkgManagers } from '../services/pkg-setup.ts'

export const pkgSetupRoutes = new Elysia({ prefix: '/pkg-setup' })
  .get('/status', async ({ request, set }) => {
    const deviceId = await authenticateRequest(request.headers.get('authorization'))
    if (!deviceId) { set.status = 401; return { error: 'Unauthorized' } }

    return checkPkgManagerStatus()
  })

  .post('/verify', async ({ request, set }) => {
    const deviceId = await authenticateRequest(request.headers.get('authorization'))
    if (!deviceId) { set.status = 401; return { error: 'Unauthorized' } }

    return verifyPkgManagers()
  })
  .post('/install', async ({ request, set, body }) => {
    const deviceId = await authenticateRequest(request.headers.get('authorization'))
    if (!deviceId) { set.status = 401; return { error: 'Unauthorized' } }

    return installPkgTool(body.tool)
  }, {
    body: t.Object({
      tool: t.Union([
        t.Literal('nvm'),
        t.Literal('npm'),
        t.Literal('pnpm'),
        t.Literal('bun'),
      ]),
    }),
  })

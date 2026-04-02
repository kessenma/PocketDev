import { Elysia, t } from 'elysia'
import { authenticateRequest } from '../services/auth.ts'
import {
  checkSshStatus,
  generateSshKey,
  readPublicKey,
  configureIdentity,
  testGithubConnection,
} from '../services/git-setup.ts'

export const gitSetupRoutes = new Elysia({ prefix: '/git-setup' })
  .get('/ssh-status', async ({ request, set }) => {
    const deviceId = await authenticateRequest(request.headers.get('authorization'))
    if (!deviceId) { set.status = 401; return { error: 'Unauthorized' } }

    return checkSshStatus()
  })

  .post('/generate-key', async ({ request, set, body }) => {
    const deviceId = await authenticateRequest(request.headers.get('authorization'))
    if (!deviceId) { set.status = 401; return { error: 'Unauthorized' } }

    return generateSshKey(body.overwrite ?? false)
  }, {
    body: t.Object({
      overwrite: t.Optional(t.Boolean()),
    }),
  })

  .get('/public-key', async ({ request, set }) => {
    const deviceId = await authenticateRequest(request.headers.get('authorization'))
    if (!deviceId) { set.status = 401; return { error: 'Unauthorized' } }

    const key = await readPublicKey()
    if (!key) { set.status = 404; return { error: 'No SSH public key found' } }
    return { public_key: key }
  })

  .post('/configure-identity', async ({ request, set, body }) => {
    const deviceId = await authenticateRequest(request.headers.get('authorization'))
    if (!deviceId) { set.status = 401; return { error: 'Unauthorized' } }

    if (!body.name?.trim() || !body.email?.trim()) {
      set.status = 400
      return { error: 'Name and email are required' }
    }

    return configureIdentity(body.name.trim(), body.email.trim())
  }, {
    body: t.Object({
      name: t.String(),
      email: t.String(),
    }),
  })

  .post('/test-connection', async ({ request, set }) => {
    const deviceId = await authenticateRequest(request.headers.get('authorization'))
    if (!deviceId) { set.status = 401; return { error: 'Unauthorized' } }

    return testGithubConnection()
  })

import { Elysia } from 'elysia'
import {
  DATABASE_TEMPLATES,
  createDatabase,
  startDatabase,
  stopDatabase,
  removeDatabase,
  fillDefaultPasswords,
} from '../services/databases.ts'
import type { DatabaseCreateRequest } from '@pocketdev/shared/types'

export const databaseRoutes = new Elysia({ prefix: '/databases' })

  // List available database templates
  .get('/templates', () => DATABASE_TEMPLATES)

  // Create a new database container
  .post('/create', async ({ body, set }) => {
    const request = body as DatabaseCreateRequest

    // Fill in auto-generated passwords for empty fields
    request.env_vars = fillDefaultPasswords(request.env_vars, request.password)

    const result = await createDatabase(request)

    if (!result.success) {
      set.status = 500
      return { error: result.error }
    }

    return {
      container_id: result.container_id,
      connection_uri: result.connection_uri,
    }
  })

  // Start a stopped database container
  .post('/start/:containerId', async ({ params, set }) => {
    const ok = await startDatabase(params.containerId)
    if (!ok) {
      set.status = 500
      return { error: 'Failed to start container' }
    }
    return { status: 'started' }
  })

  // Stop a running database container
  .post('/stop/:containerId', async ({ params, set }) => {
    const ok = await stopDatabase(params.containerId)
    if (!ok) {
      set.status = 500
      return { error: 'Failed to stop container' }
    }
    return { status: 'stopped' }
  })

  // Remove a database container and its data
  .delete('/:containerId', async ({ params, set }) => {
    const ok = await removeDatabase(params.containerId)
    if (!ok) {
      set.status = 500
      return { error: 'Failed to remove container' }
    }
    return { status: 'removed' }
  })

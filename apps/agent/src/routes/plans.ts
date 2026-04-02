import { Elysia, t } from 'elysia'
import { authenticateRequest } from '../services/auth.ts'
import {
  proposePlan,
  getActivePlanEntry,
  getPlanHistoryEntries,
} from '../services/plan-manager.ts'

export const planRoutes = new Elysia({ prefix: '/plans' })
  .get('/active', async ({ request, set }) => {
    const deviceId = await authenticateRequest(request.headers.get('authorization'))
    if (!deviceId) { set.status = 401; return { error: 'Unauthorized' } }

    console.log('[plans] GET /plans/active')
    const plan = getActivePlanEntry()
    return { plan }
  })

  .get('/history', async ({ request, query, set }) => {
    const deviceId = await authenticateRequest(request.headers.get('authorization'))
    if (!deviceId) { set.status = 401; return { error: 'Unauthorized' } }

    const limit = query.limit ? parseInt(query.limit, 10) : 20
    return { plans: getPlanHistoryEntries(limit) }
  }, {
    query: t.Object({
      limit: t.Optional(t.String()),
    }),
  })

  // Dev-only: inject a test plan for a running task
  .post('/inject', async ({ request, body, set }) => {
    if (process.env.POCKETDEV_DEV_MODE !== '1') {
      set.status = 403
      return { error: 'Plan injection is only available in dev mode' }
    }

    const deviceId = await authenticateRequest(request.headers.get('authorization'))
    if (!deviceId) { set.status = 401; return { error: 'Unauthorized' } }

    const planId = proposePlan(
      body.taskId,
      body.title,
      body.description,
      body.agentName,
      body.steps.map((s: any) => ({
        id: s.id ?? crypto.randomUUID(),
        kind: s.kind ?? 'note',
        title: s.title,
        description: s.description ?? '',
        filePath: s.filePath,
        completed: false,
      })),
      body.questions.map((q: any) => ({
        id: q.id ?? crypto.randomUUID(),
        question: q.question,
        required: q.required ?? false,
      })),
    )

    return { ok: true, planId }
  }, {
    body: t.Object({
      taskId: t.String(),
      title: t.String(),
      description: t.String(),
      agentName: t.String(),
      steps: t.Array(t.Object({
        id: t.Optional(t.String()),
        kind: t.Optional(t.String()),
        title: t.String(),
        description: t.Optional(t.String()),
        filePath: t.Optional(t.String()),
      })),
      questions: t.Array(t.Object({
        id: t.Optional(t.String()),
        question: t.String(),
        required: t.Optional(t.Boolean()),
      })),
    }),
  })

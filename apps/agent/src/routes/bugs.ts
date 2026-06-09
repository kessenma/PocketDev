import { Elysia, t } from 'elysia'
import { authenticateRequest } from '../services/auth/auth.ts'

async function exec(args: string[]): Promise<{ stdout: string; stderr: string; exitCode: number }> {
  const proc = Bun.spawn(args, { stdout: 'pipe', stderr: 'pipe' })
  const [stdout, stderr] = await Promise.all([
    new Response(proc.stdout).text(),
    new Response(proc.stderr).text(),
  ])
  await proc.exited
  return { stdout: stdout.trim(), stderr: stderr.trim(), exitCode: proc.exitCode ?? 1 }
}

export const bugsRoutes = new Elysia({ prefix: '/bugs' })

  .post('/report', async ({ request, body, set }) => {
    const deviceId = await authenticateRequest(request.headers.get('authorization'))
    if (!deviceId) { set.status = 401; return { error: 'Unauthorized' } }

    const { title, body: issueBody } = body

    // Verify gh cli is authenticated before attempting
    const authCheck = await exec(['gh', 'auth', 'status'])
    if (authCheck.exitCode !== 0) {
      set.status = 400
      return { error: 'GitHub CLI is not authenticated on this server. Configure GitHub in Workspace Tools first.' }
    }

    const result = await exec([
      'gh', 'issue', 'create',
      '--repo', 'kessenma/PocketDev',
      '--title', title,
      '--body', issueBody,
      '--label', 'bug',
    ])

    if (result.exitCode !== 0) {
      console.error('[bugs] gh issue create failed:', result.stderr)
      set.status = 500
      return { error: result.stderr || 'Failed to create GitHub issue' }
    }

    // gh issue create prints the issue URL on stdout
    const url = result.stdout
    return { url }
  }, {
    body: t.Object({
      title: t.String({ minLength: 1 }),
      body: t.String({ minLength: 1 }),
    }),
  })

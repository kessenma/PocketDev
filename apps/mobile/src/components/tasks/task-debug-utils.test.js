const { inferTaskDebugSelection } = require('./task-debug-utils')

describe('inferTaskDebugSelection', () => {
  const baseTask = {
    id: 'task-1',
    prompt: 'hello',
    agent_type: 'codex',
    mode: 'default',
    model: 'gpt-5.3-codex',
    status: 'failed',
    working_directory: null,
    project_id: null,
    project_name: null,
    session_id: null,
    turn_count: 1,
    created_at: '2026-01-01T00:00:00.000Z',
    started_at: '2026-01-01T00:00:00.000Z',
    completed_at: '2026-01-01T00:00:01.000Z',
  }

  it('preselects auth for token_expired logs', () => {
    expect(inferTaskDebugSelection({
      task: baseTask,
      logs: ['Provided authentication token is expired. token_expired'],
    })).toBe('auth')
  })

  it('preselects auth for refresh token reused logs', () => {
    expect(inferTaskDebugSelection({
      task: baseTask,
      logs: ['Your refresh token has already been used to generate a new access token. refresh_token_reused'],
    })).toBe('auth')
  })

  it('returns null when there is no task context', () => {
    expect(inferTaskDebugSelection({
      task: null,
      logs: ['401 Unauthorized'],
    })).toBeNull()
  })

  it('can map permission signals to permissions', () => {
    expect(inferTaskDebugSelection({
      task: { ...baseTask, agent_type: 'claude' },
      pendingPermissions: [{ tool_name: 'Read' }],
    })).toBe('permissions')
  })
})

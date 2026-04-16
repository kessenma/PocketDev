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

  // Claude auth inference
  it('preselects auth for Claude task with "not logged in" log', () => {
    expect(inferTaskDebugSelection({
      task: { ...baseTask, agent_type: 'claude' },
      logs: ['Error: not logged in. Please authenticate.'],
    })).toBe('auth')
  })

  it('preselects auth for Claude task with 401 Unauthorized log', () => {
    expect(inferTaskDebugSelection({
      task: { ...baseTask, agent_type: 'claude' },
      logs: ['[error] 401 Unauthorized'],
    })).toBe('auth')
  })

  it('preselects auth for Claude task with authentication_error in logs', () => {
    expect(inferTaskDebugSelection({
      task: { ...baseTask, agent_type: 'claude' },
      logs: ['{"type":"error","error":{"type":"authentication_error","message":"invalid x-api-key"}}'],
    })).toBe('auth')
  })

  it('preselects auth for Claude task when setup report says unauthenticated', () => {
    expect(inferTaskDebugSelection({
      task: { ...baseTask, agent_type: 'claude' },
      logs: [],
      report: { tools: [{ id: 'claude_cli', auth_status: 'unauthenticated' }] },
    })).toBe('auth')
  })

  it('returns null for Claude task with no failure signals', () => {
    expect(inferTaskDebugSelection({
      task: { ...baseTask, agent_type: 'claude' },
      logs: ['Working on it...'],
    })).toBeNull()
  })

  it('prefers auth over permissions when both signals present for Claude', () => {
    expect(inferTaskDebugSelection({
      task: { ...baseTask, agent_type: 'claude' },
      logs: ['not logged in'],
      pendingPermissions: [{ tool_name: 'Bash' }],
    })).toBe('auth')
  })
})

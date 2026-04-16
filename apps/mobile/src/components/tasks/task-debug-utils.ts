import type { PrerequisitesReport, Task, TaskActivity } from '@pocketdev/shared/types'

export type TaskDebugIssueKind = 'auth' | 'permissions'
export type TaskDebugSelection = TaskDebugIssueKind | null

const CODEX_AUTH_PATTERNS = [
  /401 unauthorized/i,
  /token_expired/i,
  /refresh_token_reused/i,
  /please log out and sign in again/i,
  /failed to refresh token/i,
  /provided authentication token is expired/i,
  /codex.*responses.*401 unauthorized/i,
  /codex.*models.*401 unauthorized/i,
]

const CLAUDE_AUTH_PATTERNS = [
  /not logged in/i,
  /please authenticate/i,
  /authentication required/i,
  /run.*claude.*auth/i,
  /you are not logged in/i,
  /invalid api key/i,
  /api key not found/i,
  /authentication_error/i,
  /401 unauthorized/i,
]

export function inferTaskDebugSelection(opts: {
  task?: Task | null
  logs?: string[]
  activities?: TaskActivity[]
  pendingPermissions?: Array<unknown>
  report?: PrerequisitesReport | null
}): TaskDebugSelection {
  const { task, logs = [], activities = [], pendingPermissions = [], report = null } = opts
  if (!task) return null

  if (task.agent_type === 'codex' && looksLikeCodexAuthIssue(logs, activities, report)) {
    return 'auth'
  }
  if (task.agent_type === 'claude' && looksLikeClaudeAuthIssue(logs, activities, report)) {
    return 'auth'
  }

  if (pendingPermissions.length > 0) {
    return 'permissions'
  }

  return null
}

function looksLikeClaudeAuthIssue(
  logs: string[],
  activities: TaskActivity[],
  report: PrerequisitesReport | null,
) {
  const joinedLogs = logs.join('\n')
  if (CLAUDE_AUTH_PATTERNS.some((p) => p.test(joinedLogs))) return true

  const activityText = activities
    .filter((activity) => activity.type === 'text' || activity.type === 'status')
    .map((activity) => activity.type === 'text' ? activity.content : activity.message)
    .join('\n')
  if (CLAUDE_AUTH_PATTERNS.some((p) => p.test(activityText))) return true

  const claudeTool = report?.tools.find((t) => t.id === 'claude_cli')
  return claudeTool?.auth_status === 'unauthenticated'
}

function looksLikeCodexAuthIssue(
  logs: string[],
  activities: TaskActivity[],
  report: PrerequisitesReport | null,
) {
  const joinedLogs = logs.join('\n')
  if (CODEX_AUTH_PATTERNS.some((pattern) => pattern.test(joinedLogs))) return true

  const activityText = activities
    .filter((activity) => activity.type === 'text' || activity.type === 'status')
    .map((activity) => activity.type === 'text' ? activity.content : activity.message)
    .join('\n')
  if (CODEX_AUTH_PATTERNS.some((pattern) => pattern.test(activityText))) return true

  const codexTool = report?.tools.find((tool) => tool.id === 'codex_cli')
  return codexTool?.auth_status === 'unauthenticated'
}

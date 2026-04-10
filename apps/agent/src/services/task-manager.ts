import { insertTask, getRecentTasks, getToolPath, getProject, getTask, insertTaskTurn, resetTaskForContinuation } from '../db/index.ts'
import { ManagedProcess } from './managed-process.ts'
import { ManagedTmuxProcess } from './managed-tmux-process.ts'
import { getActiveProjectId } from './projects.ts'

/** Active processes keyed by task ID — only holds running processes, cleaned up on completion */
const processes = new Map<string, ManagedProcess | ManagedTmuxProcess>()

type TaskMode = 'default' | 'plan'

/** Build the command array for a given agent type, using stored tool paths when available */
export function buildCommand(agentType: string, prompt: string, model: string | null, mode: TaskMode, sessionId?: string): string[] {
  switch (agentType) {
    case 'claude': {
      const claudePath = getToolPath('claude_cli') ?? 'claude'
      const permissionMode = mode === 'plan' ? 'plan' : 'acceptEdits'
      const cmd = [
        claudePath,
        '--output-format', 'stream-json',
        '--permission-mode', permissionMode,
        '--verbose',
      ]
      if (sessionId) cmd.push('--session-id', sessionId)
      if (model) cmd.push('--model', model)
      cmd.push('-p', prompt)
      return cmd
    }
    case 'codex': {
      const codexPath = getToolPath('codex_cli') ?? 'codex'
      const cmd = [codexPath, 'exec', '--json', '--color', 'never']
      if (model) cmd.push('--model', model)
      if (mode === 'plan') cmd.push('-c', 'collaboration_mode="plan"')
      cmd.push(prompt)
      return cmd
    }
    case 'copilot': {
      const copilotPath = getToolPath('copilot_cli') ?? 'copilot'
      const cmd = [copilotPath]
      if (model) cmd.push('--model', model)
      return cmd
    }
    case 'shell':
      return ['sh', '-c', prompt]
    default:
      throw new Error(`Unknown agent type: ${agentType}`)
  }
}

/** Start a new task */
export function startTask(
  prompt: string,
  agentType: string,
  workingDirectory: string | null,
  model: string | null = null,
  mode: TaskMode = 'default',
): string {
  const taskId = crypto.randomUUID()
  const sessionId = agentType === 'claude' ? crypto.randomUUID() : null
  const projectId = getActiveProjectId()
  const project = projectId ? getProject(projectId) : undefined
  const cwd = workingDirectory ?? project?.absolutePath ?? process.env.POCKETDEV_PROJECT_DIR ?? process.env.HOME ?? '/'
  insertTask(taskId, prompt, agentType, mode, cwd, project?.id ?? null, project?.name ?? null, model, sessionId)

  // Record the initial user turn
  if (sessionId) {
    insertTaskTurn(crypto.randomUUID(), taskId, 1, 'user', prompt)
  }

  const onComplete = () => { processes.delete(taskId) }

  if (agentType === 'copilot') {
    console.log(`[task-manager] Starting copilot tmux task ${taskId}`)
    console.log(`[task-manager]   cwd=${cwd} model=${model ?? 'default'} mode=${mode} agent=${agentType}`)
    const proc = new ManagedTmuxProcess({ taskId, prompt, cwd, mode, model, onComplete })
    processes.set(taskId, proc)
    proc.start()
  } else {
    const command = buildCommand(agentType, prompt, model, mode, sessionId ?? undefined)
    console.log(`[task-manager] Starting task ${taskId}: ${command.map((c) => c.includes(' ') ? `"${c}"` : c).join(' ')}`)
    console.log(`[task-manager]   cwd=${cwd} model=${model ?? 'default'} mode=${mode} agent=${agentType}`)
    const proc = new ManagedProcess({ taskId, command, cwd, mode, agentType, onComplete })
    processes.set(taskId, proc)
    proc.start()
  }

  return taskId
}

/** Continue a completed Claude task with a follow-up message */
export function continueTask(taskId: string, prompt: string, model: string | null = null): boolean {
  const task = getTask(taskId)
  if (!task) return false
  if (task.status !== 'completed' && task.status !== 'failed') return false
  if (task.agentType !== 'claude' || !task.sessionId) return false

  const newTurnCount = (task.turnCount ?? 1) + 1
  const turnModel = model ?? task.model

  // Build resume command
  const claudePath = getToolPath('claude_cli') ?? 'claude'
  const command = [
    claudePath,
    '--output-format', 'stream-json',
    '--permission-mode', 'acceptEdits',
    '--verbose',
    '--resume', task.sessionId,
  ]
  if (turnModel) command.push('--model', turnModel)
  command.push('-p', prompt)

  // Record the user turn
  insertTaskTurn(crypto.randomUUID(), taskId, newTurnCount, 'user', prompt)

  // Reset task status for the new turn
  resetTaskForContinuation(taskId, newTurnCount)

  const cwd = task.workingDirectory ?? process.env.POCKETDEV_PROJECT_DIR ?? process.env.HOME ?? '/'
  console.log(`[task-manager] Continuing task ${taskId} (turn ${newTurnCount}): ${command.map((c) => c.includes(' ') ? `"${c}"` : c).join(' ')}`)

  const proc = new ManagedProcess({ taskId, command, cwd, mode: 'default', agentType: 'claude', turnNumber: newTurnCount, onComplete: () => { processes.delete(taskId) } })
  processes.set(taskId, proc)
  proc.start()

  return true
}

/** Kill a running task */
export function killTask(taskId: string): boolean {
  const proc = processes.get(taskId)
  if (!proc) return false
  proc.kill()
  return true
}

/** Get list of recent tasks with their status */
export function getTaskList() {
  return getRecentTasks(50)
}

/** Get a specific active process */
export function getProcess(taskId: string): ManagedProcess | ManagedTmuxProcess | undefined {
  return processes.get(taskId)
}

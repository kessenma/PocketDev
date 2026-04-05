import { insertTask, getRecentTasks, getToolPath, getProject } from '../db/index.ts'
import { ManagedProcess } from './managed-process.ts'
import { getActiveProjectId } from './projects.ts'

/** Active processes keyed by task ID */
const processes = new Map<string, ManagedProcess>()

type TaskMode = 'default' | 'plan'

/** Build the command array for a given agent type, using stored tool paths when available */
function buildCommand(agentType: string, prompt: string, model: string | null, mode: TaskMode): string[] {
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
      if (model) cmd.push('--model', model)
      cmd.push('-p', prompt)
      return cmd
    }
    case 'codex': {
      const codexPath = getToolPath('codex_cli') ?? 'codex'
      const cmd = [codexPath]
      if (model) cmd.push('--model', model)
      if (mode === 'plan') cmd.push('-c', 'collaboration_mode="plan"')
      cmd.push('--prompt', prompt)
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
  const projectId = getActiveProjectId()
  const project = projectId ? getProject(projectId) : undefined
  const cwd = workingDirectory ?? project?.absolutePath ?? process.env.POCKETDEV_PROJECT_DIR ?? process.env.HOME ?? '/'
  insertTask(taskId, prompt, agentType, mode, cwd, project?.id ?? null, project?.name ?? null, model)

  const command = buildCommand(agentType, prompt, model, mode)
  console.log(`[task-manager] Starting task ${taskId}: ${command.map((c) => c.includes(' ') ? `"${c}"` : c).join(' ')}`)
  console.log(`[task-manager]   cwd=${cwd} model=${model ?? 'default'} mode=${mode} agent=${agentType}`)
  const proc = new ManagedProcess(taskId, command, cwd)
  processes.set(taskId, proc)

  proc.start()

  return taskId
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
export function getProcess(taskId: string): ManagedProcess | undefined {
  return processes.get(taskId)
}

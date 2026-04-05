import { insertTask, getRecentTasks, getToolPath, getProject } from '../db/index.ts'
import { ManagedProcess } from './managed-process.ts'
import { getActiveProjectId } from './projects.ts'

/** Active processes keyed by task ID */
const processes = new Map<string, ManagedProcess>()

/** Build the command array for a given agent type, using stored tool paths when available */
function buildCommand(agentType: string, prompt: string, model: string | null): string[] {
  switch (agentType) {
    case 'claude': {
      const claudePath = getToolPath('claude_cli') ?? 'claude'
      const cmd = [claudePath, '--dangerously-skip-permissions']
      if (model) cmd.push('--model', model)
      cmd.push('-p', prompt)
      return cmd
    }
    case 'codex': {
      const codexPath = getToolPath('codex_cli') ?? 'codex'
      const cmd = [codexPath]
      if (model) cmd.push('--model', model)
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
): string {
  const taskId = crypto.randomUUID()
  const projectId = getActiveProjectId()
  const project = projectId ? getProject(projectId) : undefined
  const cwd = workingDirectory ?? project?.absolutePath ?? process.env.POCKETDEV_PROJECT_DIR ?? process.env.HOME ?? '/'
  insertTask(taskId, prompt, agentType, cwd, project?.id ?? null, project?.name ?? null, model)

  const command = buildCommand(agentType, prompt, model)
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

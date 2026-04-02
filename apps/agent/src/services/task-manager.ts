import { insertTask, getRecentTasks, getToolPath } from '../db/index.ts'
import { ManagedProcess } from './managed-process.ts'

/** Active processes keyed by task ID */
const processes = new Map<string, ManagedProcess>()

/** Build the command array for a given agent type, using stored tool paths when available */
function buildCommand(agentType: string, prompt: string): string[] {
  switch (agentType) {
    case 'claude': {
      const claudePath = getToolPath('claude_cli') ?? 'claude'
      return [claudePath, '--dangerously-skip-permissions', '-p', prompt]
    }
    case 'codex': {
      const codexPath = getToolPath('codex_cli') ?? 'codex'
      return [codexPath, '--prompt', prompt]
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
): string {
  const taskId = crypto.randomUUID()

  insertTask(taskId, prompt, agentType, workingDirectory)

  const command = buildCommand(agentType, prompt)
  const proc = new ManagedProcess(taskId, command, workingDirectory)
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

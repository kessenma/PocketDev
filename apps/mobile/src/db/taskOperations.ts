import type { DB } from '@op-engineering/op-sqlite'
import type { Task } from '@pocketdev/shared/types'

// ─── Task metadata ──────────────────────────────────────

/** Insert or update tasks from server data */
export async function upsertTasks(db: DB, tasks: Task[]): Promise<void> {
  for (const task of tasks) {
    await db.execute(
      `INSERT OR REPLACE INTO tasks
        (id, prompt, agent_type, mode, model, status, project_id, project_name, working_directory, created_at, started_at, completed_at, exit_code)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        task.id,
        task.prompt,
        task.agent_type,
        task.mode,
        task.model ?? null,
        task.status,
        task.project_id ?? null,
        task.project_name ?? null,
        task.working_directory ?? null,
        task.created_at,
        task.started_at ?? null,
        task.completed_at ?? null,
        null, // exit_code not on the Task type from server list
      ],
    )
  }
}

/** Get cached tasks ordered by newest first */
export async function getCachedTasks(db: DB, limit = 50): Promise<Task[]> {
  const result = await db.execute(
    'SELECT * FROM tasks ORDER BY created_at DESC LIMIT ?',
    [limit],
  )

  return (result.rows ?? []).map(rowToTask)
}

/** Get a single task by ID */
export async function getTask(db: DB, id: string): Promise<Task | null> {
  const result = await db.execute('SELECT * FROM tasks WHERE id = ?', [id])
  const row = result.rows?.[0]
  return row ? rowToTask(row) : null
}

/** Update a task's status in the local DB */
export async function updateCachedTaskStatus(
  db: DB,
  taskId: string,
  status: string,
): Promise<void> {
  const now = new Date().toISOString()
  if (status === 'running') {
    await db.execute('UPDATE tasks SET status = ?, started_at = ? WHERE id = ?', [status, now, taskId])
  } else if (status === 'completed' || status === 'failed' || status === 'killed') {
    await db.execute('UPDATE tasks SET status = ?, completed_at = ? WHERE id = ?', [status, now, taskId])
  } else {
    await db.execute('UPDATE tasks SET status = ? WHERE id = ?', [status, taskId])
  }
}

function rowToTask(row: any): Task {
  return {
    id: row.id,
    prompt: row.prompt,
    agent_type: row.agent_type,
    mode: row.mode,
    model: row.model ?? null,
    status: row.status,
    project_id: row.project_id ?? null,
    project_name: row.project_name ?? null,
    working_directory: row.working_directory ?? null,
    created_at: row.created_at,
    started_at: row.started_at ?? null,
    completed_at: row.completed_at ?? null,
  }
}

// ─── Task logs ──────────────────────────────────────────

/** Save log lines to local DB */
export async function saveTaskLogs(
  db: DB,
  taskId: string,
  logs: Array<{ stream: string; line: string }>,
): Promise<void> {
  // Clear existing logs for this task before saving (full replace)
  await db.execute('DELETE FROM task_logs WHERE task_id = ?', [taskId])

  for (const log of logs) {
    await db.execute(
      'INSERT INTO task_logs (task_id, stream, line) VALUES (?, ?, ?)',
      [taskId, log.stream, log.line],
    )
  }
}

/** Get cached log lines for a task (chronological order) */
export async function getCachedTaskLogs(db: DB, taskId: string): Promise<string[]> {
  const result = await db.execute(
    'SELECT line FROM task_logs WHERE task_id = ? ORDER BY id ASC',
    [taskId],
  )
  return (result.rows ?? []).map((row: any) => row.line as string)
}

/** Check if we have any cached logs for a task */
export async function hasTaskLogs(db: DB, taskId: string): Promise<boolean> {
  const result = await db.execute(
    'SELECT COUNT(*) as count FROM task_logs WHERE task_id = ?',
    [taskId],
  )
  return ((result.rows?.[0] as any)?.count ?? 0) > 0
}

// ─── Cleanup ────────────────────────────────────────────

/** Delete tasks beyond a keep count (oldest first), including their logs */
export async function deleteOldTasks(db: DB, keepCount = 100): Promise<void> {
  await db.execute(
    `DELETE FROM task_logs WHERE task_id IN (
      SELECT id FROM tasks ORDER BY created_at DESC LIMIT -1 OFFSET ?
    )`,
    [keepCount],
  )
  await db.execute(
    `DELETE FROM tasks WHERE id NOT IN (
      SELECT id FROM tasks ORDER BY created_at DESC LIMIT ?
    )`,
    [keepCount],
  )
}

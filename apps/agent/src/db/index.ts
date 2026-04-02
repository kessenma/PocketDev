import { Database } from 'bun:sqlite'
import { readFileSync, mkdirSync } from 'node:fs'
import { join } from 'node:path'

const DATA_DIR = process.env.POCKETDEV_DATA_DIR ?? join(process.cwd(), 'data')

let db: Database

export function getDb(): Database {
  if (!db) {
    mkdirSync(DATA_DIR, { recursive: true })

    db = new Database(join(DATA_DIR, 'pocketdev.db'))
    db.exec('PRAGMA journal_mode = WAL;')
    db.exec('PRAGMA foreign_keys = ON;')

    // Run schema
    const schema = readFileSync(join(import.meta.dir, 'schema.sql'), 'utf-8')
    db.exec(schema)
  }
  return db
}

// Device operations
export function getDevices() {
  return getDb().query('SELECT * FROM devices').all() as DeviceRow[]
}

export function getDevice(id: string) {
  return getDb().query('SELECT * FROM devices WHERE id = ?').get(id) as DeviceRow | null
}

export function insertDevice(id: string, publicKey: string, name: string | null, platform: string | null) {
  getDb()
    .query('INSERT INTO devices (id, public_key, name, platform) VALUES (?, ?, ?, ?)')
    .run(id, publicKey, name, platform)
}

export function updateDeviceLastSeen(id: string) {
  getDb()
    .query("UPDATE devices SET last_seen_at = datetime('now') WHERE id = ?")
    .run(id)
}

export function getDeviceCount(): number {
  const row = getDb().query('SELECT COUNT(*) as count FROM devices').get() as { count: number }
  return row.count
}

// Server config operations
export function getConfig(key: string): string | null {
  const row = getDb().query('SELECT value FROM server_config WHERE key = ?').get(key) as { value: string } | null
  return row?.value ?? null
}

export function setConfig(key: string, value: string) {
  getDb()
    .query('INSERT OR REPLACE INTO server_config (key, value) VALUES (?, ?)')
    .run(key, value)
}

// Task operations
export function insertTask(id: string, prompt: string, agentType: string, workingDirectory: string | null) {
  getDb()
    .query('INSERT INTO tasks (id, prompt, agent_type, working_directory) VALUES (?, ?, ?, ?)')
    .run(id, prompt, agentType, workingDirectory)
}

export function updateTaskStatus(id: string, status: string, exitCode?: number) {
  const now = new Date().toISOString()
  if (status === 'running') {
    getDb().query('UPDATE tasks SET status = ?, started_at = ? WHERE id = ?').run(status, now, id)
  } else if (status === 'completed' || status === 'failed' || status === 'killed') {
    getDb()
      .query('UPDATE tasks SET status = ?, completed_at = ?, exit_code = ? WHERE id = ?')
      .run(status, now, exitCode ?? null, id)
  } else {
    getDb().query('UPDATE tasks SET status = ? WHERE id = ?').run(status, id)
  }
}

export function getTask(id: string) {
  return getDb().query('SELECT * FROM tasks WHERE id = ?').get(id) as TaskRow | null
}

export function getRecentTasks(limit = 20) {
  return getDb()
    .query('SELECT * FROM tasks ORDER BY created_at DESC LIMIT ?')
    .all(limit) as TaskRow[]
}

export function insertTaskLog(taskId: string, stream: string, line: string) {
  getDb()
    .query('INSERT INTO task_logs (task_id, stream, line) VALUES (?, ?, ?)')
    .run(taskId, stream, line)
}

// Tool path operations
export function upsertToolPath(
  toolId: string,
  path: string,
  version: string | null,
  authenticated?: boolean,
) {
  getDb()
    .query(
      `INSERT INTO tool_paths (tool_id, path, version, authenticated, detected_at)
       VALUES (?, ?, ?, ?, datetime('now'))
       ON CONFLICT(tool_id) DO UPDATE SET
         path = excluded.path,
         version = excluded.version,
         authenticated = COALESCE(?, authenticated),
         detected_at = datetime('now')`,
    )
    .run(toolId, path, version, authenticated ? 1 : 0, authenticated !== undefined ? (authenticated ? 1 : 0) : null)
}

export function getToolPath(toolId: string): string | null {
  const row = getDb()
    .query('SELECT path FROM tool_paths WHERE tool_id = ?')
    .get(toolId) as { path: string } | null
  return row?.path ?? null
}

export function getToolRecord(toolId: string): ToolPathRow | null {
  return getDb()
    .query('SELECT * FROM tool_paths WHERE tool_id = ?')
    .get(toolId) as ToolPathRow | null
}

export function getAllToolPaths(): Record<string, string> {
  const rows = getDb()
    .query('SELECT tool_id, path FROM tool_paths')
    .all() as { tool_id: string; path: string }[]
  const result: Record<string, string> = {}
  for (const row of rows) {
    result[row.tool_id] = row.path
  }
  return result
}

export function setToolAuthenticated(toolId: string, authenticated: boolean) {
  getDb()
    .query('UPDATE tool_paths SET authenticated = ? WHERE tool_id = ?')
    .run(authenticated ? 1 : 0, toolId)
}

// ─── Plan operations ─────────────────────────────────────

export function insertPlan(
  id: string,
  taskId: string,
  title: string,
  description: string,
  agentName: string,
) {
  getDb()
    .query('INSERT INTO plans (id, task_id, title, description, agent_name) VALUES (?, ?, ?, ?, ?)')
    .run(id, taskId, title, description, agentName)
}

export function insertPlanStep(
  id: string,
  planId: string,
  kind: string,
  title: string,
  description: string,
  filePath: string | null,
  sortOrder: number,
) {
  getDb()
    .query('INSERT INTO plan_steps (id, plan_id, kind, title, description, file_path, sort_order) VALUES (?, ?, ?, ?, ?, ?, ?)')
    .run(id, planId, kind, title, description, filePath, sortOrder)
}

export function insertPlanQuestion(
  id: string,
  planId: string,
  question: string,
  required: boolean,
) {
  getDb()
    .query('INSERT INTO plan_questions (id, plan_id, question, required) VALUES (?, ?, ?, ?)')
    .run(id, planId, question, required ? 1 : 0)
}

export function updatePlanQuestionAnswer(questionId: string, answer: string) {
  getDb()
    .query('UPDATE plan_questions SET answer = ? WHERE id = ?')
    .run(answer, questionId)
}

export function insertPlanMessage(id: string, planId: string, role: string, text: string) {
  getDb()
    .query('INSERT INTO plan_messages (id, plan_id, role, text) VALUES (?, ?, ?, ?)')
    .run(id, planId, role, text)
}

export function resolvePlan(planId: string, status: string, notes?: string) {
  getDb()
    .query("UPDATE plans SET status = ?, notes = ?, resolved_at = datetime('now') WHERE id = ?")
    .run(status, notes ?? null, planId)
}

export function updatePlanStepCompleted(stepId: string, completed: boolean) {
  getDb()
    .query('UPDATE plan_steps SET completed = ? WHERE id = ?')
    .run(completed ? 1 : 0, stepId)
}

export function getActivePlan(): PlanRow | null {
  return getDb()
    .query("SELECT * FROM plans WHERE status = 'pending' ORDER BY created_at DESC LIMIT 1")
    .get() as PlanRow | null
}

export function getPlanById(planId: string): PlanRow | null {
  return getDb()
    .query('SELECT * FROM plans WHERE id = ?')
    .get(planId) as PlanRow | null
}

export function getPlanSteps(planId: string): PlanStepRow[] {
  return getDb()
    .query('SELECT * FROM plan_steps WHERE plan_id = ? ORDER BY sort_order')
    .all(planId) as PlanStepRow[]
}

export function getPlanQuestions(planId: string): PlanQuestionRow[] {
  return getDb()
    .query('SELECT * FROM plan_questions WHERE plan_id = ?')
    .all(planId) as PlanQuestionRow[]
}

export function getPlanMessages(planId: string): PlanMessageRow[] {
  return getDb()
    .query('SELECT * FROM plan_messages WHERE plan_id = ? ORDER BY created_at')
    .all(planId) as PlanMessageRow[]
}

export function getPlanHistory(limit = 20): PlanRow[] {
  return getDb()
    .query("SELECT * FROM plans WHERE status != 'pending' ORDER BY resolved_at DESC LIMIT ?")
    .all(limit) as PlanRow[]
}

export interface PlanRow {
  id: string
  task_id: string
  title: string
  description: string | null
  agent_name: string | null
  status: string
  notes: string | null
  created_at: string
  resolved_at: string | null
}

export interface PlanStepRow {
  id: string
  plan_id: string
  kind: string
  title: string
  description: string | null
  file_path: string | null
  completed: number
  sort_order: number
}

export interface PlanQuestionRow {
  id: string
  plan_id: string
  question: string
  answer: string | null
  required: number
}

export interface PlanMessageRow {
  id: string
  plan_id: string
  role: string
  text: string
  created_at: string
}

// Row types (SQLite returns)
export interface ToolPathRow {
  tool_id: string
  path: string
  version: string | null
  installed: number
  authenticated: number
  detected_at: string
  manually_set: number
}

export interface DeviceRow {
  id: string
  public_key: string
  name: string | null
  platform: string | null
  created_at: string
  last_seen_at: string
}

export interface TaskRow {
  id: string
  prompt: string
  agent_type: string
  status: string
  working_directory: string | null
  created_at: string
  started_at: string | null
  completed_at: string | null
  exit_code: number | null
}

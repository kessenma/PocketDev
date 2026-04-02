import { drizzle } from 'drizzle-orm/bun-sqlite'
import { Database } from 'bun:sqlite'
import { migrate } from 'drizzle-orm/bun-sqlite/migrator'
import { eq, desc, sql, count } from 'drizzle-orm'
import { mkdirSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import * as schema from './schema/index.ts'

const DATA_DIR = process.env.POCKETDEV_DATA_DIR ?? join(process.cwd(), 'data')

let _db: ReturnType<typeof drizzle<typeof schema>>

export function getDb() {
  if (!_db) {
    mkdirSync(DATA_DIR, { recursive: true })

    const sqlite = new Database(join(DATA_DIR, 'pocketdev.db'))
    sqlite.exec('PRAGMA journal_mode = WAL;')
    sqlite.exec('PRAGMA foreign_keys = ON;')

    _db = drizzle(sqlite, { schema })

    // If this DB was created by the old schema.sql (pre-Drizzle), stamp the
    // initial migration as already applied so Drizzle doesn't try to re-create
    // existing tables.
    const hasDrizzleMeta = sqlite.query(
      "SELECT name FROM sqlite_master WHERE type='table' AND name='__drizzle_migrations'",
    ).get()
    const hasLegacyTables = sqlite.query(
      "SELECT name FROM sqlite_master WHERE type='table' AND name='devices'",
    ).get()
    if (!hasDrizzleMeta && hasLegacyTables) {
      // Create the Drizzle migrations tracking table and mark migration 0000 as done
      sqlite.exec(`
        CREATE TABLE IF NOT EXISTS __drizzle_migrations (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          hash TEXT NOT NULL,
          created_at NUMERIC
        );
      `)
      // Add the admin_accounts table that the old schema didn't have
      sqlite.exec(`
        CREATE TABLE IF NOT EXISTS admin_accounts (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          email TEXT NOT NULL UNIQUE,
          password_hash TEXT NOT NULL,
          created_at TEXT DEFAULT (datetime('now'))
        );
        CREATE UNIQUE INDEX IF NOT EXISTS admin_accounts_email_unique ON admin_accounts (email);
      `)
      // Stamp the initial migration as applied
      sqlite.exec(`
        INSERT INTO __drizzle_migrations (hash, created_at)
        VALUES ('0000_military_surge', ${Date.now()});
      `)
    }

    // Run migrations on startup
    // In dev: import.meta.dir is src/db/, drizzle/ is at ../../drizzle
    // In production: index.js is at /opt/pocketdev/, drizzle/ is at ./drizzle
    const devPath = join(import.meta.dir, '../../drizzle')
    const prodPath = join(process.cwd(), 'drizzle')
    const migrationsFolder = existsSync(join(devPath, 'meta')) ? devPath : prodPath
    migrate(_db, { migrationsFolder })
  }
  return _db
}

// Re-export schema for direct table access
export { schema }

// ─── Inferred types ─────────────────────────────────────

export type DeviceRow = typeof schema.devices.$inferSelect
export type TaskRow = typeof schema.tasks.$inferSelect
export type PlanRow = typeof schema.plans.$inferSelect
export type PlanStepRow = typeof schema.planSteps.$inferSelect
export type PlanQuestionRow = typeof schema.planQuestions.$inferSelect
export type PlanMessageRow = typeof schema.planMessages.$inferSelect
export type ToolPathRow = typeof schema.toolPaths.$inferSelect
export type AdminAccountRow = typeof schema.adminAccounts.$inferSelect

// ─── Device operations ──────────────────────────────────

export function getDevices(): DeviceRow[] {
  return getDb().select().from(schema.devices).all()
}

export function getDevice(id: string): DeviceRow | undefined {
  return getDb().select().from(schema.devices).where(eq(schema.devices.id, id)).get()
}

export function insertDevice(id: string, publicKey: string, name: string | null, platform: string | null) {
  getDb().insert(schema.devices).values({ id, publicKey: publicKey, name, platform }).run()
}

export function updateDeviceLastSeen(id: string) {
  getDb()
    .update(schema.devices)
    .set({ lastSeenAt: sql`datetime('now')` })
    .where(eq(schema.devices.id, id))
    .run()
}

export function getDeviceCount(): number {
  const row = getDb().select({ count: count() }).from(schema.devices).get()
  return row?.count ?? 0
}

// ─── Server config operations ───────────────────────────

export function getConfig(key: string): string | null {
  const row = getDb()
    .select()
    .from(schema.serverConfig)
    .where(eq(schema.serverConfig.key, key))
    .get()
  return row?.value ?? null
}

export function setConfig(key: string, value: string) {
  getDb()
    .insert(schema.serverConfig)
    .values({ key, value })
    .onConflictDoUpdate({ target: schema.serverConfig.key, set: { value } })
    .run()
}

// ─── Task operations ────────────────────────────────────

export function insertTask(id: string, prompt: string, agentType: string, workingDirectory: string | null) {
  getDb().insert(schema.tasks).values({ id, prompt, agentType, workingDirectory }).run()
}

export function updateTaskStatus(id: string, status: string, exitCode?: number) {
  const now = new Date().toISOString()
  if (status === 'running') {
    getDb().update(schema.tasks).set({ status, startedAt: now }).where(eq(schema.tasks.id, id)).run()
  } else if (status === 'completed' || status === 'failed' || status === 'killed') {
    getDb()
      .update(schema.tasks)
      .set({ status, completedAt: now, exitCode: exitCode ?? null })
      .where(eq(schema.tasks.id, id))
      .run()
  } else {
    getDb().update(schema.tasks).set({ status }).where(eq(schema.tasks.id, id)).run()
  }
}

export function getTask(id: string): TaskRow | undefined {
  return getDb().select().from(schema.tasks).where(eq(schema.tasks.id, id)).get()
}

export function getRecentTasks(limit = 20): TaskRow[] {
  return getDb()
    .select()
    .from(schema.tasks)
    .orderBy(desc(schema.tasks.createdAt))
    .limit(limit)
    .all()
}

export function insertTaskLog(taskId: string, stream: string, line: string) {
  getDb().insert(schema.taskLogs).values({ taskId, stream, line }).run()
}

// ─── Tool path operations ───────────────────────────────

export function upsertToolPath(
  toolId: string,
  path: string,
  version: string | null,
  authenticated?: boolean,
) {
  getDb()
    .insert(schema.toolPaths)
    .values({
      toolId,
      path,
      version,
      authenticated: authenticated ? 1 : 0,
    })
    .onConflictDoUpdate({
      target: schema.toolPaths.toolId,
      set: {
        path,
        version,
        ...(authenticated !== undefined ? { authenticated: authenticated ? 1 : 0 } : {}),
        detectedAt: sql`datetime('now')`,
      },
    })
    .run()
}

export function getToolPath(toolId: string): string | null {
  const row = getDb()
    .select({ path: schema.toolPaths.path })
    .from(schema.toolPaths)
    .where(eq(schema.toolPaths.toolId, toolId))
    .get()
  return row?.path ?? null
}

export function getToolRecord(toolId: string): ToolPathRow | undefined {
  return getDb()
    .select()
    .from(schema.toolPaths)
    .where(eq(schema.toolPaths.toolId, toolId))
    .get()
}

export function getAllToolPaths(): Record<string, string> {
  const rows = getDb()
    .select({ toolId: schema.toolPaths.toolId, path: schema.toolPaths.path })
    .from(schema.toolPaths)
    .all()
  const result: Record<string, string> = {}
  for (const row of rows) {
    result[row.toolId] = row.path
  }
  return result
}

export function setToolAuthenticated(toolId: string, authenticated: boolean) {
  getDb()
    .update(schema.toolPaths)
    .set({ authenticated: authenticated ? 1 : 0 })
    .where(eq(schema.toolPaths.toolId, toolId))
    .run()
}

// ─── Plan operations ────────────────────────────────────

export function insertPlan(
  id: string,
  taskId: string,
  title: string,
  description: string,
  agentName: string,
) {
  getDb()
    .insert(schema.plans)
    .values({ id, taskId, title, description, agentName })
    .run()
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
    .insert(schema.planSteps)
    .values({ id, planId, kind, title, description, filePath, sortOrder })
    .run()
}

export function insertPlanQuestion(
  id: string,
  planId: string,
  question: string,
  required: boolean,
) {
  getDb()
    .insert(schema.planQuestions)
    .values({ id, planId, question, required: required ? 1 : 0 })
    .run()
}

export function updatePlanQuestionAnswer(questionId: string, answer: string) {
  getDb()
    .update(schema.planQuestions)
    .set({ answer })
    .where(eq(schema.planQuestions.id, questionId))
    .run()
}

export function insertPlanMessage(id: string, planId: string, role: string, text: string) {
  getDb()
    .insert(schema.planMessages)
    .values({ id, planId, role, text })
    .run()
}

export function resolvePlan(planId: string, status: string, notes?: string) {
  getDb()
    .update(schema.plans)
    .set({ status, notes: notes ?? null, resolvedAt: sql`datetime('now')` })
    .where(eq(schema.plans.id, planId))
    .run()
}

export function updatePlanStepCompleted(stepId: string, completed: boolean) {
  getDb()
    .update(schema.planSteps)
    .set({ completed: completed ? 1 : 0 })
    .where(eq(schema.planSteps.id, stepId))
    .run()
}

export function getActivePlan(): PlanRow | undefined {
  return getDb()
    .select()
    .from(schema.plans)
    .where(eq(schema.plans.status, 'pending'))
    .orderBy(desc(schema.plans.createdAt))
    .limit(1)
    .get()
}

export function getPlanById(planId: string): PlanRow | undefined {
  return getDb().select().from(schema.plans).where(eq(schema.plans.id, planId)).get()
}

export function getPlanSteps(planId: string): PlanStepRow[] {
  return getDb()
    .select()
    .from(schema.planSteps)
    .where(eq(schema.planSteps.planId, planId))
    .orderBy(schema.planSteps.sortOrder)
    .all()
}

export function getPlanQuestions(planId: string): PlanQuestionRow[] {
  return getDb()
    .select()
    .from(schema.planQuestions)
    .where(eq(schema.planQuestions.planId, planId))
    .all()
}

export function getPlanMessages(planId: string): PlanMessageRow[] {
  return getDb()
    .select()
    .from(schema.planMessages)
    .where(eq(schema.planMessages.planId, planId))
    .orderBy(schema.planMessages.createdAt)
    .all()
}

export function getPlanHistory(limit = 20): PlanRow[] {
  return getDb()
    .select()
    .from(schema.plans)
    .where(sql`${schema.plans.status} != 'pending'`)
    .orderBy(desc(schema.plans.resolvedAt))
    .limit(limit)
    .all()
}

// ─── Admin account operations ───────────────────────────

export function hasAdminAccount(): boolean {
  const row = getDb().select({ count: count() }).from(schema.adminAccounts).get()
  return (row?.count ?? 0) > 0
}

export function getAdminAccount(): AdminAccountRow | undefined {
  return getDb().select().from(schema.adminAccounts).limit(1).get()
}

export function insertAdminAccount(email: string, passwordHash: string) {
  getDb().insert(schema.adminAccounts).values({ email, passwordHash }).run()
}

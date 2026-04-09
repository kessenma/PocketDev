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

    // Run migrations on startup
    const devPath = join(import.meta.dir, '../../drizzle')
    const prodPath = join(process.cwd(), 'drizzle')
    const migrationsFolder = existsSync(join(devPath, 'meta')) ? devPath : prodPath

    // Check for legacy DB (pre-Drizzle) and handle migration
    const existingTables = sqlite.query(
      "SELECT name FROM sqlite_master WHERE type='table' ORDER BY name",
    ).all() as { name: string }[]
    console.log('[db] Existing tables:', existingTables.map((t) => t.name).join(', '))
    console.log('[db] Migrations folder:', migrationsFolder)
    console.log('[db] Migrations folder exists:', existsSync(migrationsFolder))
    console.log('[db] Journal exists:', existsSync(join(migrationsFolder, 'meta/_journal.json')))

    const hasLegacyTables = existingTables.some((t) => t.name === 'devices')
    const hasDrizzleMeta = existingTables.some((t) => t.name === '__drizzle_migrations')

    if (hasLegacyTables && !hasDrizzleMeta) {
      console.log('[db] Legacy DB detected (no __drizzle_migrations). Bootstrapping...')
      // Add new tables the old schema didn't have
      sqlite.exec(`
        CREATE TABLE IF NOT EXISTS admin_accounts (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          email TEXT NOT NULL UNIQUE,
          password_hash TEXT NOT NULL,
          created_at TEXT DEFAULT (datetime('now'))
        );
      `)
      sqlite.exec(`
        CREATE UNIQUE INDEX IF NOT EXISTS admin_accounts_email_unique ON admin_accounts (email);
      `)
      sqlite.exec(`
        CREATE TABLE IF NOT EXISTS passkey_credentials (
          id TEXT PRIMARY KEY NOT NULL,
          admin_id INTEGER NOT NULL,
          credential_id TEXT NOT NULL,
          public_key TEXT NOT NULL,
          counter INTEGER DEFAULT 0 NOT NULL,
          credential_device_type TEXT,
          credential_backed_up INTEGER DEFAULT 0,
          transports TEXT,
          device_name TEXT,
          aaguid TEXT,
          is_active INTEGER DEFAULT 1 NOT NULL,
          last_used_at TEXT,
          created_at TEXT DEFAULT (datetime('now')),
          updated_at TEXT DEFAULT (datetime('now'))
        );
      `)
      sqlite.exec(`
        CREATE UNIQUE INDEX IF NOT EXISTS passkey_credentials_credential_id_unique ON passkey_credentials (credential_id);
      `)
      // Create the Drizzle tracking table and stamp with far-future timestamp
      sqlite.exec(`
        CREATE TABLE IF NOT EXISTS __drizzle_migrations (
          id SERIAL PRIMARY KEY,
          hash text NOT NULL,
          created_at numeric
        );
      `)
      sqlite.exec(`
        INSERT INTO __drizzle_migrations (hash, created_at)
        VALUES ('legacy_stamp', 9999999999999);
      `)
      console.log('[db] Legacy bootstrap complete')
    } else if (hasLegacyTables && hasDrizzleMeta) {
      // Fix up any bad stamps from prior migration attempts
      const stamps = sqlite.query('SELECT id, hash, created_at FROM __drizzle_migrations').all()
      console.log('[db] Existing migration stamps:', JSON.stringify(stamps))
      const maxCreatedAt = stamps.reduce((max: number, s: any) => Math.max(max, Number(s.created_at ?? 0)), 0)
      if (maxCreatedAt < 9999999999000) {
        console.log('[db] Bad stamps detected, fixing...')
        sqlite.exec(`DELETE FROM __drizzle_migrations;`)
        sqlite.exec(`
          INSERT INTO __drizzle_migrations (hash, created_at)
          VALUES ('legacy_stamp', 9999999999999);
        `)
        // Add new tables
        sqlite.exec(`
          CREATE TABLE IF NOT EXISTS admin_accounts (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            email TEXT NOT NULL UNIQUE,
            password_hash TEXT NOT NULL,
            created_at TEXT DEFAULT (datetime('now'))
          );
        `)
        sqlite.exec(`
          CREATE UNIQUE INDEX IF NOT EXISTS admin_accounts_email_unique ON admin_accounts (email);
        `)
        sqlite.exec(`
          CREATE TABLE IF NOT EXISTS passkey_credentials (
            id TEXT PRIMARY KEY NOT NULL,
            admin_id INTEGER NOT NULL,
            credential_id TEXT NOT NULL,
            public_key TEXT NOT NULL,
            counter INTEGER DEFAULT 0 NOT NULL,
            credential_device_type TEXT,
            credential_backed_up INTEGER DEFAULT 0,
            transports TEXT,
            device_name TEXT,
            aaguid TEXT,
            is_active INTEGER DEFAULT 1 NOT NULL,
            last_used_at TEXT,
            created_at TEXT DEFAULT (datetime('now')),
            updated_at TEXT DEFAULT (datetime('now'))
          );
        `)
        sqlite.exec(`
          CREATE UNIQUE INDEX IF NOT EXISTS passkey_credentials_credential_id_unique ON passkey_credentials (credential_id);
        `)
        console.log('[db] Stamps fixed')
      }
    }

    console.log('[db] Running Drizzle migrate...')
    migrate(_db, { migrationsFolder })
    console.log('[db] Migration complete')

    sqlite.exec(`
      CREATE TABLE IF NOT EXISTS passkey_credentials (
        id TEXT PRIMARY KEY NOT NULL,
        admin_id INTEGER NOT NULL,
        credential_id TEXT NOT NULL,
        public_key TEXT NOT NULL,
        counter INTEGER DEFAULT 0 NOT NULL,
        credential_device_type TEXT,
        credential_backed_up INTEGER DEFAULT 0,
        transports TEXT,
        device_name TEXT,
        aaguid TEXT,
        is_active INTEGER DEFAULT 1 NOT NULL,
        last_used_at TEXT,
        created_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT DEFAULT (datetime('now'))
      );
    `)
    sqlite.exec(`
      CREATE UNIQUE INDEX IF NOT EXISTS passkey_credentials_credential_id_unique ON passkey_credentials (credential_id);
    `)

    sqlite.exec(`
      CREATE TABLE IF NOT EXISTS projects (
        id TEXT PRIMARY KEY NOT NULL,
        name TEXT NOT NULL,
        absolute_path TEXT NOT NULL UNIQUE,
        remote_url TEXT,
        owner TEXT,
        source TEXT NOT NULL DEFAULT 'local',
        default_branch TEXT,
        created_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT DEFAULT (datetime('now')),
        last_used_at TEXT
      );
    `)

    const taskColumns = sqlite.query(`PRAGMA table_info(tasks)`).all() as { name: string }[]
    if (!taskColumns.some((column) => column.name === 'project_id')) {
      sqlite.exec(`ALTER TABLE tasks ADD COLUMN project_id TEXT;`)
    }
    if (!taskColumns.some((column) => column.name === 'project_name')) {
      sqlite.exec(`ALTER TABLE tasks ADD COLUMN project_name TEXT;`)
    }
    if (!taskColumns.some((column) => column.name === 'model')) {
      sqlite.exec(`ALTER TABLE tasks ADD COLUMN model TEXT;`)
    }
    if (!taskColumns.some((column) => column.name === 'mode')) {
      sqlite.exec(`ALTER TABLE tasks ADD COLUMN mode TEXT DEFAULT 'default';`)
      sqlite.exec(`UPDATE tasks SET mode = 'default' WHERE mode IS NULL;`)
    }
    if (!taskColumns.some((column) => column.name === 'session_id')) {
      sqlite.exec(`ALTER TABLE tasks ADD COLUMN session_id TEXT;`)
    }
    if (!taskColumns.some((column) => column.name === 'turn_count')) {
      sqlite.exec(`ALTER TABLE tasks ADD COLUMN turn_count INTEGER DEFAULT 1;`)
      sqlite.exec(`UPDATE tasks SET turn_count = 1 WHERE turn_count IS NULL;`)
    }

    sqlite.exec(`
      CREATE TABLE IF NOT EXISTS task_turns (
        id TEXT PRIMARY KEY NOT NULL,
        task_id TEXT NOT NULL REFERENCES tasks(id),
        turn_number INTEGER NOT NULL,
        role TEXT NOT NULL,
        content TEXT NOT NULL,
        created_at TEXT DEFAULT (datetime('now'))
      );
    `)

    sqlite.exec(`
      CREATE TABLE IF NOT EXISTS task_file_touches (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        task_id TEXT NOT NULL REFERENCES tasks(id),
        file_path TEXT NOT NULL,
        action TEXT NOT NULL,
        turn_number INTEGER DEFAULT 1,
        created_at TEXT DEFAULT (datetime('now'))
      );
    `)
    sqlite.exec(`CREATE INDEX IF NOT EXISTS idx_task_file_touches_task_id ON task_file_touches(task_id);`)
  }
  return _db
}

// Re-export schema for direct table access
export { schema }

// ─── Inferred types ─────────────────────────────────────

export type DeviceRow = typeof schema.devices.$inferSelect
export type TaskRow = typeof schema.tasks.$inferSelect
export type ProjectRow = typeof schema.projects.$inferSelect
export type PlanRow = typeof schema.plans.$inferSelect
export type PlanStepRow = typeof schema.planSteps.$inferSelect
export type PlanQuestionRow = typeof schema.planQuestions.$inferSelect
export type PlanMessageRow = typeof schema.planMessages.$inferSelect
export type TaskTurnRow = typeof schema.taskTurns.$inferSelect
export type TaskFileTouchRow = typeof schema.taskFileTouches.$inferSelect
export type ToolPathRow = typeof schema.toolPaths.$inferSelect
export type AdminAccountRow = typeof schema.adminAccounts.$inferSelect
export type PasskeyCredentialRow = typeof schema.passkeyCredentials.$inferSelect

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

export function updateDeviceName(id: string, name: string) {
  getDb()
    .update(schema.devices)
    .set({ name })
    .where(eq(schema.devices.id, id))
    .run()
}

export function deleteDevice(id: string) {
  getDb().delete(schema.devices).where(eq(schema.devices.id, id)).run()
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

export function deleteConfig(key: string) {
  getDb()
    .delete(schema.serverConfig)
    .where(eq(schema.serverConfig.key, key))
    .run()
}

// ─── Task operations ────────────────────────────────────

export function insertTask(
  id: string,
  prompt: string,
  agentType: string,
  mode: string,
  workingDirectory: string | null,
  projectId: string | null,
  projectName: string | null,
  model: string | null,
  sessionId: string | null = null,
) {
  getDb().insert(schema.tasks).values({
    id,
    prompt,
    agentType,
    mode,
    model,
    workingDirectory,
    projectId,
    projectName,
    sessionId,
  }).run()
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

export function getTaskLogs(taskId: string, limit = 100) {
  return getDb()
    .select()
    .from(schema.taskLogs)
    .where(eq(schema.taskLogs.taskId, taskId))
    .orderBy(desc(schema.taskLogs.id))
    .limit(limit)
    .all()
    .reverse()
}

// ─── Task turn operations ──────────────────────────────

export function insertTaskTurn(
  id: string,
  taskId: string,
  turnNumber: number,
  role: string,
  content: string,
) {
  getDb().insert(schema.taskTurns).values({ id, taskId, turnNumber, role, content }).run()
}

export function getTaskTurns(taskId: string): TaskTurnRow[] {
  return getDb()
    .select()
    .from(schema.taskTurns)
    .where(eq(schema.taskTurns.taskId, taskId))
    .orderBy(schema.taskTurns.turnNumber, schema.taskTurns.createdAt)
    .all()
}

export function resetTaskForContinuation(taskId: string, newTurnCount: number) {
  getDb()
    .update(schema.tasks)
    .set({
      status: 'running',
      completedAt: null,
      exitCode: null,
      turnCount: newTurnCount,
    })
    .where(eq(schema.tasks.id, taskId))
    .run()
}

// ─── Task file touch operations ────────────────────────

export function insertTaskFileTouch(
  taskId: string,
  filePath: string,
  action: string,
  turnNumber: number = 1,
) {
  getDb().insert(schema.taskFileTouches).values({ taskId, filePath, action, turnNumber }).run()
}

export function getTaskFileTouches(taskId: string): TaskFileTouchRow[] {
  return getDb()
    .select()
    .from(schema.taskFileTouches)
    .where(eq(schema.taskFileTouches.taskId, taskId))
    .orderBy(schema.taskFileTouches.id)
    .all()
}

// ─── Project operations ─────────────────────────────────

export function getProjects(): ProjectRow[] {
  return getDb()
    .select()
    .from(schema.projects)
    .orderBy(desc(schema.projects.lastUsedAt), desc(schema.projects.updatedAt))
    .all()
}

export function getProject(id: string): ProjectRow | undefined {
  return getDb()
    .select()
    .from(schema.projects)
    .where(eq(schema.projects.id, id))
    .get()
}

export function getProjectByPath(absolutePath: string): ProjectRow | undefined {
  return getDb()
    .select()
    .from(schema.projects)
    .where(eq(schema.projects.absolutePath, absolutePath))
    .get()
}

export function upsertProject(input: {
  id: string
  name: string
  absolutePath: string
  remoteUrl: string | null
  owner: string | null
  source: string
  defaultBranch: string | null
}) {
  getDb()
    .insert(schema.projects)
    .values({
      ...input,
      updatedAt: sql`datetime('now')`,
      lastUsedAt: sql`datetime('now')`,
    })
    .onConflictDoUpdate({
      target: schema.projects.absolutePath,
      set: {
        id: input.id,
        name: input.name,
        remoteUrl: input.remoteUrl,
        owner: input.owner,
        source: input.source,
        defaultBranch: input.defaultBranch,
        updatedAt: sql`datetime('now')`,
      },
    })
    .run()
}

export function markProjectUsed(id: string) {
  getDb()
    .update(schema.projects)
    .set({
      updatedAt: sql`datetime('now')`,
      lastUsedAt: sql`datetime('now')`,
    })
    .where(eq(schema.projects.id, id))
    .run()
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

export function deleteToolRecord(toolId: string) {
  getDb().delete(schema.toolPaths).where(eq(schema.toolPaths.toolId, toolId)).run()
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

// ─── Passkey credential operations ─────────────────────

export function getPasskeysByAdminId(adminId: number): PasskeyCredentialRow[] {
  return getDb()
    .select()
    .from(schema.passkeyCredentials)
    .where(eq(schema.passkeyCredentials.adminId, adminId))
    .all()
    .filter((row) => row.isActive === 1)
}

export function getPasskeyByCredentialId(credentialId: string): PasskeyCredentialRow | undefined {
  return getDb()
    .select()
    .from(schema.passkeyCredentials)
    .where(eq(schema.passkeyCredentials.credentialId, credentialId))
    .get()
}

export function insertPasskeyCredential(input: {
  id: string
  adminId: number
  credentialId: string
  publicKey: string
  counter: number
  credentialDeviceType: string | null
  credentialBackedUp: boolean
  transports: string[] | null
  deviceName: string | null
  aaguid: string | null
}) {
  getDb()
    .insert(schema.passkeyCredentials)
    .values({
      id: input.id,
      adminId: input.adminId,
      credentialId: input.credentialId,
      publicKey: input.publicKey,
      counter: input.counter,
      credentialDeviceType: input.credentialDeviceType,
      credentialBackedUp: input.credentialBackedUp ? 1 : 0,
      transports: input.transports ? JSON.stringify(input.transports) : null,
      deviceName: input.deviceName,
      aaguid: input.aaguid,
    })
    .run()
}

export function updatePasskeyCounter(credentialId: string, newCounter: number) {
  getDb()
    .update(schema.passkeyCredentials)
    .set({
      counter: newCounter,
      lastUsedAt: sql`datetime('now')`,
      updatedAt: sql`datetime('now')`,
    })
    .where(eq(schema.passkeyCredentials.credentialId, credentialId))
    .run()
}

export function softDeletePasskey(id: string) {
  getDb()
    .update(schema.passkeyCredentials)
    .set({
      isActive: 0,
      updatedAt: sql`datetime('now')`,
    })
    .where(eq(schema.passkeyCredentials.id, id))
    .run()
}

export function hasPasskeyCredentials(): boolean {
  const row = getDb()
    .select({ count: count() })
    .from(schema.passkeyCredentials)
    .where(eq(schema.passkeyCredentials.isActive, 1))
    .get()
  return (row?.count ?? 0) > 0
}

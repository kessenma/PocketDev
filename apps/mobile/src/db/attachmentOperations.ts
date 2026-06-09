import type { DB } from '@op-engineering/op-sqlite'
import type { PendingFile } from '../stores/attachments'
import { getModuleDb } from './DatabaseProvider'

export type CachedAttachment = {
  id: string
  taskId: string
  originalName: string
  serverFilename: string
  serverFolder: string
  size: number
  uploadedAt: string
}

export async function saveTaskAttachments(
  taskId: string,
  files: PendingFile[],
): Promise<void> {
  const db = getModuleDb()
  if (!db) return

  for (const file of files) {
    if (!file.serverFilename || !file.serverFolder) continue
    const id = `${taskId}:${file.serverFilename}`
    await db.execute(
      `INSERT OR REPLACE INTO task_attachments
         (id, task_id, original_name, server_filename, server_folder, size, uploaded_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [id, taskId, file.name, file.serverFilename, file.serverFolder, file.size, new Date().toISOString()],
    )
  }
}

export async function getTaskAttachments(taskId: string): Promise<CachedAttachment[]> {
  const db = getModuleDb()
  if (!db) return []

  const result = await db.execute(
    'SELECT * FROM task_attachments WHERE task_id = ? ORDER BY uploaded_at ASC',
    [taskId],
  )
  return (result.rows ?? []).map((row: any) => ({
    id: row.id,
    taskId: row.task_id,
    originalName: row.original_name,
    serverFilename: row.server_filename,
    serverFolder: row.server_folder,
    size: row.size,
    uploadedAt: row.uploaded_at,
  }))
}

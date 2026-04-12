import { randomUUID } from 'node:crypto'
import type {
  EnvVar,
  CreateEnvVarRequest,
  UpdateEnvVarRequest,
  BulkEnvVarItem,
} from '@pocketdev/shared/types'
import {
  getEnvVars,
  getEnvVar,
  getEnvVarByProjectAndKey,
  insertEnvVar,
  updateEnvVar,
  deleteEnvVar,
  upsertEnvVar,
  type EnvVarRow,
} from '../../db/index.ts'

export function normalizeEnvKey(key: string): string {
  return key.trim().replace(/\s+/g, '_')
}

export function rowToEnvVar(row: EnvVarRow): EnvVar {
  return {
    id: row.id,
    projectPath: row.projectPath,
    key: row.key,
    value: row.value ?? null,
    comment: row.comment ?? null,
    isSecret: (row.isSecret ?? 0) === 1,
    isMultiline: (row.isMultiline ?? 0) === 1,
    order: row.order ?? 0,
    createdAt: row.createdAt ?? '',
    updatedAt: row.updatedAt ?? '',
  }
}

export function listEnvVars(projectPath: string): EnvVar[] {
  return getEnvVars(projectPath).map(rowToEnvVar)
}

export function createEnvVar(input: CreateEnvVarRequest): EnvVar {
  const key = normalizeEnvKey(input.key)
  const id = randomUUID()
  insertEnvVar({
    id,
    projectPath: input.projectPath,
    key,
    value: input.value ?? null,
    comment: input.comment ?? null,
    isSecret: input.isSecret ? 1 : 0,
    isMultiline: input.isMultiline ? 1 : 0,
    order: 0,
  })
  return rowToEnvVar(getEnvVar(id)!)
}

export function updateEnvVarById(id: string, patch: UpdateEnvVarRequest): EnvVar | null {
  const row = getEnvVar(id)
  if (!row) return null
  updateEnvVar(id, {
    ...(patch.key !== undefined ? { key: normalizeEnvKey(patch.key) } : {}),
    ...(patch.value !== undefined ? { value: patch.value } : {}),
    ...(patch.comment !== undefined ? { comment: patch.comment } : {}),
    ...(patch.isSecret !== undefined ? { isSecret: patch.isSecret ? 1 : 0 } : {}),
    ...(patch.isMultiline !== undefined ? { isMultiline: patch.isMultiline ? 1 : 0 } : {}),
    ...(patch.order !== undefined ? { order: patch.order } : {}),
  })
  return rowToEnvVar(getEnvVar(id)!)
}

export function deleteEnvVarById(id: string): void {
  deleteEnvVar(id)
}

export function bulkUpsertEnvVars(projectPath: string, data: BulkEnvVarItem[]): EnvVar[] {
  for (const item of data) {
    const key = normalizeEnvKey(item.key)

    // Preserve existing comment if not provided in bulk item
    let resolvedComment = item.comment
    if (resolvedComment === undefined) {
      const existing = getEnvVarByProjectAndKey(projectPath, key)
      resolvedComment = existing?.comment ?? null
    }

    upsertEnvVar({
      id: randomUUID(),
      projectPath,
      key,
      value: item.value ?? null,
      comment: resolvedComment,
      isSecret: item.isSecret ? 1 : 0,
      isMultiline: item.isMultiline ? 1 : 0,
    })
  }
  return listEnvVars(projectPath)
}

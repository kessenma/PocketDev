export interface EnvVar {
  id: string
  projectPath: string
  key: string
  value: string | null
  comment: string | null
  isSecret: boolean
  isMultiline: boolean
  order: number
  createdAt: string
  updatedAt: string
}

export interface ListEnvVarsResponse {
  envVars: EnvVar[]
}

export interface CreateEnvVarRequest {
  projectPath: string
  key: string
  value?: string | null
  comment?: string | null
  isSecret?: boolean
  isMultiline?: boolean
}

export interface UpdateEnvVarRequest {
  key?: string
  value?: string | null
  comment?: string | null
  isSecret?: boolean
  isMultiline?: boolean
  order?: number
}

export interface BulkEnvVarItem {
  key: string
  value?: string | null
  comment?: string | null
  isSecret?: boolean
  isMultiline?: boolean
}

export interface BulkUpsertEnvVarsRequest {
  projectPath: string
  data: BulkEnvVarItem[]
}

export interface BulkUpsertEnvVarsResponse {
  envVars: EnvVar[]
}

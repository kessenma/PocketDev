export type ToolStatus = 'installed' | 'missing' | 'misconfigured'
export type AuthStatus = 'authenticated' | 'unauthenticated' | 'unknown' | 'not_applicable'

export interface ToolCheck {
  id: string
  name: string
  status: ToolStatus
  auth_status: AuthStatus
  version: string | null
  path: string | null
  required: boolean
  install_command: string | null
  auth_command: string | null
  details: Record<string, string | null>
}

// ─── Database provisioning (Docker-based, Coolify-style) ──────────────

export type DatabaseType = 'postgres' | 'mongodb' | 'redis' | 'mysql' | 'supabase'
export type DatabaseStatus = 'running' | 'stopped' | 'not_installed'

export interface DatabaseInfo {
  id: string
  type: DatabaseType
  name: string
  status: DatabaseStatus
  version: string | null
  port: number
  container_id: string | null
}

export interface DatabaseTemplate {
  type: DatabaseType
  name: string
  description: string
  default_image: string
  default_port: number
  env_vars: Record<string, string>
}

export interface DatabaseCreateRequest {
  type: DatabaseType
  name: string
  image: string
  port: number
  password: string
  env_vars: Record<string, string>
}

export interface PrerequisitesReport {
  os: string
  arch: string
  tools: ToolCheck[]
  databases: DatabaseInfo[]
  ready: boolean
}

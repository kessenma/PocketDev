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

// ─── Git wizard types ────────────────────────────────────────────────

export interface GitSshStatus {
  git_installed: boolean
  ssh_key_exists: boolean
  ssh_key_type: string | null
  ssh_key_path: string | null
  github_ssh_works: boolean
  github_username: string | null
  git_user_name: string | null
  git_user_email: string | null
}

export interface GitSshKeyResult {
  success: boolean
  public_key: string | null
  already_existed: boolean
  error: string | null
}

export interface GitConfigureResult {
  success: boolean
  user_name: string
  user_email: string
  error: string | null
}

export interface GitTestConnectionResult {
  success: boolean
  output: string
  github_username: string | null
  error: string | null
}

export type GitWizardStep = 'detect' | 'install' | 'generate-key' | 'add-to-github' | 'test-connection' | 'configure-identity'
export type GitWizardStepStatus = 'pending' | 'active' | 'completed' | 'skipped' | 'failed'

// ─── Claude CLI wizard types ────────────────────────────────────────

export interface ClaudeSetupStatus {
  installed: boolean
  version: string | null
  path: string | null
  authenticated: boolean
  auth_output: string | null
}

export type ClaudeWizardStep = 'detect' | 'install' | 'authenticate' | 'verify'
export type ClaudeWizardStepStatus = 'pending' | 'active' | 'completed' | 'skipped' | 'failed'

// ─── Codex CLI wizard types ────────────────────────────────────────

export interface CodexSetupStatus {
  installed: boolean
  version: string | null
  path: string | null
  authenticated: boolean
  auth_output: string | null
}

export type CodexWizardStep = 'detect' | 'install' | 'authenticate' | 'verify'
export type CodexWizardStepStatus = 'pending' | 'active' | 'completed' | 'skipped' | 'failed'

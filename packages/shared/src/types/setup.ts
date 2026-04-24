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

export interface GitSetupStatus {
  git_installed: boolean
  github_username: string | null
  gh_cli_installed: boolean
  gh_cli_version: string | null
  gh_cli_authenticated: boolean
  gh_cli_username: string | null
  private_repo_access: boolean
  git_user_name: string | null
  git_user_email: string | null
}

export interface GitConfigureResult {
  success: boolean
  user_name: string
  user_email: string
  error: string | null
}

export interface GitHubCliAuthResult {
  success: boolean
  github_username: string | null
  private_repo_access: boolean
  output: string | null
  error: string | null
}

export type GitHubCliAuthSessionState =
  | 'starting'
  | 'awaiting_browser'
  | 'pending'
  | 'authenticated'
  | 'failed'

export interface GitHubCliAuthSessionStatus {
  session_id: string
  state: GitHubCliAuthSessionState
  auth_url: string | null
  verification_code: string | null
  output_excerpt: string | null
  github_username: string | null
  private_repo_access: boolean
  authenticated: boolean
  completed: boolean
  error: string | null
}

export interface GitHubCliAuthStartResult extends GitHubCliAuthSessionStatus {}

export type GitWizardStep = 'detect' | 'install' | 'install-gh' | 'github-cli-auth' | 'configure-identity'
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

export type ClaudeAuthSessionState =
  | 'starting'
  | 'awaiting_theme'
  | 'awaiting_method'
  | 'awaiting_browser'
  | 'awaiting_code'
  | 'pending'
  | 'authenticated'
  | 'failed'

export interface ClaudeAuthSessionStatus {
  session_id: string
  state: ClaudeAuthSessionState
  auth_url: string | null
  prompt: string | null
  output_excerpt: string | null
  can_submit_code: boolean
  authenticated: boolean
  completed: boolean
  error: string | null
}

export interface ClaudeAuthStartResult extends ClaudeAuthSessionStatus {}

export interface ClaudeAuthSubmitRequest {
  code: string
}

export interface ClaudeAuthSubmitResult extends ClaudeAuthSessionStatus {}

// ─── Codex CLI wizard types ────────────────────────────────────────

export interface CodexSetupStatus {
  installed: boolean
  version: string | null
  path: string | null
  authenticated: boolean
  auth_output: string | null
}

export interface CodexInstallResult {
  success: boolean
  installed: boolean
  version: string | null
  path: string | null
  output: string | null
  error: string | null
}

export type CodexAuthSessionState =
  | 'starting'
  | 'awaiting_browser'
  | 'awaiting_code'
  | 'pending'
  | 'authenticated'
  | 'failed'

export interface CodexAuthSessionStatus {
  session_id: string
  state: CodexAuthSessionState
  auth_url: string | null
  verification_code: string | null
  prompt: string | null
  output_excerpt: string | null
  can_submit_code: boolean
  authenticated: boolean
  completed: boolean
  error: string | null
}

export interface CodexAuthStartResult extends CodexAuthSessionStatus {}

export type CodexAuthMode = 'browser' | 'device_code'

export interface CodexAuthStartRequest {
  mode: CodexAuthMode
}

export interface CodexAuthSubmitRequest {
  code: string
}

export interface CodexAuthSubmitResult extends CodexAuthSessionStatus {}

export interface CodexAuthCallbackReplayRequest {
  callback_url: string
}

export interface CodexAuthCallbackReplayResult {
  success: boolean
  callback_url: string
  status_code: number | null
  error: string | null
  attempts?: string[]
  session_output_excerpt?: string | null
  session_prompt?: string | null
}

export type CodexWizardStep = 'detect' | 'authenticate' | 'verify'
export type CodexWizardStepStatus = 'pending' | 'active' | 'completed' | 'skipped' | 'failed'

// ─── OpenAI provider auth via OpenCode ────────────────────────────

export interface OpenCodeProviderAuthStatus {
  opencode_installed: boolean
  opencode_version: string | null
  provider: 'openai' | 'github-copilot'
  authenticated: boolean
  auth_type: 'oauth' | 'api' | null
}

export type OpenAIOpenCodeAuthMethod = 'browser' | 'headless' | 'api_key'

export type OpenAIOpenCodeAuthSessionState =
  | 'starting'
  | 'awaiting_browser'
  | 'awaiting_device_code'
  | 'pending'
  | 'authenticated'
  | 'failed'

export interface OpenAIOpenCodeAuthSessionStatus {
  session_id: string
  method: OpenAIOpenCodeAuthMethod
  state: OpenAIOpenCodeAuthSessionState
  authenticated: boolean
  auth_url: string | null
  verification_url: string | null
  user_code: string | null
  output_excerpt: string | null
  error: string | null
}

export interface OpenAIOpenCodeAuthStartResult extends OpenAIOpenCodeAuthSessionStatus {}

export interface OpenAIOpenCodeAuthCallbackRequest {
  callback_url: string
}

export interface BrowserSessionCreateRequest {
  target_url: string
}

export interface BrowserSessionCreateResult {
  session_id: string
  target_url: string
  proxied_url: string
}

// ─── GitHub Copilot CLI wizard types ───────────────────────────────

export interface CopilotSetupStatus {
  installed: boolean
  version: string | null
  path: string | null
  tmux_installed: boolean
  tmux_path: string | null
  authenticated: boolean
  github_username: string | null
  auth_output: string | null
  trust_configured: boolean
  trust_target: string | null
}

export interface CopilotInstallResult {
  success: boolean
  installed: boolean
  version: string | null
  path: string | null
  tmux_installed: boolean
  tmux_path: string | null
  output: string | null
  error: string | null
}

export type CopilotTrustSessionState =
  | 'starting'
  | 'awaiting_trust'
  | 'pending'
  | 'trusted'
  | 'failed'

export interface CopilotTrustSessionStatus {
  session_id: string
  state: CopilotTrustSessionState
  prompt: string | null
  output_excerpt: string | null
  trust_target: string | null
  trusted: boolean
  completed: boolean
  error: string | null
}

export interface CopilotTrustStartResult extends CopilotTrustSessionStatus {}

export type CopilotWizardStep = 'detect' | 'authenticate' | 'verify'
export type CopilotWizardStepStatus = 'pending' | 'active' | 'completed' | 'skipped' | 'failed'

// ─── GitHub Copilot provider auth via OpenCode ─────────────────────

export type CopilotOpenCodeAuthSessionState =
  | 'starting'
  | 'awaiting_device_code'
  | 'pending'
  | 'authenticated'
  | 'failed'

export interface CopilotOpenCodeAuthSessionStatus {
  session_id: string
  state: CopilotOpenCodeAuthSessionState
  authenticated: boolean
  verification_uri: string | null
  user_code: string | null
  output_excerpt: string | null
  error: string | null
}

export interface CopilotOpenCodeAuthStartResult extends CopilotOpenCodeAuthSessionStatus {}

// ─── OpenCode wizard types ─────────────────────────────────────────

export interface OpenCodeSetupStatus {
  installed: boolean
  version: string | null
  path: string | null
  verified: boolean
  verify_output: string | null
}

export interface OpenCodeInstallResult {
  success: boolean
  installed: boolean
  version: string | null
  path: string | null
  output: string | null
  error: string | null
}

export type OpenCodeWizardStep = 'detect' | 'review' | 'install' | 'verify'
export type OpenCodeWizardStepStatus = 'pending' | 'active' | 'completed' | 'skipped' | 'failed'

// ─── Minimax wizard types ─────────────────────────────────────────

export interface MinimaxSetupStatus {
  opencode_installed: boolean
  opencode_version: string | null
  api_key_configured: boolean
  api_key_masked: string | null
  verified: boolean
  verify_output: string | null
}

export interface MinimaxConfigureRequest {
  api_key: string
}

export interface MinimaxConfigureResult {
  success: boolean
  api_key_masked: string | null
  error: string | null
}

export type MinimaxWizardStep = 'detect' | 'review' | 'configure' | 'verify'
export type MinimaxWizardStepStatus = 'pending' | 'active' | 'completed' | 'skipped' | 'failed'

// ─── Python wizard types ──────────────────────────────────────────

export interface PythonSetupStatus {
  installed: boolean
  version: string | null
  path: string | null
  /** The command name to invoke python (e.g. "python3", "python3.13", "python") */
  binary: string | null
  pip_installed: boolean
  pip_version: string | null
  pip_path: string | null
  venv_available: boolean
  ppa_added: boolean
}

export type PythonWizardStep = 'detect' | 'add-ppa' | 'install' | 'install-venv' | 'install-pip' | 'verify'
export type PythonWizardStepStatus = 'pending' | 'active' | 'completed' | 'skipped' | 'failed'

// ─── Rust wizard types ──────────────────────────────────────────

export interface RustSetupStatus {
  installed: boolean
  version: string | null
  path: string | null
  cargo_installed: boolean
  cargo_version: string | null
  cargo_path: string | null
  rustup_installed: boolean
  rustup_version: string | null
}

export type RustWizardStep = 'detect' | 'install-rustup' | 'verify'
export type RustWizardStepStatus = 'pending' | 'active' | 'completed' | 'skipped' | 'failed'

// ─── Go wizard types ──────────────────────────────────────────

export interface GoSetupStatus {
  installed: boolean
  version: string | null
  path: string | null
  gopath: string | null
  goroot: string | null
}

export type GoWizardStep = 'detect' | 'install' | 'verify'
export type GoWizardStepStatus = 'pending' | 'active' | 'completed' | 'skipped' | 'failed'

// ─── TypeScript wizard types ──────────────────────────────────────────

export interface TypeScriptSetupStatus {
  installed: boolean
  version: string | null
  path: string | null
  ts_node_installed: boolean
  ts_node_version: string | null
}

export type TypeScriptWizardStep = 'detect' | 'install' | 'verify'
export type TypeScriptWizardStepStatus = 'pending' | 'active' | 'completed' | 'skipped' | 'failed'

// ─── Package Manager wizard types ──────────────────────────────────

export interface PkgToolInfo {
  installed: boolean
  version: string | null
  path: string | null
}

export interface PkgManagerStatus {
  nvm: { installed: boolean; version: string | null }
  npm: PkgToolInfo
  pnpm: PkgToolInfo
  bun: PkgToolInfo
}

export type PkgInstallTool = 'npm' | 'pnpm' | 'bun'

export interface PkgInstallResult {
  tool: PkgInstallTool
  success: boolean
  error: string | null
  output: string
  status: PkgManagerStatus
}

export type PkgWizardStep = 'detect' | 'review' | 'install' | 'verify'
export type PkgWizardStepStatus = 'pending' | 'active' | 'completed' | 'skipped' | 'failed'

// ─── Docker wizard types ─────────────────────────────────────────

export interface DockerSetupStatus {
  installed: boolean
  version: string | null
  path: string | null
  daemon_running: boolean
  has_compose: boolean
  compose_version: string | null
  user_in_docker_group: boolean
}

export type DockerWizardStep = 'detect' | 'install' | 'start-daemon' | 'add-user-group' | 'verify'
export type DockerWizardStepStatus = 'pending' | 'active' | 'completed' | 'skipped' | 'failed'

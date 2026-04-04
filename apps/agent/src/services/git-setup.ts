import { readFileSync, existsSync, writeFileSync, mkdirSync } from 'node:fs'
import { join } from 'node:path'
import type {
  GitSshStatus,
  GitSshKeyResult,
  GitConfigureResult,
  GitTestConnectionResult,
  GitHubCliAuthResult,
} from '@pocketdev/shared/types'

const SSH_DIR = join(process.env.HOME ?? '/root', '.ssh')
const SSH_CONFIG_PATH = join(SSH_DIR, 'config')

/** Run a command in a login shell with HOME explicitly set */
async function exec(cmd: string, timeoutMs = 15_000): Promise<{ stdout: string; stderr: string; exitCode: number }> {
  const home = process.env.HOME ?? process.env.USERPROFILE ?? '/root'
  const proc = Bun.spawn(['bash', '-lc', cmd], {
    stdout: 'pipe',
    stderr: 'pipe',
    env: { ...process.env, HOME: home },
  })

  const timer = setTimeout(() => proc.kill(), timeoutMs)
  const [stdout, stderr] = await Promise.all([
    new Response(proc.stdout).text(),
    new Response(proc.stderr).text(),
  ])
  await proc.exited
  clearTimeout(timer)

  return { stdout: stdout.trim(), stderr: stderr.trim(), exitCode: proc.exitCode ?? 1 }
}

/** Find which SSH key exists, preferring ed25519 */
function findExistingKey(): { path: string; type: string } | null {
  const candidates = [
    { file: 'id_ed25519', type: 'ed25519' },
    { file: 'id_ecdsa', type: 'ecdsa' },
    { file: 'id_rsa', type: 'rsa' },
  ]
  for (const { file, type } of candidates) {
    const keyPath = join(SSH_DIR, file)
    if (existsSync(keyPath)) {
      return { path: keyPath, type }
    }
  }
  return null
}

/** Read the public key file content */
function readPubKey(privatePath: string): string | null {
  const pubPath = `${privatePath}.pub`
  if (!existsSync(pubPath)) return null
  return readFileSync(pubPath, 'utf-8').trim()
}

/** Ensure ~/.ssh/config has a GitHub host entry */
function ensureGitHubSshConfig() {
  mkdirSync(SSH_DIR, { recursive: true })

  let config = ''
  if (existsSync(SSH_CONFIG_PATH)) {
    config = readFileSync(SSH_CONFIG_PATH, 'utf-8')
  }

  // Check if GitHub host entry already exists
  if (/^Host\s+(github\.com|\*github)/m.test(config)) {
    return
  }

  const entry = `
# Added by PocketDev
Host github.com
  IdentityFile ~/.ssh/id_ed25519
  StrictHostKeyChecking accept-new
`
  writeFileSync(SSH_CONFIG_PATH, config + entry, { mode: 0o600 })
}

async function getGhStatus(): Promise<{
  installed: boolean
  version: string | null
  authenticated: boolean
  username: string | null
  privateRepoAccess: boolean
  output: string | null
}> {
  const which = await exec('which gh')
  if (which.exitCode !== 0 || !which.stdout) {
    return {
      installed: false,
      version: null,
      authenticated: false,
      username: null,
      privateRepoAccess: false,
      output: null,
    }
  }

  const versionResult = await exec('gh --version')
  const versionMatch = versionResult.stdout.match(/gh version ([^\s]+)/)
  const authResult = await exec('gh auth status 2>&1')
  const authenticated = authResult.exitCode === 0

  let username: string | null = null
  let privateRepoAccess = false

  if (authenticated) {
    const userResult = await exec('gh api user --jq .login')
    if (userResult.exitCode === 0 && userResult.stdout) {
      username = userResult.stdout.trim()
    }

    const repoProbe = await exec("gh api 'user/repos?per_page=1&visibility=private&affiliation=owner'")
    privateRepoAccess = repoProbe.exitCode === 0
  }

  return {
    installed: true,
    version: versionMatch?.[1] ?? null,
    authenticated,
    username,
    privateRepoAccess,
    output: authResult.stdout || authResult.stderr || null,
  }
}

// ─── Public API ──────────────────────────────────────────────────────

export async function checkSshStatus(): Promise<GitSshStatus> {
  // Check if git is installed
  const { exitCode: gitExit } = await exec('which git')
  const gitInstalled = gitExit === 0

  // Check SSH key
  const existingKey = findExistingKey()

  // Check GitHub SSH connectivity (exit code 1 = success for GitHub)
  let githubSshWorks = false
  let githubUsername: string | null = null

  if (existingKey) {
    const { stdout, stderr, exitCode } = await exec('ssh -T git@github.com 2>&1', 10_000)
    const combined = `${stdout}\n${stderr}`
    const match = combined.match(/Hi\s+([^!]+)!/)
    if (match) {
      githubSshWorks = true
      githubUsername = match[1]
    } else if (exitCode === 1 && combined.includes('successfully authenticated')) {
      githubSshWorks = true
    }
  }

  // Check git identity
  let gitUserName: string | null = null
  let gitUserEmail: string | null = null
  if (gitInstalled) {
    const { stdout: name } = await exec('git config --global user.name')
    const { stdout: email } = await exec('git config --global user.email')
    gitUserName = name || null
    gitUserEmail = email || null
  }

  const ghStatus = await getGhStatus()

  return {
    git_installed: gitInstalled,
    ssh_key_exists: !!existingKey,
    ssh_key_type: existingKey?.type ?? null,
    ssh_key_path: existingKey?.path ?? null,
    github_ssh_works: githubSshWorks,
    github_username: githubUsername,
    gh_cli_installed: ghStatus.installed,
    gh_cli_version: ghStatus.version,
    gh_cli_authenticated: ghStatus.authenticated,
    gh_cli_username: ghStatus.username,
    private_repo_access: ghStatus.privateRepoAccess,
    git_user_name: gitUserName,
    git_user_email: gitUserEmail,
  }
}

export async function configureGitHubCliToken(token: string): Promise<GitHubCliAuthResult> {
  if (!token.trim()) {
    return {
      success: false,
      github_username: null,
      private_repo_access: false,
      output: null,
      error: 'GitHub token is required',
    }
  }

  const ghStatus = await getGhStatus()
  if (!ghStatus.installed) {
    return {
      success: false,
      github_username: null,
      private_repo_access: false,
      output: null,
      error: 'GitHub CLI is not installed',
    }
  }

  const escapedToken = token.replace(/'/g, `'\\''`)
  const login = await exec(`printf '%s' '${escapedToken}' | gh auth login --hostname github.com --with-token`)
  if (login.exitCode !== 0) {
    return {
      success: false,
      github_username: null,
      private_repo_access: false,
      output: login.stdout || login.stderr || null,
      error: login.stderr || 'GitHub CLI authentication failed',
    }
  }

  await exec('gh auth setup-git')
  const finalStatus = await getGhStatus()

  return {
    success: finalStatus.authenticated,
    github_username: finalStatus.username,
    private_repo_access: finalStatus.privateRepoAccess,
    output: finalStatus.output,
    error: finalStatus.authenticated ? null : 'GitHub CLI is still not authenticated',
  }
}

export async function generateSshKey(overwrite: boolean): Promise<GitSshKeyResult> {
  try {
    mkdirSync(SSH_DIR, { recursive: true })
    await exec(`chmod 700 "${SSH_DIR}"`)

    const keyPath = join(SSH_DIR, 'id_ed25519')
    const existingKey = findExistingKey()

    // If key exists and user doesn't want to overwrite, return existing
    if (existingKey && !overwrite) {
      const pubKey = readPubKey(existingKey.path)
      return {
        success: true,
        public_key: pubKey,
        already_existed: true,
        error: null,
      }
    }

    // Remove old key if overwriting
    if (existingKey && overwrite) {
      await exec(`rm -f "${keyPath}" "${keyPath}.pub"`)
    }

    // Get hostname for key comment
    const { stdout: hostname } = await exec('hostname')
    const comment = `pocketdev@${hostname || 'server'}`

    // Generate new ed25519 key
    const { exitCode, stderr } = await exec(
      `ssh-keygen -t ed25519 -C "${comment}" -f "${keyPath}" -N ""`,
    )
    if (exitCode !== 0) {
      return { success: false, public_key: null, already_existed: false, error: stderr || 'Key generation failed' }
    }

    // Ensure SSH config has GitHub entry
    ensureGitHubSshConfig()

    const pubKey = readPubKey(keyPath)
    return {
      success: true,
      public_key: pubKey,
      already_existed: false,
      error: null,
    }
  } catch (err) {
    return {
      success: false,
      public_key: null,
      already_existed: false,
      error: err instanceof Error ? err.message : 'Key generation failed',
    }
  }
}

export async function readPublicKey(): Promise<string | null> {
  const existingKey = findExistingKey()
  if (!existingKey) return null
  return readPubKey(existingKey.path)
}

export async function configureIdentity(name: string, email: string): Promise<GitConfigureResult> {
  try {
    const { exitCode: nameExit, stderr: nameErr } = await exec(`git config --global user.name "${name.replace(/"/g, '\\"')}"`)
    if (nameExit !== 0) {
      return { success: false, user_name: '', user_email: '', error: nameErr || 'Failed to set user.name' }
    }

    const { exitCode: emailExit, stderr: emailErr } = await exec(`git config --global user.email "${email.replace(/"/g, '\\"')}"`)
    if (emailExit !== 0) {
      return { success: false, user_name: name, user_email: '', error: emailErr || 'Failed to set user.email' }
    }

    // Verify by reading back
    const { stdout: verifyName } = await exec('git config --global user.name')
    const { stdout: verifyEmail } = await exec('git config --global user.email')

    return {
      success: true,
      user_name: verifyName,
      user_email: verifyEmail,
      error: null,
    }
  } catch (err) {
    return {
      success: false,
      user_name: '',
      user_email: '',
      error: err instanceof Error ? err.message : 'Configuration failed',
    }
  }
}

export async function testGithubConnection(): Promise<GitTestConnectionResult> {
  try {
    const { stdout, stderr, exitCode } = await exec('ssh -T git@github.com 2>&1', 10_000)
    const combined = `${stdout}\n${stderr}`

    const match = combined.match(/Hi\s+([^!]+)!/)
    if (match) {
      return {
        success: true,
        output: combined,
        github_username: match[1],
        error: null,
      }
    }

    // GitHub returns exit code 1 on success with "successfully authenticated"
    if (exitCode === 1 && combined.includes('successfully authenticated')) {
      return {
        success: true,
        output: combined,
        github_username: null,
        error: null,
      }
    }

    // Provide helpful error messages
    let errorMsg = 'SSH connection to GitHub failed'
    if (combined.includes('Permission denied')) {
      errorMsg = 'Permission denied. Your SSH key may not be added to GitHub, or your existing key may require a passphrase.'
    } else if (combined.includes('Connection timed out') || combined.includes('Connection refused')) {
      errorMsg = 'Connection timed out. Check your server\'s network connectivity.'
    } else if (combined.includes('Host key verification failed')) {
      errorMsg = 'Host key verification failed. Try running: ssh-keyscan github.com >> ~/.ssh/known_hosts'
    }

    return {
      success: false,
      output: combined,
      github_username: null,
      error: errorMsg,
    }
  } catch (err) {
    return {
      success: false,
      output: '',
      github_username: null,
      error: err instanceof Error ? err.message : 'Connection test failed',
    }
  }
}

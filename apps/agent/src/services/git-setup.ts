import { readFileSync, existsSync, writeFileSync, mkdirSync } from 'node:fs'
import { join } from 'node:path'
import type { GitSshStatus, GitSshKeyResult, GitConfigureResult, GitTestConnectionResult } from '@pocketdev/shared/types'

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

  return {
    git_installed: gitInstalled,
    ssh_key_exists: !!existingKey,
    ssh_key_type: existingKey?.type ?? null,
    ssh_key_path: existingKey?.path ?? null,
    github_ssh_works: githubSshWorks,
    github_username: githubUsername,
    git_user_name: gitUserName,
    git_user_email: gitUserEmail,
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

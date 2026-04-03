import { readFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import { upsertToolPath } from '../db/index.ts'
import type { ToolCheck, PrerequisitesReport, ToolStatus, AuthStatus, DatabaseInfo } from '@pocketdev/shared/types'
import {
  checkBun as checkPkgBun,
  checkNode as checkPkgNode,
  checkNpm as checkPkgNpm,
  checkPnpm as checkPkgPnpm,
} from './pkg-setup.ts'

/** Run commands in a shell that can see standard system-wide tool locations. */
async function exec(cmd: string): Promise<{ stdout: string; exitCode: number }> {
  const home = process.env.HOME ?? process.env.USERPROFILE ?? '/root'
  const wrapped = `export PATH="/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin:$PATH"; ${cmd}`
  const proc = Bun.spawn(['bash', '-lc', wrapped], {
    stdout: 'pipe',
    stderr: 'pipe',
    env: { ...process.env, HOME: home },
  })
  const stdout = await new Response(proc.stdout).text()
  await proc.exited
  return { stdout: stdout.trim(), exitCode: proc.exitCode ?? 1 }
}

/** Detect which binary is available, returns absolute path or null */
async function which(binary: string): Promise<string | null> {
  const { stdout, exitCode } = await exec(`which ${binary}`)
  return exitCode === 0 && stdout ? stdout.split('\n')[0] : null
}

/** Get version from a command like "git --version" → "2.44.0" */
async function getVersion(cmd: string): Promise<string | null> {
  const { stdout, exitCode } = await exec(cmd)
  if (exitCode !== 0 || !stdout) return null
  // Extract version number pattern from output
  const match = stdout.match(/(\d+\.\d+[\.\d]*)/)
  return match ? match[1] : stdout.split('\n')[0]
}

// ─── Individual tool checkers ───────────────────────────────────────────

async function checkGit(): Promise<ToolCheck> {
  const path = await which('git')
  if (!path) {
    return {
      id: 'git', name: 'Git', status: 'missing', auth_status: 'not_applicable',
      version: null, path: null, required: true,
      install_command: 'sudo apt-get install -y git',
      auth_command: 'git config --global user.name "Your Name" && git config --global user.email "you@example.com"',
      details: {},
    }
  }

  const version = await getVersion('git --version')
  const { stdout: userName } = await exec('git config --global user.name')
  const { stdout: userEmail } = await exec('git config --global user.email')

  // Check SSH key existence
  const sshDir = join(process.env.HOME ?? '/root', '.ssh')
  const sshKeyExists = existsSync(join(sshDir, 'id_ed25519')) ||
    existsSync(join(sshDir, 'id_ecdsa')) ||
    existsSync(join(sshDir, 'id_rsa'))

  // Quick GitHub SSH connectivity check
  let githubConnected = false
  if (sshKeyExists) {
    const { stdout: sshOut } = await exec('ssh -T git@github.com 2>&1')
    githubConnected = /Hi\s+[^!]+!/.test(sshOut) || sshOut.includes('successfully authenticated')
  }

  const configured = !!userName && !!userEmail
  const status: ToolStatus = configured ? 'installed' : 'misconfigured'
  const authStatus: AuthStatus = configured ? 'authenticated' : 'unauthenticated'

  upsertToolPath('git', path, version, configured)

  return {
    id: 'git', name: 'Git', status, auth_status: authStatus,
    version, path, required: true,
    install_command: null,
    auth_command: configured ? null : 'git config --global user.name "Your Name" && git config --global user.email "you@example.com"',
    details: {
      user_name: userName || null,
      user_email: userEmail || null,
      ssh_key_exists: sshKeyExists ? 'true' : 'false',
      github_connected: githubConnected ? 'true' : 'false',
    },
  }
}

async function checkNode(): Promise<ToolCheck> {
  const node = await checkPkgNode()
  if (!node.installed || !node.path) {
    return {
      id: 'node', name: 'Node.js', status: 'missing', auth_status: 'not_applicable',
      version: null, path: null, required: true,
      install_command: 'curl -fsSL https://deb.nodesource.com/setup_lts.x | sudo -E bash - && sudo apt-get install -y nodejs',
      auth_command: null, details: {},
    }
  }

  upsertToolPath('node', node.path, node.version)

  return {
    id: 'node', name: 'Node.js', status: 'installed', auth_status: 'not_applicable',
    version: node.version, path: node.path, required: true,
    install_command: null, auth_command: null, details: {},
  }
}

async function checkNpm(): Promise<ToolCheck> {
  const npm = await checkPkgNpm()
  if (!npm.installed || !npm.path) {
    return {
      id: 'npm', name: 'npm', status: 'missing', auth_status: 'not_applicable',
      version: null, path: null, required: true,
      install_command: null, // installed with node
      auth_command: null, details: {},
    }
  }

  upsertToolPath('npm', npm.path, npm.version)

  return {
    id: 'npm', name: 'npm', status: 'installed', auth_status: 'not_applicable',
    version: npm.version, path: npm.path, required: true,
    install_command: null, auth_command: null, details: {},
  }
}

async function checkClaudeCli(): Promise<ToolCheck> {
  const path = await which('claude')
  if (!path) {
    return {
      id: 'claude_cli', name: 'Claude CLI', status: 'missing', auth_status: 'unauthenticated',
      version: null, path: null, required: true,
      install_command: 'sudo npm install -g @anthropic-ai/claude-code',
      auth_command: 'claude auth login', details: {},
    }
  }

  const version = await getVersion('claude --version')

  // Check auth status
  const { stdout: authOutput, exitCode: authExit } = await exec('claude auth status 2>&1')
  const authenticated = authExit === 0 && !authOutput.toLowerCase().includes('not logged in')
  const authStatus: AuthStatus = authenticated ? 'authenticated' : 'unauthenticated'

  upsertToolPath('claude_cli', path, version, authenticated)

  return {
    id: 'claude_cli', name: 'Claude CLI', status: 'installed', auth_status: authStatus,
    version, path, required: true,
    install_command: null,
    auth_command: authenticated ? null : 'claude auth login',
    details: { auth_output: authOutput || null },
  }
}

async function checkCodexCli(): Promise<ToolCheck> {
  const path = await which('codex')
  if (!path) {
    return {
      id: 'codex_cli', name: 'Codex CLI', status: 'missing', auth_status: 'unauthenticated',
      version: null, path: null, required: true,
      install_command: 'sudo npm install -g @openai/codex',
      auth_command: 'codex login', details: {},
    }
  }

  const version = await getVersion('codex --version')

  // Check auth status
  const { stdout: authOutput, exitCode: authExit } = await exec('codex login status 2>&1')
  const authenticated = authExit === 0 && !authOutput.toLowerCase().includes('not logged in')
  const authStatus: AuthStatus = authenticated ? 'authenticated' : 'unauthenticated'

  upsertToolPath('codex_cli', path, version, authenticated)

  return {
    id: 'codex_cli', name: 'Codex CLI', status: 'installed', auth_status: authStatus,
    version, path, required: true,
    install_command: null,
    auth_command: authenticated ? null : 'codex login',
    details: { auth_output: authOutput || null },
  }
}

async function checkBun(): Promise<ToolCheck> {
  const bun = await checkPkgBun()
  if (!bun.installed || !bun.path) {
    return {
      id: 'bun', name: 'Bun', status: 'missing', auth_status: 'not_applicable',
      version: null, path: null, required: false,
      install_command: 'sudo npm install -g bun',
      auth_command: null, details: {},
    }
  }

  upsertToolPath('bun', bun.path, bun.version)

  return {
    id: 'bun', name: 'Bun', status: 'installed', auth_status: 'not_applicable',
    version: bun.version, path: bun.path, required: false,
    install_command: null, auth_command: null, details: {},
  }
}

async function checkPnpm(): Promise<ToolCheck> {
  const pnpm = await checkPkgPnpm()
  if (!pnpm.installed || !pnpm.path) {
    return {
      id: 'pnpm', name: 'pnpm', status: 'missing', auth_status: 'not_applicable',
      version: null, path: null, required: false,
      install_command: 'sudo npm install -g pnpm',
      auth_command: null, details: {},
    }
  }

  upsertToolPath('pnpm', pnpm.path, pnpm.version)

  return {
    id: 'pnpm', name: 'pnpm', status: 'installed', auth_status: 'not_applicable',
    version: pnpm.version, path: pnpm.path, required: false,
    install_command: null, auth_command: null, details: {},
  }
}

async function checkChromium(): Promise<ToolCheck> {
  // Try multiple chromium binary names
  const path =
    (await which('chromium-browser')) ??
    (await which('chromium')) ??
    (await which('google-chrome'))

  if (!path) {
    return {
      id: 'chromium', name: 'Chromium', status: 'missing', auth_status: 'not_applicable',
      version: null, path: null, required: false,
      install_command: 'sudo apt-get install -y chromium-browser',
      auth_command: null, details: {},
    }
  }

  const version = await getVersion(`"${path}" --version`)
  upsertToolPath('chromium', path, version)

  return {
    id: 'chromium', name: 'Chromium', status: 'installed', auth_status: 'not_applicable',
    version, path, required: false,
    install_command: null, auth_command: null, details: {},
  }
}

async function checkDocker(): Promise<ToolCheck> {
  const path = await which('docker')
  if (!path) {
    return {
      id: 'docker', name: 'Docker', status: 'missing', auth_status: 'not_applicable',
      version: null, path: null, required: false,
      install_command: 'sudo apt-get update && sudo apt-get install -y ca-certificates curl gnupg && sudo install -m 0755 -d /etc/apt/keyrings && curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg && sudo chmod a+r /etc/apt/keyrings/docker.gpg && echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo $VERSION_CODENAME) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null && sudo apt-get update && sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin && sudo usermod -aG docker $USER',
      auth_command: null, details: {},
    }
  }

  const version = await getVersion('docker --version')

  // Check if Docker daemon is running
  const { exitCode: daemonCheck } = await exec('docker info >/dev/null 2>&1')
  const daemonRunning = daemonCheck === 0

  // Check if docker compose is available
  const { exitCode: composeCheck } = await exec('docker compose version >/dev/null 2>&1')
  const hasCompose = composeCheck === 0

  upsertToolPath('docker', path, version)

  if (!daemonRunning) {
    return {
      id: 'docker', name: 'Docker', status: 'misconfigured', auth_status: 'not_applicable',
      version, path, required: false,
      install_command: null,
      auth_command: 'sudo systemctl start docker',
      details: { daemon_running: 'false', has_compose: hasCompose ? 'true' : 'false' },
    }
  }

  return {
    id: 'docker', name: 'Docker', status: 'installed', auth_status: 'not_applicable',
    version, path, required: false,
    install_command: null, auth_command: null,
    details: { daemon_running: 'true', has_compose: hasCompose ? 'true' : 'false' },
  }
}

async function checkPython(): Promise<ToolCheck> {
  // Prefer python3.13, fall back to python3
  const path = (await which('python3.13')) ?? (await which('python3'))
  if (!path) {
    return {
      id: 'python', name: 'Python', status: 'missing', auth_status: 'not_applicable',
      version: null, path: null, required: false,
      install_command: 'sudo apt install python3.13',
      auth_command: null, details: {},
    }
  }

  const bin = path.includes('python3.13') ? 'python3.13' : 'python3'
  const version = await getVersion(`${bin} --version`)

  // Check pip via module
  const { stdout: pipOut, exitCode: pipExit } = await exec(`${bin} -m pip --version 2>&1`)
  const pipInstalled = pipExit === 0
  const pipVersion = pipInstalled ? (pipOut.match(/pip (\d+\.\d+[\.\d]*)/))?.[1] ?? null : null

  // Check venv
  const { exitCode: venvExit } = await exec(`${bin} -m venv --help 2>&1`)
  const venvAvailable = venvExit === 0

  upsertToolPath('python', path, version)

  const fullyConfigured = pipInstalled && venvAvailable
  const status: ToolStatus = fullyConfigured ? 'installed' : 'misconfigured'

  return {
    id: 'python', name: 'Python', status, auth_status: 'not_applicable',
    version, path, required: false,
    install_command: fullyConfigured ? null : `sudo apt install ${bin.replace('python', 'python')}-venv`,
    auth_command: null,
    details: { pip_version: pipVersion, venv_available: venvAvailable ? 'true' : 'false' },
  }
}

// ─── Database detection (Docker containers) ─────────────────────────────

/** Known database Docker image prefixes */
const DB_IMAGE_PATTERNS: Record<string, { type: string; name: string; defaultPort: number }> = {
  'postgres': { type: 'postgres', name: 'PostgreSQL', defaultPort: 5432 },
  'mongo': { type: 'mongodb', name: 'MongoDB', defaultPort: 27017 },
  'redis': { type: 'redis', name: 'Redis', defaultPort: 6379 },
  'mysql': { type: 'mysql', name: 'MySQL', defaultPort: 3306 },
  'supabase': { type: 'supabase', name: 'Supabase', defaultPort: 54322 },
}

async function detectRunningDatabases(): Promise<DatabaseInfo[]> {
  // Check if Docker is available
  const { exitCode } = await exec('docker info >/dev/null 2>&1')
  if (exitCode !== 0) return []

  // List all containers (running and stopped) with image, status, ports, and names
  const { stdout, exitCode: listExit } = await exec(
    'docker ps -a --format "{{.ID}}|{{.Image}}|{{.State}}|{{.Ports}}|{{.Names}}" 2>/dev/null',
  )
  if (listExit !== 0 || !stdout) return []

  const databases: DatabaseInfo[] = []

  for (const line of stdout.split('\n')) {
    if (!line.trim()) continue
    const [containerId, image, state, ports, name] = line.split('|')

    // Match container image against known database patterns
    for (const [pattern, dbInfo] of Object.entries(DB_IMAGE_PATTERNS)) {
      if (image.includes(pattern)) {
        // Extract host port from port mapping like "0.0.0.0:5432->5432/tcp"
        const portMatch = ports?.match(/(?:\d+\.\d+\.\d+\.\d+:)?(\d+)->/)
        const port = portMatch ? Number(portMatch[1]) : dbInfo.defaultPort

        // Extract version from image tag
        const versionMatch = image.match(/:(.+)$/)
        const version = versionMatch ? versionMatch[1] : null

        databases.push({
          id: containerId,
          type: dbInfo.type as DatabaseInfo['type'],
          name: name || `${dbInfo.name} (${containerId.slice(0, 8)})`,
          status: state === 'running' ? 'running' : 'stopped',
          version,
          port,
          container_id: containerId,
        })
        break
      }
    }
  }

  return databases
}

// ─── OS detection ───────────────────────────────────────────────────────

async function getOsInfo(): Promise<{ os: string; arch: string }> {
  const arch = process.arch
  let os = `${process.platform} ${arch}`

  if (process.platform === 'linux') {
    try {
      const release = readFileSync('/etc/os-release', 'utf-8')
      const pretty = release.match(/PRETTY_NAME="(.+)"/)
      if (pretty) os = pretty[1]
    } catch {
      // /etc/os-release may not exist
    }
  }

  return { os, arch }
}

// ─── Main export ────────────────────────────────────────────────────────

export async function checkAllPrerequisites(): Promise<PrerequisitesReport> {
  const [osInfo, databases, ...tools] = await Promise.all([
    getOsInfo(),
    detectRunningDatabases(),
    checkGit(),
    checkNode(),
    checkNpm(),
    checkClaudeCli(),
    checkCodexCli(),
    checkDocker(),
    checkBun(),
    checkPnpm(),
    checkChromium(),
    checkPython(),
  ])

  // ready = git configured + node + npm + at least one AI CLI installed & authenticated
  const gitReady =
    tools[0].status === 'installed' && tools[0].auth_status === 'authenticated'
  const nodeReady = tools[1].status === 'installed'
  const npmReady = tools[2].status === 'installed'
  const claudeReady =
    tools[3].status === 'installed' && tools[3].auth_status === 'authenticated'
  const codexReady =
    tools[4].status === 'installed' && tools[4].auth_status === 'authenticated'
  const aiReady = claudeReady || codexReady

  const ready = gitReady && nodeReady && npmReady && aiReady

  return {
    ...osInfo,
    tools,
    databases,
    ready,
  }
}

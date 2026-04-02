import { readFileSync } from 'node:fs'
import { upsertToolPath } from '../db/index.ts'
import type { ToolCheck, PrerequisitesReport, ToolStatus, AuthStatus, DatabaseInfo } from '@pocketdev/shared/types'

/** Run a command in a login shell so nvm/homebrew PATH entries are visible */
async function exec(cmd: string): Promise<{ stdout: string; exitCode: number }> {
  const proc = Bun.spawn(['bash', '-lc', cmd], {
    stdout: 'pipe',
    stderr: 'pipe',
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

  const configured = !!userName && !!userEmail
  const status: ToolStatus = configured ? 'installed' : 'misconfigured'
  const authStatus: AuthStatus = configured ? 'authenticated' : 'unauthenticated'

  upsertToolPath('git', path, version, configured)

  return {
    id: 'git', name: 'Git', status, auth_status: authStatus,
    version, path, required: true,
    install_command: null,
    auth_command: configured ? null : 'git config --global user.name "Your Name" && git config --global user.email "you@example.com"',
    details: { user_name: userName || null, user_email: userEmail || null },
  }
}

async function checkNode(): Promise<ToolCheck> {
  const path = await which('node')
  if (!path) {
    return {
      id: 'node', name: 'Node.js', status: 'missing', auth_status: 'not_applicable',
      version: null, path: null, required: true,
      install_command: 'curl -fsSL https://deb.nodesource.com/setup_lts.x | sudo -E bash - && sudo apt-get install -y nodejs',
      auth_command: null, details: {},
    }
  }

  const version = await getVersion('node --version')
  upsertToolPath('node', path, version)

  return {
    id: 'node', name: 'Node.js', status: 'installed', auth_status: 'not_applicable',
    version, path, required: true,
    install_command: null, auth_command: null, details: {},
  }
}

async function checkNpm(): Promise<ToolCheck> {
  const path = await which('npm')
  if (!path) {
    return {
      id: 'npm', name: 'npm', status: 'missing', auth_status: 'not_applicable',
      version: null, path: null, required: true,
      install_command: null, // installed with node
      auth_command: null, details: {},
    }
  }

  const version = await getVersion('npm --version')
  upsertToolPath('npm', path, version)

  return {
    id: 'npm', name: 'npm', status: 'installed', auth_status: 'not_applicable',
    version, path, required: true,
    install_command: null, auth_command: null, details: {},
  }
}

async function checkNvm(): Promise<ToolCheck> {
  // nvm is a shell function, not a binary — check for the directory
  const { exitCode: dirCheck } = await exec('test -d "$HOME/.nvm"')
  if (dirCheck !== 0) {
    return {
      id: 'nvm', name: 'nvm', status: 'missing', auth_status: 'not_applicable',
      version: null, path: null, required: false,
      install_command: 'curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.1/install.sh | bash',
      auth_command: null, details: {},
    }
  }

  const version = await getVersion('bash -lc "nvm --version"')
  const nvmDir = `${process.env.HOME}/.nvm`
  upsertToolPath('nvm', nvmDir, version)

  return {
    id: 'nvm', name: 'nvm', status: 'installed', auth_status: 'not_applicable',
    version, path: nvmDir, required: false,
    install_command: null, auth_command: null, details: {},
  }
}

async function checkClaudeCli(): Promise<ToolCheck> {
  const path = await which('claude')
  if (!path) {
    return {
      id: 'claude_cli', name: 'Claude CLI', status: 'missing', auth_status: 'unauthenticated',
      version: null, path: null, required: true,
      install_command: 'npm install -g @anthropic-ai/claude-code',
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
      install_command: 'npm install -g @openai/codex',
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
  const path = await which('bun')
  if (!path) {
    return {
      id: 'bun', name: 'Bun', status: 'missing', auth_status: 'not_applicable',
      version: null, path: null, required: false,
      install_command: 'curl -fsSL https://bun.sh/install | bash',
      auth_command: null, details: {},
    }
  }

  const version = await getVersion('bun --version')
  upsertToolPath('bun', path, version)

  return {
    id: 'bun', name: 'Bun', status: 'installed', auth_status: 'not_applicable',
    version, path, required: false,
    install_command: null, auth_command: null, details: {},
  }
}

async function checkPnpm(): Promise<ToolCheck> {
  const path = await which('pnpm')
  if (!path) {
    return {
      id: 'pnpm', name: 'pnpm', status: 'missing', auth_status: 'not_applicable',
      version: null, path: null, required: false,
      install_command: 'npm install -g pnpm',
      auth_command: null, details: {},
    }
  }

  const version = await getVersion('pnpm --version')
  upsertToolPath('pnpm', path, version)

  return {
    id: 'pnpm', name: 'pnpm', status: 'installed', auth_status: 'not_applicable',
    version, path, required: false,
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
    checkNvm(),
    checkClaudeCli(),
    checkCodexCli(),
    checkDocker(),
    checkBun(),
    checkPnpm(),
    checkChromium(),
  ])

  // ready = git configured + node + npm + at least one AI CLI installed & authenticated
  const gitReady =
    tools[0].status === 'installed' && tools[0].auth_status === 'authenticated'
  const nodeReady = tools[1].status === 'installed'
  const npmReady = tools[2].status === 'installed'
  const claudeReady =
    tools[4].status === 'installed' && tools[4].auth_status === 'authenticated'
  const codexReady =
    tools[5].status === 'installed' && tools[5].auth_status === 'authenticated'
  const aiReady = claudeReady || codexReady

  const ready = gitReady && nodeReady && npmReady && aiReady

  return {
    ...osInfo,
    tools,
    databases,
    ready,
  }
}

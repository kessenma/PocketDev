import { chmodSync, existsSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { deleteConfig, getConfig, setConfig } from '../db/index.ts'

const MANAGED_SWAP_CONFIG_KEY = 'managed_swap_config'
const MANAGED_SWAP_FILE_PATH = '/swapfile'
const MANAGED_SWAPPINESS_FILE_PATH = '/etc/sysctl.d/99-pocketdev-swap.conf'
const DEFAULT_SWAPPINESS = 10
const COMMAND_TIMEOUT_MS = 20_000

interface ExecResult {
  stdout: string
  stderr: string
  exitCode: number
}

interface ManagedSwapConfig {
  filePath: string
  sizeBytes: number
  swappiness: number | null
  previousSwappiness: number | null
  createdAt: string
}

export interface SwapEntry {
  path: string
  type: string
  sizeBytes: number
  usedBytes: number
  priority: number
}

export interface SwapStatus {
  supported: boolean
  canManage: boolean
  totalBytes: number
  usedBytes: number
  freeBytes: number
  swappiness: number | null
  entries: SwapEntry[]
  managed: {
    tracked: boolean
    active: boolean
    filePath: string | null
    sizeBytes: number | null
    swappiness: number | null
    previousSwappiness: number | null
    createdAt: string | null
  }
  actions: {
    canEnable: boolean
    canDisable: boolean
    enableBlockedReason: string | null
    disableBlockedReason: string | null
  }
}

export interface SwapMetrics {
  generatedAt: string
  storage: {
    path: string
    totalBytes: number
    usedBytes: number
    availableBytes: number
  } | null
  app: {
    path: string
    footprintBytes: number
  } | null
}

function isLinux() {
  return process.platform === 'linux'
}

function isRoot() {
  return typeof process.getuid === 'function' ? process.getuid() === 0 : false
}

function bytesFromKilobytes(value: string): number {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed * 1024 : 0
}

async function exec(
  cmd: string[],
  timeoutMs = COMMAND_TIMEOUT_MS,
): Promise<ExecResult> {
  const proc = Bun.spawn(cmd, {
    stdout: 'pipe',
    stderr: 'pipe',
    env: process.env,
  })

  const timer = setTimeout(() => {
    try { proc.kill('SIGKILL') } catch { /* already exited */ }
  }, timeoutMs)

  try {
    const [stdout, stderr] = await Promise.all([
      new Response(proc.stdout).text(),
      new Response(proc.stderr).text(),
    ])
    await proc.exited
    return {
      stdout: stdout.trim(),
      stderr: stderr.trim(),
      exitCode: proc.exitCode ?? 1,
    }
  } finally {
    clearTimeout(timer)
  }
}

async function execOrThrow(cmd: string[], timeoutMs = COMMAND_TIMEOUT_MS): Promise<ExecResult> {
  const result = await exec(cmd, timeoutMs)
  if (result.exitCode !== 0) {
    const detail = [result.stdout, result.stderr].filter(Boolean).join('\n').trim()
    throw new Error(detail || `Command failed: ${cmd.join(' ')}`)
  }
  return result
}

function parseSwapEntries(procSwapsContent: string): SwapEntry[] {
  return procSwapsContent
    .split('\n')
    .slice(1)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [path, type, size, used, priority] = line.split(/\s+/)
      return {
        path,
        type,
        sizeBytes: bytesFromKilobytes(size ?? '0'),
        usedBytes: bytesFromKilobytes(used ?? '0'),
        priority: Number(priority ?? '0'),
      } satisfies SwapEntry
    })
}

function parseMemInfo(memInfoContent: string): {
  totalBytes: number
  freeBytes: number
  usedBytes: number
} {
  const values = new Map<string, number>()

  for (const line of memInfoContent.split('\n')) {
    const match = line.match(/^(\w+):\s+(\d+)\s+kB$/)
    if (match) {
      values.set(match[1], bytesFromKilobytes(match[2]))
    }
  }

  const totalBytes = values.get('SwapTotal') ?? 0
  const freeBytes = values.get('SwapFree') ?? 0
  return {
    totalBytes,
    freeBytes,
    usedBytes: Math.max(totalBytes - freeBytes, 0),
  }
}

function parseSwappiness(raw: string): number | null {
  const value = Number(raw.trim())
  return Number.isFinite(value) ? value : null
}

function parseDfOutput(raw: string): SwapMetrics['storage'] {
  const lines = raw
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)

  const target = lines[lines.length - 1]
  if (!target) return null

  const parts = target.split(/\s+/)
  if (parts.length < 6) return null

  const totalBytes = bytesFromKilobytes(parts[1] ?? '0')
  const usedBytes = bytesFromKilobytes(parts[2] ?? '0')
  const availableBytes = bytesFromKilobytes(parts[3] ?? '0')
  const path = parts.slice(5).join(' ') || '/'

  return {
    path,
    totalBytes,
    usedBytes,
    availableBytes,
  }
}

function parseDuOutput(raw: string, path: string): SwapMetrics['app'] {
  const match = raw.trim().match(/^(\d+)/)
  if (!match) return null

  return {
    path,
    footprintBytes: bytesFromKilobytes(match[1]),
  }
}

function getManagedSwapConfig(): ManagedSwapConfig | null {
  const raw = getConfig(MANAGED_SWAP_CONFIG_KEY)
  if (!raw) return null

  try {
    const parsed = JSON.parse(raw) as Partial<ManagedSwapConfig>
    if (
      typeof parsed.filePath !== 'string' ||
      typeof parsed.sizeBytes !== 'number' ||
      typeof parsed.createdAt !== 'string'
    ) {
      return null
    }

    return {
      filePath: parsed.filePath,
      sizeBytes: parsed.sizeBytes,
      swappiness: typeof parsed.swappiness === 'number' ? parsed.swappiness : null,
      previousSwappiness: typeof parsed.previousSwappiness === 'number' ? parsed.previousSwappiness : null,
      createdAt: parsed.createdAt,
    }
  } catch {
    return null
  }
}

function setManagedSwapConfig(config: ManagedSwapConfig) {
  setConfig(MANAGED_SWAP_CONFIG_KEY, JSON.stringify(config))
}

function clearManagedSwapConfig() {
  deleteConfig(MANAGED_SWAP_CONFIG_KEY)
}

function getSwapEntries(): SwapEntry[] {
  if (!isLinux() || !existsSync('/proc/swaps')) return []
  return parseSwapEntries(readFileSync('/proc/swaps', 'utf8'))
}

function getSwapTotals() {
  if (!isLinux() || !existsSync('/proc/meminfo')) {
    return { totalBytes: 0, freeBytes: 0, usedBytes: 0 }
  }

  return parseMemInfo(readFileSync('/proc/meminfo', 'utf8'))
}

function getCurrentSwappiness(): number | null {
  if (!isLinux() || !existsSync('/proc/sys/vm/swappiness')) return null
  return parseSwappiness(readFileSync('/proc/sys/vm/swappiness', 'utf8'))
}

function getEnableBlockedReason(
  entries: SwapEntry[],
  managedConfig: ManagedSwapConfig | null,
): string | null {
  if (!isLinux()) return 'Swap management is only supported on Linux hosts.'
  if (!isRoot()) return 'PocketDev must run as root to manage swap from the console.'
  if (managedConfig) return 'PocketDev is already tracking a managed swap file. Disable it before creating a new one.'
  if (entries.length > 0) return 'This server already has swap enabled outside PocketDev. PocketDev will not override it.'
  if (existsSync(MANAGED_SWAP_FILE_PATH)) return `${MANAGED_SWAP_FILE_PATH} already exists. PocketDev will not overwrite it.`
  return null
}

function getDisableBlockedReason(managedConfig: ManagedSwapConfig | null): string | null {
  if (!isLinux()) return 'Swap management is only supported on Linux hosts.'
  if (!isRoot()) return 'PocketDev must run as root to manage swap from the console.'
  if (!managedConfig) return 'No PocketDev-managed swap file is recorded.'
  return null
}

function ensureFstabEntry(filePath: string) {
  const fstabPath = '/etc/fstab'
  const current = existsSync(fstabPath) ? readFileSync(fstabPath, 'utf8') : ''
  const matcher = new RegExp(`^\\s*${filePath.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s+none\\s+swap\\b`, 'm')

  if (matcher.test(current)) return

  const next = `${current.replace(/\s*$/, '')}\n${filePath} none swap sw 0 0\n`
  writeFileSync(fstabPath, next)
}

function removeFstabEntry(filePath: string) {
  const fstabPath = '/etc/fstab'
  if (!existsSync(fstabPath)) return

  const matcher = new RegExp(`^\\s*${filePath.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s+none\\s+swap\\b.*$`)
  const next = readFileSync(fstabPath, 'utf8')
    .split('\n')
    .filter((line) => !matcher.test(line))
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/\s*$/, '\n')

  writeFileSync(fstabPath, next)
}

function writeManagedSwappinessFile(swappiness: number) {
  writeFileSync(MANAGED_SWAPPINESS_FILE_PATH, `vm.swappiness=${swappiness}\n`)
}

function removeManagedSwappinessFile() {
  if (existsSync(MANAGED_SWAPPINESS_FILE_PATH)) {
    rmSync(MANAGED_SWAPPINESS_FILE_PATH, { force: true })
  }
}

function assertManageableHost() {
  if (!isLinux()) {
    throw new Error('Swap management is only supported on Linux hosts.')
  }

  if (!isRoot()) {
    throw new Error('PocketDev must run as root to manage swap from the console.')
  }
}

export function getSwapStatus(): SwapStatus {
  const entries = getSwapEntries()
  const totals = getSwapTotals()
  const managedConfig = getManagedSwapConfig()
  const managedActive = !!managedConfig && entries.some((entry) => entry.path === managedConfig.filePath)
  const enableBlockedReason = getEnableBlockedReason(entries, managedConfig)
  const disableBlockedReason = getDisableBlockedReason(managedConfig)

  return {
    supported: isLinux(),
    canManage: isLinux() && isRoot(),
    totalBytes: totals.totalBytes,
    usedBytes: totals.usedBytes,
    freeBytes: totals.freeBytes,
    swappiness: getCurrentSwappiness(),
    entries,
    managed: {
      tracked: !!managedConfig,
      active: managedActive,
      filePath: managedConfig?.filePath ?? null,
      sizeBytes: managedConfig?.sizeBytes ?? null,
      swappiness: managedConfig?.swappiness ?? null,
      previousSwappiness: managedConfig?.previousSwappiness ?? null,
      createdAt: managedConfig?.createdAt ?? null,
    },
    actions: {
      canEnable: enableBlockedReason === null,
      canDisable: disableBlockedReason === null,
      enableBlockedReason,
      disableBlockedReason,
    },
  }
}

export async function getSwapMetrics(): Promise<SwapMetrics> {
  if (!isLinux()) {
    return {
      generatedAt: new Date().toISOString(),
      storage: null,
      app: null,
    }
  }

  const storageResult = await exec(['df', '-Pk', '/'])
  const appPath = process.cwd()
  const appResult = await exec(['du', '-sk', appPath], 120_000)

  return {
    generatedAt: new Date().toISOString(),
    storage: storageResult.exitCode === 0 ? parseDfOutput(storageResult.stdout) : null,
    app: appResult.exitCode === 0 ? parseDuOutput(appResult.stdout, appPath) : null,
  }
}

export async function enableManagedSwap(sizeGb: number): Promise<SwapStatus> {
  assertManageableHost()

  if (![1, 2, 4].includes(sizeGb)) {
    throw new Error('PocketDev swap sizes are limited to 1GB, 2GB, or 4GB.')
  }

  const existingStatus = getSwapStatus()
  if (!existingStatus.actions.canEnable) {
    throw new Error(existingStatus.actions.enableBlockedReason ?? 'Swap cannot be enabled right now.')
  }

  const sizeBytes = sizeGb * 1024 * 1024 * 1024
  const previousSwappiness = existingStatus.swappiness
  let swapActivated = false

  try {
    try {
      await execOrThrow(['fallocate', '-l', `${sizeGb}G`, MANAGED_SWAP_FILE_PATH])
    } catch {
      if (existsSync(MANAGED_SWAP_FILE_PATH)) {
        rmSync(MANAGED_SWAP_FILE_PATH, { force: true })
      }
      await execOrThrow([
        'dd',
        'if=/dev/zero',
        `of=${MANAGED_SWAP_FILE_PATH}`,
        'bs=1M',
        `count=${sizeGb * 1024}`,
        'status=none',
      ], 120_000)
    }

    chmodSync(MANAGED_SWAP_FILE_PATH, 0o600)
    await execOrThrow(['mkswap', MANAGED_SWAP_FILE_PATH])
    await execOrThrow(['swapon', MANAGED_SWAP_FILE_PATH])
    swapActivated = true
    ensureFstabEntry(MANAGED_SWAP_FILE_PATH)
    writeManagedSwappinessFile(DEFAULT_SWAPPINESS)
    await execOrThrow(['sysctl', '-w', `vm.swappiness=${DEFAULT_SWAPPINESS}`])

    setManagedSwapConfig({
      filePath: MANAGED_SWAP_FILE_PATH,
      sizeBytes,
      swappiness: DEFAULT_SWAPPINESS,
      previousSwappiness,
      createdAt: new Date().toISOString(),
    })

    return getSwapStatus()
  } catch (error) {
    clearManagedSwapConfig()
    removeFstabEntry(MANAGED_SWAP_FILE_PATH)
    removeManagedSwappinessFile()

    if (previousSwappiness !== null) {
      try {
        await exec(['sysctl', '-w', `vm.swappiness=${previousSwappiness}`])
      } catch {
        // best-effort restore
      }
    }

    if (swapActivated) {
      try {
        await exec(['swapoff', MANAGED_SWAP_FILE_PATH])
      } catch {
        // best-effort cleanup
      }
    }

    if (existsSync(MANAGED_SWAP_FILE_PATH)) {
      rmSync(MANAGED_SWAP_FILE_PATH, { force: true })
    }

    throw error
  }
}

export async function disableManagedSwap(): Promise<SwapStatus> {
  assertManageableHost()

  const managedConfig = getManagedSwapConfig()
  if (!managedConfig) {
    throw new Error('No PocketDev-managed swap file is recorded.')
  }

  const activeEntries = getSwapEntries()
  const managedIsActive = activeEntries.some((entry) => entry.path === managedConfig.filePath)

  if (managedIsActive) {
    await execOrThrow(['swapoff', managedConfig.filePath])
  }

  removeFstabEntry(managedConfig.filePath)
  removeManagedSwappinessFile()

  if (managedConfig.previousSwappiness !== null) {
    await execOrThrow(['sysctl', '-w', `vm.swappiness=${managedConfig.previousSwappiness}`])
  }

  if (existsSync(managedConfig.filePath)) {
    rmSync(managedConfig.filePath, { force: true })
  }

  clearManagedSwapConfig()
  return getSwapStatus()
}

export const __test = {
  parseDfOutput,
  parseDuOutput,
  parseSwapEntries,
  parseMemInfo,
  parseSwappiness,
}

import { hostname } from 'node:os'
import type {
  ServerActionsSummary,
  ServerMetricEntry,
  ServerMetricTone,
  ServerPortEntry,
  ServerNetworkEntry,
  ServerErrorEntry,
  ServerActionDefinition,
  ServerActionResult,
} from '@pocketdev/shared/types'

const IS_MACOS = process.platform === 'darwin'
const ACTION_TIMEOUT_MS = 5_000

export class ServerActionsError extends Error {
  statusCode: number
  constructor(message: string, statusCode = 500) {
    super(message)
    this.statusCode = statusCode
  }
}

async function exec(cmd: string): Promise<{ stdout: string; exitCode: number }> {
  const proc = Bun.spawn(['bash', '-lc', cmd], {
    stdout: 'pipe',
    stderr: 'pipe',
  })
  const stdout = await new Response(proc.stdout).text()
  await proc.exited
  return { stdout: stdout.trim(), exitCode: proc.exitCode ?? 1 }
}

// ─── Summary ─────────────────────────────────────────────

export async function getSystemSummary(): Promise<ServerActionsSummary> {
  const [uptimeResult, cpuResult, memResult, storageResult, loadResult] = await Promise.all([
    exec(IS_MACOS ? 'uptime | sed "s/.*up /up /" | sed "s/,.*//"' : 'uptime -p 2>/dev/null || uptime'),
    getCpuMetric(),
    getMemoryMetric(),
    getStorageMetric(),
    getLoadMetric(),
  ])

  const metrics = [cpuResult, memResult, storageResult, loadResult]
  const errors = await getRecentErrors()

  return {
    serverLabel: hostname(),
    uptime: uptimeResult.stdout || 'unknown',
    metrics,
    incidentCount: errors.length,
    generatedAt: new Date().toISOString(),
  }
}

async function getCpuMetric(): Promise<ServerMetricEntry> {
  if (IS_MACOS) {
    const { stdout } = await exec("top -l 1 -n 0 | grep 'CPU usage' | awk '{print $3}'")
    const value = stdout || '0%'
    const pct = parseFloat(value)
    return {
      id: 'cpu',
      label: 'CPU',
      value,
      detail: 'Current CPU usage from top.',
      tone: pctTone(pct),
    }
  }

  const { stdout } = await exec("top -bn1 | grep 'Cpu(s)' | awk '{print $2}' | cut -d. -f1")
  const pct = parseInt(stdout, 10) || 0
  return {
    id: 'cpu',
    label: 'CPU',
    value: `${pct}%`,
    detail: 'Current user CPU usage.',
    tone: pctTone(pct),
  }
}

async function getMemoryMetric(): Promise<ServerMetricEntry> {
  if (IS_MACOS) {
    const { stdout } = await exec("vm_stat | awk '/Pages active/ {print $3}' | tr -d '.'")
    const activePages = parseInt(stdout, 10) || 0
    const activeMB = Math.round((activePages * 4096) / 1048576)
    const { stdout: totalRaw } = await exec("sysctl -n hw.memsize")
    const totalMB = Math.round(parseInt(totalRaw, 10) / 1048576)
    const pct = totalMB > 0 ? Math.round((activeMB / totalMB) * 100) : 0
    return {
      id: 'memory',
      label: 'Memory',
      value: `${(activeMB / 1024).toFixed(1)} GB / ${(totalMB / 1024).toFixed(1)} GB`,
      detail: `${pct}% active memory.`,
      tone: pctTone(pct),
    }
  }

  const { stdout } = await exec("free -m | awk '/Mem:/ {printf \"%s %s\", $3, $2}'")
  const [usedStr, totalStr] = stdout.split(' ')
  const used = parseInt(usedStr, 10) || 0
  const total = parseInt(totalStr, 10) || 1
  const pct = Math.round((used / total) * 100)
  return {
    id: 'memory',
    label: 'Memory',
    value: `${(used / 1024).toFixed(1)} GB / ${(total / 1024).toFixed(1)} GB`,
    detail: `${pct}% used.`,
    tone: pctTone(pct),
  }
}

async function getStorageMetric(): Promise<ServerMetricEntry> {
  const { stdout } = await exec("df -h / | awk 'NR==2 {printf \"%s %s %s\", $4, $2, $5}'")
  const [free, total, usedPctStr] = stdout.split(' ')
  const usedPct = parseInt(usedPctStr, 10) || 0
  return {
    id: 'storage',
    label: 'Storage',
    value: `${free || '?'} free of ${total || '?'}`,
    detail: `Root volume at ${usedPct}% usage.`,
    tone: pctTone(usedPct),
  }
}

async function getLoadMetric(): Promise<ServerMetricEntry> {
  const { stdout } = await exec(IS_MACOS ? 'sysctl -n vm.loadavg' : 'cat /proc/loadavg')
  const parts = stdout.replace(/[{}]/g, '').trim().split(/\s+/)
  const [l1, l5, l15] = parts.map((p) => parseFloat(p) || 0)
  return {
    id: 'load',
    label: 'Load Avg',
    value: `${l1.toFixed(2)} / ${l5.toFixed(2)} / ${l15.toFixed(2)}`,
    detail: '1 / 5 / 15 minute load averages.',
    tone: l1 > 4 ? 'critical' : l1 > 2 ? 'warning' : 'healthy',
  }
}

function pctTone(pct: number): ServerMetricTone {
  if (pct >= 90) return 'critical'
  if (pct >= 70) return 'warning'
  return 'healthy'
}

// ─── Ports ───────────────────────────────────────────────

export async function getListeningPorts(): Promise<ServerPortEntry[]> {
  if (IS_MACOS) {
    const { stdout } = await exec("lsof -iTCP -sTCP:LISTEN -P -n 2>/dev/null | tail -n +2")
    if (!stdout) return []

    const entries: ServerPortEntry[] = []
    const seen = new Set<number>()

    for (const line of stdout.split('\n')) {
      if (!line) continue
      const parts = line.split(/\s+/)
      const process = parts[0] ?? ''
      const pid = parts[1] ?? ''
      const nameField = parts[8] ?? ''
      const portMatch = nameField.match(/:(\d+)$/)
      if (!portMatch) continue

      const port = parseInt(portMatch[1], 10)
      if (seen.has(port)) continue
      seen.add(port)

      const isLocal = nameField.startsWith('127.') || nameField.startsWith('[::1]') || nameField.startsWith('localhost')
      entries.push({
        id: `${port}-tcp`,
        port,
        protocol: 'tcp',
        service: guessService(port),
        process: `${process} (pid ${pid})`,
        exposure: isLocal ? 'local' : 'public',
        status: 'listening',
      })
    }

    return entries
  }

  // Linux: ss
  const { stdout } = await exec("ss -tulpn 2>/dev/null | tail -n +2")
  if (!stdout) return []

  const entries: ServerPortEntry[] = []
  const seen = new Set<number>()

  for (const line of stdout.split('\n')) {
    if (!line) continue
    const parts = line.split(/\s+/)
    const proto = (parts[0] ?? '').toLowerCase().startsWith('udp') ? 'udp' as const : 'tcp' as const
    const localAddr = parts[4] ?? ''
    const processField = parts[6] ?? ''

    const portMatch = localAddr.match(/:(\d+)$/)
    if (!portMatch) continue

    const port = parseInt(portMatch[1], 10)
    if (seen.has(port)) continue
    seen.add(port)

    const isLocal = localAddr.startsWith('127.') || localAddr.startsWith('[::1]')
    const procMatch = processField.match(/\("([^"]+)",pid=(\d+)/)

    entries.push({
      id: `${port}-${proto}`,
      port,
      protocol: proto,
      service: guessService(port),
      process: procMatch ? `${procMatch[1]} (pid ${procMatch[2]})` : processField,
      exposure: isLocal ? 'local' : 'public',
      status: 'listening',
    })
  }

  return entries
}

function guessService(port: number): string {
  const map: Record<number, string> = {
    22: 'SSH', 80: 'HTTP', 443: 'HTTPS', 3000: 'Dev Server',
    3306: 'MySQL', 4387: 'PocketDev', 5173: 'Vite', 5432: 'Postgres',
    6379: 'Redis', 8080: 'HTTP Alt', 27017: 'MongoDB',
  }
  return map[port] ?? `Port ${port}`
}

// ─── Network ─────────────────────────────────────────────

export async function getNetworkStats(): Promise<ServerNetworkEntry[]> {
  if (IS_MACOS) {
    const { stdout } = await exec("netstat -ib 2>/dev/null | tail -n +2")
    if (!stdout) return []

    const entries: ServerNetworkEntry[] = []
    const seen = new Set<string>()

    for (const line of stdout.split('\n')) {
      if (!line) continue
      const parts = line.split(/\s+/)
      const iface = parts[0] ?? ''
      if (seen.has(iface) || iface === 'lo0') continue
      seen.add(iface)

      const inBytes = parseInt(parts[6] ?? '0', 10)
      const outBytes = parseInt(parts[9] ?? '0', 10)

      entries.push({
        id: iface,
        interface: iface,
        inbound: formatBytes(inBytes),
        outbound: formatBytes(outBytes),
        connections: 0,
        detail: 'Cumulative byte counts from netstat.',
      })
    }

    return entries
  }

  // Linux: /proc/net/dev
  const { stdout } = await exec("cat /proc/net/dev 2>/dev/null | tail -n +3")
  if (!stdout) return []

  const entries: ServerNetworkEntry[] = []

  for (const line of stdout.split('\n')) {
    if (!line) continue
    const parts = line.trim().split(/[\s:]+/)
    const iface = parts[0]
    if (!iface || iface === 'lo') continue

    const inBytes = parseInt(parts[1] ?? '0', 10)
    const outBytes = parseInt(parts[9] ?? '0', 10)

    // Count active connections on this interface
    const { stdout: connCount } = await exec(`ss -tn state established 2>/dev/null | grep -c . || echo 0`)

    entries.push({
      id: iface,
      interface: iface,
      inbound: formatBytes(inBytes),
      outbound: formatBytes(outBytes),
      connections: parseInt(connCount, 10) || 0,
      detail: 'Cumulative byte counts from /proc/net/dev.',
    })
  }

  return entries
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`
  if (bytes < 1073741824) return `${(bytes / 1048576).toFixed(1)} MB`
  return `${(bytes / 1073741824).toFixed(1)} GB`
}

// ─── Errors ──────────────────────────────────────────────

export async function getRecentErrors(): Promise<ServerErrorEntry[]> {
  const errors: ServerErrorEntry[] = []

  // Docker container failures
  try {
    const { stdout } = await exec(
      "docker ps -a --filter 'status=exited' --format '{{.ID}}\\t{{.Names}}\\t{{.Status}}\\t{{.Image}}' 2>/dev/null | head -10",
    )
    if (stdout) {
      for (const line of stdout.split('\n')) {
        if (!line) continue
        const [id, name, status, image] = line.split('\t')
        errors.push({
          id: `docker-${id}`,
          severity: status?.includes('Exited (0)') ? 'info' : 'warning',
          title: `Container ${name} exited`,
          source: image ?? 'docker',
          relativeTime: extractTimeFromStatus(status ?? ''),
          detail: status ?? '',
          suggestion: `Check logs with: docker logs ${name}`,
        })
      }
    }
  } catch {
    // Docker may not be available
  }

  return errors
}

function extractTimeFromStatus(status: string): string {
  const match = status.match(/\(.*?\)\s+(.+)/)
  return match ? match[1] : status
}

// ─── Quick Actions ───────────────────────────────────────

const ACTION_CATALOG: Record<string, { label: string; description: string; command: string }> = {
  ports: {
    label: 'Check open ports',
    description: 'List all listening TCP/UDP ports and their owning processes.',
    command: IS_MACOS ? 'lsof -iTCP -sTCP:LISTEN -P -n' : 'ss -tulpn',
  },
  stats: {
    label: 'System stats',
    description: 'Show CPU, memory, and process overview.',
    command: IS_MACOS ? 'top -l 1 -n 10' : 'top -bn1 | head -30',
  },
  storage: {
    label: 'Disk usage',
    description: 'Show filesystem usage and Docker disk consumption.',
    command: 'df -h && echo "---" && du -sh /var/lib/docker/* 2>/dev/null || echo "Docker storage not available"',
  },
  network: {
    label: 'Network connections',
    description: 'Show active network connections.',
    command: IS_MACOS ? 'netstat -an | head -40' : 'ss -tn state established | head -40',
  },
}

export function getActionCatalog(): ServerActionDefinition[] {
  return Object.entries(ACTION_CATALOG).map(([id, def]) => ({
    id,
    label: def.label,
    description: def.description,
  }))
}

export async function runNamedAction(actionId: string): Promise<ServerActionResult> {
  const action = ACTION_CATALOG[actionId]
  if (!action) {
    throw new ServerActionsError(`Unknown action: ${actionId}`, 404)
  }

  const proc = Bun.spawn(['bash', '-lc', action.command], {
    stdout: 'pipe',
    stderr: 'pipe',
  })

  const timeout = setTimeout(() => proc.kill(), ACTION_TIMEOUT_MS)

  try {
    const stdout = await new Response(proc.stdout).text()
    await proc.exited
    clearTimeout(timeout)

    return {
      actionId,
      output: stdout.trim().slice(0, 10_000),
      exitCode: proc.exitCode ?? 1,
    }
  } catch {
    clearTimeout(timeout)
    throw new ServerActionsError('Action timed out', 408)
  }
}

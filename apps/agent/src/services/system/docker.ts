import type {
  ContainerLogLine,
  ContainerLogsFilter,
  ContainerLogsRequest,
  ContainerLogsSnapshot,
  ContainerLogsFollowRequest,
  ContainerSummary,
} from '@pocketdev/shared/types'

const MAX_LOG_LINE_COUNT = 1000
const SAFE_CONTAINER_REF = /^[a-zA-Z0-9][a-zA-Z0-9_.-]{0,127}$/
const ERROR_PATTERNS = [
  /\berror\b/i,
  /\bfatal\b/i,
  /\bexception\b/i,
  /\bpanic\b/i,
  /\bfailed\b/i,
  /\btraceback\b/i,
  /\brefused\b/i,
  /\btimeout\b/i,
]

type ShellResult = {
  stdout: string
  stderr: string
  exitCode: number
}

type DockerPsRecord = {
  ID?: string
  Image?: string
  Command?: string
  CreatedAt?: string
  RunningFor?: string
  Ports?: string
  State?: string
  Status?: string
  Names?: string
}

type FollowCallbacks = {
  onLine: (line: ContainerLogLine) => void
  onStop: (reason: 'completed' | 'stopped' | 'stopped_by_client' | 'terminated') => void
}

export type ContainerLogsFollower = {
  stop: () => void
}

export class DockerServiceError extends Error {
  statusCode: number

  constructor(message: string, statusCode = 500) {
    super(message)
    this.statusCode = statusCode
  }
}

async function execProcess(args: string[]): Promise<ShellResult> {
  const proc = Bun.spawn(args, {
    stdout: 'pipe',
    stderr: 'pipe',
  })

  const [stdout, stderr] = await Promise.all([
    new Response(proc.stdout).text(),
    new Response(proc.stderr).text(),
  ])

  await proc.exited

  return {
    stdout: stdout.trimEnd(),
    stderr: stderr.trimEnd(),
    exitCode: proc.exitCode ?? 1,
  }
}

async function execShell(command: string): Promise<ShellResult> {
  const proc = Bun.spawn(['bash', '-lc', command], {
    stdout: 'pipe',
    stderr: 'pipe',
  })

  const [stdout, stderr] = await Promise.all([
    new Response(proc.stdout).text(),
    new Response(proc.stderr).text(),
  ])

  await proc.exited

  return {
    stdout: stdout.trimEnd(),
    stderr: stderr.trimEnd(),
    exitCode: proc.exitCode ?? 1,
  }
}

async function ensureDockerAvailable() {
  const result = await execProcess(['docker', 'info'])
  if (result.exitCode !== 0) {
    throw new DockerServiceError('Docker is not available on this server.', 503)
  }
}

function parsePorts(rawPorts: string | undefined): string[] {
  if (!rawPorts) return []
  return rawPorts
    .split(',')
    .map((port) => port.trim())
    .filter(Boolean)
}

function normalizeContainerState(state: string | undefined): ContainerSummary['state'] {
  switch ((state ?? '').toLowerCase()) {
    case 'running':
      return 'running'
    case 'created':
      return 'created'
    case 'restarting':
      return 'restarting'
    case 'paused':
      return 'paused'
    case 'exited':
      return 'exited'
    case 'dead':
      return 'dead'
    case 'removing':
      return 'removing'
    default:
      return 'unknown'
  }
}

function toContainerSummary(record: DockerPsRecord): ContainerSummary {
  return {
    id: record.ID ?? '',
    name: record.Names ?? 'unknown',
    image: record.Image ?? 'unknown',
    command: (record.Command ?? '').replace(/^"|"$/g, ''),
    state: normalizeContainerState(record.State),
    status_text: record.Status ?? 'Unknown',
    created_at: record.CreatedAt ?? '',
    running_for: record.RunningFor ?? '',
    ports: parsePorts(record.Ports),
    is_running: normalizeContainerState(record.State) === 'running',
  }
}

function buildDockerError(output: string): DockerServiceError {
  if (/no such container/i.test(output)) {
    return new DockerServiceError('Container not found.', 404)
  }

  if (/permission denied/i.test(output)) {
    return new DockerServiceError('Docker is installed but this server user cannot access it.', 403)
  }

  return new DockerServiceError(output || 'Docker command failed.', 500)
}

export function validateContainerReference(containerId: string): string {
  const normalized = containerId.trim()
  if (!SAFE_CONTAINER_REF.test(normalized)) {
    throw new DockerServiceError('Invalid container identifier.', 400)
  }
  return normalized
}

export function normalizeLogLineCount(lineCount: number): number {
  if (!Number.isFinite(lineCount) || lineCount <= 0) return 100
  return Math.min(Math.floor(lineCount), MAX_LOG_LINE_COUNT)
}

export function isLikelyErrorLine(line: string): boolean {
  return ERROR_PATTERNS.some((pattern) => pattern.test(line))
}

function toLogLines(output: string, filter: ContainerLogsFilter): ContainerLogLine[] {
  return output
    .split('\n')
    .filter((line) => line.length > 0)
    .map((line) => ({
      content: line,
      stream: 'combined' as const,
      is_error: isLikelyErrorLine(line),
    }))
    .filter((line) => (filter === 'errors' ? line.is_error : true))
}

async function readStreamLines(
  stream: ReadableStream<Uint8Array> | null,
  streamType: 'stdout' | 'stderr',
  filter: ContainerLogsFilter,
  onLine: (line: ContainerLogLine) => void,
) {
  if (!stream) return

  const reader = stream.getReader()
  const decoder = new TextDecoder()
  let buffer = ''

  while (true) {
    const { value, done } = await reader.read()
    if (done) break

    buffer += decoder.decode(value, { stream: true })
    const lines = buffer.split('\n')
    buffer = lines.pop() ?? ''

    for (const line of lines) {
      const trimmed = line.replace(/\r$/, '')
      const isError = streamType === 'stderr' || isLikelyErrorLine(trimmed)
      if (filter === 'errors' && !isError) continue
      onLine({
        content: trimmed,
        stream: streamType,
        is_error: isError,
      })
    }
  }

  const finalLine = buffer.replace(/\r$/, '')
  if (!finalLine) return

  const isError = streamType === 'stderr' || isLikelyErrorLine(finalLine)
  if (filter === 'errors' && !isError) return

  onLine({
    content: finalLine,
    stream: streamType,
    is_error: isError,
  })
}

export async function listContainers(): Promise<ContainerSummary[]> {
  await ensureDockerAvailable()

  const result = await execProcess([
    'docker',
    'ps',
    '-a',
    '--no-trunc',
    '--format',
    '{{json .}}',
  ])

  if (result.exitCode !== 0) {
    throw buildDockerError(result.stderr || result.stdout)
  }

  if (!result.stdout) return []

  return result.stdout
    .split('\n')
    .filter(Boolean)
    .map((line) => JSON.parse(line) as DockerPsRecord)
    .map(toContainerSummary)
}

export async function getContainerLogs(request: ContainerLogsRequest): Promise<ContainerLogsSnapshot> {
  await ensureDockerAvailable()

  const containerId = validateContainerReference(request.container_id)
  const lineCount = normalizeLogLineCount(request.line_count)
  const direction = request.direction === 'head' ? 'head' : 'tail'
  const filter = request.filter === 'errors' ? 'errors' : 'all'

  const command =
    direction === 'tail'
      ? `docker logs --timestamps --tail ${lineCount} "${containerId}" 2>&1`
      : `docker logs --timestamps "${containerId}" 2>&1 | head -n ${lineCount}`

  const result = await execShell(command)
  if (result.exitCode !== 0) {
    throw buildDockerError(result.stdout || result.stderr)
  }

  const lines = toLogLines(result.stdout || result.stderr, filter)

  return {
    container_id: containerId,
    line_count: lineCount,
    direction,
    filter,
    returned_line_count: lines.length,
    lines,
  }
}

export function startContainerLogsFollow(
  request: Omit<ContainerLogsFollowRequest, 'direction'>,
  callbacks: FollowCallbacks,
): ContainerLogsFollower {
  const containerId = validateContainerReference(request.container_id)
  const lineCount = normalizeLogLineCount(request.line_count)
  const filter = request.filter === 'errors' ? 'errors' : 'all'
  const proc = Bun.spawn(
    ['docker', 'logs', '--timestamps', '--tail', String(lineCount), '-f', containerId],
    {
      stdout: 'pipe',
      stderr: 'pipe',
    },
  )

  let finished = false

  const finish = (reason: 'completed' | 'stopped' | 'stopped_by_client' | 'terminated') => {
    if (finished) return
    finished = true
    callbacks.onStop(reason)
  }

  void Promise.all([
    readStreamLines(proc.stdout, 'stdout', filter, callbacks.onLine),
    readStreamLines(proc.stderr, 'stderr', filter, callbacks.onLine),
  ]).then(async () => {
    const exitCode = await proc.exited
    finish(exitCode === 0 ? 'completed' : 'terminated')
  })

  return {
    stop: () => {
      proc.kill()
      finish('stopped_by_client')
    },
  }
}
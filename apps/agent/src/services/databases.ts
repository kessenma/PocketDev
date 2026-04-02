import type { DatabaseTemplate, DatabaseCreateRequest } from '@pocketdev/shared/types'

/** Available database templates — Coolify-style one-click provisioning */
export const DATABASE_TEMPLATES: DatabaseTemplate[] = [
  {
    type: 'postgres',
    name: 'PostgreSQL',
    description: 'Powerful open-source relational database',
    default_image: 'postgres:16',
    default_port: 5432,
    env_vars: {
      POSTGRES_USER: 'pocketdev',
      POSTGRES_PASSWORD: '',  // generated at creation time
      POSTGRES_DB: 'app',
    },
  },
  {
    type: 'mongodb',
    name: 'MongoDB',
    description: 'Document-oriented NoSQL database',
    default_image: 'mongo:7',
    default_port: 27017,
    env_vars: {
      MONGO_INITDB_ROOT_USERNAME: 'pocketdev',
      MONGO_INITDB_ROOT_PASSWORD: '', // generated at creation time
      MONGO_INITDB_DATABASE: 'app',
    },
  },
  {
    type: 'redis',
    name: 'Redis',
    description: 'In-memory data store for caching and messaging',
    default_image: 'redis:7-alpine',
    default_port: 6379,
    env_vars: {},
  },
  {
    type: 'mysql',
    name: 'MySQL',
    description: 'Popular open-source relational database',
    default_image: 'mysql:8',
    default_port: 3306,
    env_vars: {
      MYSQL_ROOT_PASSWORD: '', // generated at creation time
      MYSQL_USER: 'pocketdev',
      MYSQL_PASSWORD: '', // generated at creation time
      MYSQL_DATABASE: 'app',
    },
  },
  {
    type: 'supabase',
    name: 'Supabase',
    description: 'Open-source Firebase alternative (Postgres + Auth + APIs)',
    default_image: 'supabase/postgres:15.6.1.145',
    default_port: 54322,
    env_vars: {
      POSTGRES_PASSWORD: '', // generated at creation time
    },
  },
]

/** Generate a random password */
function generatePassword(length = 24): string {
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
  let result = ''
  const bytes = new Uint8Array(length)
  crypto.getRandomValues(bytes)
  for (const byte of bytes) {
    result += chars[byte % chars.length]
  }
  return result
}

/** Run a command and return stdout + exit code */
async function exec(cmd: string): Promise<{ stdout: string; exitCode: number }> {
  const proc = Bun.spawn(['bash', '-lc', cmd], { stdout: 'pipe', stderr: 'pipe' })
  const stdout = await new Response(proc.stdout).text()
  await proc.exited
  return { stdout: stdout.trim(), exitCode: proc.exitCode ?? 1 }
}

/** Create and start a database container */
export async function createDatabase(
  request: DatabaseCreateRequest,
): Promise<{ success: boolean; container_id: string | null; connection_uri: string | null; error: string | null }> {
  // Check Docker is available
  const { exitCode: dockerCheck } = await exec('docker info >/dev/null 2>&1')
  if (dockerCheck !== 0) {
    return { success: false, container_id: null, connection_uri: null, error: 'Docker is not running' }
  }

  // Build env var flags
  const envFlags = Object.entries(request.env_vars)
    .map(([key, value]) => `-e ${key}="${value}"`)
    .join(' ')

  // Container name
  const containerName = `pocketdev-${request.type}-${request.name}`
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, '-')

  // Build docker run command
  const cmd = [
    'docker run -d',
    `--name "${containerName}"`,
    `-p ${request.port}:${getInternalPort(request.type)}`,
    `--restart unless-stopped`,
    `-v "pocketdev-${containerName}-data:${getDataVolume(request.type)}"`,
    envFlags,
    request.image,
  ].join(' ')

  const { stdout, exitCode } = await exec(cmd)

  if (exitCode !== 0) {
    return { success: false, container_id: null, connection_uri: null, error: stdout || 'Failed to create container' }
  }

  const containerId = stdout.trim().slice(0, 12)
  const connectionUri = buildConnectionUri(request)

  return { success: true, container_id: containerId, connection_uri: connectionUri, error: null }
}

/** Stop a running database container */
export async function stopDatabase(containerId: string): Promise<boolean> {
  const { exitCode } = await exec(`docker stop "${containerId}"`)
  return exitCode === 0
}

/** Start a stopped database container */
export async function startDatabase(containerId: string): Promise<boolean> {
  const { exitCode } = await exec(`docker start "${containerId}"`)
  return exitCode === 0
}

/** Remove a database container and its data */
export async function removeDatabase(containerId: string): Promise<boolean> {
  // Get container name for volume cleanup
  const { stdout: name } = await exec(`docker inspect --format '{{.Name}}' "${containerId}" 2>/dev/null`)
  const containerName = name.replace(/^\//, '')

  const { exitCode: stopCode } = await exec(`docker rm -f "${containerId}"`)
  if (stopCode !== 0) return false

  // Clean up the named volume
  if (containerName) {
    await exec(`docker volume rm "pocketdev-${containerName}-data" 2>/dev/null`)
  }

  return true
}

/** Get the internal container port for a database type */
function getInternalPort(type: string): number {
  const map: Record<string, number> = {
    postgres: 5432, mongodb: 27017, redis: 6379, mysql: 3306, supabase: 5432,
  }
  return map[type] ?? 5432
}

/** Get the data volume mount path inside the container */
function getDataVolume(type: string): string {
  const map: Record<string, string> = {
    postgres: '/var/lib/postgresql/data',
    mongodb: '/data/db',
    redis: '/data',
    mysql: '/var/lib/mysql',
    supabase: '/var/lib/postgresql/data',
  }
  return map[type] ?? '/data'
}

/** Build a connection URI from the create request */
function buildConnectionUri(request: DatabaseCreateRequest): string {
  const host = 'localhost'
  switch (request.type) {
    case 'postgres':
    case 'supabase': {
      const user = request.env_vars.POSTGRES_USER ?? 'pocketdev'
      const pass = request.env_vars.POSTGRES_PASSWORD ?? request.password
      const db = request.env_vars.POSTGRES_DB ?? 'app'
      return `postgresql://${user}:${pass}@${host}:${request.port}/${db}`
    }
    case 'mongodb': {
      const user = request.env_vars.MONGO_INITDB_ROOT_USERNAME ?? 'pocketdev'
      const pass = request.env_vars.MONGO_INITDB_ROOT_PASSWORD ?? request.password
      return `mongodb://${user}:${pass}@${host}:${request.port}`
    }
    case 'mysql': {
      const user = request.env_vars.MYSQL_USER ?? 'pocketdev'
      const pass = request.env_vars.MYSQL_PASSWORD ?? request.password
      const db = request.env_vars.MYSQL_DATABASE ?? 'app'
      return `mysql://${user}:${pass}@${host}:${request.port}/${db}`
    }
    case 'redis':
      return `redis://${host}:${request.port}`
    default:
      return `${request.type}://${host}:${request.port}`
  }
}

/** Fill in empty password fields in env_vars with generated passwords */
export function fillDefaultPasswords(envVars: Record<string, string>, password?: string): Record<string, string> {
  const filled = { ...envVars }
  const pw = password || generatePassword()

  for (const [key, value] of Object.entries(filled)) {
    if (value === '' && key.toLowerCase().includes('password')) {
      filled[key] = pw
    }
  }

  return filled
}

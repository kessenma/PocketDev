import { Elysia } from 'elysia'
import { readdir, readFile, stat } from 'node:fs/promises'
import { join, basename } from 'node:path'
import { authenticateRequest } from '../services/auth.ts'
import { getActiveProjectPath } from '../services/projects.ts'
import type { ScriptPackageInfo, ScriptsResponse } from '@pocketdev/shared/types'

async function detectPackageManager(projectDir: string): Promise<ScriptPackageInfo['packageManager']> {
  const checks: Array<[string, ScriptPackageInfo['packageManager']]> = [
    ['bun.lock', 'bun'],
    ['bun.lockb', 'bun'],
    ['pnpm-lock.yaml', 'pnpm'],
    ['yarn.lock', 'yarn'],
    ['package-lock.json', 'npm'],
  ]
  for (const [file, pm] of checks) {
    try {
      await stat(join(projectDir, file))
      return pm
    } catch { /* not found */ }
  }
  return 'npm'
}

async function readPackageJson(dir: string): Promise<{ name: string; scripts: Record<string, string>; workspaces?: string[] } | null> {
  try {
    const raw = await readFile(join(dir, 'package.json'), 'utf-8')
    const pkg = JSON.parse(raw)
    return {
      name: pkg.name ?? basename(dir),
      scripts: pkg.scripts ?? {},
      workspaces: Array.isArray(pkg.workspaces) ? pkg.workspaces : pkg.workspaces?.packages,
    }
  } catch {
    return null
  }
}

async function readPnpmWorkspaces(projectDir: string): Promise<string[] | null> {
  try {
    const raw = await readFile(join(projectDir, 'pnpm-workspace.yaml'), 'utf-8')
    // Simple YAML parse for packages list: lines starting with "  - "
    const packages: string[] = []
    let inPackages = false
    for (const line of raw.split('\n')) {
      if (line.trim() === 'packages:') { inPackages = true; continue }
      if (inPackages && /^\s+-\s+/.test(line)) {
        packages.push(line.replace(/^\s+-\s+/, '').replace(/['"\s]/g, ''))
      } else if (inPackages && line.trim() && !line.startsWith(' ') && !line.startsWith('\t')) {
        break
      }
    }
    return packages.length > 0 ? packages : null
  } catch {
    return null
  }
}

async function resolveGlobPatterns(baseDir: string, patterns: string[]): Promise<string[]> {
  const dirs: string[] = []
  for (const pattern of patterns) {
    // Handle simple glob like "packages/*" or "apps/*"
    if (pattern.endsWith('/*') || pattern.endsWith('/**')) {
      const parent = join(baseDir, pattern.replace(/\/\*+$/, ''))
      try {
        const entries = await readdir(parent, { withFileTypes: true })
        for (const entry of entries) {
          if (entry.isDirectory() && !entry.name.startsWith('.') && entry.name !== 'node_modules') {
            dirs.push(join(parent, entry.name))
          }
        }
      } catch { /* parent dir doesn't exist */ }
    } else {
      // Direct path like "tools/cli"
      const dir = join(baseDir, pattern)
      try {
        await stat(join(dir, 'package.json'))
        dirs.push(dir)
      } catch { /* no package.json */ }
    }
  }
  return dirs
}

async function discoverPackages(projectDir: string): Promise<ScriptPackageInfo[]> {
  const pm = await detectPackageManager(projectDir)
  const packages: ScriptPackageInfo[] = []

  // Root package.json
  const rootPkg = await readPackageJson(projectDir)
  if (!rootPkg) return packages

  if (Object.keys(rootPkg.scripts).length > 0) {
    packages.push({
      name: rootPkg.name,
      path: '.',
      scripts: rootPkg.scripts,
      packageManager: pm,
    })
  }

  // Detect workspace patterns
  const workspacePatterns = rootPkg.workspaces ?? await readPnpmWorkspaces(projectDir)
  if (!workspacePatterns) return packages

  // Resolve workspace directories
  const workspaceDirs = await resolveGlobPatterns(projectDir, workspacePatterns)

  for (const dir of workspaceDirs) {
    const pkg = await readPackageJson(dir)
    if (pkg && Object.keys(pkg.scripts).length > 0) {
      const relativePath = dir.replace(projectDir + '/', '')
      packages.push({
        name: pkg.name ?? basename(dir),
        path: relativePath,
        scripts: pkg.scripts,
        packageManager: pm,
      })
    }
  }

  return packages
}

export const scriptRoutes = new Elysia({ prefix: '/scripts' })
  .get('/', async ({ request, set }) => {
    const deviceId = await authenticateRequest(request.headers.get('authorization'))
    if (!deviceId) { set.status = 401; return { error: 'Unauthorized' } }

    try {
      const projectDir = await getActiveProjectPath()
      const packages = await discoverPackages(projectDir)
      return { packages } satisfies ScriptsResponse
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to discover scripts'
      set.status = 500
      return { error: message }
    }
  })

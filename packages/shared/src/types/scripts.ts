export interface ScriptPackageInfo {
  name: string
  path: string
  scripts: Record<string, string>
  packageManager: 'npm' | 'pnpm' | 'yarn' | 'bun'
}

export interface ScriptsResponse {
  packages: ScriptPackageInfo[]
}

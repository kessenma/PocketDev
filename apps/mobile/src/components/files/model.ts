export type CodeLanguage =
  | 'typescript'
  | 'tsx'
  | 'javascript'
  | 'jsx'
  | 'python'
  | 'markdown'
  | 'rust'
  | 'json'
  | 'yaml'
  | 'toml'
  | 'shell'
  | 'html'
  | 'css'
  | 'sql'
  | 'text'
  | 'unknown'

export type FileView = 'browser' | 'viewer'

export interface FileNode {
  id: string
  name: string
  path: string
  kind: 'directory' | 'file'
  children?: FileNode[]
  language?: CodeLanguage
  content?: string
}

const EXTENSION_LANGUAGE_MAP: Record<string, CodeLanguage> = {
  ts: 'typescript',
  tsx: 'tsx',
  js: 'javascript',
  jsx: 'jsx',
  mjs: 'javascript',
  cjs: 'javascript',
  py: 'python',
  md: 'markdown',
  markdown: 'markdown',
  mdx: 'markdown',
  rs: 'rust',
  json: 'json',
  jsonc: 'json',
  yml: 'yaml',
  yaml: 'yaml',
  toml: 'toml',
  sh: 'shell',
  bash: 'shell',
  zsh: 'shell',
  fish: 'shell',
  env: 'shell',
  html: 'html',
  htm: 'html',
  css: 'css',
  scss: 'css',
  sass: 'css',
  less: 'css',
  sql: 'sql',
  txt: 'text',
  log: 'text',
  xml: 'text',
  svg: 'text',
  gitignore: 'text',
  gitattributes: 'text',
  gitmodules: 'text',
  editorconfig: 'text',
  conf: 'text',
  config: 'text',
  ini: 'text',
  lock: 'text',
  gradle: 'text',
  java: 'text',
  kt: 'text',
  kts: 'text',
  go: 'text',
  rb: 'text',
  php: 'text',
  c: 'text',
  cc: 'text',
  cpp: 'text',
  cxx: 'text',
  h: 'text',
  hpp: 'text',
  swift: 'text',
}

const EXACT_FILENAME_LANGUAGE_MAP: Record<string, CodeLanguage> = {
  dockerfile: 'text',
  makefile: 'text',
  readme: 'markdown',
  license: 'text',
  changelog: 'markdown',
}

export function inferLanguage(filename: string): CodeLanguage {
  const normalized = filename.trim().split('/').pop()?.toLowerCase() ?? ''
  const ext = normalized.split('.').pop()?.toLowerCase() ?? ''

  if (EXACT_FILENAME_LANGUAGE_MAP[normalized]) {
    return EXACT_FILENAME_LANGUAGE_MAP[normalized]
  }

  if (normalized.startsWith('readme.')) return 'markdown'
  if (normalized.startsWith('changelog.')) return 'markdown'

  return EXTENSION_LANGUAGE_MAP[ext] ?? 'unknown'
}

export function treeEntryToFileNode(entry: {
  name: string
  path: string
  type: 'file' | 'dir'
  children?: Array<{ name: string; path: string; type: 'file' | 'dir'; children?: any[] }>
}): FileNode {
  const node: FileNode = {
    id: entry.path,
    name: entry.name,
    path: entry.path,
    kind: entry.type === 'dir' ? 'directory' : 'file',
  }

  if (entry.type === 'file') {
    node.language = inferLanguage(entry.name)
  }

  if (entry.children?.length) {
    node.children = entry.children.map(treeEntryToFileNode)
  }

  return node
}

export function pathToName(path: string): string {
  const parts = path.split('/').filter(Boolean)
  return parts[parts.length - 1] ?? path
}

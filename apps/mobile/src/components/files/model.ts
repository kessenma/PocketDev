export type CodeLanguage = 'typescript' | 'tsx' | 'javascript' | 'jsx' | 'unknown'

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
}

export function inferLanguage(filename: string): CodeLanguage {
  const ext = filename.split('.').pop()?.toLowerCase() ?? ''
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

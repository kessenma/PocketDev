// services/file-context-suggester.ts
// Pure TypeScript module for suggesting relevant files based on semantic similarity.
// No React or store dependencies — unit-testable.

import type { TreeEntry } from '@pocketdev/shared/types'
import { embed, embedBatch } from './embedding'

export interface FileIndex {
  rootPath: string
  paths: string[]
  enrichedTexts: string[]
  vectors: number[][]
  builtAt: number
}

export interface FileSuggestion {
  path: string
  score: number
}

const EXTENSION_CATEGORIES: Record<string, string> = {
  ts: 'TypeScript module',
  tsx: 'TypeScript React component',
  js: 'JavaScript module',
  jsx: 'JavaScript React component',
  py: 'Python module',
  rs: 'Rust module',
  go: 'Go module',
  rb: 'Ruby module',
  java: 'Java class',
  kt: 'Kotlin class',
  swift: 'Swift file',
  css: 'CSS stylesheet',
  scss: 'SCSS stylesheet',
  html: 'HTML document',
  json: 'JSON configuration',
  yaml: 'YAML configuration',
  yml: 'YAML configuration',
  toml: 'TOML configuration',
  md: 'Markdown document',
  sql: 'SQL script',
  sh: 'Shell script',
  dockerfile: 'Dockerfile',
}

export function enrichPath(filePath: string): string {
  const parts = filePath.split('/')
  const filename = parts[parts.length - 1] ?? filePath
  const parent = parts.length > 1 ? parts[parts.length - 2] : ''
  const grandparent = parts.length > 2 ? parts[parts.length - 3] : ''

  const dotIdx = filename.lastIndexOf('.')
  const stem = dotIdx > 0 ? filename.substring(0, dotIdx) : filename
  const ext = dotIdx > 0 ? filename.substring(dotIdx + 1).toLowerCase() : ''

  const category = EXTENSION_CATEGORIES[ext] ?? 'source file'

  // Convert camelCase/PascalCase/kebab-case to words
  const words = stem
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/[-_]/g, ' ')
    .toLowerCase()

  const contextParts = [words]
  if (parent) contextParts.push(parent.replace(/[-_]/g, ' '))
  if (grandparent) contextParts.push(grandparent.replace(/[-_]/g, ' '))
  contextParts.push(filePath)
  contextParts.push(category)

  return contextParts.join(' - ')
}

export function flattenTree(entries: TreeEntry[], maxFiles = 500): string[] {
  const paths: string[] = []

  function walk(items: TreeEntry[]) {
    for (const item of items) {
      if (paths.length >= maxFiles) return
      if (item.type === 'file') {
        paths.push(item.path)
      } else if (item.children) {
        walk(item.children)
      }
    }
  }

  walk(entries)
  return paths
}

export async function buildFileIndex(
  rootPath: string,
  paths: string[],
  onProgress?: (current: number, total: number) => void,
): Promise<FileIndex> {
  const enrichedTexts = paths.map(enrichPath)
  const vectors = await embedBatch(enrichedTexts, onProgress)

  return {
    rootPath,
    paths,
    enrichedTexts,
    vectors,
    builtAt: Date.now(),
  }
}

export function cosineSimilarity(a: number[], b: number[]): number {
  // Vectors are pre-normalized, so dot product = cosine similarity
  let dot = 0
  for (let i = 0; i < a.length; i++) dot += a[i] * b[i]
  return dot
}

export async function suggestFiles(
  prompt: string,
  index: FileIndex,
  topN = 5,
  threshold = 0.25,
): Promise<FileSuggestion[]> {
  const promptVector = await embed(prompt)

  const scored: FileSuggestion[] = []
  for (let i = 0; i < index.vectors.length; i++) {
    const score = cosineSimilarity(promptVector, index.vectors[i])
    if (score >= threshold) {
      scored.push({ path: index.paths[i], score })
    }
  }

  scored.sort((a, b) => b.score - a.score)
  return scored.slice(0, topN)
}

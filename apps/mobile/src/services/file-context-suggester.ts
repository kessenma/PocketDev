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

export type FileKind = 'code' | 'doc' | 'config' | 'other'

const EXTENSION_CATEGORIES: Record<string, { label: string; kind: FileKind }> = {
  ts: { label: 'TypeScript source code implementation module', kind: 'code' },
  tsx: { label: 'TypeScript React component source code screen', kind: 'code' },
  js: { label: 'JavaScript source code implementation module', kind: 'code' },
  jsx: { label: 'JavaScript React component source code screen', kind: 'code' },
  py: { label: 'Python source code implementation module', kind: 'code' },
  rs: { label: 'Rust source code implementation module', kind: 'code' },
  go: { label: 'Go source code implementation module', kind: 'code' },
  rb: { label: 'Ruby source code implementation module', kind: 'code' },
  java: { label: 'Java source code implementation class', kind: 'code' },
  kt: { label: 'Kotlin source code implementation class', kind: 'code' },
  swift: { label: 'Swift source code implementation file', kind: 'code' },
  css: { label: 'CSS stylesheet', kind: 'code' },
  scss: { label: 'SCSS stylesheet', kind: 'code' },
  html: { label: 'HTML document', kind: 'code' },
  json: { label: 'JSON configuration', kind: 'config' },
  yaml: { label: 'YAML configuration', kind: 'config' },
  yml: { label: 'YAML configuration', kind: 'config' },
  toml: { label: 'TOML configuration', kind: 'config' },
  md: { label: 'Markdown documentation', kind: 'doc' },
  sql: { label: 'SQL database script', kind: 'code' },
  sh: { label: 'Shell script', kind: 'code' },
  dockerfile: { label: 'Dockerfile container configuration', kind: 'config' },
}

export function getFileKind(filePath: string): FileKind {
  const dotIdx = filePath.lastIndexOf('.')
  const ext = dotIdx > 0 ? filePath.substring(dotIdx + 1).toLowerCase() : ''
  return EXTENSION_CATEGORIES[ext]?.kind ?? 'other'
}

function splitWords(name: string): string {
  return name
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/[-_.]/g, ' ')
    .toLowerCase()
    .trim()
}

export function enrichPath(filePath: string): string {
  const parts = filePath.split('/')
  const filename = parts[parts.length - 1] ?? filePath
  const parent = parts.length > 1 ? parts[parts.length - 2] : ''
  const grandparent = parts.length > 2 ? parts[parts.length - 3] : ''
  const greatGrandparent = parts.length > 3 ? parts[parts.length - 4] : ''

  const dotIdx = filename.lastIndexOf('.')
  const stem = dotIdx > 0 ? filename.substring(0, dotIdx) : filename
  const ext = dotIdx > 0 ? filename.substring(dotIdx + 1).toLowerCase() : ''

  const info = EXTENSION_CATEGORIES[ext] ?? { label: 'source file', kind: 'other' as FileKind }

  const stemWords = splitWords(stem)

  // Build directory context from meaningful folder names
  const dirContext = [greatGrandparent, grandparent, parent]
    .filter(Boolean)
    .map(splitWords)
    .join(' ')

  // Repeat filename words to boost their weight in the embedding
  const contextParts = [
    stemWords,
    stemWords, // double-weight the filename
    dirContext,
    filePath,
    info.label,
  ]

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
  // Log a few samples for debugging enrichment quality
  for (let i = 0; i < Math.min(5, enrichedTexts.length); i++) {
    console.log(`[Enrichment] ${paths[i]} → "${enrichedTexts[i]}"`)
  }
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

export interface SuggestResult {
  top: FileSuggestion[]
  rest: FileSuggestion[]
}

export async function suggestFiles(
  prompt: string,
  index: FileIndex,
  topN = 5,
  threshold = 0.15,
  restThreshold = 0.08,
): Promise<SuggestResult> {
  const promptVector = await embed(prompt)

  const all: FileSuggestion[] = []
  for (let i = 0; i < index.vectors.length; i++) {
    const score = cosineSimilarity(promptVector, index.vectors[i])
    if (score >= restThreshold) {
      all.push({ path: index.paths[i], score })
    }
  }

  all.sort((a, b) => b.score - a.score)

  const top = all.filter((s) => s.score >= threshold).slice(0, topN)
  const rest = all.filter((s) => !top.includes(s))

  return { top, rest }
}

export function getExtension(filePath: string): string {
  const dotIdx = filePath.lastIndexOf('.')
  return dotIdx > 0 ? filePath.substring(dotIdx + 1).toLowerCase() : ''
}

import { create } from 'zustand'
import type { TreeEntry } from '@pocketdev/shared/types'
import * as embedding from '../services/embedding'
import {
  flattenTree,
  buildFileIndex,
  suggestFiles,
  getExtension,
  type FileIndex,
  type FileSuggestion,
  type SuggestResult,
} from '../services/file-context-suggester'
import {
  getOnDeviceAIModelStatus,
  setOnDeviceAIModelStatus,
  getCachedFileIndex,
  saveCachedFileIndex,
} from '../services/storage'
import { BareResourceFetcher } from '@react-native-executorch/bare-resource-fetcher'
import { ALL_MINILM_L6_V2 } from 'react-native-executorch'

function computeExtensions(paths: string[]): string[] {
  const extSet = new Set<string>()
  for (const p of paths) {
    const dot = p.lastIndexOf('.')
    if (dot > 0) extSet.add(p.substring(dot + 1).toLowerCase())
  }
  return [...extSet].sort()
}

type ModelStatus =
  | 'not_downloaded'
  | 'downloading'
  | 'downloaded'
  | 'loading'
  | 'ready'
  | 'error'

interface OnDeviceAIState {
  modelStatus: ModelStatus
  downloadProgress: number
  fileIndex: FileIndex | null
  indexingProgress: number
  suggestions: FileSuggestion[]
  restSuggestions: FileSuggestion[]
  extensionFilter: string[] // empty = all extensions
  availableExtensions: string[] // all unique extensions in the index
  error: string | null

  hydrate: () => void
  downloadModel: () => Promise<void>
  deleteModel: () => Promise<void>
  loadModel: () => Promise<void>
  buildIndex: (rootPath: string, entries: TreeEntry[]) => Promise<void>
  suggest: (prompt: string) => Promise<void>
  clearSuggestions: () => void
  setExtensionFilter: (exts: string[]) => void
}

export const useOnDeviceAIStore = create<OnDeviceAIState>((set, get) => ({
  modelStatus: 'not_downloaded',
  downloadProgress: 0,
  fileIndex: null,
  indexingProgress: 0,
  suggestions: [],
  restSuggestions: [],
  extensionFilter: [],
  availableExtensions: [],
  error: null,

  hydrate: () => {
    const persisted = getOnDeviceAIModelStatus()
    console.log('[OnDeviceAI] hydrate → persisted status:', persisted)
    set({ modelStatus: persisted })
  },

  downloadModel: async () => {
    if (get().modelStatus === 'downloading') return
    console.log('[OnDeviceAI] Starting model download...')
    set({ modelStatus: 'downloading', downloadProgress: 0, error: null })

    try {
      await BareResourceFetcher.fetch(
        (progress: number) => {
          set({ downloadProgress: progress })
        },
        ALL_MINILM_L6_V2.modelSource,
        ALL_MINILM_L6_V2.tokenizerSource,
      )

      console.log('[OnDeviceAI] Download complete')
      setOnDeviceAIModelStatus('downloaded')
      set({ modelStatus: 'downloaded', downloadProgress: 1 })
    } catch (e) {
      console.error('[OnDeviceAI] Download failed:', e)
      set({
        modelStatus: 'error',
        error: e instanceof Error ? e.message : 'Download failed',
      })
    }
  },

  deleteModel: async () => {
    embedding.unload()
    try {
      await BareResourceFetcher.deleteResources(
        ALL_MINILM_L6_V2.modelSource,
        ALL_MINILM_L6_V2.tokenizerSource,
      )
    } catch {}
    setOnDeviceAIModelStatus('not_downloaded')
    set({
      modelStatus: 'not_downloaded',
      downloadProgress: 0,
      fileIndex: null,
      suggestions: [],
    })
  },

  loadModel: async () => {
    const status = get().modelStatus
    if (status === 'ready' || status === 'loading') return
    if (status !== 'downloaded') return

    console.log('[OnDeviceAI] Loading model into memory...')
    set({ modelStatus: 'loading', error: null })
    try {
      await embedding.loadModel()
      console.log('[OnDeviceAI] Model loaded — status: ready')
      set({ modelStatus: 'ready' })
    } catch (e) {
      console.error('[OnDeviceAI] Model load failed:', e)
      set({
        modelStatus: 'error',
        error: e instanceof Error ? e.message : 'Failed to load model',
      })
    }
  },

  buildIndex: async (rootPath: string, entries: TreeEntry[]) => {
    // Prevent concurrent builds
    if (get().indexingProgress > 0 && get().indexingProgress < 1) {
      console.log('[OnDeviceAI] Index build already in progress, skipping')
      return
    }

    const incoming = flattenTree(entries, 500)
    const existing = get().fileIndex

    // Reuse if same root, same file count, and vectors are intact
    if (existing && existing.rootPath === rootPath
      && existing.paths.length === incoming.length
      && existing.vectors.length === existing.paths.length) {
      console.log('[OnDeviceAI] Index already exists for', rootPath, '→', existing.paths.length, 'files')
      return
    }

    // Check MMKV cache — must match count AND have intact vectors
    const cached = getCachedFileIndex(rootPath)
    if (cached && cached.paths.length === incoming.length
      && cached.vectors.length === cached.paths.length) {
      console.log('[OnDeviceAI] Using cached index for', rootPath, '→', cached.paths.length, 'files,', cached.vectors.length, 'vectors')
      set({ fileIndex: cached, indexingProgress: 1, availableExtensions: computeExtensions(cached.paths) })
      return
    }

    set({ indexingProgress: 0.001 }) // Mark as in-progress
    const paths = incoming
    console.log('[OnDeviceAI] Building index for', rootPath, '→', paths.length, 'files')
    if (paths.length === 0) { set({ indexingProgress: 0 }); return }

    try {
      const startTime = Date.now()
      const index = await buildFileIndex(rootPath, paths, (current, total) => {
        set({ indexingProgress: total > 0 ? current / total : 0.001 })
      })
      const availableExtensions = computeExtensions(index.paths)

      console.log('[OnDeviceAI] Index built in', Date.now() - startTime, 'ms →', index.vectors.length, 'vectors,', availableExtensions.length, 'extensions')
      set({ fileIndex: index, indexingProgress: 1, availableExtensions })
      saveCachedFileIndex(index)
    } catch (e) {
      console.warn('[OnDeviceAI] Index build failed:', e)
      set({ indexingProgress: 0 })
    }
  },

  suggest: async (prompt: string) => {
    const { fileIndex, modelStatus } = get()
    console.log('[OnDeviceAI] suggest() called — modelStatus:', modelStatus, 'indexReady:', !!fileIndex)
    if (modelStatus !== 'ready' || !fileIndex) {
      set({ suggestions: [], restSuggestions: [] })
      return
    }

    const trimmed = prompt.trim()
    if (trimmed.length < 5) {
      console.log('[OnDeviceAI] Prompt too short, skipping')
      set({ suggestions: [], restSuggestions: [] })
      return
    }

    try {
      const { extensionFilter } = get()
      console.log('[OnDeviceAI] Embedding prompt and ranking against', fileIndex.vectors.length, 'files...', extensionFilter.length ? `filter: ${extensionFilter.join(',')}` : '(no filter)')
      const startTime = Date.now()
      let { top, rest } = await suggestFiles(trimmed, fileIndex)

      // Apply extension filter if set
      if (extensionFilter.length > 0) {
        const filterSet = new Set(extensionFilter)
        top = top.filter((s) => filterSet.has(getExtension(s.path)))
        rest = rest.filter((s) => filterSet.has(getExtension(s.path)))
      }

      console.log('[OnDeviceAI] Suggest completed in', Date.now() - startTime, 'ms →', top.length, 'top,', rest.length, 'rest')
      set({ suggestions: top, restSuggestions: rest })
    } catch (e) {
      console.error('[OnDeviceAI] suggest() failed:', e)
      set({ suggestions: [], restSuggestions: [] })
    }
  },

  clearSuggestions: () => set({ suggestions: [], restSuggestions: [] }),
  setExtensionFilter: (exts: string[]) => set({ extensionFilter: exts }),
}))

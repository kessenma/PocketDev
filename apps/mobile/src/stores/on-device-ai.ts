import { create } from 'zustand'
import type { TreeEntry } from '@pocketdev/shared/types'
import * as embedding from '../services/embedding'
import {
  flattenTree,
  buildFileIndex,
  suggestFiles,
  type FileIndex,
  type FileSuggestion,
} from '../services/file-context-suggester'
import {
  getOnDeviceAIModelStatus,
  setOnDeviceAIModelStatus,
  getCachedFileIndex,
  saveCachedFileIndex,
} from '../services/storage'
import { BareResourceFetcher } from '@react-native-executorch/bare-resource-fetcher'
import { ALL_MINILM_L6_V2 } from 'react-native-executorch'

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
  error: string | null

  hydrate: () => void
  downloadModel: () => Promise<void>
  deleteModel: () => Promise<void>
  loadModel: () => Promise<void>
  buildIndex: (rootPath: string, entries: TreeEntry[]) => Promise<void>
  suggest: (prompt: string) => Promise<void>
  clearSuggestions: () => void
}

export const useOnDeviceAIStore = create<OnDeviceAIState>((set, get) => ({
  modelStatus: 'not_downloaded',
  downloadProgress: 0,
  fileIndex: null,
  indexingProgress: 0,
  suggestions: [],
  error: null,

  hydrate: () => {
    const persisted = getOnDeviceAIModelStatus()
    set({ modelStatus: persisted })
  },

  downloadModel: async () => {
    if (get().modelStatus === 'downloading') return
    set({ modelStatus: 'downloading', downloadProgress: 0, error: null })

    try {
      await BareResourceFetcher.fetch(
        (progress: number) => {
          set({ downloadProgress: progress })
        },
        ALL_MINILM_L6_V2.modelSource,
        ALL_MINILM_L6_V2.tokenizerSource,
      )

      setOnDeviceAIModelStatus('downloaded')
      set({ modelStatus: 'downloaded', downloadProgress: 1 })
    } catch (e) {
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

    set({ modelStatus: 'loading', error: null })
    try {
      await embedding.loadModel()
      set({ modelStatus: 'ready' })
    } catch (e) {
      set({
        modelStatus: 'error',
        error: e instanceof Error ? e.message : 'Failed to load model',
      })
    }
  },

  buildIndex: async (rootPath: string, entries: TreeEntry[]) => {
    const existing = get().fileIndex
    if (existing && existing.rootPath === rootPath) return

    // Check MMKV cache first
    const cached = getCachedFileIndex(rootPath)
    if (cached) {
      set({ fileIndex: cached, indexingProgress: 1 })
      return
    }

    set({ indexingProgress: 0 })
    const paths = flattenTree(entries, 500)
    if (paths.length === 0) return

    try {
      const index = await buildFileIndex(rootPath, paths, (current, total) => {
        set({ indexingProgress: total > 0 ? current / total : 0 })
      })
      set({ fileIndex: index, indexingProgress: 1 })
      saveCachedFileIndex(index)
    } catch (e) {
      console.warn('[OnDeviceAI] Index build failed:', e)
    }
  },

  suggest: async (prompt: string) => {
    const { fileIndex, modelStatus } = get()
    if (modelStatus !== 'ready' || !fileIndex) {
      set({ suggestions: [] })
      return
    }

    const trimmed = prompt.trim()
    if (trimmed.length < 5) {
      set({ suggestions: [] })
      return
    }

    try {
      const results = await suggestFiles(trimmed, fileIndex)
      set({ suggestions: results })
    } catch {
      set({ suggestions: [] })
    }
  },

  clearSuggestions: () => set({ suggestions: [] }),
}))

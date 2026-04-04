import { create } from 'zustand'
import type { FileSearchResult } from '@pocketdev/shared/types'
import type { FileNode, FileView } from '../components/files/model'
import { treeEntryToFileNode, pathToName } from '../components/files/model'
import { listDirectory, fetchFileContent, searchFiles } from '../services/api'
import { useConnectionStore } from './connection'

type FilesState = {
  rootLabel: string
  rootPath: string
  currentPath: string
  currentEntries: FileNode[]
  directoryEntriesByPath: Record<string, FileNode[]>
  selectedFileId: string | null
  selectedFile: FileNode | null
  selectedFileContent: string | null
  isLoadingContent: boolean
  activePhoneView: FileView
  wrapLines: boolean
  searchQuery: string
  searchResults: FileSearchResult[]
  isSearching: boolean
  selectedContextPaths: string[]
  lastActionMessage: string
  isRefreshing: boolean
  error: string | null
  setSearchQuery: (query: string) => void
  runSearch: () => Promise<void>
  clearSearch: () => void
  openDirectory: (path: string) => Promise<void>
  navigateUp: () => Promise<void>
  selectFile: (filePath: string) => Promise<void>
  goBackToBrowser: () => void
  toggleWrapLines: () => void
  toggleContextPath: (filePath: string) => void
  clearContextPaths: () => void
  resetForProjectSwitch: () => void
  refresh: () => Promise<void>
}

export const useFilesStore = create<FilesState>((set, get) => ({
  rootLabel: '',
  rootPath: '',
  currentPath: '.',
  currentEntries: [],
  directoryEntriesByPath: {},
  selectedFileId: null,
  selectedFile: null,
  selectedFileContent: null,
  isLoadingContent: false,
  activePhoneView: 'browser',
  wrapLines: false,
  searchQuery: '',
  searchResults: [],
  isSearching: false,
  selectedContextPaths: [],
  lastActionMessage: 'Pull to refresh to load project files from the server.',
  isRefreshing: false,
  error: null,

  setSearchQuery: (searchQuery) => set({ searchQuery }),

  runSearch: async () => {
    const query = get().searchQuery.trim()
    if (!query) {
      set({
        searchResults: [],
        isSearching: false,
        lastActionMessage: 'Search cleared.',
      })
      return
    }

    const server = useConnectionStore.getState().server
    if (!server) {
      set({
        isSearching: false,
        lastActionMessage: 'Not connected to server.',
        error: 'Not connected',
      })
      return
    }

    set({
      isSearching: true,
      lastActionMessage: `Searching for "${query}"...`,
      error: null,
    })

    try {
      const result = await searchFiles(server.ip, server.port, query, get().currentPath)
      set({
        searchResults: result.results,
        isSearching: false,
        lastActionMessage: result.results.length > 0
          ? `Found ${result.results.length} matches for "${query}".`
          : `No matches for "${query}".`,
      })
    } catch (error) {
      set({
        isSearching: false,
        searchResults: [],
        lastActionMessage: 'Search failed.',
        error: error instanceof Error ? error.message : 'Search failed',
      })
    }
  },

  clearSearch: () => set({
    searchQuery: '',
    searchResults: [],
    isSearching: false,
    lastActionMessage: 'Showing current folder.',
  }),

  openDirectory: async (path) => {
    const cached = get().directoryEntriesByPath[path]
    set({
      currentPath: path,
      currentEntries: cached ?? [],
      activePhoneView: 'browser',
      error: null,
    })

    if (cached) {
      set({
        lastActionMessage: `Opened ${path === '.' ? 'project root' : path}.`,
      })
      return
    }

    const server = useConnectionStore.getState().server
    if (!server) {
      set({ lastActionMessage: 'Not connected to server.', error: 'Not connected' })
      return
    }

    set({ isRefreshing: true, lastActionMessage: `Loading ${path === '.' ? 'project root' : path}...` })

    try {
      const result = await listDirectory(server.ip, server.port, path)
      const entries = result.entries.map(treeEntryToFileNode)
      set((state) => ({
        rootLabel: result.base.split('/').pop() ?? result.base,
        rootPath: result.base,
        currentPath: result.path,
        currentEntries: entries,
        directoryEntriesByPath: {
          ...state.directoryEntriesByPath,
          [result.path]: entries,
        },
        isRefreshing: false,
        lastActionMessage: `Loaded ${entries.length} items from ${result.path === '.' ? 'project root' : result.path}.`,
        error: null,
      }))
    } catch (error) {
      set({
        isRefreshing: false,
        lastActionMessage: 'Failed to load directory.',
        error: error instanceof Error ? error.message : 'Failed to load directory',
      })
    }
  },

  navigateUp: async () => {
    const currentPath = get().currentPath
    if (currentPath === '.' || currentPath.length === 0) return

    const parts = currentPath.split('/').filter(Boolean)
    const nextPath = parts.length <= 1 ? '.' : parts.slice(0, -1).join('/')
    await get().openDirectory(nextPath)
  },

  selectFile: async (filePath) => {
    const file = findFileByPath(get(), filePath)
    if (!file) {
      set({
        lastActionMessage: `Failed to locate ${pathToName(filePath)}.`,
      })
      return
    }

    set({
      selectedFileId: filePath,
      selectedFile: file,
      selectedFileContent: null,
      isLoadingContent: true,
      activePhoneView: 'viewer',
      lastActionMessage: `Loading ${file.name}...`,
    })

    const server = useConnectionStore.getState().server
    if (!server) {
      set({
        isLoadingContent: false,
        lastActionMessage: 'Not connected to server.',
        error: 'Not connected',
      })
      return
    }

    try {
      const result = await fetchFileContent(server.ip, server.port, file.path)
      set({
        selectedFileContent: result.content,
        isLoadingContent: false,
        lastActionMessage: `Opened ${file.path} (${formatSize(result.size)})`,
        error: null,
      })
    } catch (err) {
      set({
        isLoadingContent: false,
        lastActionMessage: `Failed to load ${file.name}`,
        error: err instanceof Error ? err.message : 'Failed to load file',
      })
    }
  },

  goBackToBrowser: () => {
    set({
      activePhoneView: 'browser',
      lastActionMessage: `Back in ${get().currentPath === '.' ? 'project root' : get().currentPath}.`,
    })
  },

  toggleWrapLines: () => {
    set((state) => ({
      wrapLines: !state.wrapLines,
      lastActionMessage: `Line wrapping ${state.wrapLines ? 'disabled' : 'enabled'}.`,
    }))
  },

  toggleContextPath: (filePath) => {
    set((state) => {
      const selected = state.selectedContextPaths.includes(filePath)
      return {
        selectedContextPaths: selected
          ? state.selectedContextPaths.filter((path) => path !== filePath)
          : [...state.selectedContextPaths, filePath],
        lastActionMessage: selected
          ? `Removed ${pathToName(filePath)} from AI context.`
          : `Added ${pathToName(filePath)} to AI context.`,
      }
    })
  },

  clearContextPaths: () => set({
    selectedContextPaths: [],
    lastActionMessage: 'Cleared AI context files.',
  }),

  resetForProjectSwitch: () => set({
    currentPath: '.',
    currentEntries: [],
    directoryEntriesByPath: {},
    selectedFileId: null,
    selectedFile: null,
    selectedFileContent: null,
    activePhoneView: 'browser',
    searchQuery: '',
    searchResults: [],
    isSearching: false,
    selectedContextPaths: [],
    lastActionMessage: 'Project changed. Reloading workspace files...',
    error: null,
  }),

  refresh: async () => {
    if (get().isRefreshing) return

    const currentPath = get().currentPath
    set((state) => {
      const directoryEntriesByPath = { ...state.directoryEntriesByPath }
      delete directoryEntriesByPath[currentPath]
      return { directoryEntriesByPath }
    })
    await get().openDirectory(currentPath)
  },
}))

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1048576).toFixed(1)} MB`
}

function findFileByPath(state: FilesState, filePath: string): FileNode | null {
  const fromCurrentEntries = state.currentEntries.find((node) => node.path === filePath && node.kind === 'file')
  if (fromCurrentEntries) return fromCurrentEntries

  for (const entries of Object.values(state.directoryEntriesByPath)) {
    const match = entries.find((node) => node.path === filePath && node.kind === 'file')
    if (match) return match
  }

  return {
    id: filePath,
    name: pathToName(filePath),
    path: filePath,
    kind: 'file',
  }
}

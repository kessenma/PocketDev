import { create } from 'zustand'
import type { FileNode, FileView } from '../components/files/model'
import { treeEntryToFileNode } from '../components/files/model'
import { fetchFileTree, fetchFileContent } from '../services/api'
import { useConnectionStore } from './connection'

type FilesState = {
  rootLabel: string
  rootPath: string
  tree: FileNode[]
  expandedDirectoryIds: string[]
  selectedFileId: string | null
  selectedFileContent: string | null
  isLoadingContent: boolean
  activePhoneView: FileView
  wrapLines: boolean
  lastActionMessage: string
  isRefreshing: boolean
  error: string | null
  toggleFolder: (folderId: string) => void
  selectFile: (fileId: string) => void
  goBackToBrowser: () => void
  toggleWrapLines: () => void
  refresh: () => void
}

export const useFilesStore = create<FilesState>((set, get) => ({
  rootLabel: '',
  rootPath: '',
  tree: [],
  expandedDirectoryIds: [],
  selectedFileId: null,
  selectedFileContent: null,
  isLoadingContent: false,
  activePhoneView: 'browser',
  wrapLines: false,
  lastActionMessage: 'Pull to refresh to load the file tree from the server.',
  isRefreshing: false,
  error: null,

  toggleFolder: (folderId) => {
    set((state) => ({
      expandedDirectoryIds: state.expandedDirectoryIds.includes(folderId)
        ? state.expandedDirectoryIds.filter((id) => id !== folderId)
        : [...state.expandedDirectoryIds, folderId],
    }))
  },

  selectFile: async (fileId) => {
    const file = findFileById(get().tree, fileId)
    if (!file || file.kind !== 'file') return

    set({
      selectedFileId: fileId,
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
      selectedFileContent: null,
      lastActionMessage: 'Back in the file browser.',
    })
  },

  toggleWrapLines: () => {
    set((state) => ({
      wrapLines: !state.wrapLines,
      lastActionMessage: `Line wrapping ${state.wrapLines ? 'disabled' : 'enabled'}.`,
    }))
  },

  refresh: async () => {
    if (get().isRefreshing) return

    const server = useConnectionStore.getState().server
    if (!server) {
      set({ lastActionMessage: 'Not connected to server.', error: 'Not connected' })
      return
    }

    set({ isRefreshing: true, lastActionMessage: 'Refreshing file tree...', error: null })

    try {
      const result = await fetchFileTree(server.ip, server.port, '.', 3)
      const tree = result.tree.map(treeEntryToFileNode)

      set({
        rootLabel: result.base.split('/').pop() ?? result.base,
        rootPath: result.base,
        tree,
        isRefreshing: false,
        lastActionMessage: `Loaded ${countFiles(tree)} files from the server.`,
        error: null,
      })
    } catch (err) {
      set({
        isRefreshing: false,
        lastActionMessage: 'Failed to load file tree.',
        error: err instanceof Error ? err.message : 'Failed to load file tree',
      })
    }
  },
}))

function findFileById(nodes: FileNode[], fileId: string): FileNode | null {
  for (const node of nodes) {
    if (node.id === fileId) return node
    if (node.children?.length) {
      const child = findFileById(node.children, fileId)
      if (child) return child
    }
  }
  return null
}

function countFiles(nodes: FileNode[]): number {
  return nodes.reduce((count, node) => {
    if (node.kind === 'file') return count + 1
    return count + countFiles(node.children ?? [])
  }, 0)
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1048576).toFixed(1)} MB`
}

import { create } from 'zustand'
import type {
  ContainerLogsChunkEvent,
  ContainerLogsDirection,
  ContainerLogsFilter,
  ContainerLogsStoppedEvent,
  ContainerLogLine,
  ContainerSummary,
} from '@pocketdev/shared/types'
import { fetchContainerLogs, fetchContainers } from '../services/api'
import { useConnectionStore } from './connection'
import type { ContainerView } from '../components/containers/model'

const MAX_BUFFERED_LOG_LINES = 2000

type ContainerState = {
  containers: ContainerSummary[]
  selectedContainerId: string | null
  activeView: ContainerView
  lineCountInput: string
  direction: ContainerLogsDirection
  filter: ContainerLogsFilter
  logsByContainer: Record<string, ContainerLogLine[]>
  isRefreshing: boolean
  isLoadingLogs: boolean
  isFollowingLogs: boolean
  error: string | null
  lastActionMessage: string
  selectView: (view: ContainerView) => void
  selectContainer: (containerId: string) => void
  updateLineCountInput: (value: string) => void
  setDirection: (direction: ContainerLogsDirection) => void
  setFilter: (filter: ContainerLogsFilter) => void
  refreshContainers: () => Promise<void>
  loadLogs: () => Promise<void>
  startFollowingLogs: () => void
  stopFollowingLogs: () => void
  appendLogChunk: (payload: ContainerLogsChunkEvent) => void
  handleLogsStopped: (payload: ContainerLogsStoppedEvent) => void
}

function parseLineCount(value: string): number {
  const parsed = parseInt(value, 10)
  if (!Number.isFinite(parsed) || parsed <= 0) return 100
  return Math.min(parsed, 1000)
}

function upsertLogs(
  current: Record<string, ContainerLogLine[]>,
  containerId: string,
  nextLine: ContainerLogLine,
) {
  const existing = current[containerId] ?? []
  const next = [...existing, nextLine].slice(-MAX_BUFFERED_LOG_LINES)

  return {
    ...current,
    [containerId]: next,
  }
}

export const useContainerStore = create<ContainerState>((set, get) => ({
  containers: [],
  selectedContainerId: null,
  activeView: 'containers',
  lineCountInput: '100',
  direction: 'tail',
  filter: 'all',
  logsByContainer: {},
  isRefreshing: false,
  isLoadingLogs: false,
  isFollowingLogs: false,
  error: null,
  lastActionMessage: 'Docker-only v1: inspect containers, fetch snapshot logs, or follow live output.',

  selectView: (view) => set({ activeView: view }),

  selectContainer: (containerId) => {
    set({
      selectedContainerId: containerId,
      error: null,
    })
  },

  updateLineCountInput: (value) => {
    const digitsOnly = value.replace(/[^0-9]/g, '')
    set({ lineCountInput: digitsOnly })
  },

  setDirection: (direction) => set({ direction }),

  setFilter: (filter) => set({ filter }),

  refreshContainers: async () => {
    const server = useConnectionStore.getState().server
    if (!server) {
      set({ error: 'Not connected to a server.' })
      return
    }

    set({ isRefreshing: true, error: null })

    try {
      const containers = await fetchContainers(server.ip, server.port)
      const selectedContainerId = get().selectedContainerId
      const hasSelectedContainer = containers.some((container) => container.id === selectedContainerId)

      set({
        containers,
        selectedContainerId: hasSelectedContainer
          ? selectedContainerId
          : (containers[0]?.id ?? null),
        isRefreshing: false,
        lastActionMessage:
          containers.length > 0
            ? `Loaded ${containers.length} containers from docker ps -a.`
            : 'No Docker containers were found on this server.',
      })
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to fetch containers.',
        isRefreshing: false,
      })
    }
  },

  loadLogs: async () => {
    const server = useConnectionStore.getState().server
    const selectedContainerId = get().selectedContainerId

    if (!server || !selectedContainerId) {
      set({ error: 'Select a container before loading logs.' })
      return
    }

    set({
      isLoadingLogs: true,
      isFollowingLogs: false,
      activeView: 'logs',
      error: null,
    })

    try {
      const snapshot = await fetchContainerLogs(server.ip, server.port, {
        container_id: selectedContainerId,
        line_count: parseLineCount(get().lineCountInput),
        direction: get().direction,
        filter: get().filter,
      })

      set((state) => ({
        logsByContainer: {
          ...state.logsByContainer,
          [selectedContainerId]: snapshot.lines,
        },
        isLoadingLogs: false,
        lastActionMessage: `Loaded ${snapshot.returned_line_count} log lines from ${snapshot.direction === 'head' ? 'the beginning' : 'the end'} of ${selectedContainerId.slice(0, 12)}.`,
      }))
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to fetch logs.',
        isLoadingLogs: false,
      })
    }
  },

  startFollowingLogs: () => {
    const ws = useConnectionStore.getState().ws
    const selectedContainerId = get().selectedContainerId

    if (!ws || !selectedContainerId) {
      set({ error: 'Connect to the server and choose a container before following logs.' })
      return
    }

    ws.send('container.logs.follow', {
      container_id: selectedContainerId,
      line_count: parseLineCount(get().lineCountInput),
      direction: get().direction,
      filter: get().filter,
    })

    set({
      activeView: 'logs',
      isFollowingLogs: true,
      error: null,
      lastActionMessage: `Following live Docker logs for ${selectedContainerId.slice(0, 12)}.`,
    })
  },

  stopFollowingLogs: () => {
    const ws = useConnectionStore.getState().ws
    const selectedContainerId = get().selectedContainerId

    ws?.send('container.logs.stop', {
      container_id: selectedContainerId,
    })

    set({
      isFollowingLogs: false,
      lastActionMessage: selectedContainerId
        ? `Stopped following Docker logs for ${selectedContainerId.slice(0, 12)}.`
        : 'Stopped following Docker logs.',
    })
  },

  appendLogChunk: (payload) => {
    set((state) => ({
      logsByContainer: upsertLogs(state.logsByContainer, payload.container_id, {
        content: payload.line,
        stream: payload.stream,
        is_error: payload.is_error,
      }),
      isFollowingLogs: true,
      error: null,
    }))
  },

  handleLogsStopped: (payload) => {
    set({
      isFollowingLogs: false,
      lastActionMessage:
        payload.reason === 'completed'
          ? `Docker log stream finished for ${payload.container_id.slice(0, 12)}.`
          : `Docker log stream stopped for ${payload.container_id.slice(0, 12)} (${payload.reason}).`,
    })
  },
}))
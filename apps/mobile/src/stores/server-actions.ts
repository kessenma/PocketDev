import { create } from 'zustand'
import type {
  ServerErrorEntry,
  ServerMetric,
  ServerNetworkEntry,
  ServerPortEntry,
  ServerQuickAction,
  ServerView,
} from '../components/server-actions/model'

export type PreviewResult =
  | { status: 'loading' }
  | { status: 'ok'; output: string; exitCode: number }
  | { status: 'error'; message: string }
import {
  fetchServerSummary,
  fetchServerPorts,
  fetchServerNetwork,
  fetchServerErrors,
  fetchServerActions,
  runServerAction,
} from '../services/api'
import { useConnectionStore } from './connection'

type ServerActionsState = {
  serverLabel: string
  uptime: string
  activeView: ServerView
  metrics: ServerMetric[]
  ports: ServerPortEntry[]
  network: ServerNetworkEntry[]
  errors: ServerErrorEntry[]
  actions: ServerQuickAction[]
  lastActionMessage: string
  isRefreshing: boolean
  error: string | null
  previewResults: Record<string, PreviewResult>
  selectView: (view: ServerView) => void
  refresh: () => void
  previewAction: (actionId: string) => void
}

function getServer() {
  return useConnectionStore.getState().server
}

export const useServerActionsStore = create<ServerActionsState>((set, get) => ({
  serverLabel: '',
  uptime: '',
  activeView: 'overview',
  metrics: [],
  ports: [],
  network: [],
  errors: [],
  actions: [],
  lastActionMessage: 'Pull to refresh to load server diagnostics.',
  isRefreshing: false,
  error: null,
  previewResults: {},

  selectView: (view) => set({ activeView: view }),

  refresh: async () => {
    if (get().isRefreshing) return

    const server = getServer()
    if (!server) {
      set({ lastActionMessage: 'Not connected to server.', error: 'Not connected' })
      return
    }

    set({ isRefreshing: true, lastActionMessage: 'Refreshing server diagnostics...', error: null })

    try {
      const [summary, ports, network, errors, actionDefs] = await Promise.all([
        fetchServerSummary(server.ip, server.port),
        fetchServerPorts(server.ip, server.port),
        fetchServerNetwork(server.ip, server.port),
        fetchServerErrors(server.ip, server.port),
        fetchServerActions(server.ip, server.port),
      ])

      set({
        serverLabel: summary.serverLabel,
        uptime: summary.uptime,
        metrics: summary.metrics.map((m) => ({
          id: m.id,
          label: m.label,
          value: m.value,
          detail: m.detail,
          tone: m.tone,
        })),
        ports: ports as ServerPortEntry[],
        network: network as ServerNetworkEntry[],
        errors: errors as ServerErrorEntry[],
        actions: actionDefs.map((a) => ({
          id: a.id,
          label: a.label,
          command: '',
          description: a.description,
        })),
        isRefreshing: false,
        lastActionMessage: `${ports.length} listeners, ${errors.length} incidents.`,
      })
    } catch (err) {
      set({
        isRefreshing: false,
        lastActionMessage: 'Failed to load server diagnostics.',
        error: err instanceof Error ? err.message : 'Failed to refresh',
      })
    }
  },

  previewAction: async (actionId) => {
    const server = getServer()
    if (!server) return

    if (get().previewResults[actionId]?.status === 'loading') return

    set((state) => ({
      previewResults: { ...state.previewResults, [actionId]: { status: 'loading' } },
    }))

    try {
      const result = await runServerAction(server.ip, server.port, actionId)
      set((state) => ({
        previewResults: {
          ...state.previewResults,
          [actionId]: { status: 'ok', output: result.output, exitCode: result.exitCode },
        },
      }))
    } catch (err) {
      set((state) => ({
        previewResults: {
          ...state.previewResults,
          [actionId]: { status: 'error', message: err instanceof Error ? err.message : 'Action failed' },
        },
      }))
    }
  },
}))

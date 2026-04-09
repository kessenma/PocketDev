import { create } from 'zustand'
import type { DB } from '@op-engineering/op-sqlite'
import type { PrerequisitesReport } from '@pocketdev/shared/types'
import { fetchPrerequisites } from '../services/api'
import { useConnectionStore } from './connection'
import { useNewTaskDraftStore } from './new-task-draft'
import {
  getLegacyPrerequisitesReport,
  clearLegacyPrerequisitesReport,
} from '../services/storage'
import {
  deleteCachedSetupReport,
  getCachedSetupReport,
  upsertCachedSetupReport,
} from '../db/setupOperations'

let _db: DB | null = null

export function setSetupStoreDb(db: DB | null) {
  _db = db

  if (_db) {
    const server = useConnectionStore.getState().server
    const setup = useSetupStore.getState()
    if (server?.deviceId && setup.report) {
      upsertCachedSetupReport(_db, server.deviceId, setup.report).catch(() => {})
    }
  }
}

type ReportSource = 'none' | 'cache' | 'live'

interface SetupState {
  report: PrerequisitesReport | null
  loading: boolean
  error: string | null
  hydrated: boolean
  revalidating: boolean
  reportSource: ReportSource
  hasLiveConfirmation: boolean
  hydrateFromCache: () => Promise<void>
  fetchPrerequisites: () => Promise<void>
  applyLiveReport: (report: PrerequisitesReport) => Promise<void>
  setFetchError: (message: string) => void
  resetForUnpair: (deviceId?: string) => Promise<void>
}

export const useSetupStore = create<SetupState>((set) => ({
  report: null,
  loading: false,
  error: null,
  hydrated: false,
  revalidating: false,
  reportSource: 'none',
  hasLiveConfirmation: false,

  hydrateFromCache: async () => {
    const server = useConnectionStore.getState().server
    const current = useSetupStore.getState()

    if (!server) {
      set({
        report: null,
        loading: false,
        error: null,
        hydrated: true,
        revalidating: false,
        reportSource: 'none',
        hasLiveConfirmation: false,
      })
      return
    }

    if (!_db) {
      set({ hydrated: true })
      return
    }

    if (current.reportSource === 'live' && current.hasLiveConfirmation) {
      set({ hydrated: true })
      return
    }

    let cachedReport = await getCachedSetupReport(_db, server.deviceId)
    if (!cachedReport) {
      const legacyReport = getLegacyPrerequisitesReport() as PrerequisitesReport | null
      if (legacyReport) {
        cachedReport = legacyReport
        upsertCachedSetupReport(_db, server.deviceId, legacyReport).catch(() => {})
        clearLegacyPrerequisitesReport()
      }
    }

    if (cachedReport) {
      set((state) => ({
        report: cachedReport,
        hydrated: true,
        reportSource: state.hasLiveConfirmation ? 'live' : 'cache',
      }))
      return
    }

    set((state) => ({
      hydrated: true,
      reportSource: state.report
        ? (state.hasLiveConfirmation ? 'live' : 'cache')
        : 'none',
    }))
  },

  applyLiveReport: async (report: PrerequisitesReport) => {
    const server = useConnectionStore.getState().server

    set({
      report,
      loading: false,
      error: null,
      hydrated: true,
      revalidating: false,
      reportSource: 'live',
      hasLiveConfirmation: true,
    })

    if (_db && server?.deviceId) {
      upsertCachedSetupReport(_db, server.deviceId, report).catch(() => {})
    }

    useNewTaskDraftStore.getState().loadCapabilities()
  },

  setFetchError: (message: string) => {
    set((state) => ({
      error: message,
      loading: false,
      revalidating: false,
      hydrated: true,
      reportSource: state.report
        ? (state.hasLiveConfirmation ? 'live' : 'cache')
        : 'none',
    }))
  },

  fetchPrerequisites: async () => {
    const server = useConnectionStore.getState().server
    if (!server) {
      useSetupStore.getState().setFetchError('Not connected to a server')
      return
    }

    set({ loading: true, revalidating: true, error: null })

    try {
      const report = (await fetchPrerequisites(server.ip, server.port)) as PrerequisitesReport
      await useSetupStore.getState().applyLiveReport(report)
    } catch (e) {
      useSetupStore.getState().setFetchError(
        e instanceof Error ? e.message : 'Failed to check prerequisites',
      )
    }
  },

  resetForUnpair: async (deviceId?: string) => {
    if (_db && deviceId) {
      deleteCachedSetupReport(_db, deviceId).catch(() => {})
    }

    clearLegacyPrerequisitesReport()
    set({
      report: null,
      loading: false,
      error: null,
      hydrated: false,
      revalidating: false,
      reportSource: 'none',
      hasLiveConfirmation: false,
    })
  },
}))

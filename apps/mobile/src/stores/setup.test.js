jest.mock('../services/api', () => ({
  fetchPrerequisites: jest.fn(),
}))

jest.mock('../services/storage', () => ({
  getLegacyPrerequisitesReport: jest.fn(),
  clearLegacyPrerequisitesReport: jest.fn(),
}))

jest.mock('../db/setupOperations', () => ({
  getCachedSetupReport: jest.fn(),
  upsertCachedSetupReport: jest.fn(),
  deleteCachedSetupReport: jest.fn(),
}))

jest.mock('./connection', () => ({
  useConnectionStore: {
    getState: jest.fn(),
  },
}))

jest.mock('./new-task-draft', () => ({
  useNewTaskDraftStore: {
    getState: jest.fn(),
  },
}))

const { fetchPrerequisites } = require('../services/api')
const {
  getLegacyPrerequisitesReport,
  clearLegacyPrerequisitesReport,
} = require('../services/storage')
const {
  getCachedSetupReport,
  upsertCachedSetupReport,
  deleteCachedSetupReport,
} = require('../db/setupOperations')
const { useConnectionStore } = require('./connection')
const { useNewTaskDraftStore } = require('./new-task-draft')
const { useSetupStore, setSetupStoreDb } = require('./setup')

describe('useSetupStore', () => {
  const mockLoadCapabilities = jest.fn()
  const initialState = useSetupStore.getState()
  const cachedReport = {
    os: 'darwin',
    arch: 'arm64',
    ready: false,
    databases: [],
    tools: [
      {
        id: 'git',
        name: 'Git',
        status: 'installed',
        auth_status: 'authenticated',
        version: '2.0.0',
        path: '/usr/bin/git',
        required: true,
        install_command: null,
        auth_command: null,
        details: {},
      },
    ],
  }
  const liveReport = {
    ...cachedReport,
    ready: true,
    tools: [
      ...cachedReport.tools,
      {
        id: 'claude_cli',
        name: 'Claude',
        status: 'installed',
        auth_status: 'authenticated',
        version: '1.0.0',
        path: '/usr/local/bin/claude',
        required: false,
        install_command: null,
        auth_command: null,
        details: {},
      },
    ],
  }

  beforeEach(() => {
    jest.clearAllMocks()
    setSetupStoreDb(null)
    getCachedSetupReport.mockResolvedValue(null)
    upsertCachedSetupReport.mockResolvedValue(undefined)
    deleteCachedSetupReport.mockResolvedValue(undefined)
    useConnectionStore.getState.mockReturnValue({
      server: { ip: '127.0.0.1', port: 8787, deviceId: 'device-1' },
    })
    useNewTaskDraftStore.getState.mockReturnValue({
      loadCapabilities: mockLoadCapabilities,
    })
    useSetupStore.setState({
      ...initialState,
      report: null,
      loading: false,
      error: null,
      hydrated: false,
      revalidating: false,
      reportSource: 'none',
      hasLiveConfirmation: false,
    })
  })

  it('hydrates a cached setup snapshot from SQLite', async () => {
    const db = { execute: jest.fn() }
    setSetupStoreDb(db)
    getCachedSetupReport.mockResolvedValue(cachedReport)

    await useSetupStore.getState().hydrateFromCache()

    const state = useSetupStore.getState()
    expect(state.report).toEqual(cachedReport)
    expect(state.hydrated).toBe(true)
    expect(state.reportSource).toBe('cache')
    expect(getCachedSetupReport).toHaveBeenCalledWith(db, 'device-1')
  })

  it('falls back to the legacy MMKV prerequisites blob once when SQLite is empty', async () => {
    const db = { execute: jest.fn() }
    setSetupStoreDb(db)
    getCachedSetupReport.mockResolvedValue(null)
    getLegacyPrerequisitesReport.mockReturnValue(cachedReport)

    await useSetupStore.getState().hydrateFromCache()

    const state = useSetupStore.getState()
    expect(state.report).toEqual(cachedReport)
    expect(state.reportSource).toBe('cache')
    expect(upsertCachedSetupReport).toHaveBeenCalledWith(db, 'device-1', cachedReport)
    expect(clearLegacyPrerequisitesReport).toHaveBeenCalled()
  })

  it('keeps cached data visible while revalidating and then swaps to live data', async () => {
    const db = { execute: jest.fn() }
    setSetupStoreDb(db)
    useSetupStore.setState({
      ...useSetupStore.getState(),
      report: cachedReport,
      hydrated: true,
      reportSource: 'cache',
      hasLiveConfirmation: false,
    })

    let resolveFetch
    fetchPrerequisites.mockImplementation(
      () => new Promise((resolve) => { resolveFetch = resolve }),
    )

    const fetchPromise = useSetupStore.getState().fetchPrerequisites()

    expect(useSetupStore.getState().report).toEqual(cachedReport)
    expect(useSetupStore.getState().revalidating).toBe(true)
    expect(useSetupStore.getState().reportSource).toBe('cache')

    resolveFetch(liveReport)
    await fetchPromise

    const state = useSetupStore.getState()
    expect(state.report).toEqual(liveReport)
    expect(state.revalidating).toBe(false)
    expect(state.reportSource).toBe('live')
    expect(state.hasLiveConfirmation).toBe(true)
    expect(upsertCachedSetupReport).toHaveBeenCalledWith(db, 'device-1', liveReport)
  })

  it('keeps the cached report when the server refresh fails', async () => {
    useSetupStore.setState({
      ...useSetupStore.getState(),
      report: cachedReport,
      hydrated: true,
      reportSource: 'cache',
      hasLiveConfirmation: false,
    })
    fetchPrerequisites.mockRejectedValue(new Error('offline'))

    await useSetupStore.getState().fetchPrerequisites()

    const state = useSetupStore.getState()
    expect(state.report).toEqual(cachedReport)
    expect(state.error).toBe('offline')
    expect(state.reportSource).toBe('cache')
    expect(state.revalidating).toBe(false)
  })

  it('clears the in-memory and persisted setup cache on unpair', async () => {
    const db = { execute: jest.fn() }
    setSetupStoreDb(db)
    useSetupStore.setState({
      ...useSetupStore.getState(),
      report: liveReport,
      hydrated: true,
      reportSource: 'live',
      hasLiveConfirmation: true,
    })

    await useSetupStore.getState().resetForUnpair('device-1')

    const state = useSetupStore.getState()
    expect(deleteCachedSetupReport).toHaveBeenCalledWith(db, 'device-1')
    expect(clearLegacyPrerequisitesReport).toHaveBeenCalled()
    expect(state.report).toBeNull()
    expect(state.reportSource).toBe('none')
    expect(state.hasLiveConfirmation).toBe(false)
  })
})

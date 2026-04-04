jest.mock('../services/api', () => ({
  listDirectory: jest.fn(),
  fetchFileContent: jest.fn(),
  searchFiles: jest.fn(),
}))

jest.mock('../services/storage', () => ({
  getCachedDirectorySnapshot: jest.fn(),
  saveCachedDirectorySnapshot: jest.fn(),
}))

jest.mock('./connection', () => ({
  useConnectionStore: {
    getState: () => ({
      server: { ip: '127.0.0.1', port: 8787, deviceId: 'device-1' },
    }),
  },
}))

const { listDirectory, fetchFileContent, searchFiles } = require('../services/api')
const { getCachedDirectorySnapshot, saveCachedDirectorySnapshot } = require('../services/storage')
const { useFilesStore } = require('./files')

describe('useFilesStore', () => {
  const initialState = useFilesStore.getState()

  beforeEach(() => {
    jest.clearAllMocks()
    useFilesStore.setState({
      ...initialState,
      currentPath: '.',
      currentEntries: [],
      directoryEntriesByPath: {},
      selectedFileId: null,
      selectedFile: null,
      selectedFileContent: null,
      selectedContextPaths: [],
      searchQuery: '',
      searchResults: [],
      activePhoneView: 'browser',
    })
  })

  it('loads a directory and updates the current path', async () => {
    getCachedDirectorySnapshot.mockReturnValue(null)
    listDirectory.mockResolvedValue({
      base: '/work/repo',
      path: 'src',
      entries: [
        { name: 'components', path: 'src/components', type: 'dir' },
        { name: 'App.tsx', path: 'src/App.tsx', type: 'file' },
      ],
    })

    await useFilesStore.getState().openDirectory('src')

    const state = useFilesStore.getState()
    expect(state.rootPath).toBe('/work/repo')
    expect(state.currentPath).toBe('src')
    expect(state.currentEntries.map((entry) => entry.path)).toEqual([
      'src/components',
      'src/App.tsx',
    ])
    expect(saveCachedDirectorySnapshot).toHaveBeenCalledWith('device-1', expect.anything())
  })

  it('hydrates a directory from persistent cache before revalidating', async () => {
    getCachedDirectorySnapshot.mockReturnValue({
      base: '/work/repo',
      path: 'src',
      cachedAt: Date.now(),
      entries: [
        { id: 'src/cached.ts', name: 'cached.ts', path: 'src/cached.ts', kind: 'file', language: 'typescript' },
      ],
    })

    let release
    listDirectory.mockImplementation(() => new Promise((resolve) => {
      release = resolve
    }))

    const openPromise = useFilesStore.getState().openDirectory('src')

    const stateWhileRefreshing = useFilesStore.getState()
    expect(stateWhileRefreshing.currentEntries.map((entry) => entry.path)).toEqual(['src/cached.ts'])
    expect(stateWhileRefreshing.lastActionMessage).toBe('Loading src...')

    release({
      base: '/work/repo',
      path: 'src',
      entries: [
        { name: 'fresh.ts', path: 'src/fresh.ts', type: 'file' },
      ],
    })

    await openPromise

    const state = useFilesStore.getState()
    expect(state.currentEntries.map((entry) => entry.path)).toEqual(['src/fresh.ts'])
    expect(saveCachedDirectorySnapshot).toHaveBeenCalledWith('device-1', expect.objectContaining({
      base: '/work/repo',
      path: 'src',
    }))
  })

  it('selects a file, loads content, and enters viewer mode', async () => {
    useFilesStore.setState({
      currentEntries: [
        { id: 'src/App.tsx', name: 'App.tsx', path: 'src/App.tsx', kind: 'file', language: 'tsx' },
      ],
    })
    fetchFileContent.mockResolvedValue({
      path: 'src/App.tsx',
      content: 'export default function App() {}',
      size: 32,
    })

    await useFilesStore.getState().selectFile('src/App.tsx')

    const state = useFilesStore.getState()
    expect(state.selectedFileId).toBe('src/App.tsx')
    expect(state.selectedFileContent).toContain('App')
    expect(state.activePhoneView).toBe('viewer')
  })

  it('runs a search within the current folder', async () => {
    useFilesStore.setState({ currentPath: 'src', searchQuery: 'Button' })
    searchFiles.mockResolvedValue({
      base: '/work/repo',
      query: 'Button',
      path: 'src',
      results: [
        { path: 'src/components/Button.tsx', line_number: 8, text: 'export function Button() {' },
      ],
    })

    await useFilesStore.getState().runSearch()

    const state = useFilesStore.getState()
    expect(searchFiles).toHaveBeenCalledWith('127.0.0.1', 8787, 'Button', 'src')
    expect(state.searchResults).toHaveLength(1)
    expect(state.searchResults[0].path).toBe('src/components/Button.tsx')
  })

  it('toggles pinned AI context paths', () => {
    useFilesStore.getState().toggleContextPath('src/App.tsx')
    expect(useFilesStore.getState().selectedContextPaths).toEqual(['src/App.tsx'])

    useFilesStore.getState().toggleContextPath('src/App.tsx')
    expect(useFilesStore.getState().selectedContextPaths).toEqual([])
  })

  it('resets repo-specific state on project switch', () => {
    useFilesStore.setState({
      currentPath: 'src',
      currentEntries: [{ id: 'src/App.tsx', name: 'App.tsx', path: 'src/App.tsx', kind: 'file' }],
      directoryEntriesByPath: { src: [{ id: 'src/App.tsx', name: 'App.tsx', path: 'src/App.tsx', kind: 'file' }] },
      selectedFileId: 'src/App.tsx',
      selectedFile: { id: 'src/App.tsx', name: 'App.tsx', path: 'src/App.tsx', kind: 'file' },
      selectedContextPaths: ['src/App.tsx'],
      searchQuery: 'App',
      searchResults: [{ path: 'src/App.tsx', line_number: 1, text: 'App' }],
      activePhoneView: 'viewer',
    })

    useFilesStore.getState().resetForProjectSwitch()

    const state = useFilesStore.getState()
    expect(state.currentPath).toBe('.')
    expect(state.currentEntries).toEqual([])
    expect(state.selectedFile).toBeNull()
    expect(state.selectedContextPaths).toEqual([])
    expect(state.searchResults).toEqual([])
    expect(state.activePhoneView).toBe('browser')
  })
})

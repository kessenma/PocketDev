const { useFilesStore } = require('./files')

describe('useFilesStore', () => {
  const initialState = useFilesStore.getState()

  beforeEach(() => {
    useFilesStore.setState({
      ...initialState,
      expandedDirectoryIds: [...initialState.expandedDirectoryIds],
      tree: [...initialState.tree],
    })
  })

  it('selects a file and enters viewer mode', () => {
    useFilesStore.getState().selectFile('features-agent')

    const state = useFilesStore.getState()
    expect(state.selectedFileId).toBe('features-agent')
    expect(state.activePhoneView).toBe('viewer')
  })

  it('toggles a folder without changing unrelated expansion state', () => {
    useFilesStore.getState().toggleFolder('src-app')

    const state = useFilesStore.getState()
    expect(state.expandedDirectoryIds).not.toContain('src-app')
    expect(state.expandedDirectoryIds).toContain('src')
    expect(state.expandedDirectoryIds).toContain('mobile')
  })

  it('toggles wrap without losing the selected file', () => {
    useFilesStore.setState({ selectedFileId: 'app-shell', wrapLines: false })

    useFilesStore.getState().toggleWrapLines()

    const state = useFilesStore.getState()
    expect(state.wrapLines).toBe(true)
    expect(state.selectedFileId).toBe('app-shell')
  })

  it('returns to the browser view when requested', () => {
    useFilesStore.setState({ activePhoneView: 'viewer' })

    useFilesStore.getState().goBackToBrowser()

    expect(useFilesStore.getState().activePhoneView).toBe('browser')
  })
})

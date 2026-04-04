jest.mock('../services/api', () => ({
  postCreateBrowserSession: jest.fn(),
  browserSessionUrl: jest.fn((ip, port, proxiedPath) => `http://${ip}:${port}${proxiedPath}`),
}))

jest.mock('./connection', () => ({
  useConnectionStore: {
    getState: () => ({
      server: { ip: '127.0.0.1', port: 8787 },
    }),
  },
}))

const { postCreateBrowserSession } = require('../services/api')
const { usePreviewStore } = require('./preview')

describe('usePreviewStore', () => {
  const initialState = usePreviewStore.getState()

  beforeEach(() => {
    jest.clearAllMocks()
    usePreviewStore.setState({ ...initialState })
  })

  it('creates a preview session and stores the proxied url', async () => {
    postCreateBrowserSession.mockResolvedValue({
      session_id: 'session-1',
      target_url: 'http://localhost:3000',
      proxied_url: '/PocketDev/browser/session/session-1',
    })

    await usePreviewStore.getState().openPreview()

    const state = usePreviewStore.getState()
    expect(state.visible).toBe(true)
    expect(state.sessionId).toBe('session-1')
    expect(state.proxiedUrl).toBe('http://127.0.0.1:8787/PocketDev/browser/session/session-1')
    expect(state.status).toBe('connecting')
  })

  it('stores a failure when session creation fails', async () => {
    postCreateBrowserSession.mockRejectedValue(new Error('connection refused'))

    await usePreviewStore.getState().openPreview()

    const state = usePreviewStore.getState()
    expect(state.status).toBe('failed')
    expect(state.lastError).toBe('connection refused')
  })

  it('resets preview state when the project changes', () => {
    usePreviewStore.setState({
      visible: true,
      sessionId: 'session-1',
      targetUrl: 'http://localhost:3000',
      proxiedUrl: 'http://127.0.0.1:8787/PocketDev/browser/session/session-1',
      status: 'loaded',
      lastError: null,
    })

    usePreviewStore.getState().resetForProjectChange()

    const state = usePreviewStore.getState()
    expect(state.visible).toBe(false)
    expect(state.sessionId).toBeNull()
    expect(state.proxiedUrl).toBeNull()
    expect(state.status).toBe('idle')
  })
})

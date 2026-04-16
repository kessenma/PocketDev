jest.useFakeTimers()

jest.mock('react-native', () => {
  const React = require('react')

  function createComponent(name) {
    return function MockComponent(props) {
      return React.createElement(name, props, props.children)
    }
  }

  return {
    Image: createComponent('Image'),
    KeyboardAvoidingView: createComponent('KeyboardAvoidingView'),
    Linking: { openURL: jest.fn() },
    Platform: { OS: 'ios' },
    ScrollView: createComponent('ScrollView'),
    StyleSheet: { create: (styles) => styles },
    Text: createComponent('Text'),
    TextInput: createComponent('TextInput'),
    TouchableOpacity: createComponent('TouchableOpacity'),
    View: createComponent('View'),
  }
})

jest.mock('@pocketdev/shared/theme', () => ({
  spacing: { 2: 8, 3: 12, 4: 16 },
  borderRadius: { md: 12, lg: 16 },
  typographyScale: { xs: {}, sm: {}, base: {}, lg: {}, xl: {} },
}))

jest.mock('../../../contexts/ThemeContext', () => ({
  useTheme: () => ({
    isDark: false,
    colors: {
      primary: '#2563eb',
      primaryText: '#fff',
      text: '#111827',
      textSecondary: '#374151',
      textTertiary: '#6b7280',
      border: '#d1d5db',
      background: '#fff',
      surface: '#f8fafc',
      error: '#ef4444',
    },
  }),
}))

jest.mock('../../../stores/connection', () => ({
  useConnectionStore: (selector) => selector({ server: { ip: '127.0.0.1', port: 4444 } }),
}))

jest.mock('../../../../assets', () => ({
  Assets: { codexBlack: 1, codexWhite: 2 },
}))

jest.mock('../../shared/CopyButton', () => {
  const React = require('react')
  return function CopyButton(props) {
    return React.createElement('CopyButton', props)
  }
})

jest.mock('lucide-react-native', () => {
  const React = require('react')
  const makeIcon = (name) => (props) => React.createElement(name, props)
  return {
    ExternalLink: makeIcon('ExternalLink'),
    RefreshCw: makeIcon('RefreshCw'),
    Send: makeIcon('Send'),
    ShieldCheck: makeIcon('ShieldCheck'),
    Smartphone: makeIcon('Smartphone'),
    Globe: makeIcon('Globe'),
    Circle: makeIcon('Circle'),
    CircleDot: makeIcon('CircleDot'),
  }
})

const mockPostStartCodexAuth = jest.fn()
const mockFetchCodexAuthStatus = jest.fn()
const mockPostSubmitCodexAuth = jest.fn()
const mockPostReplayCodexAuthCallback = jest.fn()

jest.mock('../../../services/api', () => ({
  postStartCodexAuth: (...args) => mockPostStartCodexAuth(...args),
  fetchCodexAuthStatus: (...args) => mockFetchCodexAuthStatus(...args),
  postSubmitCodexAuth: (...args) => mockPostSubmitCodexAuth(...args),
  postReplayCodexAuthCallback: (...args) => mockPostReplayCodexAuthCallback(...args),
}))

const React = require('react')
const renderer = require('react-test-renderer')
const { Text, TextInput, TouchableOpacity } = require('react-native')
const AuthenticateStep = require('./AuthenticateStep').default

function renderStep() {
  const dispatch = jest.fn()
  let tree
  renderer.act(() => {
    tree = renderer.create(React.createElement(AuthenticateStep, {
      dispatch,
      authSession: null,
    }))
  })
  return { tree, dispatch }
}

function pressTextButton(tree, label) {
  const textNode = tree.root.findAllByType(Text).find((node) => {
    const children = Array.isArray(node.props.children) ? node.props.children : [node.props.children]
    return children.filter((value) => typeof value === 'string').join('') === label
  })

  let current = textNode
  while (current && current.type !== TouchableOpacity) {
    current = current.parent
  }

  renderer.act(() => {
    current.props.onPress()
  })
}

describe('AuthenticateStep', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('keeps the browser callback flow active while polling for auth completion', async () => {
    mockPostStartCodexAuth.mockResolvedValue({
      session_id: 'session-1',
      state: 'awaiting_browser',
      auth_url: 'https://example.com/login',
      verification_code: null,
      prompt: null,
      output_excerpt: null,
      can_submit_code: false,
      authenticated: false,
      completed: false,
      error: null,
    })

    mockPostReplayCodexAuthCallback.mockResolvedValue({
      success: true,
      callback_url: 'http://localhost:1455/auth/callback?code=abc',
      status_code: 200,
      error: null,
    })

    mockFetchCodexAuthStatus
      .mockResolvedValueOnce({
        session_id: 'session-1',
        state: 'pending',
        auth_url: 'https://example.com/login',
        verification_code: null,
        prompt: null,
        output_excerpt: null,
        can_submit_code: false,
        authenticated: false,
        completed: false,
        error: null,
      })
      .mockResolvedValueOnce({
        session_id: 'session-1',
        state: 'authenticated',
        auth_url: 'https://example.com/login',
        verification_code: null,
        prompt: null,
        output_excerpt: null,
        can_submit_code: false,
        authenticated: true,
        completed: true,
        error: null,
      })

    const { tree, dispatch } = renderStep()

    pressTextButton(tree, 'web app')
    await renderer.act(async () => {
      pressTextButton(tree, 'Continue with web app')
    })

    pressTextButton(tree, 'Open sign-in in browser')

    const inputs = tree.root.findAllByType(TextInput)
    renderer.act(() => {
      inputs[0].props.onChangeText('localhost:1455/auth/callback?code=abc')
    })

    await renderer.act(async () => {
      pressTextButton(tree, 'Finish sign-in')
    })

    expect(mockPostReplayCodexAuthCallback).toHaveBeenCalled()
    expect(tree.root.findAllByType(Text).some((node) => {
      const children = Array.isArray(node.props.children) ? node.props.children : [node.props.children]
      return children.filter((value) => typeof value === 'string').join('') === 'Checking sign-in...'
    })).toBe(true)

    await renderer.act(async () => {
      jest.advanceTimersByTime(700)
      await Promise.resolve()
    })

    expect(dispatch).toHaveBeenCalledWith(expect.objectContaining({
      type: 'STEP_COMPLETE',
      step: 'authenticate',
    }))
  })

  it('stops checking sign-in and recommends device auth for headless browser flows', async () => {
    mockPostStartCodexAuth.mockResolvedValue({
      session_id: 'session-1',
      state: 'awaiting_browser',
      auth_url: 'https://example.com/login',
      verification_code: null,
      prompt: null,
      output_excerpt: null,
      can_submit_code: false,
      authenticated: false,
      completed: false,
      error: null,
    })

    mockPostReplayCodexAuthCallback.mockResolvedValue({
      success: true,
      callback_url: 'http://localhost:1455/auth/callback?code=abc',
      status_code: 302,
      error: null,
    })

    const awaitingCode = {
      session_id: 'session-1',
      state: 'awaiting_code',
      auth_url: 'https://example.com/login',
      verification_code: null,
      prompt: 'On a remote or headless machine? Use `codex login --device-auth` instead.',
      output_excerpt: 'On a remote or headless machine? Use `codex login --device-auth` instead.',
      can_submit_code: true,
      authenticated: false,
      completed: false,
      error: null,
    }

    mockFetchCodexAuthStatus
      .mockResolvedValueOnce(awaitingCode)
      .mockResolvedValue(awaitingCode)

    const { tree } = renderStep()

    pressTextButton(tree, 'web app')
    await renderer.act(async () => {
      pressTextButton(tree, 'Continue with web app')
    })

    pressTextButton(tree, 'Open sign-in in browser')

    const inputs = tree.root.findAllByType(TextInput)
    renderer.act(() => {
      inputs[0].props.onChangeText('localhost:1455/auth/callback?code=abc')
    })

    await renderer.act(async () => {
      pressTextButton(tree, 'Finish sign-in')
    })

    const textValues = tree.root.findAllByType(Text).map((node) => {
      const children = Array.isArray(node.props.children) ? node.props.children : [node.props.children]
      return children.filter((value) => typeof value === 'string').join('')
    })

    expect(textValues).toContain('This Codex session is asking for `codex login --device-auth`. Use the ChatGPT app path instead of the browser callback flow for this workspace.')
  })
})

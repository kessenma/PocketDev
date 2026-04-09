jest.mock('react-native', () => {
  const React = require('react')

  function createComponent(name) {
    return function MockComponent(props) {
      return React.createElement(name, props, props.children)
    }
  }

  return {
    View: createComponent('View'),
    Text: createComponent('Text'),
    ScrollView: createComponent('ScrollView'),
    Pressable: createComponent('Pressable'),
    TouchableOpacity: createComponent('TouchableOpacity'),
    TextInput: createComponent('TextInput'),
    ActivityIndicator: createComponent('ActivityIndicator'),
    Modal: createComponent('Modal'),
    SafeAreaView: createComponent('SafeAreaView'),
    StyleSheet: {
      create: (styles) => styles,
      hairlineWidth: 1,
      absoluteFillObject: {},
    },
    Platform: {
      OS: 'ios',
      select: (options) => options.ios ?? options.default,
    },
    useColorScheme: () => 'light',
  }
})

jest.mock('../../contexts/ThemeContext', () => ({
  useTheme: () => ({
    colors: {
      primary: '#2563eb',
      primaryText: '#ffffff',
      text: '#111827',
      textSecondary: '#374151',
      textTertiary: '#6b7280',
      border: '#d1d5db',
      background: '#ffffff',
      backgroundSecondary: '#f3f4f6',
      surface: '#ffffff',
      error: '#ef4444',
    },
  }),
}))

jest.mock('@pocketdev/shared/theme', () => ({
  fontFamilyTokens: {
    body: 'System',
    mono: 'Menlo',
    displayFallback: 'System',
  },
  semanticTypography: {
    display: { fontSize: 28, lineHeight: 32 },
    screenTitle: { fontSize: 24, lineHeight: 28 },
    sectionTitle: { fontSize: 18, lineHeight: 22 },
    labelStrong: { fontSize: 14, lineHeight: 18 },
    body: { fontSize: 16, lineHeight: 24 },
    bodySmall: { fontSize: 14, lineHeight: 20 },
    meta: { fontSize: 12, lineHeight: 16 },
    button: { fontSize: 15, lineHeight: 20 },
  },
  borderRadius: {
    full: 999,
    xl: 24,
    lg: 16,
    md: 12,
  },
  spacing: {
    1: 4,
    2: 8,
    3: 12,
    4: 16,
    6: 24,
    8: 32,
  },
  typographyScale: {
    xs: { fontSize: 12, lineHeight: 16 },
    sm: { fontSize: 14, lineHeight: 20 },
    base: { fontSize: 16, lineHeight: 24 },
    xl: { fontSize: 20, lineHeight: 28 },
    '2xl': { fontSize: 24, lineHeight: 32 },
  },
  palette: {
    primary: { 500: '#3b82f6', 600: '#2563eb' },
    accent: { 500: '#a855f7', 600: '#9333ea', 700: '#7e22ce' },
    success: { 700: '#15803d' },
    warning: { 600: '#d97706', 700: '#b45309' },
  },
}), { virtual: true })

jest.mock('../../hooks/useAdaptiveLayout', () => ({
  useAdaptiveLayout: () => ({
    isTabletDevice: false,
    isLandscape: false,
    windowWidth: 430,
    windowHeight: 932,
    layoutMode: 'phone',
  }),
}))

jest.mock('../../services/api', () => ({
  fetchCapabilities: jest.fn(),
  listDirectory: jest.fn(),
  fetchFileContent: jest.fn(),
  searchFiles: jest.fn(),
  postCreateBrowserSession: jest.fn(),
  browserSessionUrl: jest.fn((ip, port, proxiedPath) => `http://${ip}:${port}${proxiedPath}`),
}))

jest.mock('react-native-enriched-markdown', () => {
  const React = require('react')

  return {
    EnrichedMarkdownText: function EnrichedMarkdownText(props) {
      return React.createElement('EnrichedMarkdownText', props, props.markdown)
    },
  }
})

jest.mock('../../stores/connection', () => ({
  useConnectionStore: {
    getState: () => ({
      server: { ip: '127.0.0.1', port: 8787 },
      ws: null,
    }),
  },
}))

jest.mock('lucide-react-native', () => {
  const React = require('react')

  function createIcon(name) {
    return function Icon(props) {
      return React.createElement(name, props)
    }
  }

  return {
    FileCode2: createIcon('FileCode2'),
    FolderOpen: createIcon('FolderOpen'),
    Pin: createIcon('Pin'),
    RefreshCcw: createIcon('RefreshCcw'),
    Search: createIcon('Search'),
    Info: createIcon('Info'),
    ArrowLeft: createIcon('ArrowLeft'),
    WrapText: createIcon('WrapText'),
    PinOff: createIcon('PinOff'),
    X: createIcon('X'),
    ChevronLeft: createIcon('ChevronLeft'),
    ChevronRight: createIcon('ChevronRight'),
    RotateCw: createIcon('RotateCw'),
    AlertCircle: createIcon('AlertCircle'),
  }
})

jest.mock('../browser/ServerWebBrowserSheet', () => {
  const React = require('react')
  return function ServerWebBrowserSheet(props) {
    return React.createElement('ServerWebBrowserSheet', props)
  }
})

const React = require('react')
const renderer = require('react-test-renderer')
const { Text, TouchableOpacity } = require('react-native')
const FileWorkspace = require('./FileWorkspace').default
const { useFilesStore } = require('../../stores/files')
const { useProjectsStore } = require('../../stores/projects')
const { usePreviewStore } = require('../../stores/preview')

function renderWorkspace(props = {}) {
  let tree

  renderer.act(() => {
    tree = renderer.create(React.createElement(FileWorkspace, {
      onOpenProjects: jest.fn(),
      ...props,
    }))
  })

  return tree
}

function collectText(tree) {
  return tree.root.findAllByType(Text).map((node) => {
    const children = Array.isArray(node.props.children)
      ? node.props.children
      : [node.props.children]

    return children
      .filter((value) => typeof value === 'string' || typeof value === 'number')
      .map(String)
      .join('')
  })
}

function pressByLabel(tree, label) {
  const touchable = tree.root.findAllByType(TouchableOpacity).find((node) => {
    const texts = node.findAllByType(Text).map((textNode) => {
      const children = Array.isArray(textNode.props.children)
        ? textNode.props.children
        : [textNode.props.children]
      return children.join('')
    })
    return texts.includes(label)
  })

  touchable.props.onPress()
}

describe('FileWorkspace', () => {
  const initialFilesState = useFilesStore.getState()
  const initialProjectsState = useProjectsStore.getState()
  const initialPreviewState = usePreviewStore.getState()

  beforeEach(() => {
    renderer.act(() => {
      useProjectsStore.setState({
        ...initialProjectsState,
        projects: [{
          id: 'repo-1',
          name: 'PocketDev',
          owner: 'ke',
          remoteUrl: 'https://github.com/ke/PocketDev',
          localPath: '/work/PocketDev',
          isLocal: true,
          isActive: true,
          needsClone: false,
          defaultBranch: 'main',
          lastUpdatedAt: '2026-04-04T12:00:00.000Z',
          visibility: 'public',
          source: 'local',
        }],
      })
      useFilesStore.setState({
        ...initialFilesState,
        rootLabel: 'PocketDev',
        rootPath: '/work/PocketDev',
        currentPath: 'src',
        currentEntries: [
          { id: 'src/components', name: 'components', path: 'src/components', kind: 'directory' },
          { id: 'src/App.tsx', name: 'App.tsx', path: 'src/App.tsx', kind: 'file', language: 'tsx' },
        ],
        selectedFileId: 'src/App.tsx',
        selectedFile: { id: 'src/App.tsx', name: 'App.tsx', path: 'src/App.tsx', kind: 'file', language: 'tsx' },
        selectedFileContent: 'export default function App() { return null }',
        selectedContextPaths: ['src/App.tsx'],
      })
      usePreviewStore.setState({
        ...initialPreviewState,
        openPreview: jest.fn().mockResolvedValue(undefined),
        markLoaded: jest.fn(),
        markFailed: jest.fn(),
        closePreview: jest.fn(),
        visible: false,
        proxiedUrl: 'http://127.0.0.1:8787/PocketDev/browser/session/abc',
        status: 'idle',
        lastError: null,
      })
    })
  })

  it('renders the repo workspace header and pinned context', () => {
    const tree = renderWorkspace()
    const text = collectText(tree)

    expect(text).toContain('Code Browser')
    expect(text).toContain('PocketDev')
    expect(text).toContain('AI Context')
    expect(text).toContain('src/App.tsx')
  })

  it('opens preview from the workspace header', () => {
    const tree = renderWorkspace()

    renderer.act(() => {
      pressByLabel(tree, 'Preview')
    })

    expect(usePreviewStore.getState().openPreview).toHaveBeenCalledTimes(1)
  })
})

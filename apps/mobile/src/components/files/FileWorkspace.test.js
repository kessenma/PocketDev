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
    StyleSheet: {
      create: (styles) => styles,
      hairlineWidth: 1,
    },
    Platform: { OS: 'ios' },
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
    },
  }),
}))

jest.mock('../../hooks/useAdaptiveLayout', () => ({
  useAdaptiveLayout: () => ({
    isTabletDevice: false,
    isLandscape: false,
    windowWidth: 430,
    windowHeight: 932,
    layoutMode: 'phone',
  }),
}))

jest.mock('lucide-react-native', () => {
  const React = require('react')

  function createIcon(name) {
    return function Icon(props) {
      return React.createElement(name, props)
    }
  }

  return {
    ArrowLeft: createIcon('ArrowLeft'),
    ChevronRight: createIcon('ChevronRight'),
    Code2: createIcon('Code2'),
    FileCode2: createIcon('FileCode2'),
    Folder: createIcon('Folder'),
    WrapText: createIcon('WrapText'),
  }
})

const React = require('react')
const renderer = require('react-test-renderer')
const { Text } = require('react-native')
const FileWorkspace = require('./FileWorkspace').default
const { useFilesStore } = require('../../stores/files')

function renderWorkspace() {
  let tree

  renderer.act(() => {
    tree = renderer.create(React.createElement(FileWorkspace))
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
  const textNode = tree.root.findAllByType(Text).find((node) => {
    const children = Array.isArray(node.props.children)
      ? node.props.children
      : [node.props.children]

    return children.join('') === label
  })

  let currentNode = textNode
  while (currentNode && typeof currentNode.props.onPress !== 'function') {
    currentNode = currentNode.parent
  }

  currentNode.props.onPress()
}

describe('FileWorkspace', () => {
  const initialState = useFilesStore.getState()

  beforeEach(() => {
    renderer.act(() => {
      useFilesStore.setState({
        ...initialState,
        expandedDirectoryIds: [...initialState.expandedDirectoryIds],
        tree: [...initialState.tree],
      })
    })
  })

  it('renders the project tree on the browser screen', () => {
    const tree = renderWorkspace()
    const text = collectText(tree)

    expect(text).toContain('Project Files')
    expect(text).toContain('src')
    expect(text).toContain('shell.tsx')
    expect(text).toContain('agent-status.js')
  })

  it('opens the viewer with line-numbered content when a file is selected', () => {
    const tree = renderWorkspace()

    renderer.act(() => {
      pressByLabel(tree, 'shell.tsx')
    })

    const text = collectText(tree)
    expect(text).toContain('Code Viewer')
    expect(text).toContain('Wrap off')
    expect(text).toContain('1')
    expect(text).toContain('import React from "react"')
  })

  it('updates the wrap button label when toggled', () => {
    const tree = renderWorkspace()

    renderer.act(() => {
      pressByLabel(tree, 'shell.tsx')
    })

    renderer.act(() => {
      pressByLabel(tree, 'Wrap off')
    })

    const text = collectText(tree)
    expect(text).toContain('Wrap on')
  })

  it('shows a placeholder state for unsupported files', () => {
    const tree = renderWorkspace()

    renderer.act(() => {
      pressByLabel(tree, 'package.json')
    })

    const text = collectText(tree)
    expect(text).toContain('Preview not available yet')
  })
})

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
    StyleSheet: {
      create: (styles) => styles,
    },
    Platform: { OS: 'ios' },
  }
})

jest.mock('react-native-enriched-markdown', () => {
  const React = require('react')

  return {
    EnrichedMarkdownText: function EnrichedMarkdownText(props) {
      return React.createElement('EnrichedMarkdownText', props, props.markdown)
    },
  }
})

jest.mock('../../contexts/ThemeContext', () => ({
  useTheme: () => ({
    colors: {
      primary: '#2563eb',
      text: '#111827',
      textSecondary: '#374151',
      textTertiary: '#6b7280',
      border: '#d1d5db',
      backgroundSecondary: '#f3f4f6',
      surface: '#ffffff',
    },
  }),
}))

jest.mock('@pocketdev/shared/theme', () => ({
  borderRadius: {
    lg: 16,
    md: 12,
  },
  spacing: {
    1: 4,
    2: 8,
    3: 12,
    4: 16,
  },
  typographyScale: {
    base: { fontSize: 16, lineHeight: 24 },
    sm: { fontSize: 14, lineHeight: 20 },
  },
}), { virtual: true })

jest.mock('./FileCard', () => {
  const React = require('react')

  function createComponent(name) {
    return function MockComponent(props) {
      return React.createElement(name, props, props.children)
    }
  }

  return {
    FileCard: createComponent('FileCard'),
    FileCardHeader: createComponent('FileCardHeader'),
    FileCardContent: createComponent('FileCardContent'),
    FileCardTitle: createComponent('FileCardTitle'),
    FileCardDescription: createComponent('FileCardDescription'),
  }
})

jest.mock('./FileBreadcrumbs', () => {
  const React = require('react')
  return function FileBreadcrumbs(props) {
    return React.createElement('FileBreadcrumbs', props)
  }
})

jest.mock('./FileViewerToolbar', () => {
  const React = require('react')
  return function FileViewerToolbar(props) {
    return React.createElement('FileViewerToolbar', props)
  }
})

const React = require('react')
const renderer = require('react-test-renderer')
const { Text } = require('react-native')
const CodeViewer = require('./CodeViewer').default

function collectText(tree) {
  return tree.root.findAllByType(Text).map((node) => {
    const children = Array.isArray(node.props.children)
      ? node.props.children
      : [node.props.children]

    return children
      .flatMap((value) => Array.isArray(value) ? value : [value])
      .filter((value) => typeof value === 'string' || typeof value === 'number')
      .map(String)
      .join('')
  })
}

describe('CodeViewer', () => {
  it('renders python files as previewable text', () => {
    let tree

    renderer.act(() => {
      tree = renderer.create(React.createElement(CodeViewer, {
        file: { id: 'main.py', name: 'main.py', path: 'main.py', kind: 'file', language: 'python' },
        content: 'def main():\n    return 1',
        isLoading: false,
        wrapLines: false,
        onToggleWrap: jest.fn(),
      }))
    })

    const text = collectText(tree).join(' ')
    expect(text).toContain('def')
    expect(text).toContain('return')
  })

  it('renders markdown content through the markdown component', () => {
    let tree

    renderer.act(() => {
      tree = renderer.create(React.createElement(CodeViewer, {
        file: { id: 'README.md', name: 'README.md', path: 'README.md', kind: 'file', language: 'markdown' },
        content: '# Hello\n\nWorld',
        isLoading: false,
        wrapLines: true,
        onToggleWrap: jest.fn(),
      }))
    })

    const markdownNode = tree.root.findByType('EnrichedMarkdownText')
    expect(markdownNode.props.markdown).toBe('# Hello\n\nWorld')
  })

  it('shows unsupported files as unavailable', () => {
    let tree

    renderer.act(() => {
      tree = renderer.create(React.createElement(CodeViewer, {
        file: { id: 'photo.png', name: 'photo.png', path: 'photo.png', kind: 'file', language: 'unknown' },
        content: 'not really image data',
        isLoading: false,
        wrapLines: false,
        onToggleWrap: jest.fn(),
      }))
    })

    expect(collectText(tree)).toContain('Preview not available')
  })
})

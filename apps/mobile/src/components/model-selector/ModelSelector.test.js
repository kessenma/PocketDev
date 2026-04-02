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
    Pressable: createComponent('Pressable'),
    StyleSheet: {
      create: (styles) => styles,
      hairlineWidth: 1,
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
    },
  }),
}))

const React = require('react')
const renderer = require('react-test-renderer')
const { Text } = require('react-native')
const { MODEL_PROVIDERS } = require('./catalog')
const ModelSelector = require('./ModelSelector').default

function Harness() {
  const [selectedProviderId, setSelectedProviderId] = React.useState('claude')
  const [selectedModelId, setSelectedModelId] = React.useState('claude-sonnet-4')

  return React.createElement(ModelSelector, {
    providers: MODEL_PROVIDERS,
    selectedProviderId,
    selectedModelId,
    onSelectProvider: (providerId) => {
      setSelectedProviderId(providerId)
      const provider = MODEL_PROVIDERS.find((entry) => entry.id === providerId)
      setSelectedModelId(provider.models[0].id)
    },
    onSelectModel: (_providerId, modelId) => setSelectedModelId(modelId),
  })
}

function renderSelector() {
  let tree

  renderer.act(() => {
    tree = renderer.create(
      React.createElement(Harness),
    )
  })

  return tree
}

function collectText(tree) {
  return tree.root.findAllByType(Text).map((node) => {
    const children = Array.isArray(node.props.children)
      ? node.props.children
      : [node.props.children]

    return children.filter((value) => typeof value === 'string').join('')
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

describe('ModelSelector', () => {
  it('renders the default provider models', () => {
    const tree = renderSelector()
    const text = collectText(tree)

    expect(text).toContain('Claude')
    expect(text).toContain('Claude Sonnet 4')
    expect(text).toContain('Claude Opus 4.1')
    expect(text).not.toContain('GPT-5.4 Codex')
  })

  it('updates the model list when the provider changes', () => {
    const tree = renderSelector()

    renderer.act(() => {
      pressByLabel(tree, 'Codex')
    })

    const text = collectText(tree)

    expect(text).toContain('GPT-5.4 Codex')
    expect(text).toContain('GPT-5.4 Mini')
    expect(text).not.toContain('Claude Opus 4.1')
  })

  it('updates the selected model within the current provider', () => {
    const tree = renderSelector()

    renderer.act(() => {
      pressByLabel(tree, 'Claude Opus 4.1')
    })

    const text = collectText(tree)
    expect(text).toContain('Claude Opus 4.1')
    expect(text).toContain('Deep reasoning for harder refactors')
  })
})

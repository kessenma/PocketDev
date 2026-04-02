jest.mock('react-native', () => {
  const React = require('react')

  function createComponent(name) {
    return function MockComponent(props) {
      return React.createElement(name, props, props.children)
    }
  }

  function FlatList({ data, renderItem, keyExtractor, ...props }) {
    return React.createElement(
      'FlatList',
      props,
      data.map((item, index) =>
        React.createElement(
          React.Fragment,
          { key: keyExtractor ? keyExtractor(item, index) : `${index}` },
          renderItem({ item, index }),
        ),
      ),
    )
  }

  return {
    View: createComponent('View'),
    Text: createComponent('Text'),
    Pressable: createComponent('Pressable'),
    TextInput: createComponent('TextInput'),
    KeyboardAvoidingView: createComponent('KeyboardAvoidingView'),
    FlatList,
    StyleSheet: {
      create: (styles) => styles,
      hairlineWidth: 1,
    },
    Platform: { OS: 'ios' },
    useColorScheme: () => 'light',
  }
})

jest.mock('../services/storage', () => ({
  getRecentPrompts: jest.fn(),
  addRecentPrompt: jest.fn(),
  getNewTaskDraft: jest.fn(),
  saveNewTaskDraft: jest.fn(),
}))

jest.mock('../hooks/useAdaptiveLayout', () => ({
  useAdaptiveLayout: () => ({
    isTabletDevice: false,
    isLandscape: false,
    windowWidth: 430,
    windowHeight: 932,
    layoutMode: 'phone',
  }),
}))

jest.mock('../contexts/ThemeContext', () => ({
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
const { Text, TextInput } = require('react-native')
const {
  getRecentPrompts,
  addRecentPrompt,
  getNewTaskDraft,
  saveNewTaskDraft,
} = require('../services/storage')
const { getDefaultModelSelection } = require('../components/model-selector')
const { useNewTaskDraftStore } = require('../stores/new-task-draft')
const NewTaskScreen = require('./NewTaskScreen').default

function renderScreen() {
  let tree

  renderer.act(() => {
    tree = renderer.create(
      React.createElement(NewTaskScreen, {
        navigation: { navigate: jest.fn() },
      }),
    )
  })

  return tree
}

function getTextNode(tree, value) {
  return tree.root.findAllByType(Text).find((node) => {
    const children = Array.isArray(node.props.children)
      ? node.props.children
      : [node.props.children]

    return children.join('') === value
  })
}

function pressByLabel(tree, value) {
  let currentNode = getTextNode(tree, value)

  while (currentNode && typeof currentNode.props.onPress !== 'function') {
    currentNode = currentNode.parent
  }

  currentNode.props.onPress()
}

describe('NewTaskScreen', () => {
  beforeEach(() => {
    addRecentPrompt.mockReset()
    saveNewTaskDraft.mockReset()
    getRecentPrompts.mockReturnValue(['Audit the auth flow'])

    const defaultSelection = getDefaultModelSelection()
    const initialDraft = {
      prompt: '',
      selectedProviderId: defaultSelection.selectedProviderId,
      selectedModelId: defaultSelection.selectedModelId,
      lastActionMessage:
        'Prototype mode: model selection stays on-device until PocketDev wires this screen to the server agent.',
    }

    getNewTaskDraft.mockReturnValue(initialDraft)
    renderer.act(() => {
      useNewTaskDraftStore.setState(initialDraft)
    })
  })

  it('loads a recent prompt into the local draft', () => {
    const tree = renderScreen()

    renderer.act(() => {
      pressByLabel(tree, 'Audit the auth flow')
    })

    const input = tree.root.findByType(TextInput)
    expect(input.props.value).toBe('Audit the auth flow')
  })

  it('saves the prompt and selection as a local draft instead of navigating', () => {
    const navigate = jest.fn()
    let tree

    renderer.act(() => {
      tree = renderer.create(
        React.createElement(NewTaskScreen, { navigation: { navigate } }),
      )
    })

    renderer.act(() => {
      tree.root.findByType(TextInput).props.onChangeText('Refactor the mobile layout')
    })

    renderer.act(() => {
      pressByLabel(tree, 'GitHub Copilot')
    })

    renderer.act(() => {
      pressByLabel(tree, 'Copilot GPT-4.1')
    })

    renderer.act(() => {
      pressByLabel(tree, 'Save Draft')
    })

    expect(addRecentPrompt).toHaveBeenCalledWith('Refactor the mobile layout')
    expect(navigate).not.toHaveBeenCalled()

    const statusText = tree.root.findAllByType(Text).map((node) => {
      const children = Array.isArray(node.props.children)
        ? node.props.children
        : [node.props.children]

      return children.join('')
    })

    expect(statusText).toContain(
      'Prompt draft saved. GitHub Copilot / Copilot GPT-4.1 is stored locally on this device until transport wiring is added.',
    )
    expect(saveNewTaskDraft).toHaveBeenCalled()
  })
})

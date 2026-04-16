jest.mock('react-native', () => {
  const React = require('react')

  function createComponent(name) {
    return function MockComponent(props) {
      return React.createElement(name, props, props.children)
    }
  }

  return {
    Image: createComponent('Image'),
    Modal: createComponent('Modal'),
    SafeAreaView: createComponent('SafeAreaView'),
    StyleSheet: { create: (styles) => styles },
    Text: createComponent('Text'),
    TouchableOpacity: createComponent('TouchableOpacity'),
    View: createComponent('View'),
  }
})

jest.mock('@pocketdev/shared/theme', () => ({
  spacing: { 1: 4, 2: 8, 3: 12, 4: 16, 6: 24, 8: 32 },
  borderRadius: { lg: 16 },
  typographyScale: { lg: {}, base: {}, sm: {}, '2xl': {} },
}))

jest.mock('../../contexts/ThemeContext', () => ({
  useTheme: () => ({
    isDark: false,
    colors: {
      background: '#fff',
      text: '#111827',
      textSecondary: '#374151',
      textTertiary: '#6b7280',
      primary: '#2563eb',
      primaryText: '#fff',
    },
  }),
}))

jest.mock('../../stores/setup', () => ({
  useSetupStore: (selector) => selector({ fetchPrerequisites: jest.fn() }),
}))

jest.mock('../../../assets', () => ({
  Assets: {
    codexBlack: 1,
    codexWhite: 2,
  },
}))

jest.mock('lucide-react-native', () => {
  const React = require('react')
  const makeIcon = (name) => (props) => React.createElement(name, props)
  return {
    ChevronLeft: makeIcon('ChevronLeft'),
    X: makeIcon('X'),
    Check: makeIcon('Check'),
  }
})

jest.mock('./codex-wizard/WizardStepper', () => {
  const React = require('react')
  return function WizardStepper(props) {
    return React.createElement('WizardStepper', props)
  }
})

jest.mock('./codex-wizard/DetectStep', () => {
  const React = require('react')
  return function DetectStep(props) {
    return React.createElement('DetectStep', props)
  }
})

jest.mock('./codex-wizard/ReviewStep', () => {
  const React = require('react')
  return function ReviewStep(props) {
    return React.createElement('ReviewStep', props)
  }
})

jest.mock('./codex-wizard/InstallStep', () => {
  const React = require('react')
  return function InstallStep(props) {
    return React.createElement('InstallStep', props)
  }
})

jest.mock('./codex-wizard/AuthenticateStep', () => {
  const React = require('react')
  return function AuthenticateStep(props) {
    return React.createElement('AuthenticateStep', props)
  }
})

jest.mock('./codex-wizard/VerifyStep', () => {
  const React = require('react')
  return function VerifyStep(props) {
    return React.createElement('VerifyStep', props)
  }
})

const React = require('react')
const renderer = require('react-test-renderer')
const CodexWizardSheet = require('./CodexWizardSheet').default

function renderSheet(props = {}) {
  let tree
  renderer.act(() => {
    tree = renderer.create(React.createElement(CodexWizardSheet, {
      visible: true,
      onClose: jest.fn(),
      onComplete: jest.fn(),
      ...props,
    }))
  })
  return tree
}

describe('CodexWizardSheet', () => {
  it('starts in the full flow by default', () => {
    const tree = renderSheet()
    expect(() => tree.root.findByType('DetectStep')).not.toThrow()
  })

  it('starts at authenticate in auth repair mode', () => {
    const tree = renderSheet({ entryMode: 'auth_repair' })
    expect(() => tree.root.findByType('AuthenticateStep')).not.toThrow()
  })

  it('does not force review or install UI in auth repair mode', () => {
    const tree = renderSheet({ entryMode: 'auth_repair' })
    expect(tree.root.findAllByType('ReviewStep')).toHaveLength(0)
    expect(tree.root.findAllByType('InstallStep')).toHaveLength(0)
  })
})

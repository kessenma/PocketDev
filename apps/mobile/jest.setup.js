/* eslint-env jest */
global.IS_REACT_ACT_ENVIRONMENT = true
global.IS_REACT_NATIVE_TEST_ENVIRONMENT = true
global.__DEV__ = true
global.window = global
global.__fbBatchedBridgeConfig = {
  remoteModuleConfig: [],
}
global.requestAnimationFrame = (callback) => setTimeout(() => callback(Date.now()), 0)
global.cancelAnimationFrame = (id) => clearTimeout(id)

jest.mock('react-native/Libraries/Utilities/useColorScheme', () => ({
  __esModule: true,
  default: () => 'light',
}))

jest.mock('react-native-device-info', () => ({
  isTablet: () => false,
}))

jest.mock('react-native-fs', () => ({
  DocumentDirectoryPath: '/tmp/pocketdev-tests',
  exists: jest.fn().mockResolvedValue(true),
  mkdir: jest.fn().mockResolvedValue(undefined),
}))

jest.mock('@op-engineering/op-sqlite', () => ({
  open: jest.fn(() => ({
    execute: jest.fn().mockResolvedValue({ rows: [] }),
    close: jest.fn().mockResolvedValue(undefined),
  })),
}))

jest.mock('react-native-executorch', () => ({
  initExecutorch: jest.fn(),
  TextEmbeddingsModule: {
    generate: jest.fn(),
  },
  ALL_MINILM_L6_V2: {
    name: 'ALL_MINILM_L6_V2',
  },
}), { virtual: true })

jest.mock('@react-native-executorch/bare-resource-fetcher', () => ({
  BareResourceFetcher: {
    download: jest.fn(),
  },
}), { virtual: true })

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
}), { virtual: true })

jest.mock('react-native-mmkv', () => {
  const values = new Map()

  return {
    createMMKV: () => ({
      set: (key, value) => values.set(key, value),
      getString: (key) => {
        const value = values.get(key)
        return typeof value === 'string' ? value : undefined
      },
      getNumber: (key) => {
        const value = values.get(key)
        return typeof value === 'number' ? value : undefined
      },
      getBoolean: (key) => {
        const value = values.get(key)
        return typeof value === 'boolean' ? value : undefined
      },
      remove: (key) => values.delete(key),
    }),
  }
})

jest.mock('@shopify/flash-list', () => {
  const React = require('react')

  return {
    FlashList: function FlashList(props) {
      return React.createElement('FlashList', props, props.ListEmptyComponent ?? props.children)
    },
  }
})

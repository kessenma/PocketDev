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

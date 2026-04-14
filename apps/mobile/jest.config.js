/* eslint-env node */
/* eslint-disable @react-native/no-deep-imports */
const reactNativePreset = require('@react-native/jest-preset')

module.exports = {
  ...reactNativePreset,
  setupFiles: ['<rootDir>/jest.setup.js'],
  transformIgnorePatterns: [
    'node_modules/(?!.pnpm|((jest-)?react-native|@react-native(-community)?|react-native-device-info|react-native-mmkv|@react-navigation)/)',
    '<rootDir>/../../node_modules/.pnpm/(?!(react-native|@react-native\\+community|react-native-device-info|react-native-mmkv|@react-native|@react-navigation\\+)@)',
  ],
}

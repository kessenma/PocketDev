/**
 * @format
 */

import React from 'react';

jest.mock('react-native', () => {
  return {
    AppState: {
      addEventListener: () => ({ remove: () => {} }),
    },
    Platform: {
      OS: 'ios',
      select: (options: Record<string, unknown>) => options.ios ?? options.default,
    },
    StyleSheet: {
      create: <T,>(styles: T) => styles,
    },
  }
})

jest.mock('@react-navigation/native', () => ({
  NavigationContainer: ({ children }: { children: React.ReactNode }) => children,
}))

jest.mock('react-native-gesture-handler', () => ({
  GestureHandlerRootView: ({ children }: { children: React.ReactNode }) => children,
}))

jest.mock('../src/contexts/ThemeContext', () => ({
  ThemeProvider: ({ children }: { children: React.ReactNode }) => children,
  useTheme: () => ({
    colors: {
      primary: '#2563eb',
      background: '#ffffff',
      surface: '#f8fafc',
      text: '#111827',
      border: '#d1d5db',
      error: '#ef4444',
    },
  }),
}))

jest.mock('../src/hooks/useToast', () => ({
  ToastProvider: ({ children }: { children: React.ReactNode }) => children,
}))

jest.mock('../src/db/TaskDatabaseProvider', () => ({
  __esModule: true,
  default: ({ children }: { children: React.ReactNode }) => children,
}))

jest.mock('../src/navigation/RootNavigator', () => ({
  __esModule: true,
  default: () => null,
}))

jest.mock('../src/stores/connection', () => ({
  useConnectionStore: (selector: (state: {
    loadFromStorage: () => void
    connect: () => void
    server: null
  }) => unknown) => selector({
    loadFromStorage: () => {},
    connect: () => {},
    server: null,
  }),
}))

import App from '../App';

// Note: test renderer must be required after react-native.
import ReactTestRenderer from 'react-test-renderer';

declare const it: (name: string, test: () => Promise<void> | void) => void;

it('renders correctly', async () => {
  await ReactTestRenderer.act(() => {
    ReactTestRenderer.create(<App />);
  });
});

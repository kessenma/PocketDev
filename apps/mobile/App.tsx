import { initExecutorch } from 'react-native-executorch'
import { BareResourceFetcher } from '@react-native-executorch/bare-resource-fetcher'

initExecutorch({ resourceFetcher: BareResourceFetcher })

import React, { useEffect } from 'react'
import { NavigationContainer } from '@react-navigation/native'
import { GestureHandlerRootView } from 'react-native-gesture-handler'
import { ThemeProvider, useTheme } from './src/contexts/ThemeContext'
import { ToastProvider } from './src/hooks/useToast'
import RootNavigator from './src/navigation/RootNavigator'
import { useConnectionStore } from './src/stores/connection'
import { AppState, StyleSheet } from 'react-native'
import { typeStyles } from './src/theme/typography'

function AppInner() {
  const { colors } = useTheme()
  const loadFromStorage = useConnectionStore((s) => s.loadFromStorage)
  const connect = useConnectionStore((s) => s.connect)
  const server = useConnectionStore((s) => s.server)

  useEffect(() => {
    loadFromStorage()
  }, [loadFromStorage])

  // Reconnect when app comes to foreground
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active' && server) {
        connect()
      }
    })
    return () => subscription.remove()
  }, [connect, server])

  return (
    <NavigationContainer
      theme={{
        dark: false,
        colors: {
          primary: colors.primary,
          background: colors.background,
          card: colors.surface,
          text: colors.text,
          border: colors.border,
          notification: colors.error,
        },
        fonts: {
          regular: { fontFamily: typeStyles.body.fontFamily ?? 'System', fontWeight: '400' },
          medium: { fontFamily: typeStyles.bodyStrong.fontFamily ?? 'System', fontWeight: '500' },
          bold: { fontFamily: typeStyles.button.fontFamily ?? 'System', fontWeight: '700' },
          heavy: { fontFamily: typeStyles.screenTitle.fontFamily ?? 'System', fontWeight: '800' },
        },
      }}
    >
      <RootNavigator />
    </NavigationContainer>
  )
}

export default function App() {
  return (
    <GestureHandlerRootView style={styles.root}>
      <ThemeProvider>
        <ToastProvider>
          <AppInner />
        </ToastProvider>
      </ThemeProvider>
    </GestureHandlerRootView>
  )
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
})

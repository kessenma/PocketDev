import { initExecutorch } from 'react-native-executorch'
import { BareResourceFetcher } from '@react-native-executorch/bare-resource-fetcher'

initExecutorch({ resourceFetcher: BareResourceFetcher })

import React, { useEffect } from 'react'
import { NavigationContainer } from '@react-navigation/native'
import { GestureHandlerRootView } from 'react-native-gesture-handler'
import { KeyboardProvider } from 'react-native-keyboard-controller'
import { ThemeProvider, useTheme } from './src/contexts/ThemeContext'
import { ToastProvider } from './src/hooks/useToast'
import TaskDatabaseProvider from './src/db/TaskDatabaseProvider'
import OfflineDatabaseProvider from './src/db/OfflineDatabaseProvider'
import RootNavigator from './src/navigation/RootNavigator'
import { navigationRef } from './src/navigation/ref'
import { useConnectionStore } from './src/stores/connection'
import notifee, { EventType } from '@notifee/react-native'
import { AppState, Platform, StyleSheet } from 'react-native'
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

  // Push notification tap handling (iOS only, via @notifee)
  useEffect(() => {
    if (Platform.OS !== 'ios') return

    const unsubscribe = notifee.onForegroundEvent(({ type, detail }) => {
      if (type === EventType.PRESS) {
        const taskId = detail.notification?.data?.taskId as string | undefined
        if (taskId && navigationRef.isReady()) {
          navigationRef.navigate('TaskDetail' as any, { taskId } as any)
        }
      }
    })

    // Handle tap when app was fully closed
    notifee.getInitialNotification().then((initialNotification) => {
      const taskId = initialNotification?.notification?.data?.taskId as string | undefined
      if (taskId && navigationRef.isReady()) {
        navigationRef.navigate('TaskDetail' as any, { taskId } as any)
      }
    }).catch(() => {})

    return () => unsubscribe()
  }, [])

  return (
    <NavigationContainer
      ref={navigationRef}
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
      <KeyboardProvider>
      <ThemeProvider>
        <TaskDatabaseProvider>
          <OfflineDatabaseProvider>
            <ToastProvider>
              <AppInner />
            </ToastProvider>
          </OfflineDatabaseProvider>
        </TaskDatabaseProvider>
      </ThemeProvider>
      </KeyboardProvider>
    </GestureHandlerRootView>
  )
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
})

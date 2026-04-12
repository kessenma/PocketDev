import React, { useState } from 'react'
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native'
import { spacing } from '@pocketdev/shared/theme'
import { useTheme } from '../contexts/ThemeContext'
import { useConnectionStore } from '../stores/connection'
import { useServerActionsStore } from '../stores/server-actions'
import { browserSessionUrl, lockServer } from '../services/api'
import type { CompositeNavigationProp } from '@react-navigation/native'
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import type { MainTabParamList, RootStackParamList } from '../navigation/types'
import AdaptiveShell from '../components/layout/AdaptiveShell'
import ServerWorkspace from '../components/server-actions/ServerWorkspace'
import ServerWebBrowserSheet from '../components/browser/ServerWebBrowserSheet'
import BauhausButton from '../components/shared/BauhausButton'
import { BauhausPanel } from '../components/shared/BauhausPanel'
import BauhausBadge from '../components/shared/BauhausBadge'
import OnDeviceAISection from '../components/settings/OnDeviceAISection'
import { typeStyles } from '../theme/typography'

type Props = {
  navigation: CompositeNavigationProp<
    BottomTabNavigationProp<MainTabParamList, 'Settings'>,
    NativeStackNavigationProp<RootStackParamList>
  >
}

export default function SettingsScreen({ navigation }: Props) {
  const { colors } = useTheme()
  const server = useConnectionStore((s) => s.server)
  const status = useConnectionStore((s) => s.status)
  const unpair = useConnectionStore((s) => s.unpair)
  const serverLocked = useConnectionStore((s) => s.serverLocked)
  const wakeAndConnect = useConnectionStore((s) => s.wakeAndConnect)
  const setServerLocked = useConnectionStore((s) => s.setServerLocked)
  const refreshServer = useServerActionsStore((s) => s.refresh)
  const [consoleOpen, setConsoleOpen] = useState(false)
  const [lockLoading, setLockLoading] = useState(false)

  async function handleLock() {
    if (!server) return
    setLockLoading(true)
    try {
      await lockServer(server.ip, server.port)
      setServerLocked(true)
    } catch { /* ignore — WS server.locked event will also update state */ }
    finally { setLockLoading(false) }
  }

  async function handleWake() {
    setLockLoading(true)
    try { await wakeAndConnect() }
    finally { setLockLoading(false) }
  }

  const consoleUrl = server
    ? browserSessionUrl(server.ip, server.port, '/PocketDev/')
    : ''

  React.useEffect(() => {
    refreshServer()
  }, [refreshServer])

  const statusColor =
    status === 'connected'
      ? '#22c55e'
      : status === 'connecting'
        ? '#facc15'
        : '#ef4444'

  function handleUnpair() {
    unpair()
    navigation.getParent()?.reset({
      index: 0,
      routes: [{ name: 'Connect' }],
    })
  }

  return (
    <AdaptiveShell maxWidth={1200} style={{ backgroundColor: colors.background }}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
        <BauhausPanel style={styles.section} accentColor={colors.accentBlue}>
          <Text style={[styles.sectionTitle, { color: colors.textTertiary }]}>Connection</Text>
          <View style={styles.row}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>Status</Text>
            <View style={styles.statusRow}>
              <BauhausBadge label={status} color={statusColor} />
            </View>
          </View>
          {server ? (
            <>
              <View style={styles.row}>
                <Text style={[styles.label, { color: colors.textSecondary }]}>Paired Host</Text>
                <Text style={[styles.value, { color: colors.text }]}>
                  {server.ip}:{server.port}
                </Text>
              </View>
              <View style={styles.row}>
                <Text style={[styles.label, { color: colors.textSecondary }]}>Pairing ID</Text>
                <Text style={[styles.value, { color: colors.text }]} numberOfLines={1}>
                  {server.deviceId}
                </Text>
              </View>
            </>
          ) : null}
        </BauhausPanel>

        <BauhausPanel style={styles.section} accentColor={colors.accentYellow}>
          <Text style={[styles.sectionTitle, { color: colors.textTertiary }]}>Workspace</Text>
          <BauhausButton onPress={() => navigation.getParent()?.navigate('ServerSetup')}>
            Workspace Tools
          </BauhausButton>
          {server && (
            <BauhausButton onPress={() => setConsoleOpen(true)}>
              Server Console
            </BauhausButton>
          )}
          {server && (
            <BauhausButton onPress={() => navigation.getParent()?.navigate('ServerDebug')}>
              Server Debug
            </BauhausButton>
          )}
          <View style={styles.row}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>Services</Text>
            <TouchableOpacity onPress={() => navigation.getParent()?.navigate('Containers')} activeOpacity={0.7}>
              <Text style={[styles.value, { color: colors.primary }]}>Open</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.row}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>Plans</Text>
            <TouchableOpacity onPress={() => navigation.getParent()?.navigate('Plan')} activeOpacity={0.7}>
              <Text style={[styles.value, { color: colors.primary }]}>Review</Text>
            </TouchableOpacity>
          </View>
        </BauhausPanel>

        <BauhausPanel style={styles.section} accentColor={colors.accentYellow}>
          <Text style={[styles.sectionTitle, { color: colors.textTertiary }]}>Security</Text>
          <View style={styles.row}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>Server Port</Text>
            <BauhausBadge
              label={serverLocked ? 'Locked' : 'Open'}
              color={serverLocked ? '#ef4444' : '#22c55e'}
            />
          </View>
          {serverLocked ? (
            <BauhausButton onPress={handleWake} loading={lockLoading}>
              Wake &amp; Unlock Server
            </BauhausButton>
          ) : (
            <BauhausButton variant="danger" onPress={handleLock} loading={lockLoading}>
              Lock Server Port
            </BauhausButton>
          )}
        </BauhausPanel>

        <BauhausPanel style={styles.section} accentColor={colors.accentRed}>
          <Text style={[styles.sectionTitle, { color: colors.textTertiary }]}>Server Health</Text>
          <ServerWorkspace />
        </BauhausPanel>

        <OnDeviceAISection />

        <BauhausPanel style={styles.section} accentColor={colors.accentBlue}>
          <Text style={[styles.sectionTitle, { color: colors.textTertiary }]}>App</Text>
          <View style={styles.row}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>Version</Text>
            <Text style={[styles.value, { color: colors.text }]}>1.0.0</Text>
          </View>
          <BauhausButton variant="danger" onPress={handleUnpair}>
            Remove Pairing
          </BauhausButton>
        </BauhausPanel>
      </ScrollView>

      <ServerWebBrowserSheet
        visible={consoleOpen}
        title="Server Console"
        initialUrl={consoleUrl}
        onClose={() => setConsoleOpen(false)}
      />
    </AdaptiveShell>
  )
}

const styles = StyleSheet.create({
  scrollView: {
    flex: 1,
  },
  content: {
    gap: spacing[4],
    paddingBottom: spacing[8],
  },
  section: {
    gap: spacing[3],
  },
  sectionTitle: {
    ...typeStyles.sectionTitle,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  label: {
    ...typeStyles.bodySmall,
  },
  value: {
    ...typeStyles.bodyStrong,
    flexShrink: 1,
    textAlign: 'right',
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
  },
})

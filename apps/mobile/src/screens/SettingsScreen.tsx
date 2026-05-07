import React, { useState, useEffect } from 'react'
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Alert } from 'react-native'
import DeviceInfo from 'react-native-device-info'
import { spacing } from '@pocketdev/shared/theme'
import { useTheme } from '../contexts/ThemeContext'
import { useConnectionStore } from '../stores/connection'
import { useServerActionsStore } from '../stores/server-actions'
import { browserSessionUrl, lockServer, postUninstall } from '../services/api'
import type { CompositeNavigationProp } from '@react-navigation/native'
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import type { MainTabParamList, RootStackParamList } from '../navigation/types'
import AdaptiveShell from '../components/layout/AdaptiveShell'
import ServerWorkspace from '../components/server-actions/ServerWorkspace'
import ServerWebBrowserSheet from '../components/browser/ServerWebBrowserSheet'
import { Button } from '../components/ui/Button'
import { BauhausPanel } from '../components/shared/BauhausPanel'
import BauhausBadge from '../components/shared/BauhausBadge'
import OnDeviceAISection from '../components/settings/OnDeviceAISection'
import PushNotificationsSection from '../components/settings/PushNotificationsSection'
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
  const setServerLocked = useConnectionStore((s) => s.setServerLocked)
  const refreshServer = useServerActionsStore((s) => s.refresh)
  const [consoleOpen, setConsoleOpen] = useState(false)
  const [lockLoading, setLockLoading] = useState(false)
  const [agentVersion, setAgentVersion] = useState<string | null>(null)
  const mobileVersion = DeviceInfo.getVersion()

  useEffect(() => {
    if (!server) return
    const protocol = server.secure ? 'https' : 'http'
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), 5_000)
    fetch(`${protocol}://${server.ip}:${server.port}/PocketDev/api/console/health`, {
      signal: controller.signal,
    })
      .then((r) => r.json())
      .then((d: { version?: string }) => { if (d.version) setAgentVersion(d.version) })
      .catch(() => { /* agent unreachable — leave null */ })
      .finally(() => clearTimeout(timer))
  }, [server])

  async function handleLock() {
    if (!server) return
    setLockLoading(true)
    try {
      await lockServer(server.ip, server.port)
      setServerLocked(true)
      // Bounce back to Connect — locked servers live there now, with a Lock
      // icon on the existing-server tile that re-runs wakeAndConnect on tap.
      navigation.getParent()?.reset({
        index: 0,
        routes: [{ name: 'Connect' }],
      })
    } catch (err) {
      Alert.alert(
        'Failed to lock port',
        err instanceof Error ? err.message : 'The server rejected the lock request.',
      )
    } finally { setLockLoading(false) }
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

  function handleUninstall() {
    if (!server) return
    Alert.alert(
      'Uninstall PocketDev?',
      'This removes the PocketDev agent, data, and systemd units from your server. The server will be unreachable from this device afterwards. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Uninstall',
          style: 'destructive',
          onPress: async () => {
            // Fire-and-forget: the server kills itself during the request, so
            // a network error here is expected and doesn't mean the teardown failed.
            try { await postUninstall(server.ip, server.port) } catch { /* ignore */ }
            unpair()
            navigation.getParent()?.reset({
              index: 0,
              routes: [{ name: 'Connect' }],
            })
          },
        },
      ],
    )
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
          <Button onPress={() => navigation.getParent()?.navigate('ServerSetup')}>
            Workspace Tools
          </Button>
          {server && (
            <Button onPress={() => setConsoleOpen(true)}>
              Server Console
            </Button>
          )}
          {server && (
            <Button onPress={() => navigation.getParent()?.navigate('ServerDebug')}>
              Server Debug
            </Button>
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
          {!serverLocked && (
            <Button variant="danger" onPress={handleLock} loading={lockLoading}>
              Lock Server Port
            </Button>
          )}
        </BauhausPanel>

        <BauhausPanel style={styles.section} accentColor={colors.accentRed}>
          <Text style={[styles.sectionTitle, { color: colors.textTertiary }]}>Server Health</Text>
          <ServerWorkspace />
        </BauhausPanel>

        <PushNotificationsSection />
        <OnDeviceAISection />

        <BauhausPanel style={styles.section} accentColor={colors.accentBlue}>
          <Text style={[styles.sectionTitle, { color: colors.textTertiary }]}>App</Text>
          <View style={styles.row}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>Mobile Version</Text>
            <Text style={[styles.value, { color: colors.text }]}>{mobileVersion}</Text>
          </View>
          {agentVersion && (
            <View style={styles.row}>
              <Text style={[styles.label, { color: colors.textSecondary }]}>Agent Version</Text>
              <Text style={[styles.value, { color: colors.text }]}>v{agentVersion}</Text>
            </View>
          )}
          <Button variant="danger" onPress={handleUnpair}>
            Remove Pairing
          </Button>
        </BauhausPanel>

        {server && (
          <BauhausPanel style={styles.section} accentColor={colors.accentRed}>
            <Text style={[styles.sectionTitle, { color: colors.textTertiary }]}>Danger Zone</Text>
            <Text style={[styles.label, { color: colors.textSecondary }]}>
              Fully remove PocketDev from the paired server. Deletes the agent, data, and systemd units.
            </Text>
            <Button variant="danger" onPress={handleUninstall}>
              Uninstall PocketDev
            </Button>
          </BauhausPanel>
        )}
      </ScrollView>

      {consoleOpen && (
        <ServerWebBrowserSheet
          title="Server Console"
          initialUrl={consoleUrl}
          onDismiss={() => setConsoleOpen(false)}
        />
      )}
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

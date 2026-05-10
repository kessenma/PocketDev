import React, { useState, useEffect } from 'react'
import { View, Alert, StyleSheet } from 'react-native'
import ReanimatedLib from 'react-native-reanimated'
import { Server, Smartphone } from 'lucide-react-native'
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
import ShrinkableHeader, { useShrinkableHeader } from '../components/ui/ShrinkableHeader'
import ServerWebBrowserSheet from '../components/browser/ServerWebBrowserSheet'
import ConnectionCard from '../components/settings-screen/ConnectionCard'
import WorkspaceCard from '../components/settings-screen/WorkspaceCard'
import SecurityCard from '../components/settings-screen/SecurityCard'
import ServerHealthCard from '../components/settings-screen/ServerHealthCard'
import AppCard from '../components/settings-screen/AppCard'
import DangerZoneCard from '../components/settings-screen/DangerZoneCard'
import PushNotificationsCard from '../components/settings-screen/PushNotificationsCard'
import OnDeviceAICard from '../components/settings-screen/OnDeviceAICard'
import type { CodeSubTabOption } from '../components/code-screen/navigation/types'

type SettingsTab = 'server' | 'app'

const SETTINGS_TABS: readonly CodeSubTabOption<SettingsTab>[] = [
  { value: 'server', label: 'Server', icon: Server },
  { value: 'app', label: 'App', icon: Smartphone },
] as const

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
  const [activeTab, setActiveTab] = useState<SettingsTab>('server')

  const { scrollY, scrollHandler } = useShrinkableHeader()

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

  useEffect(() => {
    refreshServer()
  }, [refreshServer])

  function handleTabChange(tab: SettingsTab) {
    setActiveTab(tab)
    scrollY.value = 0
  }

  async function handleLock() {
    if (!server) return
    setLockLoading(true)
    try {
      await lockServer(server.ip, server.port)
      setServerLocked(true)
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

  const consoleUrl = server
    ? browserSessionUrl(server.ip, server.port, '/PocketDev/')
    : ''

  const statusSubtitle = server
    ? status === 'connected'
      ? `${server.ip}:${server.port}`
      : status
    : 'No server paired'

  return (
    <AdaptiveShell maxWidth={1200} style={{ backgroundColor: colors.background }}>
      <View style={styles.container}>
        <ShrinkableHeader
          scrollY={scrollY}
          title="Settings"
          subtitle={statusSubtitle}
          tabs={{
            value: activeTab,
            options: SETTINGS_TABS,
            onChange: handleTabChange,
            variant: 'segmented',
          }}
        />

        <ReanimatedLib.ScrollView
          onScroll={scrollHandler}
          scrollEventThrottle={16}
          style={styles.scroll}
          contentContainerStyle={styles.content}
        >
          {activeTab === 'server' ? (
            <>
              <ConnectionCard server={server} status={status} />
              <WorkspaceCard
                server={server}
                onWorkspaceTools={() => navigation.getParent()?.navigate('ServerSetup')}
                onServerConsole={() => setConsoleOpen(true)}
                onServerDebug={() => navigation.getParent()?.navigate('ServerDebug')}
                onOpenContainers={() => navigation.getParent()?.navigate('Containers')}
                onOpenPlans={() => navigation.getParent()?.navigate('Plan')}
              />
              <SecurityCard
                serverLocked={serverLocked}
                lockLoading={lockLoading}
                onLock={handleLock}
              />
              <ServerHealthCard />
            </>
          ) : (
            <>
              <PushNotificationsCard />
              <OnDeviceAICard />
              <AppCard
                mobileVersion={mobileVersion}
                agentVersion={agentVersion}
                onUnpair={handleUnpair}
              />
              {server && <DangerZoneCard onUninstall={handleUninstall} />}
            </>
          )}
        </ReanimatedLib.ScrollView>
      </View>

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
  container: {
    flex: 1,
  },
  scroll: {
    flex: 1,
  },
  content: {
    gap: spacing[4],
    paddingBottom: spacing[8],
  },
})

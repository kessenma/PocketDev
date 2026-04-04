import React from 'react'
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native'
import { useTheme } from '../contexts/ThemeContext'
import { useConnectionStore } from '../stores/connection'
import { spacing, borderRadius, typographyScale } from '@pocketdev/shared/theme'
import type { CompositeNavigationProp } from '@react-navigation/native'
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import type { MainTabParamList, RootStackParamList } from '../navigation/types'
import { useAdaptiveLayout } from '../hooks/useAdaptiveLayout'
import AdaptiveShell from '../components/layout/AdaptiveShell'
import SplitViewLayout from '../components/layout/SplitViewLayout'

type Props = {
  navigation: CompositeNavigationProp<
    BottomTabNavigationProp<MainTabParamList, 'Settings'>,
    NativeStackNavigationProp<RootStackParamList>
  >
}

export default function SettingsScreen({ navigation }: Props) {
  const { colors } = useTheme()
  const { layoutMode } = useAdaptiveLayout()
  const server = useConnectionStore((s) => s.server)
  const status = useConnectionStore((s) => s.status)
  const unpair = useConnectionStore((s) => s.unpair)

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

  const connectionSection = (
    <View style={[styles.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <Text style={[styles.sectionTitle, { color: colors.textTertiary }]}>Workspace</Text>
      <View style={styles.row}>
        <Text style={[styles.label, { color: colors.textSecondary }]}>Status</Text>
        <View style={styles.statusRow}>
          <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
          <Text style={[styles.value, { color: colors.text }]}>{status}</Text>
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
      <TouchableOpacity
        style={[styles.setupButton, { backgroundColor: colors.primary + '14', borderColor: colors.primary + '30' }]}
        onPress={() => navigation.getParent()?.navigate('ServerSetup')}
        activeOpacity={0.7}
      >
        <Text style={[styles.setupButtonText, { color: colors.primary }]}>Workspace Tools</Text>
      </TouchableOpacity>
      <View style={styles.row}>
        <Text style={[styles.label, { color: colors.textSecondary }]}>Services</Text>
        <TouchableOpacity
          onPress={() => navigation.getParent()?.navigate('Containers')}
          activeOpacity={0.7}
        >
          <Text style={[styles.value, { color: colors.primary }]}>Open</Text>
        </TouchableOpacity>
      </View>
      <View style={styles.row}>
        <Text style={[styles.label, { color: colors.textSecondary }]}>Plans</Text>
        <TouchableOpacity
          onPress={() => navigation.getParent()?.navigate('Plan')}
          activeOpacity={0.7}
        >
          <Text style={[styles.value, { color: colors.primary }]}>Review</Text>
        </TouchableOpacity>
      </View>
    </View>
  )

  const appSection = (
    <View style={[styles.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <Text style={[styles.sectionTitle, { color: colors.textTertiary }]}>App</Text>
      <View style={styles.row}>
        <Text style={[styles.label, { color: colors.textSecondary }]}>Version</Text>
        <Text style={[styles.value, { color: colors.text }]}>1.0.0</Text>
      </View>
      <TouchableOpacity
        style={[styles.unpairButton, { backgroundColor: colors.errorBackground }]}
        onPress={handleUnpair}
        activeOpacity={0.7}
      >
        <Text style={[styles.unpairText, { color: colors.error }]}>Remove Pairing</Text>
      </TouchableOpacity>
    </View>
  )

  return (
    <AdaptiveShell maxWidth={1100} style={{ backgroundColor: colors.background }}>
      {layoutMode === 'tabletSplit' ? (
        <SplitViewLayout leading={connectionSection} trailing={appSection} leadingWidth={420} />
      ) : (
        <View style={styles.container}>
          {connectionSection}
          {appSection}
        </View>
      )}
    </AdaptiveShell>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    gap: spacing[4],
  },
  section: {
    borderWidth: 1,
    borderRadius: borderRadius.lg,
    padding: spacing[4],
    gap: spacing[3],
  },
  sectionTitle: {
    ...typographyScale.xs,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  label: {
    ...typographyScale.sm,
  },
  value: {
    ...typographyScale.sm,
    fontWeight: '500',
    flexShrink: 1,
    textAlign: 'right',
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  unpairButton: {
    borderRadius: borderRadius.lg,
    paddingVertical: spacing[4],
    alignItems: 'center',
    marginTop: spacing[6],
  },
  unpairText: {
    ...typographyScale.base,
    fontWeight: '600',
  },
  setupButton: {
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    paddingVertical: spacing[4],
    alignItems: 'center',
  },
  setupButtonText: {
    ...typographyScale.base,
    fontWeight: '600',
  },
})

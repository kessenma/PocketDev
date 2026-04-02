import React, { useEffect, useState } from 'react'
import { View, Text, ActivityIndicator, TouchableOpacity, StyleSheet } from 'react-native'
import { useTheme } from '../../../contexts/ThemeContext'
import { spacing, typographyScale } from '@pocketdev/shared/theme'
import { useConnectionStore } from '../../../stores/connection'
import { fetchPkgSetupStatus } from '../../../services/api'
import { RefreshCw, Package } from 'lucide-react-native'
import type { PkgManagerStatus } from '@pocketdev/shared/types'

type WizardAction =
  | { type: 'DETECTION_COMPLETE'; pkgStatus: PkgManagerStatus }
  | { type: 'STEP_FAILED'; step: 'detect'; error: string }

interface Props {
  dispatch: (action: WizardAction) => void
}

export default function DetectStep({ dispatch }: Props) {
  const { colors } = useTheme()
  const server = useConnectionStore((s) => s.server)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    detect()
  }, [])

  async function detect() {
    if (!server) return
    setError(null)
    try {
      const status = await fetchPkgSetupStatus(server.ip, server.port)
      dispatch({ type: 'DETECTION_COMPLETE', pkgStatus: status })
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to check package manager status'
      setError(message)
      dispatch({ type: 'STEP_FAILED', step: 'detect', error: message })
    }
  }

  if (error) {
    return (
      <View style={styles.center}>
        <Text style={[styles.errorText, { color: colors.error }]}>{error}</Text>
        <TouchableOpacity
          style={[styles.retryButton, { borderColor: colors.border }]}
          onPress={() => { setError(null); detect() }}
          activeOpacity={0.7}
        >
          <RefreshCw color={colors.text} size={16} strokeWidth={2.25} />
          <Text style={[styles.retryText, { color: colors.text }]}>Retry</Text>
        </TouchableOpacity>
      </View>
    )
  }

  return (
    <View style={styles.center}>
      <Package color={colors.textTertiary} size={40} strokeWidth={1.5} />
      <ActivityIndicator color={colors.primary} size="small" style={styles.spinner} />
      <Text style={[styles.detectText, { color: colors.textSecondary }]}>
        Scanning for package managers...
      </Text>
    </View>
  )
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing[4],
    paddingHorizontal: spacing[6],
  },
  spinner: {
    marginTop: spacing[2],
  },
  detectText: {
    ...typographyScale.base,
    textAlign: 'center',
  },
  errorText: {
    ...typographyScale.sm,
    textAlign: 'center',
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[2],
  },
  retryText: {
    ...typographyScale.sm,
    fontWeight: '600',
  },
})

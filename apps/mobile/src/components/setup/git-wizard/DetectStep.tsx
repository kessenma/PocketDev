import React, { useEffect, useState } from 'react'
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native'
import { useTheme } from '../../../contexts/ThemeContext'
import { spacing, borderRadius, typographyScale } from '@pocketdev/shared/theme'
import { useConnectionStore } from '../../../stores/connection'
import { fetchGitSshStatus } from '../../../services/api'
import { RefreshCw } from 'lucide-react-native'
import type { GitSshStatus } from '@pocketdev/shared/types'

type WizardAction =
  | { type: 'DETECTION_COMPLETE'; sshStatus: GitSshStatus }
  | { type: 'STEP_FAILED'; step: 'detect'; error: string }

interface Props {
  dispatch: (action: WizardAction) => void
}

export default function DetectStep({ dispatch }: Props) {
  const { colors } = useTheme()
  const server = useConnectionStore((s) => s.server)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  const detect = async () => {
    if (!server) return
    setLoading(true)
    setError(null)
    try {
      const status = await fetchGitSshStatus(server.ip, server.port)
      dispatch({ type: 'DETECTION_COMPLETE', sshStatus: status })
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Detection failed'
      setError(msg)
      setLoading(false)
    }
  }

  useEffect(() => {
    detect()
  }, [server])

  return (
    <View style={styles.container}>
      {loading && !error && (
        <>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.message, { color: colors.textSecondary }]}>
            Checking this workspace's Git setup...
          </Text>
        </>
      )}

      {error && (
        <>
          <Text style={[styles.message, { color: colors.error }]}>{error}</Text>
          <TouchableOpacity
            style={[styles.retryButton, { backgroundColor: colors.primary }]}
            onPress={detect}
            activeOpacity={0.7}
          >
            <RefreshCw color={colors.primaryText} size={16} strokeWidth={2.25} />
            <Text style={[styles.retryText, { color: colors.primaryText }]}>Retry</Text>
          </TouchableOpacity>
        </>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing[4],
    paddingHorizontal: spacing[6],
  },
  message: {
    ...typographyScale.base,
    textAlign: 'center',
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    paddingHorizontal: spacing[5],
    paddingVertical: spacing[3],
    borderRadius: borderRadius.lg,
  },
  retryText: {
    ...typographyScale.sm,
    fontWeight: '600',
  },
})

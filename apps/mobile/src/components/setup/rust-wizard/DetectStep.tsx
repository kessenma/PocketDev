import React, { useCallback, useEffect, useState } from 'react'
import { ActivityIndicator, View, Text, TouchableOpacity, StyleSheet } from 'react-native'
import { useTheme } from '../../../contexts/ThemeContext'
import { spacing } from '@pocketdev/shared/theme'
import { typeStyles } from '../../../theme/typography'
import { useConnectionStore } from '../../../stores/connection'
import { fetchRustSetupStatus } from '../../../services/api'
import { RefreshCw } from 'lucide-react-native'
import type { RustSetupStatus } from '@pocketdev/shared/types'

type WizardAction =
  | { type: 'DETECTION_COMPLETE'; rustStatus: RustSetupStatus }
  | { type: 'STEP_FAILED'; step: 'detect'; error: string }

interface Props {
  dispatch: (action: WizardAction) => void
}

export default function DetectStep({ dispatch }: Props) {
  const { colors } = useTheme()
  const server = useConnectionStore((s) => s.server)
  const [error, setError] = useState<string | null>(null)
  const [statusResult, setStatusResult] = useState<RustSetupStatus | null>(null)

  const detect = useCallback(async () => {
    if (!server) return
    setError(null)
    try {
      const status = await fetchRustSetupStatus(server.ip, server.port)
      setStatusResult(status)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to check Rust status'
      setError(message)
      dispatch({ type: 'STEP_FAILED', step: 'detect', error: message })
    }
  }, [dispatch, server])

  useEffect(() => {
    detect()
  }, [detect])

  useEffect(() => {
    if (statusResult) {
      dispatch({ type: 'DETECTION_COMPLETE', rustStatus: statusResult })
    }
  }, [dispatch, statusResult])

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
      <ActivityIndicator size="large" color={colors.primary} />
      <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Checking Rust setup...</Text>
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
  errorText: {
    ...typeStyles.bodySmall,
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
    ...typeStyles.button,
  },
  loadingText: {
    ...typeStyles.bodySmall,
    textAlign: 'center',
  },
})

import React, { useEffect, useState } from 'react'
import { View, Text, ActivityIndicator, TouchableOpacity, StyleSheet, Image } from 'react-native'
import { RefreshCw } from 'lucide-react-native'
import { spacing } from '@pocketdev/shared/theme'
import { typeStyles } from '../../../theme/typography'
import { useTheme } from '../../../contexts/ThemeContext'
import { useConnectionStore } from '../../../stores/connection'
import { fetchOpenCodeSetupStatus } from '../../../services/api'
import { Assets } from '../../../../assets'
import type { OpenCodeSetupStatus } from '@pocketdev/shared/types'

type WizardAction =
  | { type: 'DETECTION_COMPLETE'; openCodeStatus: OpenCodeSetupStatus }
  | { type: 'STEP_FAILED'; step: 'detect'; error: string }

interface Props {
  dispatch: (action: WizardAction) => void
}

export default function DetectStep({ dispatch }: Props) {
  const { colors, isDark } = useTheme()
  const server = useConnectionStore((state) => state.server)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    void detect()
  }, [])

  async function detect() {
    if (!server) return
    setLoading(true)
    setError(null)
    try {
      const status = await fetchOpenCodeSetupStatus(server.ip, server.port)
      dispatch({ type: 'DETECTION_COMPLETE', openCodeStatus: status })
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to check OpenCode status'
      setError(message)
      dispatch({ type: 'STEP_FAILED', step: 'detect', error: message })
    } finally {
      setLoading(false)
    }
  }

  if (error) {
    return (
      <View style={styles.center}>
        <Text style={[styles.errorText, { color: colors.error }]}>{error}</Text>
        <TouchableOpacity style={[styles.retryButton, { borderColor: colors.border }]} onPress={() => void detect()} activeOpacity={0.7}>
          <RefreshCw color={colors.text} size={16} strokeWidth={2.25} />
          <Text style={[styles.retryText, { color: colors.text }]}>Retry</Text>
        </TouchableOpacity>
      </View>
    )
  }

  return (
    <View style={styles.center}>
      <Image source={isDark ? Assets.opencodeWhite : Assets.opencodeBlack} style={styles.logo} resizeMode="contain" />
      {loading ? <ActivityIndicator color={colors.primary} size="small" /> : null}
      <Text style={[styles.title, { color: colors.text }]}>Checking OpenCode runtime</Text>
      <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
        PocketDev is verifying whether OpenCode is already installed on the paired workspace.
      </Text>
    </View>
  )
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing[3],
    paddingHorizontal: spacing[6],
  },
  logo: {
    width: 48,
    height: 48,
  },
  title: {
    ...typeStyles.screenTitle,
    textAlign: 'center',
  },
  subtitle: {
    ...typeStyles.bodySmall,
    textAlign: 'center',
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
})

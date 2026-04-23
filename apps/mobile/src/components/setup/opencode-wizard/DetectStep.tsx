import React, { useEffect, useState } from 'react'
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native'
import { RefreshCw } from 'lucide-react-native'
import { spacing } from '@pocketdev/shared/theme'
import { typeStyles } from '../../../theme/typography'
import { useTheme } from '../../../contexts/ThemeContext'
import { useConnectionStore } from '../../../stores/connection'
import { fetchOpenCodeSetupStatus } from '../../../services/api'
import OpencodeSetupAnimation from '../../animations/OpencodeSetupAnimation'
import type { OpenCodeSetupStatus } from '@pocketdev/shared/types'

type WizardAction =
  | { type: 'DETECTION_COMPLETE'; openCodeStatus: OpenCodeSetupStatus }
  | { type: 'STEP_FAILED'; step: 'detect'; error: string }

interface Props {
  dispatch: (action: WizardAction) => void
}

export default function DetectStep({ dispatch }: Props) {
  const { colors } = useTheme()
  const server = useConnectionStore((state) => state.server)
  const [error, setError] = useState<string | null>(null)
  const [animationReady, setAnimationReady] = useState(false)
  const [statusResult, setStatusResult] = useState<OpenCodeSetupStatus | null>(null)

  useEffect(() => {
    void detect()
  }, [])

  // Dispatch when the animation begins its exit fade AND the API result is ready.
  // Using onBeforeFade (rather than onComplete) means the next step renders during
  // the fade instead of after it, eliminating the blank-screen gap.
  useEffect(() => {
    if (animationReady && statusResult) {
      dispatch({ type: 'DETECTION_COMPLETE', openCodeStatus: statusResult })
    }
  }, [animationReady, statusResult])

  async function detect() {
    if (!server) return
    setError(null)
    try {
      const status = await fetchOpenCodeSetupStatus(server.ip, server.port)
      setStatusResult(status)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to check OpenCode status'
      setError(message)
      dispatch({ type: 'STEP_FAILED', step: 'detect', error: message })
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
    <View style={styles.container}>
      <OpencodeSetupAnimation
        onBeforeFade={() => setAnimationReady(true)}
        onComplete={() => {}}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing[3],
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
})

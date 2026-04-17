import React, { useState } from 'react'
import { View, Text, Image, TouchableOpacity, ActivityIndicator, StyleSheet } from 'react-native'
import { useTheme } from '../../../contexts/ThemeContext'
import { spacing, borderRadius } from '@pocketdev/shared/theme'
import { typeStyles } from '../../../theme/typography'
import { useConnectionStore } from '../../../stores/connection'
import { postVerifyPkgSetup } from '../../../services/api'
import { Assets } from '../../../../assets'
import { Check, X, RefreshCw, ChevronLeft } from 'lucide-react-native'
import type { PkgManagerStatus } from '@pocketdev/shared/types'

type WizardAction =
  | { type: 'STEP_COMPLETE'; step: 'verify' }
  | { type: 'STEP_FAILED'; step: 'verify'; error: string }
  | { type: 'GO_BACK' }

interface Props {
  dispatch: (action: WizardAction) => void
}

type VerifyState = 'idle' | 'loading' | 'success' | 'failed'

interface ToolResult {
  id: string
  name: string
  installed: boolean
  version: string | null
  logo: any
}

function buildResults(status: PkgManagerStatus, isDark: boolean): ToolResult[] {
  return [
    { id: 'npm', name: 'Node.js + npm', installed: status.npm.installed, version: status.npm.version, logo: isDark ? Assets.npmWhite : Assets.npmBlack },
    { id: 'pnpm', name: 'pnpm', installed: status.pnpm.installed, version: status.pnpm.version, logo: isDark ? Assets.pnpmWhite : Assets.pnpmBlack },
    { id: 'bun', name: 'Bun', installed: status.bun.installed, version: status.bun.version, logo: isDark ? Assets.bunWhite : Assets.bunBlack },
  ]
}

export default function VerifyStep({ dispatch }: Props) {
  const { colors, isDark } = useTheme()
  const server = useConnectionStore((s) => s.server)
  const [state, setState] = useState<VerifyState>('idle')
  const [results, setResults] = useState<ToolResult[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function handleVerify() {
    if (!server) return
    setState('loading')
    setError(null)

    try {
      const status = await postVerifyPkgSetup(server.ip, server.port)
      const toolResults = buildResults(status, isDark)
      setResults(toolResults)

      const allInstalled = status.npm.installed && status.pnpm.installed && status.bun.installed
      if (allInstalled) {
        setState('success')
        setTimeout(() => {
          dispatch({ type: 'STEP_COMPLETE', step: 'verify' })
        }, 800)
      } else {
        setState('failed')
        const missing = toolResults.filter((t) => !t.installed).map((t) => t.name)
        setError(`${missing.join(', ')} could not be detected. You may need to re-run the install step.`)
      }
    } catch (err) {
      setState('failed')
      setError(err instanceof Error ? err.message : 'Verification failed')
    }
  }

  return (
    <View style={styles.container}>
      <View style={styles.center}>
        <Text style={[styles.title, { color: colors.text }]}>
          {state === 'success' ? 'All verified!' :
            state === 'loading' ? 'Verifying...' :
            'Verify Installation'}
        </Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          {state === 'success' ? 'All package managers are installed and ready.' :
            state === 'loading' ? 'Checking each tool in this workspace...' :
            'Confirm that all package managers were installed successfully.'}
        </Text>

        {/* Results */}
        {results && (
          <View style={styles.resultList}>
            {results.map((tool) => (
              <View key={tool.id} style={[styles.resultRow, { borderColor: colors.border }]}>
                <Image source={tool.logo} style={styles.resultLogo} resizeMode="contain" />
                <Text style={[styles.resultName, { color: colors.text }]}>{tool.name}</Text>
                {tool.installed ? (
                  <View style={styles.resultStatus}>
                    <Text style={[styles.resultVersion, { color: '#22c55e' }]}>
                      v{tool.version ?? '?'}
                    </Text>
                    <Check color="#22c55e" size={16} strokeWidth={2.5} />
                  </View>
                ) : (
                  <View style={styles.resultStatus}>
                    <Text style={[styles.resultVersion, { color: colors.error }]}>missing</Text>
                    <X color={colors.error} size={16} strokeWidth={2.5} />
                  </View>
                )}
              </View>
            ))}
          </View>
        )}

        {state === 'loading' && !results && (
          <ActivityIndicator color={colors.primary} size="small" style={styles.spinner} />
        )}

        {state === 'failed' && error && (
          <Text style={[styles.errorText, { color: colors.error }]}>{error}</Text>
        )}
      </View>

      {/* Actions */}
      {state === 'idle' && (
        <TouchableOpacity
          style={[styles.actionButton, { backgroundColor: colors.primary }]}
          onPress={handleVerify}
          activeOpacity={0.7}
        >
          <Text style={[styles.buttonText, { color: colors.primaryText }]}>Verify</Text>
        </TouchableOpacity>
      )}

      {state === 'failed' && (
        <View style={styles.failedActions}>
          <TouchableOpacity
            style={[styles.secondaryButton, { borderColor: colors.border }]}
            onPress={() => dispatch({ type: 'GO_BACK' })}
            activeOpacity={0.7}
          >
            <ChevronLeft color={colors.text} size={16} strokeWidth={2.25} />
            <Text style={[styles.secondaryText, { color: colors.text }]}>Go Back</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: colors.primary, flex: 1 }]}
            onPress={handleVerify}
            activeOpacity={0.7}
          >
            <RefreshCw color={colors.primaryText} size={16} strokeWidth={2.25} />
            <Text style={[styles.buttonText, { color: colors.primaryText }]}>Retry</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    gap: spacing[4],
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing[3],
    paddingHorizontal: spacing[4],
  },
  title: {
    ...typeStyles.screenTitle,
  },
  subtitle: {
    ...typeStyles.body,
    textAlign: 'center',
  },
  spinner: {
    marginTop: spacing[4],
  },
  resultList: {
    width: '100%',
    gap: spacing[2],
    marginTop: spacing[3],
  },
  resultRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
    paddingVertical: spacing[3],
    paddingHorizontal: spacing[3],
    borderBottomWidth: 1,
  },
  resultLogo: {
    width: 24,
    height: 24,
  },
  resultName: {
    ...typeStyles.bodyStrong,
    flex: 1,
  },
  resultStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
  },
  resultVersion: {
    ...typeStyles.mono,
  },
  errorText: {
    ...typeStyles.bodySmall,
    textAlign: 'center',
    marginTop: spacing[1],
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing[2],
    paddingVertical: spacing[4],
    borderRadius: borderRadius.lg,
  },
  buttonText: {
    ...typeStyles.button,
  },
  failedActions: {
    flexDirection: 'row',
    gap: spacing[3],
  },
  secondaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing[2],
    paddingVertical: spacing[4],
    paddingHorizontal: spacing[5],
    borderRadius: borderRadius.lg,
    borderWidth: 1,
  },
  secondaryText: {
    ...typeStyles.button,
  },
})

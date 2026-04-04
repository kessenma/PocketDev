import React, { useState, useCallback } from 'react'
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, Image } from 'react-native'
import { useTheme } from '../../../contexts/ThemeContext'
import { spacing, borderRadius, typographyScale } from '@pocketdev/shared/theme'
import { useConnectionStore } from '../../../stores/connection'
import { postTestGitConnection } from '../../../services/api'
import { Assets } from '../../../../assets'
import { CheckCircle, XCircle, RefreshCw, ArrowRight, ChevronLeft } from 'lucide-react-native'

type WizardAction =
  | { type: 'STEP_COMPLETE'; step: 'test-connection' }
  | { type: 'SET_GITHUB_USERNAME'; username: string }
  | { type: 'GO_BACK' }

interface Props {
  dispatch: (action: WizardAction) => void
}

export default function TestConnectionStep({ dispatch }: Props) {
  const { colors, isDark } = useTheme()
  const server = useConnectionStore((s) => s.server)
  const [testing, setTesting] = useState(false)
  const [success, setSuccess] = useState<boolean | null>(null)
  const [githubUser, setGithubUser] = useState<string | null>(null)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [rawOutput, setRawOutput] = useState<string | null>(null)

  const testConnection = useCallback(async () => {
    if (!server) return
    setTesting(true)
    setSuccess(null)
    setErrorMsg(null)
    setRawOutput(null)

    try {
      const result = await postTestGitConnection(server.ip, server.port)
      setSuccess(result.success)
      setGithubUser(result.github_username)
      setRawOutput(result.output)
      if (result.success && result.github_username) {
        dispatch({ type: 'SET_GITHUB_USERNAME', username: result.github_username })
      }
      if (!result.success) {
        setErrorMsg(result.error ?? 'Connection failed')
      }
    } catch (err) {
      setSuccess(false)
      setErrorMsg(err instanceof Error ? err.message : 'Connection test failed')
    } finally {
      setTesting(false)
    }
  }, [server])

  function handleContinue() {
    dispatch({ type: 'STEP_COMPLETE', step: 'test-connection' })
  }

  function handleGoBack() {
    dispatch({ type: 'GO_BACK' })
  }

  const githubLogo = isDark ? Assets.githubWhite : Assets.githubBlack

  return (
    <View style={styles.container}>
      <View style={styles.centerContent}>
        {/* Initial / idle state */}
        {success === null && !testing && (
          <>
            <Image source={githubLogo} style={styles.logo} resizeMode="contain" />
            <Text style={[styles.title, { color: colors.text }]}>Test Connection</Text>
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
              Verify that this workspace can connect to GitHub.
            </Text>
            <TouchableOpacity
              style={[styles.testButton, { backgroundColor: colors.primary }]}
              onPress={testConnection}
              activeOpacity={0.7}
            >
              <Text style={[styles.buttonText, { color: colors.primaryText }]}>Test Connection</Text>
            </TouchableOpacity>
          </>
        )}

        {/* Testing */}
        {testing && (
          <>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
              Connecting to GitHub...
            </Text>
          </>
        )}

        {/* Success */}
        {success === true && (
          <>
            <View style={[styles.resultIcon, { backgroundColor: '#22c55e20' }]}>
              <CheckCircle color="#22c55e" size={40} strokeWidth={1.5} />
            </View>
            <Text style={[styles.title, { color: colors.text }]}>Connected!</Text>
            {githubUser && (
              <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
                Authenticated as @{githubUser}
              </Text>
            )}
          </>
        )}

        {/* Failure */}
        {success === false && (
          <>
            <View style={[styles.resultIcon, { backgroundColor: colors.error + '20' }]}>
              <XCircle color={colors.error} size={40} strokeWidth={1.5} />
            </View>
            <Text style={[styles.title, { color: colors.text }]}>Connection Failed</Text>
            <Text style={[styles.subtitle, { color: colors.error }]}>{errorMsg}</Text>

            {rawOutput && (
              <View style={[styles.outputCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <Text style={[styles.outputText, { color: colors.textTertiary }]} numberOfLines={6} selectable>
                  {rawOutput}
                </Text>
              </View>
            )}

            <View style={styles.failActions}>
              <TouchableOpacity
                style={[styles.secondaryButton, { borderColor: colors.border }]}
                onPress={handleGoBack}
                activeOpacity={0.7}
              >
                <ChevronLeft color={colors.text} size={16} strokeWidth={2.25} />
                <Text style={[styles.secondaryButtonText, { color: colors.text }]}>Go Back</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.retryButton, { backgroundColor: colors.primary }]}
                onPress={testConnection}
                activeOpacity={0.7}
              >
                <RefreshCw color={colors.primaryText} size={16} strokeWidth={2.25} />
                <Text style={[styles.buttonText, { color: colors.primaryText }]}>Retry</Text>
              </TouchableOpacity>
            </View>
          </>
        )}
      </View>

      {/* Continue on success */}
      {success === true && (
        <TouchableOpacity
          style={[styles.continueButton, { backgroundColor: colors.primary }]}
          onPress={handleContinue}
          activeOpacity={0.7}
        >
          <Text style={[styles.buttonText, { color: colors.primaryText }]}>Continue</Text>
          <ArrowRight color={colors.primaryText} size={18} strokeWidth={2.25} />
        </TouchableOpacity>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'space-between',
  },
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing[3],
    paddingHorizontal: spacing[4],
  },
  logo: {
    width: 40,
    height: 40,
    marginBottom: spacing[2],
  },
  title: {
    ...typographyScale.xl,
    fontWeight: '700',
  },
  subtitle: {
    ...typographyScale.sm,
    textAlign: 'center',
  },
  resultIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing[2],
  },
  testButton: {
    paddingHorizontal: spacing[8],
    paddingVertical: spacing[4],
    borderRadius: borderRadius.lg,
    marginTop: spacing[2],
  },
  outputCard: {
    width: '100%',
    borderWidth: 1,
    borderRadius: borderRadius.md,
    padding: spacing[3],
    marginTop: spacing[1],
  },
  outputText: {
    ...typographyScale.xs,
    fontFamily: 'monospace',
    lineHeight: 16,
  },
  failActions: {
    flexDirection: 'row',
    gap: spacing[3],
    marginTop: spacing[2],
  },
  secondaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[1],
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
    borderRadius: borderRadius.lg,
    borderWidth: 1,
  },
  secondaryButtonText: {
    ...typographyScale.sm,
    fontWeight: '600',
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    paddingHorizontal: spacing[5],
    paddingVertical: spacing[3],
    borderRadius: borderRadius.lg,
  },
  continueButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing[2],
    paddingVertical: spacing[4],
    borderRadius: borderRadius.lg,
    marginBottom: spacing[4],
  },
  buttonText: {
    ...typographyScale.base,
    fontWeight: '600',
  },
})

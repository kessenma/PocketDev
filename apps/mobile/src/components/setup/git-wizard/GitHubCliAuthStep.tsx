import React, { useState } from 'react'
import { View, Text, TouchableOpacity, StyleSheet, TextInput } from 'react-native'
import { useTheme } from '../../../contexts/ThemeContext'
import { spacing, borderRadius, typographyScale } from '@pocketdev/shared/theme'
import { useConnectionStore } from '../../../stores/connection'
import { postConfigureGitHubCliToken } from '../../../services/api'
import { CheckCircle, KeyRound } from 'lucide-react-native'

type WizardAction =
  | { type: 'STEP_COMPLETE'; step: 'github-cli-auth' }
  | { type: 'STEP_FAILED'; step: 'github-cli-auth'; error: string }
  | { type: 'SET_GITHUB_USERNAME'; username: string }

interface Props {
  dispatch: (action: WizardAction) => void
}

export default function GitHubCliAuthStep({ dispatch }: Props) {
  const { colors } = useTheme()
  const server = useConnectionStore((s) => s.server)
  const [token, setToken] = useState('')
  const [loading, setLoading] = useState(false)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  async function handleSubmit() {
    if (!server || !token.trim()) return
    setLoading(true)
    setSuccessMsg(null)
    setErrorMsg(null)

    try {
      const result = await postConfigureGitHubCliToken(server.ip, server.port, token.trim())
      if (!result.success) {
        setErrorMsg(result.error ?? 'GitHub CLI authentication failed')
        return
      }

      if (result.github_username) {
        dispatch({ type: 'SET_GITHUB_USERNAME', username: result.github_username })
      }
      setSuccessMsg(
        result.private_repo_access
          ? 'Private repository access is enabled.'
          : 'GitHub CLI is authenticated, but private repository access could not be verified.',
      )
      dispatch({ type: 'STEP_COMPLETE', step: 'github-cli-auth' })
    } catch (error) {
      setErrorMsg(error instanceof Error ? error.message : 'GitHub CLI authentication failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={[styles.iconWrap, { backgroundColor: colors.backgroundSecondary }]}>
          <KeyRound color={colors.primary} size={22} strokeWidth={2.25} />
        </View>
        <Text style={[styles.title, { color: colors.text }]}>Enable private repo access</Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          Paste a GitHub token so GitHub CLI can list your private repositories on this server. A token with repo read access is enough.
        </Text>
      </View>

      <View style={[styles.tipCard, { backgroundColor: colors.backgroundSecondary, borderColor: colors.border }]}>
        <Text style={[styles.tipTitle, { color: colors.text }]}>Recommended token scope</Text>
        <Text style={[styles.tipBody, { color: colors.textSecondary }]}>
          Fine-grained token: repository metadata/read access for the repos you want listed. Classic token: `repo`.
        </Text>
      </View>

      <TextInput
        style={[styles.input, { borderColor: colors.border, color: colors.text, backgroundColor: colors.surface }]}
        value={token}
        onChangeText={setToken}
        placeholder="GitHub token"
        placeholderTextColor={colors.textTertiary}
        autoCapitalize="none"
        autoCorrect={false}
        secureTextEntry
      />

      {errorMsg ? <Text style={[styles.feedback, { color: colors.error }]}>{errorMsg}</Text> : null}
      {successMsg ? (
        <View style={styles.successRow}>
          <CheckCircle color="#22c55e" size={16} strokeWidth={2.25} />
          <Text style={[styles.feedback, { color: '#22c55e' }]}>{successMsg}</Text>
        </View>
      ) : null}

      <TouchableOpacity
        style={[styles.submitButton, { backgroundColor: colors.primary }]}
        onPress={handleSubmit}
        activeOpacity={0.7}
        disabled={loading || token.trim().length === 0}
      >
        <Text style={[styles.submitText, { color: colors.primaryText }]}>
          {loading ? 'Authenticating...' : 'Enable Private Repos'}
        </Text>
      </TouchableOpacity>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    gap: spacing[3],
  },
  header: {
    gap: spacing[2],
    alignItems: 'flex-start',
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    ...typographyScale.xl,
    fontWeight: '700',
  },
  subtitle: {
    ...typographyScale.sm,
  },
  tipCard: {
    borderWidth: 1,
    borderRadius: borderRadius.lg,
    padding: spacing[3],
    gap: spacing[1],
  },
  tipTitle: {
    ...typographyScale.sm,
    fontWeight: '700',
  },
  tipBody: {
    ...typographyScale.sm,
  },
  input: {
    borderWidth: 1,
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[3],
  },
  feedback: {
    ...typographyScale.sm,
  },
  successRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
  },
  submitButton: {
    borderRadius: borderRadius.lg,
    paddingVertical: spacing[4],
    alignItems: 'center',
  },
  submitText: {
    ...typographyScale.base,
    fontWeight: '700',
  },
})

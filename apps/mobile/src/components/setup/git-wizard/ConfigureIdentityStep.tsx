import React, { useState, useCallback } from 'react'
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, ActivityIndicator } from 'react-native'
import { useTheme } from '../../../contexts/ThemeContext'
import { spacing, borderRadius } from '@pocketdev/shared/theme'
import { typeStyles } from '../../../theme/typography'
import { useConnectionStore } from '../../../stores/connection'
import { postConfigureGitIdentity } from '../../../services/api'
import { User, Mail, CheckCircle } from 'lucide-react-native'

type WizardAction =
  | { type: 'STEP_COMPLETE'; step: 'configure-identity' }
  | { type: 'STEP_FAILED'; step: 'configure-identity'; error: string }
  | { type: 'SET_IDENTITY'; name: string; email: string }

interface Props {
  dispatch: (action: WizardAction) => void
  initialName: string
  initialEmail: string
}

export default function ConfigureIdentityStep({ dispatch, initialName, initialEmail }: Props) {
  const { colors } = useTheme()
  const server = useConnectionStore((s) => s.server)
  const [name, setName] = useState(initialName)
  const [email, setEmail] = useState(initialEmail)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const nameValid = name.trim().length > 0
  const emailValid = email.trim().includes('@')
  const canSave = nameValid && emailValid && !saving

  const handleSave = useCallback(async () => {
    if (!server || !canSave) return
    setSaving(true)
    setError(null)

    try {
      const result = await postConfigureGitIdentity(server.ip, server.port, name.trim(), email.trim())
      if (result.success) {
        dispatch({ type: 'SET_IDENTITY', name: result.user_name, email: result.user_email })
        dispatch({ type: 'STEP_COMPLETE', step: 'configure-identity' })
      } else {
        setError(result.error ?? 'Configuration failed')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Configuration failed')
    } finally {
      setSaving(false)
    }
  }, [server, canSave, name, email, dispatch])

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer} keyboardShouldPersistTaps="handled">
      <View style={styles.iconRow}>
        <View style={[styles.iconCircle, { backgroundColor: colors.primary + '20' }]}>
          <User color={colors.primary} size={24} strokeWidth={2} />
        </View>
      </View>

      <Text style={[styles.title, { color: colors.text }]}>Git Identity</Text>
      <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
        Set your name and email for git commits. This is how your commits will be attributed.
      </Text>

      {/* Name field */}
      <View style={styles.fieldGroup}>
        <Text style={[styles.label, { color: colors.textSecondary }]}>Name</Text>
        <View style={[styles.inputRow, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <User color={colors.textTertiary} size={16} strokeWidth={2} />
          <TextInput
            style={[styles.input, { color: colors.text }]}
            placeholder="Your Name"
            placeholderTextColor={colors.textTertiary}
            value={name}
            onChangeText={setName}
            autoCapitalize="words"
            autoCorrect={false}
            returnKeyType="next"
          />
        </View>
      </View>

      {/* Email field */}
      <View style={styles.fieldGroup}>
        <Text style={[styles.label, { color: colors.textSecondary }]}>Email</Text>
        <View style={[styles.inputRow, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Mail color={colors.textTertiary} size={16} strokeWidth={2} />
          <TextInput
            style={[styles.input, { color: colors.text }]}
            placeholder="you@example.com"
            placeholderTextColor={colors.textTertiary}
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="email-address"
            returnKeyType="done"
            onSubmitEditing={handleSave}
          />
        </View>
        {email.length > 0 && !emailValid && (
          <Text style={[styles.hint, { color: colors.error }]}>Enter a valid email address</Text>
        )}
      </View>

      {error && (
        <View style={[styles.errorCard, { backgroundColor: colors.errorBackground }]}>
          <Text style={[styles.errorText, { color: colors.error }]}>{error}</Text>
        </View>
      )}

      {/* Save button */}
      <TouchableOpacity
        style={[
          styles.saveButton,
          { backgroundColor: canSave ? colors.primary : colors.border },
        ]}
        onPress={handleSave}
        disabled={!canSave}
        activeOpacity={0.7}
      >
        {saving ? (
          <ActivityIndicator size="small" color={colors.primaryText} />
        ) : (
          <>
            <CheckCircle color={colors.primaryText} size={18} strokeWidth={2.25} />
            <Text style={[styles.saveText, { color: colors.primaryText }]}>Save & Finish</Text>
          </>
        )}
      </TouchableOpacity>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  contentContainer: {
    gap: spacing[3],
    paddingBottom: spacing[6],
  },
  iconRow: {
    alignItems: 'center',
    marginTop: spacing[4],
  },
  iconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    ...typeStyles.screenTitle,
    textAlign: 'center',
  },
  subtitle: {
    ...typeStyles.bodySmall,
    textAlign: 'center',
    paddingHorizontal: spacing[4],
    marginBottom: spacing[2],
  },
  fieldGroup: {
    gap: spacing[1],
  },
  label: {
    ...typeStyles.button,
    marginLeft: spacing[1],
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    borderWidth: 1,
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
  },
  input: {
    flex: 1,
    ...typeStyles.body,
    padding: 0,
  },
  hint: {
    ...typeStyles.meta,
    marginLeft: spacing[1],
  },
  errorCard: {
    padding: spacing[3],
    borderRadius: borderRadius.md,
  },
  errorText: {
    ...typeStyles.bodySmall,
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing[2],
    paddingVertical: spacing[4],
    borderRadius: borderRadius.lg,
    marginTop: spacing[2],
  },
  saveText: {
    ...typeStyles.button,
  },
})

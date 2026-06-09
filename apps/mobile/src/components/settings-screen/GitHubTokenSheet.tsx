import React, { useRef, useState } from 'react'
import {
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native'
import { Sheet, type SheetHandle } from '../ui/Sheet'
import { Key } from 'lucide-react-native'
import { borderRadius, spacing } from '@pocketdev/shared/theme'
import { useTheme } from '../../contexts/ThemeContext'
import { Button } from '../ui/Button'
import { typeStyles } from '../../theme/typography'
import { validateGitHubPAT, saveGitHubPAT, clearGitHubPAT } from '../../services/github'

type Props = {
  hasExistingToken: boolean
  onSave: (username: string) => void
  onRemove: () => void
  onDismiss: () => void
}

export default function GitHubTokenSheet({ hasExistingToken, onSave, onRemove, onDismiss }: Props) {
  const { colors } = useTheme()
  const sheetRef = useRef<SheetHandle>(null)
  const [token, setToken] = useState('')
  const [saving, setSaving] = useState(false)
  const [removing, setRemoving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSave() {
    if (!token.trim()) { setError('Paste your GitHub Personal Access Token above.'); return }
    setSaving(true)
    setError(null)
    try {
      const username = await validateGitHubPAT(token.trim())
      await saveGitHubPAT(token.trim())
      onSave(username)
      sheetRef.current?.dismiss()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to validate token.')
    } finally {
      setSaving(false)
    }
  }

  async function handleRemove() {
    setRemoving(true)
    try {
      await clearGitHubPAT()
      onRemove()
      sheetRef.current?.dismiss()
    } finally {
      setRemoving(false)
    }
  }

  return (
    <Sheet ref={sheetRef} detents={[1]} onDismiss={onDismiss}>
      <View style={[styles.root, { backgroundColor: colors.background }]}>
        <View style={[styles.header, { borderBottomColor: colors.border }]}>
          <Text style={[typeStyles.screenTitle, { color: colors.text }]}>GitHub Token</Text>
          <TouchableOpacity onPress={() => sheetRef.current?.dismiss()} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
            <Text style={[typeStyles.body, { color: colors.textSecondary }]}>Cancel</Text>
          </TouchableOpacity>
        </View>

        <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={styles.body}>
            <Text style={[typeStyles.bodySmall, { color: colors.textSecondary }]}>
              Create a GitHub Personal Access Token with the{' '}
              <Text style={{ color: colors.text }}>Issues: Read & Write</Text> permission, then paste it below. The token is stored securely in your device keychain.
            </Text>

            <View style={styles.fieldGroup}>
              <Text style={[styles.label, { color: colors.textSecondary }]}>Personal Access Token</Text>
              <TextInput
                value={token}
                onChangeText={setToken}
                placeholder="github_pat_..."
                placeholderTextColor={colors.textTertiary}
                style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
                autoCapitalize="none"
                autoCorrect={false}
                secureTextEntry
                autoFocus
              />
            </View>

            {error ? (
              <View style={[styles.errorBanner, { backgroundColor: colors.errorBackground }]}>
                <Text style={[typeStyles.bodySmall, { color: colors.error }]}>{error}</Text>
              </View>
            ) : null}

            <Button leftIcon={Key} loading={saving} onPress={handleSave}>
              Save Token
            </Button>

            {hasExistingToken && (
              <Button variant="danger" loading={removing} onPress={handleRemove}>
                Remove Saved Token
              </Button>
            )}
          </View>
        </KeyboardAvoidingView>
      </View>
    </Sheet>
  )
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  flex: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing[5],
    paddingVertical: spacing[4],
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  body: {
    paddingHorizontal: spacing[5],
    paddingTop: spacing[5],
    gap: spacing[4],
  },
  fieldGroup: {
    gap: spacing[2],
  },
  label: {
    ...typeStyles.button,
  },
  input: {
    borderWidth: 1,
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[3],
    ...typeStyles.mono,
  },
  errorBanner: {
    borderRadius: borderRadius.lg,
    padding: spacing[3],
  },
})

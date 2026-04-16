import React, { useState } from 'react'
import { View, Text, Image, TouchableOpacity, TextInput, ActivityIndicator, Linking, StyleSheet } from 'react-native'
import { Eye, EyeOff, ExternalLink, Check } from 'lucide-react-native'
import { spacing, borderRadius, typographyScale } from '@pocketdev/shared/theme'
import { useTheme } from '../../../contexts/ThemeContext'
import { useConnectionStore } from '../../../stores/connection'
import { postConfigureMinimax } from '../../../services/api'
import { Assets } from '../../../../assets'
import type { MinimaxSetupStatus } from '@pocketdev/shared/types'

type WizardAction =
  | { type: 'STEP_COMPLETE'; step: 'configure'; minimaxStatus?: MinimaxSetupStatus | null }
  | { type: 'STEP_FAILED'; step: 'configure'; error: string }

interface Props {
  dispatch: (action: WizardAction) => void
}

export default function ConfigureStep({ dispatch }: Props) {
  const { colors, isDark } = useTheme()
  const server = useConnectionStore((state) => state.server)
  const [apiKey, setApiKey] = useState('')
  const [showKey, setShowKey] = useState(false)
  const [saving, setSaving] = useState(false)
  const [savedMasked, setSavedMasked] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function handleSave() {
    if (!server || !apiKey.trim()) return
    setSaving(true)
    setError(null)
    try {
      const result = await postConfigureMinimax(server.ip, server.port, apiKey.trim())
      if (result.success) {
        setSavedMasked(result.api_key_masked)
        setTimeout(() => {
          dispatch({ type: 'STEP_COMPLETE', step: 'configure' })
        }, 300)
      } else {
        setError(result.error ?? 'Failed to save API key.')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save API key.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <View style={styles.container}>
      <View style={styles.hero}>
        <Image source={isDark ? Assets.minimaxWhite : Assets.minimaxBlack} style={styles.logo} resizeMode="contain" />
        <Text style={[styles.title, { color: colors.text }]}>Enter your Minimax API key</Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          Your key will be written to the OpenCode config on the workspace. It is sent over PocketDev's authenticated HTTPS channel.
        </Text>
      </View>

      {savedMasked ? (
        <View style={[styles.successCard, { backgroundColor: '#22c55e18', borderColor: '#22c55e40' }]}>
          <Check color="#22c55e" size={16} strokeWidth={2.25} />
          <Text style={[styles.successText, { color: '#22c55e' }]}>Key saved: {savedMasked}</Text>
        </View>
      ) : (
        <>
          <View style={[styles.inputCard, { backgroundColor: colors.surface, borderColor: error ? colors.error : colors.border }]}>
            <TextInput
              style={[styles.input, { color: colors.text }]}
              value={apiKey}
              onChangeText={setApiKey}
              placeholder="sk-mm-..."
              placeholderTextColor={colors.textTertiary}
              secureTextEntry={!showKey}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="ascii-capable"
              returnKeyType="done"
              onSubmitEditing={() => void handleSave()}
            />
            <TouchableOpacity onPress={() => setShowKey((v) => !v)} style={styles.eyeButton} activeOpacity={0.7}>
              {showKey
                ? <EyeOff color={colors.textTertiary} size={18} strokeWidth={2.25} />
                : <Eye color={colors.textTertiary} size={18} strokeWidth={2.25} />
              }
            </TouchableOpacity>
          </View>

          {error ? (
            <Text style={[styles.errorText, { color: colors.error }]}>{error}</Text>
          ) : null}

          <TouchableOpacity
            style={styles.linkRow}
            onPress={() => void Linking.openURL('https://www.minimax.io/platform/user-center/basic-information/interface-key')}
            activeOpacity={0.7}
          >
            <ExternalLink color={colors.textTertiary} size={14} strokeWidth={2.25} />
            <Text style={[styles.linkText, { color: colors.textTertiary }]}>Get API Key at minimax.io</Text>
          </TouchableOpacity>
        </>
      )}

      <TouchableOpacity
        style={[
          styles.saveButton,
          {
            backgroundColor: (!apiKey.trim() || saving || !!savedMasked) ? colors.border : colors.primary,
          },
        ]}
        onPress={() => void handleSave()}
        activeOpacity={0.7}
        disabled={!apiKey.trim() || saving || !!savedMasked}
      >
        {saving ? (
          <>
            <ActivityIndicator color={colors.primaryText} size="small" />
            <Text style={[styles.saveText, { color: colors.primaryText }]}>Saving…</Text>
          </>
        ) : (
          <Text style={[styles.saveText, { color: (!apiKey.trim() || !!savedMasked) ? colors.textTertiary : colors.primaryText }]}>
            Save Key
          </Text>
        )}
      </TouchableOpacity>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, gap: spacing[4], paddingTop: spacing[4] },
  hero: { alignItems: 'center', gap: spacing[2] },
  logo: { width: 42, height: 42 },
  title: { ...typographyScale.xl, fontWeight: '700', textAlign: 'center' },
  subtitle: { ...typographyScale.sm, textAlign: 'center' },
  inputCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
  },
  input: {
    flex: 1,
    ...typographyScale.base,
    fontFamily: 'monospace',
  },
  eyeButton: {
    padding: spacing[1],
  },
  errorText: {
    ...typographyScale.sm,
    marginTop: -spacing[2],
  },
  linkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    alignSelf: 'flex-start',
  },
  linkText: {
    ...typographyScale.sm,
  },
  successCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    borderWidth: 1,
    borderRadius: borderRadius.lg,
    padding: spacing[3],
  },
  successText: {
    ...typographyScale.sm,
    fontFamily: 'monospace',
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing[2],
    paddingVertical: spacing[4],
    borderRadius: borderRadius.lg,
    marginTop: 'auto',
  },
  saveText: { ...typographyScale.base, fontWeight: '600' },
})

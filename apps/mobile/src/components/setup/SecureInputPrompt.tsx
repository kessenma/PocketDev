import React, { useEffect, useState } from 'react'
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Modal,
  KeyboardAvoidingView,
  Platform,
  type TextInputProps,
} from 'react-native'
import { useTheme } from '../../contexts/ThemeContext'
import { spacing, borderRadius } from '@pocketdev/shared/theme'
import { typeStyles } from '../../theme/typography'
import type { SecurePromptKind, SecurePromptMatch } from '../../utils/secure-prompts'

interface Props {
  prompt: SecurePromptMatch | null
  onSubmit: (value: string) => void
  onCancel: () => void
}

function inputPropsFor(kind: SecurePromptKind): TextInputProps {
  switch (kind) {
    case 'password':
      return {
        secureTextEntry: true,
        autoCapitalize: 'none',
        autoCorrect: false,
        autoComplete: 'off',
        importantForAutofill: 'no',
      }
    case 'code':
      return {
        keyboardType: 'number-pad',
        textContentType: 'oneTimeCode',
        autoComplete: 'one-time-code',
        autoCorrect: false,
      }
    case 'text':
    default:
      return {
        keyboardType: 'email-address',
        textContentType: 'emailAddress',
        autoCapitalize: 'none',
        autoCorrect: false,
      }
  }
}

/**
 * Native entry sheet for terminal prompts (Apple Account password, 2FA codes).
 * The value goes straight to the terminal — there's deliberately no "remember" option.
 */
export default function SecureInputPrompt({ prompt, onSubmit, onCancel }: Props) {
  const { colors } = useTheme()
  const [value, setValue] = useState('')

  useEffect(() => {
    setValue(prompt?.defaultValue ?? '')
  }, [prompt])

  function handleSubmit() {
    if (!value.trim()) return
    const toSend = prompt?.kind === 'password' ? value : value.trim()
    setValue('')
    onSubmit(toSend)
  }

  function handleAlternative() {
    if (!prompt?.alternative) return
    setValue('')
    onSubmit(prompt.alternative.value)
  }

  function handleCancel() {
    setValue('')
    onCancel()
  }

  const kind = prompt?.kind ?? 'password'

  return (
    <Modal visible={!!prompt} transparent animationType="fade" onRequestClose={handleCancel}>
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={[styles.dialog, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.title, { color: colors.text }]}>{prompt?.title}</Text>
          {prompt?.message ? (
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>{prompt.message}</Text>
          ) : null}

          <TextInput
            style={[styles.input, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
            value={value}
            onChangeText={setValue}
            placeholder={prompt?.placeholder ?? undefined}
            placeholderTextColor={colors.textTertiary}
            autoFocus
            returnKeyType="done"
            onSubmitEditing={handleSubmit}
            {...inputPropsFor(kind)}
          />

          {prompt?.alternative ? (
            <TouchableOpacity onPress={handleAlternative} activeOpacity={0.7} style={styles.alternative}>
              <Text style={[styles.alternativeText, { color: colors.primary }]}>{prompt.alternative.label}</Text>
            </TouchableOpacity>
          ) : null}

          <View style={styles.buttons}>
            <TouchableOpacity
              style={[styles.button, { backgroundColor: colors.background }]}
              onPress={handleCancel}
              activeOpacity={0.7}
            >
              <Text style={[styles.buttonText, { color: colors.textSecondary }]}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.button, { backgroundColor: value.trim() ? colors.primary : colors.border }]}
              onPress={handleSubmit}
              disabled={!value.trim()}
              activeOpacity={0.7}
            >
              <Text style={[styles.buttonText, { color: colors.primaryText }]}>Send</Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  )
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
    padding: spacing[6],
  },
  dialog: {
    width: '100%',
    borderWidth: 1,
    borderRadius: borderRadius.xl,
    padding: spacing[5],
    gap: spacing[4],
  },
  title: {
    ...typeStyles.heading,
  },
  subtitle: {
    ...typeStyles.bodySmall,
  },
  input: {
    ...typeStyles.body,
    borderWidth: 1,
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
  },
  alternative: {
    alignSelf: 'flex-start',
  },
  alternativeText: {
    ...typeStyles.bodySmall,
    fontWeight: '600',
  },
  buttons: {
    flexDirection: 'row',
    gap: spacing[3],
  },
  button: {
    flex: 1,
    borderRadius: borderRadius.lg,
    paddingVertical: spacing[3],
    alignItems: 'center',
  },
  buttonText: {
    ...typeStyles.button,
  },
})

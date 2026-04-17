import React, { useState } from 'react'
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Switch,
  StyleSheet,
  Modal,
  KeyboardAvoidingView,
  Platform,
} from 'react-native'
import { useTheme } from '../../contexts/ThemeContext'
import { spacing, borderRadius } from '@pocketdev/shared/theme'
import { typeStyles } from '../../theme/typography'

interface Props {
  visible: boolean
  onSubmit: (password: string, remember: boolean) => void
  onCancel: () => void
}

export default function SudoPrompt({ visible, onSubmit, onCancel }: Props) {
  const { colors } = useTheme()
  const [password, setPassword] = useState('')
  const [remember, setRemember] = useState(true)

  function handleSubmit() {
    if (!password) return
    onSubmit(password, remember)
    setPassword('')
  }

  function handleCancel() {
    setPassword('')
    onCancel()
  }

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={handleCancel}>
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={[styles.dialog, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.title, { color: colors.text }]}>sudo password required</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            Enter your server password to continue the installation.
          </Text>

          <TextInput
            style={[styles.input, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
            value={password}
            onChangeText={setPassword}
            placeholder="Password"
            placeholderTextColor={colors.textTertiary}
            secureTextEntry
            autoFocus
            returnKeyType="done"
            onSubmitEditing={handleSubmit}
          />

          <View style={styles.rememberRow}>
            <Text style={[styles.rememberLabel, { color: colors.textSecondary }]}>
              Remember password
            </Text>
            <Switch
              value={remember}
              onValueChange={setRemember}
              trackColor={{ true: colors.primary }}
            />
          </View>

          <View style={styles.buttons}>
            <TouchableOpacity
              style={[styles.button, { backgroundColor: colors.background }]}
              onPress={handleCancel}
              activeOpacity={0.7}
            >
              <Text style={[styles.buttonText, { color: colors.textSecondary }]}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.button, { backgroundColor: password ? colors.primary : colors.border }]}
              onPress={handleSubmit}
              disabled={!password}
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
    ...typeStyles.mono,
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
  rememberRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  rememberLabel: {
    ...typeStyles.bodySmall,
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

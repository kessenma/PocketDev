import React, { useState } from 'react'
import { ActivityIndicator, Platform, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native'
import { borderRadius, spacing } from '@pocketdev/shared/theme'
import { useTheme } from '../../contexts/ThemeContext'
import { typeStyles } from '../../theme/typography'

type Props = {
  placeholder?: string
  onSend: (text: string) => void
  disabled?: boolean
  loading?: boolean
  autoFocus?: boolean
}

export default function BauhausChatInput({
  placeholder = 'Send a follow-up...',
  onSend,
  disabled = false,
  loading = false,
  autoFocus = false,
}: Props) {
  const { colors } = useTheme()
  const [draft, setDraft] = useState('')
  const canSend = draft.trim().length > 0 && !disabled && !loading

  function handleSend() {
    const trimmed = draft.trim()
    if (!trimmed || disabled || loading) return
    onSend(trimmed)
    setDraft('')
  }

  return (
    <View style={[styles.container, { borderTopColor: colors.border, backgroundColor: colors.panel }]}>
      <View style={styles.inputRow}>
        <TextInput
          value={draft}
          onChangeText={setDraft}
          placeholder={placeholder}
          placeholderTextColor={colors.textTertiary}
          editable={!disabled}
          autoFocus={autoFocus}
          multiline
          maxLength={10000}
          style={[
            styles.input,
            {
              backgroundColor: colors.backgroundSecondary,
              borderColor: colors.border,
              color: colors.text,
              maxHeight: 100,
            },
          ]}
          onSubmitEditing={Platform.OS === 'ios' ? undefined : handleSend}
          blurOnSubmit={false}
          returnKeyType="default"
        />
        <TouchableOpacity
          activeOpacity={0.7}
          disabled={!canSend}
          onPress={handleSend}
          style={[
            styles.sendButton,
            { backgroundColor: canSend ? colors.primary : colors.border },
          ]}
        >
          {loading ? (
            <ActivityIndicator size="small" color={colors.primaryText} />
          ) : (
            <Text style={[styles.sendText, { color: colors.primaryText }]}>Send</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    borderTopWidth: 1,
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
  },
  inputRow: {
    flexDirection: 'row',
    gap: spacing[2],
    alignItems: 'flex-end',
  },
  input: {
    ...typeStyles.bodySmall,
    flex: 1,
    minHeight: 40,
    borderWidth: 1,
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
  },
  sendButton: {
    minHeight: 40,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing[4],
  },
  sendText: {
    ...typeStyles.bodySmall,
  },
})

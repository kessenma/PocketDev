import React, { useState } from 'react'
import { ActivityIndicator, Platform, StyleSheet, TextInput, TouchableOpacity, View } from 'react-native'
import { CircleArrowRight, Cpu } from 'lucide-react-native'
import { borderRadius, spacing } from '@pocketdev/shared/theme'
import { useTheme } from '../../contexts/ThemeContext'
import { typeStyles } from '../../theme/typography'

type Props = {
  placeholder?: string
  onSend: (text: string) => void
  disabled?: boolean
  loading?: boolean
  autoFocus?: boolean
  /** Called with current draft text when the find-files button is pressed */
  onFindFiles?: (draft: string) => void
  /** Shows a spinner on the find-files button while searching */
  findFilesActive?: boolean
}

const INPUT_HEIGHT_SINGLE = 40
const INPUT_HEIGHT_EXPANDED = 72

export default function ChatInput({
  placeholder = 'Send a follow-up...',
  onSend,
  disabled = false,
  loading = false,
  autoFocus = false,
  onFindFiles,
  findFilesActive = false,
}: Props) {
  const { colors } = useTheme()
  const [draft, setDraft] = useState('')
  const canSend = draft.trim().length > 0 && !disabled && !loading
  const isExpanded = draft.length > 0

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
              minHeight: isExpanded ? INPUT_HEIGHT_EXPANDED : INPUT_HEIGHT_SINGLE,
              maxHeight: 100,
            },
          ]}
          onSubmitEditing={Platform.OS === 'ios' ? undefined : handleSend}
          blurOnSubmit={false}
          returnKeyType="default"
        />
        <View style={styles.buttonColumn}>
          {isExpanded && onFindFiles ? (
            <TouchableOpacity
              activeOpacity={0.7}
              disabled={findFilesActive}
              onPress={() => onFindFiles(draft)}
              style={styles.findFilesButton}
            >
              {findFilesActive
                ? <ActivityIndicator size="small" color={colors.primary} />
                : <Cpu size={22} color={colors.textSecondary} strokeWidth={2} />}
            </TouchableOpacity>
          ) : null}
          <TouchableOpacity
            activeOpacity={0.7}
            disabled={!canSend}
            onPress={handleSend}
            style={styles.sendButton}
          >
            {loading ? (
              <ActivityIndicator size="small" color={colors.primary} />
            ) : (
              <CircleArrowRight
                size={32}
                color={canSend ? colors.primary : colors.border}
                strokeWidth={1.75}
              />
            )}
          </TouchableOpacity>
        </View>
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
    borderWidth: 1,
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
  },
  buttonColumn: {
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: spacing[1],
    paddingBottom: spacing[1],
  },
  findFilesButton: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendButton: {
    alignItems: 'center',
    justifyContent: 'center',
  },
})

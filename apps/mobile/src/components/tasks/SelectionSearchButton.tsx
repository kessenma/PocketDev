import React from 'react'
import { StyleSheet, Text, TouchableOpacity } from 'react-native'
import { TextCursorInput } from 'lucide-react-native'
import { borderRadius, spacing } from '@pocketdev/shared/theme'
import { useTheme } from '../../contexts/ThemeContext'
import { typeStyles } from '../../theme/typography'

type Props = {
  searching: boolean
  selectedText: string
  onPress: () => void
}

const MAX_PREVIEW = 22

export default function SelectionSearchButton({ searching, selectedText, onPress }: Props) {
  const { colors } = useTheme()
  const preview = selectedText.length > MAX_PREVIEW
    ? selectedText.slice(0, MAX_PREVIEW).trimEnd() + '…'
    : selectedText

  return (
    <TouchableOpacity
      style={[
        styles.button,
        {
          borderColor: colors.accentYellow + '60',
          backgroundColor: colors.accentYellow + '0D',
          opacity: searching ? 0.5 : 1,
        },
      ]}
      onPress={onPress}
      activeOpacity={0.7}
      disabled={searching}
    >
      <TextCursorInput color={colors.accentYellow} size={14} strokeWidth={2.2} />
      <Text style={[styles.label, { color: colors.accentYellow }]} numberOfLines={1}>
        "{preview}"
      </Text>
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[1],
    borderWidth: 2,
    borderStyle: 'dashed',
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[3],
    flexShrink: 1,
  },
  label: {
    ...typeStyles.meta,
    fontWeight: '700',
    flexShrink: 1,
  },
})

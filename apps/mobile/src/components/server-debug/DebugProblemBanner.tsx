import React from 'react'
import { View, Text, TextInput, StyleSheet } from 'react-native'
import { spacing, borderRadius } from '@pocketdev/shared/theme'
import { useTheme } from '../../contexts/ThemeContext'
import { typeStyles } from '../../theme/typography'

interface Props {
  value: string
  onChange: (text: string) => void
}

export default function DebugProblemBanner({ value, onChange }: Props) {
  const { colors } = useTheme()

  return (
    <View style={[styles.container, { backgroundColor: colors.panel, borderColor: colors.border }]}>
      <Text style={[styles.label, { color: colors.textTertiary }]}>What are you debugging?</Text>
      <TextInput
        style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.background }]}
        value={value}
        onChangeText={onChange}
        placeholder="e.g. postgres container won't start, port 5432 not listening..."
        placeholderTextColor={colors.textTertiary}
        multiline
        returnKeyType="done"
        blurOnSubmit
      />
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    gap: spacing[2],
    padding: spacing[3],
    borderRadius: borderRadius.lg,
    borderWidth: 1,
  },
  label: {
    ...typeStyles.meta,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  input: {
    ...typeStyles.body,
    borderWidth: 1,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
    minHeight: 44,
    maxHeight: 88,
  },
})

import React from 'react'
import { Text, TouchableOpacity } from 'react-native'
import { useTheme } from '../../../contexts/ThemeContext'
import { stepStyles as styles } from './styles'

interface Props {
  title: string
  body: string
  selected: boolean
  onPress: () => void
  disabled?: boolean
}

/** Selectable option tile used for "App Store / Apple Developer" and "Create / Use existing key". */
export default function MethodOption({ title, body, selected, onPress, disabled = false }: Props) {
  const { colors } = useTheme()
  return (
    <TouchableOpacity
      style={[
        styles.option,
        {
          backgroundColor: colors.surface,
          borderColor: selected ? colors.primary : colors.border,
          borderWidth: selected ? 2 : 1,
        },
        disabled && styles.disabled,
      ]}
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.7}
      accessibilityRole="radio"
      accessibilityState={{ selected, disabled }}
    >
      <Text style={[styles.optionTitle, { color: selected ? colors.primary : colors.text }]}>{title}</Text>
      <Text style={[styles.optionBody, { color: colors.textSecondary }]}>{body}</Text>
    </TouchableOpacity>
  )
}

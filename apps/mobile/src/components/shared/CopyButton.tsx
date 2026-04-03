import React, { useState } from 'react'
import { TouchableOpacity, Text, StyleSheet, type StyleProp, type ViewStyle } from 'react-native'
import Clipboard from '@react-native-clipboard/clipboard'
import { Copy, Check } from 'lucide-react-native'
import { borderRadius, spacing, typographyScale } from '@pocketdev/shared/theme'
import { useTheme } from '../../contexts/ThemeContext'

interface Props {
  value: string
  label?: string
  style?: StyleProp<ViewStyle>
}

export default function CopyButton({ value, label = 'Copy', style }: Props) {
  const { colors } = useTheme()
  const [copied, setCopied] = useState(false)

  function handleCopy() {
    Clipboard.setString(value)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const accentColor = copied ? '#22c55e' : colors.text

  return (
    <TouchableOpacity
      style={[
        styles.button,
        {
          backgroundColor: copied ? '#22c55e15' : colors.background,
          borderColor: copied ? '#22c55e' : colors.border,
        },
        style,
      ]}
      onPress={handleCopy}
      activeOpacity={0.7}
    >
      {copied ? (
        <Check color="#22c55e" size={16} strokeWidth={2.25} />
      ) : (
        <Copy color={accentColor} size={16} strokeWidth={2.25} />
      )}
      <Text style={[styles.label, { color: copied ? '#22c55e' : colors.text }]}>
        {copied ? 'Copied!' : label}
      </Text>
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing[2],
    borderWidth: 1,
    borderRadius: borderRadius.md,
    paddingVertical: spacing[2],
    paddingHorizontal: spacing[3],
  },
  label: {
    ...typographyScale.sm,
    fontWeight: '600',
  },
})

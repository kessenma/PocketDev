import React from 'react'
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { borderRadius, spacing } from '@pocketdev/shared/theme'
import { useTheme } from '../../contexts/ThemeContext'
import { typeStyles } from '../../theme/typography'

type Option<T extends string> = {
  value: T
  label: string
}

type Props<T extends string> = {
  value: T
  options: readonly Option<T>[]
  onChange: (value: T) => void
}

export default function ServerSegmentedControl<T extends string>({
  value,
  options,
  onChange,
}: Props<T>) {
  const { colors } = useTheme()

  return (
    <View style={[styles.container, { backgroundColor: colors.panelAlt, borderColor: colors.border }]}>
      {options.map((option) => {
        const selected = option.value === value

        return (
          <TouchableOpacity
            key={option.value}
            accessibilityRole="button"
            activeOpacity={0.7}
            onPress={() => onChange(option.value)}
            style={[
              styles.option,
              {
                backgroundColor: selected ? colors.primary : colors.panel,
                borderColor: colors.border,
              },
            ]}
          >
            <Text
              style={[
                styles.label,
                { color: selected ? colors.primaryText : colors.textSecondary },
              ]}
            >
              {option.label}
            </Text>
          </TouchableOpacity>
        )
      })}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    borderRadius: borderRadius.lg,
    padding: spacing[1],
    borderWidth: 2,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[1],
    alignSelf: 'flex-start',
  },
  option: {
    minHeight: 38,
    paddingHorizontal: spacing[3],
    borderRadius: borderRadius.md,
    justifyContent: 'center',
    borderWidth: 1.5,
  },
  label: {
    ...typeStyles.meta,
  },
})

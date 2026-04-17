import React from 'react'
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { borderRadius, spacing } from '@pocketdev/shared/theme'
import { typeStyles } from '../../theme/typography'
import { useTheme } from '../../contexts/ThemeContext'
import type { PlanView } from './model'

type Option = {
  value: PlanView
  label: string
}

type Props = {
  value: PlanView
  options: readonly Option[]
  onChange: (value: PlanView) => void
}

export default function PlanSegmentedControl({ value, options, onChange }: Props) {
  const { colors } = useTheme()

  return (
    <View style={[styles.container, { backgroundColor: colors.backgroundSecondary, borderColor: colors.border }]}>
      {options.map((option) => {
        const selected = option.value === value

        return (
          <TouchableOpacity
            key={option.value}
            activeOpacity={0.7}
            onPress={() => onChange(option.value)}
            style={[
              styles.segment,
              selected && { backgroundColor: colors.surface, borderColor: colors.border },
            ]}
          >
            <Text
              style={[
                styles.segmentLabel,
                { color: selected ? colors.text : colors.textSecondary },
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
    borderWidth: 1,
    borderRadius: borderRadius.full,
    padding: spacing[1],
    flexDirection: 'row',
    gap: spacing[1],
  },
  segment: {
    flex: 1,
    minHeight: 40,
    borderRadius: borderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing[3],
    borderWidth: 1,
    borderColor: 'transparent',
  },
  segmentLabel: {
    ...typeStyles.button,
  },
})

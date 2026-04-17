import React from 'react'
import { ScrollView, StyleSheet, Text, TouchableOpacity } from 'react-native'
import { borderRadius, spacing } from '@pocketdev/shared/theme'
import { useTheme } from '../../contexts/ThemeContext'
import type { ScriptPackageInfo } from '@pocketdev/shared/types'
import { typeStyles } from '../../theme/typography'

type Props = {
  packages: ScriptPackageInfo[]
  selectedIndex: number
  onSelect: (index: number) => void
}

export default function PackageSelector({ packages, selectedIndex, onSelect }: Props) {
  const { colors } = useTheme()

  if (packages.length <= 1) return null

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.container}
    >
      {packages.map((pkg, index) => {
        const isSelected = index === selectedIndex
        return (
          <TouchableOpacity
            key={pkg.path}
            activeOpacity={0.7}
            onPress={() => onSelect(index)}
            style={[
              styles.chip,
              {
                backgroundColor: isSelected ? colors.primary : colors.backgroundSecondary,
                borderColor: isSelected ? colors.primary : colors.border,
              },
            ]}
          >
            <Text
              style={[
                styles.chipText,
                { color: isSelected ? colors.primaryText : colors.textSecondary },
              ]}
              numberOfLines={1}
            >
              {pkg.name}
            </Text>
            {pkg.path !== '.' && (
              <Text
                style={[
                  styles.chipPath,
                  { color: isSelected ? colors.primaryText : colors.textTertiary },
                ]}
                numberOfLines={1}
              >
                {pkg.path}
              </Text>
            )}
          </TouchableOpacity>
        )
      })}
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: {
    gap: spacing[2],
    paddingVertical: spacing[1],
  },
  chip: {
    borderRadius: borderRadius.full,
    borderWidth: 1,
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[1],
  },
  chipText: {
    ...typeStyles.bodySmall,
  },
  chipPath: {
    ...typeStyles.meta,
  },
})

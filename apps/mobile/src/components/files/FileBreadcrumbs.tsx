import React from 'react'
import { StyleSheet, Text, View } from 'react-native'
import { spacing, typographyScale } from '@pocketdev/shared/theme'
import { useTheme } from '../../contexts/ThemeContext'

type Props = {
  path: string
}

export default function FileBreadcrumbs({ path }: Props) {
  const { colors } = useTheme()
  const segments = path.split('/').filter(Boolean)

  return (
    <View style={styles.container}>
      {segments.map((segment, index) => (
        <React.Fragment key={`${segment}-${index}`}>
          {index > 0 ? (
            <Text style={[styles.separator, { color: colors.textTertiary }]}>/</Text>
          ) : null}
          <Text
            numberOfLines={1}
            style={[
              styles.segment,
              { color: index === segments.length - 1 ? colors.text : colors.textSecondary },
            ]}
          >
            {segment}
          </Text>
        </React.Fragment>
      ))}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: spacing[1],
  },
  separator: {
    ...typographyScale.sm,
  },
  segment: {
    ...typographyScale.sm,
    fontWeight: '600',
    flexShrink: 1,
  },
})

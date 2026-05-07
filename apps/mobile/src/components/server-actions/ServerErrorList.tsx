import React from 'react'
import { StyleSheet, Text, View } from 'react-native'
import { borderRadius, spacing } from '@pocketdev/shared/theme'
import { useTheme } from '../../contexts/ThemeContext'
import { typeStyles } from '../../theme/typography'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/Card'
import type { ServerErrorEntry } from './model'

type Props = {
  errors: ServerErrorEntry[]
}

const SEVERITY_COLORS: Record<ServerErrorEntry['severity'], string> = {
  critical: '#dc2626',
  warning: '#d97706',
  info: '#2563eb',
}

export default function ServerErrorList({ errors }: Props) {
  const { colors } = useTheme()

  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent server errors</CardTitle>
        <CardDescription>
          Shape the mobile debugging flow around the failures you actually need to inspect first.
        </CardDescription>
      </CardHeader>

      <CardContent>
        {errors.map((error) => (
          <View
            key={error.id}
            style={[styles.row, { backgroundColor: colors.backgroundSecondary }]}
          >
            <View style={styles.headerRow}>
              <View style={styles.titleWrap}>
                <View
                  style={[
                    styles.severityDot,
                    { backgroundColor: SEVERITY_COLORS[error.severity] },
                  ]}
                />
                <Text style={[styles.title, { color: colors.text }]}>{error.title}</Text>
              </View>
              <Text style={[styles.meta, { color: colors.textTertiary }]}>
                {error.relativeTime}
              </Text>
            </View>
            <Text style={[styles.source, { color: colors.textSecondary }]}>
              {error.source}
            </Text>
            <Text style={[styles.detail, { color: colors.textSecondary }]}>{error.detail}</Text>
            <Text style={[styles.suggestion, { color: colors.text }]}>
              {error.suggestion}
            </Text>
          </View>
        ))}
      </CardContent>
    </Card>
  )
}

const styles = StyleSheet.create({
  row: {
    borderRadius: borderRadius.lg,
    padding: spacing[3],
    gap: spacing[2],
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing[2],
    alignItems: 'flex-start',
  },
  titleWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    flex: 1,
  },
  severityDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginTop: 4,
  },
  title: {
    ...typeStyles.bodyBold,
    flex: 1,
  },
  meta: {
    ...typeStyles.sectionTitle,
  },
  source: {
    ...typeStyles.bodySmall,
  },
  detail: {
    ...typeStyles.bodySmall,
  },
  suggestion: {
    ...typeStyles.bodySmall,
  },
})

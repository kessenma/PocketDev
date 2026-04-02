import React from 'react'
import { StyleSheet, Text, View } from 'react-native'
import { borderRadius, spacing, typographyScale } from '@pocketdev/shared/theme'
import { useTheme } from '../../contexts/ThemeContext'
import {
  ServerCard,
  ServerCardContent,
  ServerCardDescription,
  ServerCardHeader,
  ServerCardTitle,
} from './ServerCard'
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
    <ServerCard>
      <ServerCardHeader>
        <ServerCardTitle>Recent server errors</ServerCardTitle>
        <ServerCardDescription>
          Shape the mobile debugging flow around the failures you actually need to inspect first.
        </ServerCardDescription>
      </ServerCardHeader>

      <ServerCardContent>
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
      </ServerCardContent>
    </ServerCard>
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
    ...typographyScale.base,
    fontWeight: '700',
    flex: 1,
  },
  meta: {
    ...typographyScale.xs,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  source: {
    ...typographyScale.sm,
    fontWeight: '600',
  },
  detail: {
    ...typographyScale.sm,
  },
  suggestion: {
    ...typographyScale.sm,
    fontWeight: '600',
  },
})

import React from 'react'
import { StyleSheet, Text, View } from 'react-native'
import { borderRadius, spacing } from '@pocketdev/shared/theme'
import { useTheme } from '../../contexts/ThemeContext'
import { typeStyles } from '../../theme/typography'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/Card'
import type { ServerPortEntry } from './model'

type Props = {
  ports: ServerPortEntry[]
}

const STATUS_COLORS: Record<ServerPortEntry['status'], string> = {
  listening: '#16a34a',
  busy: '#d97706',
  closed: '#64748b',
}

export default function ServerPortList({ ports }: Props) {
  const { colors } = useTheme()

  return (
    <Card>
      <CardHeader>
        <CardTitle>Workspace activity</CardTitle>
        <CardDescription>
          A quick view of active services and traffic-facing processes tied to the current workspace.
        </CardDescription>
      </CardHeader>

      <CardContent>
        {ports.map((entry) => (
          <View
            key={entry.id}
            style={[styles.row, { backgroundColor: colors.backgroundSecondary }]}
          >
            <View style={styles.primary}>
              <View style={styles.portRow}>
                <Text style={[styles.portText, { color: colors.text }]}>
                  {entry.port}/{entry.protocol}
                </Text>
                <View
                  style={[
                    styles.statusPill,
                    { backgroundColor: STATUS_COLORS[entry.status] + '20' },
                  ]}
                >
                  <Text
                    style={[
                      styles.statusText,
                      { color: STATUS_COLORS[entry.status] },
                    ]}
                  >
                    {entry.status}
                  </Text>
                </View>
              </View>
              <Text style={[styles.service, { color: colors.text }]}>{entry.service}</Text>
              <Text style={[styles.process, { color: colors.textSecondary }]}>
                {entry.process}
              </Text>
            </View>

            <View style={styles.secondary}>
              <Text style={[styles.exposure, { color: colors.textTertiary }]}>
                {entry.exposure}
              </Text>
            </View>
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing[3],
  },
  primary: {
    flex: 1,
    gap: spacing[1],
  },
  secondary: {
    justifyContent: 'center',
  },
  portRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    flexWrap: 'wrap',
  },
  portText: {
    ...typeStyles.bodyBold,
  },
  statusPill: {
    borderRadius: borderRadius.full,
    paddingHorizontal: spacing[2],
    paddingVertical: spacing[1],
  },
  statusText: {
    ...typeStyles.sectionTitle,
  },
  service: {
    ...typeStyles.bodySmall,
  },
  process: {
    ...typeStyles.bodySmall,
  },
  exposure: {
    ...typeStyles.sectionTitle,
  },
})

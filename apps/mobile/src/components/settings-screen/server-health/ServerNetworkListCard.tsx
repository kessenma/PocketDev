import React from 'react'
import { StyleSheet, Text, View } from 'react-native'
import { Globe } from 'lucide-react-native'
import { borderRadius, spacing } from '@pocketdev/shared/theme'
import { useTheme } from '../../../contexts/ThemeContext'
import { typeStyles } from '../../../theme/typography'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../ui/Card'
import type { ServerNetworkEntry } from '../../server-actions/model'

type Props = {
  entries: ServerNetworkEntry[]
}

export default function ServerNetworkListCard({ entries }: Props) {
  const { colors } = useTheme()

  return (
    <Card accentColor={colors.bracketAccent}>
      <CardHeader>
        <CardTitle icon={<Globe size={16} color={colors.textSecondary} strokeWidth={2} />}>
          Network activity
        </CardTitle>
        <CardDescription>
          Keep current throughput, interface pressure, and active connection counts visible in one place.
        </CardDescription>
      </CardHeader>

      <CardContent>
        {entries.map((entry) => (
          <View
            key={entry.id}
            style={[styles.row, { backgroundColor: colors.backgroundSecondary }]}
          >
            <View style={styles.headerRow}>
              <Text style={[styles.interfaceName, { color: colors.text }]}>
                {entry.interface}
              </Text>
              <Text style={[styles.connections, { color: colors.textSecondary }]}>
                {entry.connections} active
              </Text>
            </View>
            <View style={styles.metricsRow}>
              <Text style={[styles.metric, { color: colors.text }]}>In {entry.inbound}</Text>
              <Text style={[styles.metric, { color: colors.text }]}>Out {entry.outbound}</Text>
            </View>
            <Text style={[styles.detail, { color: colors.textSecondary }]}>{entry.detail}</Text>
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
    alignItems: 'center',
    gap: spacing[2],
  },
  interfaceName: {
    ...typeStyles.bodyBold,
  },
  connections: {
    ...typeStyles.bodySmall,
  },
  metricsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing[3],
  },
  metric: {
    ...typeStyles.bodySmall,
  },
  detail: {
    ...typeStyles.bodySmall,
  },
})

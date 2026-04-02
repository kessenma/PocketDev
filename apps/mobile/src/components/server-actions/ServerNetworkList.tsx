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
import type { ServerNetworkEntry } from './model'

type Props = {
  entries: ServerNetworkEntry[]
}

export default function ServerNetworkList({ entries }: Props) {
  const { colors } = useTheme()

  return (
    <ServerCard>
      <ServerCardHeader>
        <ServerCardTitle>Network activity</ServerCardTitle>
        <ServerCardDescription>
          Keep current throughput, interface pressure, and active connection counts visible in one place.
        </ServerCardDescription>
      </ServerCardHeader>

      <ServerCardContent>
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
    alignItems: 'center',
    gap: spacing[2],
  },
  interfaceName: {
    ...typographyScale.base,
    fontWeight: '700',
  },
  connections: {
    ...typographyScale.sm,
  },
  metricsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing[3],
  },
  metric: {
    ...typographyScale.sm,
    fontWeight: '600',
  },
  detail: {
    ...typographyScale.sm,
  },
})

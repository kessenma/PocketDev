import React from 'react'
import { View, Text, StyleSheet } from 'react-native'
import { MapPin, MonitorSmartphone, Wifi } from 'lucide-react-native'
import { spacing } from '@pocketdev/shared/theme'
import { useTheme } from '../../contexts/ThemeContext'
import { Card, CardTitle } from '../ui/Card'
import Badge from '../ui/Badge'
import { typeStyles } from '../../theme/typography'
import type { StoredServer } from '../../services/storage'

type Props = {
  server: StoredServer | null
  status: string
}

export default function ConnectionCard({ server, status }: Props) {
  const { colors } = useTheme()

  const statusColor =
    status === 'connected'
      ? colors.accentGreen
      : status === 'connecting'
        ? colors.warning
        : colors.accentRed

  return (
    <Card style={styles.card} accentColor={colors.bracketAccent}>
      <CardTitle>Connection</CardTitle>

      <View style={styles.row}>
        <View style={styles.labelRow}>
          <Wifi size={14} color={colors.textSecondary} strokeWidth={2} />
          <Text style={[styles.label, { color: colors.textSecondary }]}>Status</Text>
        </View>
        <Badge label={status} color={statusColor} />
      </View>

      {server ? (
        <>
          <View style={styles.row}>
            <View style={styles.labelRow}>
              <MapPin size={14} color={colors.textSecondary} strokeWidth={2} />
              <Text style={[styles.label, { color: colors.textSecondary }]}>Paired Host</Text>
            </View>
            <Text style={[styles.value, { color: colors.text }]}>
              {server.ip}:{server.port}
            </Text>
          </View>

          <View style={styles.row}>
            <View style={styles.labelRow}>
              <MonitorSmartphone size={14} color={colors.textSecondary} strokeWidth={2} />
              <Text style={[styles.label, { color: colors.textSecondary }]}>Pairing ID</Text>
            </View>
            <Text style={[styles.value, { color: colors.text }]} numberOfLines={1}>
              {server.deviceId}
            </Text>
          </View>
        </>
      ) : null}
    </Card>
  )
}

const styles = StyleSheet.create({
  card: {
    gap: spacing[3],
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[1],
  },
  label: {
    ...typeStyles.bodySmall,
  },
  value: {
    ...typeStyles.bodyStrong,
    flexShrink: 1,
    textAlign: 'right',
  },
})

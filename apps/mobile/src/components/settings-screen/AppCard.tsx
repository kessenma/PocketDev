import React from 'react'
import { View, Text, StyleSheet } from 'react-native'
import { Server, Smartphone, Unlink } from 'lucide-react-native'
import { spacing } from '@pocketdev/shared/theme'
import { useTheme } from '../../contexts/ThemeContext'
import { Card, CardTitle } from '../ui/Card'
import { Button } from '../ui/Button'
import { typeStyles } from '../../theme/typography'

type Props = {
  mobileVersion: string
  agentVersion: string | null
  onUnpair: () => void
}

export default function AppCard({ mobileVersion, agentVersion, onUnpair }: Props) {
  const { colors } = useTheme()

  return (
    <Card style={styles.card} accentColor={colors.bracketAccent}>
      <CardTitle>App</CardTitle>

      <View style={styles.row}>
        <View style={styles.labelRow}>
          <Smartphone size={14} color={colors.textSecondary} strokeWidth={2} />
          <Text style={[styles.label, { color: colors.textSecondary }]}>Mobile Version</Text>
        </View>
        <Text style={[styles.value, { color: colors.text }]}>{mobileVersion}</Text>
      </View>

      {agentVersion && (
        <View style={styles.row}>
          <View style={styles.labelRow}>
            <Server size={14} color={colors.textSecondary} strokeWidth={2} />
            <Text style={[styles.label, { color: colors.textSecondary }]}>Agent Version</Text>
          </View>
          <Text style={[styles.value, { color: colors.text }]}>v{agentVersion}</Text>
        </View>
      )}

      <Button variant="danger" leftIcon={Unlink} onPress={onUnpair}>
        Remove Pairing
      </Button>
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

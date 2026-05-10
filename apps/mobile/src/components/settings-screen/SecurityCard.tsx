import React from 'react'
import { View, Text, StyleSheet } from 'react-native'
import { Lock, ShieldAlert, ShieldCheck } from 'lucide-react-native'
import { spacing } from '@pocketdev/shared/theme'
import { useTheme } from '../../contexts/ThemeContext'
import { Card, CardTitle } from '../ui/Card'
import { Button } from '../ui/Button'
import Badge from '../ui/Badge'
import { typeStyles } from '../../theme/typography'

type Props = {
  serverLocked: boolean
  lockLoading: boolean
  onLock: () => void
}

export default function SecurityCard({ serverLocked, lockLoading, onLock }: Props) {
  const { colors } = useTheme()

  return (
    <Card style={styles.card} accentColor={colors.bracketAccent}>
      <CardTitle>Security</CardTitle>

      <View style={styles.row}>
        <View style={styles.labelRow}>
          {serverLocked
            ? <ShieldCheck size={14} color={colors.textSecondary} strokeWidth={2} />
            : <ShieldAlert size={14} color={colors.textSecondary} strokeWidth={2} />
          }
          <Text style={[styles.label, { color: colors.textSecondary }]}>Server Port</Text>
        </View>
        <Badge
          label={serverLocked ? 'Locked' : 'Open'}
          color={serverLocked ? colors.accentRed : colors.accentGreen}
        />
      </View>

      {!serverLocked && (
        <Button variant="danger" leftIcon={Lock} onPress={onLock} loading={lockLoading}>
          Lock Server Port
        </Button>
      )}
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
})

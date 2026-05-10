import React from 'react'
import { View, Text, StyleSheet } from 'react-native'
import { Trash2, TriangleAlert } from 'lucide-react-native'
import { spacing } from '@pocketdev/shared/theme'
import { useTheme } from '../../contexts/ThemeContext'
import { Card, CardTitle } from '../ui/Card'
import { Button } from '../ui/Button'
import { typeStyles } from '../../theme/typography'

type Props = {
  onUninstall: () => void
}

export default function DangerZoneCard({ onUninstall }: Props) {
  const { colors } = useTheme()

  return (
    <Card style={styles.card} accentColor={colors.bracketAccent}>
      <CardTitle>Danger Zone</CardTitle>
      <View style={styles.descriptionRow}>
        <TriangleAlert size={14} color={colors.accentRed} strokeWidth={2} />
        <Text style={[styles.description, { color: colors.textSecondary }]}>
          Fully remove PocketDev from the paired server. Deletes the agent, data, and systemd units.
        </Text>
      </View>
      <Button variant="danger" leftIcon={Trash2} onPress={onUninstall}>
        Uninstall PocketDev
      </Button>
    </Card>
  )
}

const styles = StyleSheet.create({
  card: {
    gap: spacing[3],
  },
  descriptionRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing[2],
  },
  description: {
    ...typeStyles.bodySmall,
    flex: 1,
  },
})

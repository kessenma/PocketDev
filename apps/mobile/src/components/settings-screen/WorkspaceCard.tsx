import React from 'react'
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native'
import { Bug, ClipboardList, Layers, Terminal, Wrench } from 'lucide-react-native'
import { spacing } from '@pocketdev/shared/theme'
import { useTheme } from '../../contexts/ThemeContext'
import { Card, CardTitle } from '../ui/Card'
import { Button } from '../ui/Button'
import { typeStyles } from '../../theme/typography'
import type { StoredServer } from '../../services/storage'

type Props = {
  server: StoredServer | null
  onWorkspaceTools: () => void
  onServerConsole: () => void
  onServerDebug: () => void
  onOpenContainers: () => void
  onOpenPlans: () => void
}

export default function WorkspaceCard({
  server,
  onWorkspaceTools,
  onServerConsole,
  onServerDebug,
  onOpenContainers,
  onOpenPlans,
}: Props) {
  const { colors } = useTheme()

  return (
    <Card style={styles.card} accentColor={colors.bracketAccent}>
      <CardTitle>Workspace</CardTitle>

      <Button leftIcon={Wrench} onPress={onWorkspaceTools}>
        Workspace Tools
      </Button>

      {server && (
        <Button leftIcon={Terminal} onPress={onServerConsole}>
          Server Console
        </Button>
      )}

      {server && (
        <Button leftIcon={Bug} onPress={onServerDebug}>
          Server Debug
        </Button>
      )}

      <View style={styles.row}>
        <View style={styles.labelRow}>
          <Layers size={14} color={colors.textSecondary} strokeWidth={2} />
          <Text style={[styles.label, { color: colors.textSecondary }]}>Services</Text>
        </View>
        <TouchableOpacity onPress={onOpenContainers} activeOpacity={0.7}>
          <Text style={[styles.link, { color: colors.primary }]}>Open</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.row}>
        <View style={styles.labelRow}>
          <ClipboardList size={14} color={colors.textSecondary} strokeWidth={2} />
          <Text style={[styles.label, { color: colors.textSecondary }]}>Plans</Text>
        </View>
        <TouchableOpacity onPress={onOpenPlans} activeOpacity={0.7}>
          <Text style={[styles.link, { color: colors.primary }]}>Review</Text>
        </TouchableOpacity>
      </View>
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
  link: {
    ...typeStyles.bodyStrong,
  },
})

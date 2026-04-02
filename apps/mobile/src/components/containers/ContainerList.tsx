import React from 'react'
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { borderRadius, spacing, typographyScale } from '@pocketdev/shared/theme'
import { useTheme } from '../../contexts/ThemeContext'
import ContainerBadge from './ContainerBadge'
import {
  ContainerCard,
  ContainerCardContent,
  ContainerCardDescription,
  ContainerCardHeader,
  ContainerCardTitle,
} from './ContainerCard'
import type { ContainerSummary } from './model'

type Props = {
  containers: ContainerSummary[]
  selectedContainerId: string | null
  onSelect: (containerId: string) => void
}

export default function ContainerList({ containers, selectedContainerId, onSelect }: Props) {
  const { colors } = useTheme()

  return (
    <ContainerCard>
      <ContainerCardHeader>
        <ContainerCardTitle>Containers</ContainerCardTitle>
        <ContainerCardDescription>Choose any running, stopped, or looping container to inspect logs.</ContainerCardDescription>
      </ContainerCardHeader>

      <ContainerCardContent>
        {containers.length > 0 ? (
          containers.map((container) => {
            const selected = container.id === selectedContainerId
            const primaryPort = container.ports[0] ?? 'no published ports'

            return (
              <TouchableOpacity
                key={container.id}
                activeOpacity={0.7}
                onPress={() => onSelect(container.id)}
                style={[
                  styles.row,
                  {
                    backgroundColor: selected ? colors.primary + '12' : colors.backgroundSecondary,
                    borderColor: selected ? colors.primary : 'transparent',
                  },
                ]}
              >
                <View style={styles.rowHeader}>
                  <View style={styles.titleBlock}>
                    <Text style={[styles.name, { color: colors.text }]} numberOfLines={1}>
                      {container.name}
                    </Text>
                    <Text style={[styles.image, { color: colors.textSecondary }]} numberOfLines={1}>
                      {container.image}
                    </Text>
                  </View>
                  <ContainerBadge variant={badgeVariant(container.state)}>{container.state}</ContainerBadge>
                </View>

                <Text style={[styles.meta, { color: colors.textSecondary }]} numberOfLines={1}>
                  {primaryPort}
                </Text>

                <Text style={[styles.statusText, { color: colors.textTertiary }]} numberOfLines={2}>
                  {container.status_text}
                </Text>
              </TouchableOpacity>
            )
          })
        ) : (
          <View style={[styles.emptyState, { backgroundColor: colors.backgroundSecondary }]}>
            <Text style={[styles.emptyTitle, { color: colors.text }]}>No containers found</Text>
            <Text style={[styles.emptyBody, { color: colors.textSecondary }]}>This server is not running any Docker containers yet.</Text>
          </View>
        )}
      </ContainerCardContent>
    </ContainerCard>
  )
}

function badgeVariant(state: ContainerSummary['state']) {
  switch (state) {
    case 'running':
      return 'success'
    case 'restarting':
      return 'warning'
    case 'paused':
      return 'primary'
    case 'exited':
    case 'dead':
      return 'error'
    default:
      return 'outline'
  }
}

const styles = StyleSheet.create({
  row: {
    borderWidth: 1,
    borderRadius: borderRadius.lg,
    padding: spacing[3],
    gap: spacing[2],
  },
  rowHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing[2],
  },
  titleBlock: {
    flex: 1,
    gap: spacing[1],
  },
  name: {
    ...typographyScale.sm,
    fontWeight: '700',
  },
  image: {
    ...typographyScale.sm,
  },
  meta: {
    ...typographyScale.sm,
    fontWeight: '600',
  },
  statusText: {
    ...typographyScale.xs,
    textTransform: 'none',
  },
  emptyState: {
    borderRadius: borderRadius.lg,
    padding: spacing[4],
    gap: spacing[2],
  },
  emptyTitle: {
    ...typographyScale.base,
    fontWeight: '700',
  },
  emptyBody: {
    ...typographyScale.sm,
  },
})
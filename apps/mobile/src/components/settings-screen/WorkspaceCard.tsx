import React from 'react'
import { StyleSheet } from 'react-native'
import { Box, Bug, Terminal, Wrench } from 'lucide-react-native'
import { spacing } from '@pocketdev/shared/theme'
import { useTheme } from '../../contexts/ThemeContext'
import { Card, CardTitle } from '../ui/Card'
import { Button } from '../ui/Button'
import Tooltip from '../ui/Tooltip'
import type { StoredServer } from '../../services/storage'
import type { DockerStatus } from '../../services/api'

type Props = {
  server: StoredServer | null
  dockerStatus: DockerStatus | null
  onWorkspaceTools: () => void
  onServerConsole: () => void
  onServerDebug: () => void
  onOpenContainers: () => void
}

export default function WorkspaceCard({
  server,
  dockerStatus,
  onWorkspaceTools,
  onServerConsole,
  onServerDebug,
  onOpenContainers,
}: Props) {
  const { colors } = useTheme()
  const hasContainers = dockerStatus !== null && dockerStatus.available && dockerStatus.total > 0

  const dockerTooltipLabel = dockerStatus === null
    ? 'Checking for Docker containers…'
    : !dockerStatus.available
      ? 'Docker is not available on this server.'
      : 'No Docker containers found on this server.'

  const dockerButton = (
    <Button
      leftIcon={Box}
      disabled={!hasContainers}
      onPress={hasContainers ? onOpenContainers : undefined}
    >
      Docker Containers
    </Button>
  )

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

      {server && (
        hasContainers
          ? dockerButton
          : <Tooltip label={dockerTooltipLabel} direction="top">{dockerButton}</Tooltip>
      )}
    </Card>
  )
}

const styles = StyleSheet.create({
  card: {
    gap: spacing[3],
  },
})

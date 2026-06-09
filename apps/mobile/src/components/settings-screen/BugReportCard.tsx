import React, { useState, useEffect } from 'react'
import { View, Text, StyleSheet } from 'react-native'
import { Bug, Key, Server } from 'lucide-react-native'
import { spacing } from '@pocketdev/shared/theme'
import { useTheme } from '../../contexts/ThemeContext'
import { Card, CardTitle } from '../ui/Card'
import { Button } from '../ui/Button'
import Badge from '../ui/Badge'
import Tooltip from '../ui/Tooltip'
import { typeStyles } from '../../theme/typography'
import { fetchGitSetupStatus } from '../../services/api'
import { getGitHubPAT } from '../../services/github'
import type { StoredServer } from '../../services/storage'
import type { GitSetupStatus } from '@pocketdev/shared/types'
import GitHubTokenSheet from './GitHubTokenSheet'
import BugReportSheet from './BugReportSheet'

type Props = {
  mobileVersion: string
  agentVersion: string | null
  server: StoredServer | null
  status: string
}

export default function BugReportCard({ mobileVersion, agentVersion, server, status }: Props) {
  const { colors } = useTheme()
  const [gitStatus, setGitStatus] = useState<GitSetupStatus | null>(null)
  const [hasDevicePAT, setHasDevicePAT] = useState(false)
  const [patUsername, setPatUsername] = useState<string | null>(null)
  const [tokenSheetOpen, setTokenSheetOpen] = useState(false)
  const [reportSheetOpen, setReportSheetOpen] = useState(false)

  const canReportViaServer =
    status === 'connected' &&
    !!gitStatus?.gh_cli_authenticated &&
    !!gitStatus?.private_repo_access

  const canReport = canReportViaServer || hasDevicePAT

  const disabledTooltip = server
    ? 'GitHub CLI is not authenticated on your server. Configure it in Workspace Tools, or add a personal access token below.'
    : 'Connect to a server with GitHub auth configured, or add a personal access token below.'

  useEffect(() => {
    getGitHubPAT().then((pat) => setHasDevicePAT(!!pat)).catch(() => {})
  }, [])

  useEffect(() => {
    if (!server || status !== 'connected') return
    fetchGitSetupStatus(server.ip, server.port)
      .then(setGitStatus)
      .catch(() => {})
  }, [server, status])

  const reportButton = (
    <Button
      leftIcon={Bug}
      disabled={!canReport}
      onPress={canReport ? () => setReportSheetOpen(true) : undefined}
    >
      Report a Bug
    </Button>
  )

  return (
    <>
      <Card style={styles.card} accentColor={colors.bracketAccent}>
        <CardTitle>Bug Report</CardTitle>

        {canReportViaServer && (
          <View style={styles.row}>
            <View style={styles.labelRow}>
              <Server size={14} color={colors.textSecondary} strokeWidth={2} />
              <Text style={[styles.label, { color: colors.textSecondary }]}>Reporting via</Text>
            </View>
            <Badge label="Server GitHub CLI" color={colors.accentGreen} />
          </View>
        )}

        {!canReportViaServer && (
          <View style={styles.row}>
            <View style={styles.labelRow}>
              <Key size={14} color={colors.textSecondary} strokeWidth={2} />
              <Text style={[styles.label, { color: colors.textSecondary }]}>Device token</Text>
            </View>
            {hasDevicePAT ? (
              <Badge
                label={patUsername ? `@${patUsername}` : 'Configured'}
                color={colors.accentGreen}
              />
            ) : (
              <Badge label="Not configured" color={colors.textTertiary} />
            )}
          </View>
        )}

        {!canReportViaServer && (
          <Button variant="secondary" leftIcon={Key} onPress={() => setTokenSheetOpen(true)}>
            {hasDevicePAT ? 'Change Token' : 'Configure Token'}
          </Button>
        )}

        {canReport
          ? reportButton
          : <Tooltip label={disabledTooltip} direction="top">{reportButton}</Tooltip>
        }
      </Card>

      {tokenSheetOpen && (
        <GitHubTokenSheet
          hasExistingToken={hasDevicePAT}
          onSave={(username) => {
            setHasDevicePAT(true)
            setPatUsername(username)
          }}
          onRemove={() => {
            setHasDevicePAT(false)
            setPatUsername(null)
          }}
          onDismiss={() => setTokenSheetOpen(false)}
        />
      )}

      {reportSheetOpen && (
        <BugReportSheet
          mobileVersion={mobileVersion}
          agentVersion={agentVersion}
          server={server}
          status={status}
          canReportViaServer={canReportViaServer}
          onDismiss={() => setReportSheetOpen(false)}
        />
      )}
    </>
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

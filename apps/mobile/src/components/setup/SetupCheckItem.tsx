import React from 'react'
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native'
import { useTheme } from '../../contexts/ThemeContext'
import { spacing, borderRadius, typographyScale } from '@pocketdev/shared/theme'
import type { ToolCheck } from '@pocketdev/shared/types'

interface Props {
  tool: ToolCheck
  onInstall: (tool: ToolCheck) => void
  onAuthenticate: (tool: ToolCheck) => void
  onGitWizard?: (tool: ToolCheck) => void
  onClaudeWizard?: (tool: ToolCheck) => void
  onCodexWizard?: (tool: ToolCheck) => void
}

function StatusIcon({ tool }: { tool: ToolCheck }) {
  const { colors } = useTheme()

  if (tool.status === 'installed' && tool.auth_status === 'authenticated') {
    return <Text style={styles.icon}>✓</Text>
  }
  if (tool.status === 'installed' && tool.auth_status === 'unauthenticated') {
    return <Text style={[styles.icon, { color: '#facc15' }]}>!</Text>
  }
  if (tool.status === 'misconfigured') {
    return <Text style={[styles.icon, { color: '#facc15' }]}>!</Text>
  }
  if (tool.status === 'installed') {
    return <Text style={styles.icon}>✓</Text>
  }
  return <Text style={[styles.icon, { color: colors.error }]}>✗</Text>
}

function statusLabel(tool: ToolCheck): string {
  if (tool.status === 'missing') return 'Not installed'
  if (tool.status === 'misconfigured') return 'Needs configuration'
  if (tool.auth_status === 'unauthenticated') return 'Installed, not authenticated'
  if (tool.auth_status === 'authenticated') return 'Installed & authenticated'
  return tool.version ? `v${tool.version}` : 'Installed'
}

function statusColor(tool: ToolCheck): string {
  if (tool.status === 'missing') return '#ef4444'
  if (tool.status === 'misconfigured' || tool.auth_status === 'unauthenticated') return '#facc15'
  return '#22c55e'
}

export default function SetupCheckItem({ tool, onInstall, onAuthenticate, onGitWizard, onClaudeWizard, onCodexWizard }: Props) {
  const { colors } = useTheme()

  // Git gets a dedicated wizard instead of generic install/configure buttons
  const isGit = tool.id === 'git'
  const gitNeedsAction = isGit && (tool.status === 'missing' || tool.status === 'misconfigured' || tool.auth_status === 'unauthenticated')

  // Claude CLI gets a dedicated wizard
  const isClaude = tool.id === 'claude_cli'
  const claudeNeedsAction = isClaude && (tool.status === 'missing' || tool.auth_status === 'unauthenticated')

  // Codex CLI gets a dedicated wizard
  const isCodex = tool.id === 'codex_cli'
  const codexNeedsAction = isCodex && (tool.status === 'missing' || tool.auth_status === 'unauthenticated')

  const hasWizard = isGit || isClaude || isCodex
  const showInstall = !hasWizard && tool.status === 'missing' && tool.install_command
  const showAuth =
    !hasWizard &&
    tool.status !== 'missing' &&
    tool.auth_status === 'unauthenticated' &&
    tool.auth_command
  const showConfigure = !hasWizard && tool.status === 'misconfigured' && tool.auth_command

  return (
    <View style={[styles.container, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <View style={styles.header}>
        <View style={[styles.statusDot, { backgroundColor: statusColor(tool) }]} />
        <View style={styles.info}>
          <View style={styles.nameRow}>
            <Text style={[styles.name, { color: colors.text }]}>{tool.name}</Text>
            {tool.required && (
              <Text style={[styles.required, { color: colors.textTertiary }]}>Required</Text>
            )}
          </View>
          <Text style={[styles.status, { color: colors.textSecondary }]}>
            {statusLabel(tool)}
          </Text>
          {tool.path && (
            <Text style={[styles.path, { color: colors.textTertiary }]} numberOfLines={1}>
              {tool.path}
            </Text>
          )}
          {tool.details.user_name && (
            <Text style={[styles.path, { color: colors.textTertiary }]}>
              {tool.details.user_name} {'<'}{tool.details.user_email}{'>'}
            </Text>
          )}
        </View>
      </View>

      {gitNeedsAction && onGitWizard && (
        <View style={styles.actions}>
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: colors.primary }]}
            onPress={() => onGitWizard(tool)}
            activeOpacity={0.7}
          >
            <Text style={[styles.actionText, { color: colors.primaryText }]}>Set up Git</Text>
          </TouchableOpacity>
        </View>
      )}

      {claudeNeedsAction && onClaudeWizard && (
        <View style={styles.actions}>
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: colors.primary }]}
            onPress={() => onClaudeWizard(tool)}
            activeOpacity={0.7}
          >
            <Text style={[styles.actionText, { color: colors.primaryText }]}>Set up Claude</Text>
          </TouchableOpacity>
        </View>
      )}

      {codexNeedsAction && onCodexWizard && (
        <View style={styles.actions}>
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: colors.primary }]}
            onPress={() => onCodexWizard(tool)}
            activeOpacity={0.7}
          >
            <Text style={[styles.actionText, { color: colors.primaryText }]}>Set up Codex</Text>
          </TouchableOpacity>
        </View>
      )}

      {(showInstall || showAuth || showConfigure) && (
        <View style={styles.actions}>
          {showInstall && (
            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: colors.primary }]}
              onPress={() => onInstall(tool)}
              activeOpacity={0.7}
            >
              <Text style={[styles.actionText, { color: colors.primaryText }]}>Install</Text>
            </TouchableOpacity>
          )}
          {(showAuth || showConfigure) && (
            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: colors.primary }]}
              onPress={() => onAuthenticate(tool)}
              activeOpacity={0.7}
            >
              <Text style={[styles.actionText, { color: colors.primaryText }]}>
                {showConfigure ? 'Configure' : 'Authenticate'}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    borderWidth: 1,
    borderRadius: borderRadius.lg,
    padding: spacing[3],
    gap: spacing[2],
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing[3],
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginTop: 5,
  },
  info: {
    flex: 1,
    gap: 2,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
  },
  name: {
    ...typographyScale.base,
    fontWeight: '600',
  },
  required: {
    ...typographyScale.xs,
    fontWeight: '500',
  },
  status: {
    ...typographyScale.sm,
  },
  path: {
    ...typographyScale.xs,
    fontFamily: 'monospace',
  },
  icon: {
    fontSize: 16,
    fontWeight: '700',
    color: '#22c55e',
  },
  actions: {
    flexDirection: 'row',
    gap: spacing[2],
    marginTop: spacing[1],
  },
  actionButton: {
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[2],
    borderRadius: borderRadius.md,
  },
  actionText: {
    ...typographyScale.sm,
    fontWeight: '600',
  },
})

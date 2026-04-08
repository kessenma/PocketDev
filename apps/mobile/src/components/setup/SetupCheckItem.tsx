import React from 'react'
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, Image, type ImageSourcePropType } from 'react-native'
import { useTheme } from '../../contexts/ThemeContext'
import { spacing, borderRadius, typographyScale, palette } from '@pocketdev/shared/theme'
import type { ToolCheck } from '@pocketdev/shared/types'
import { Assets } from '../../../assets'

const toolAssetMap: Record<string, { light: ImageSourcePropType; dark: ImageSourcePropType }> = {
  git: { light: Assets.gitBlack, dark: Assets.gitWhite },
  github_cli: { light: Assets.githubBlack, dark: Assets.githubWhite },
  docker: { light: Assets.dockerBlack, dark: Assets.dockerWhite },
  python: { light: Assets.pythonBlack, dark: Assets.pythonWhite },
  node: { light: Assets.nodeBlack, dark: Assets.nodeWhite },
  npm: { light: Assets.npmBlack, dark: Assets.npmWhite },
  nvm: { light: Assets.nvmBlack, dark: Assets.nvmWhite },
  pnpm: { light: Assets.pnpmBlack, dark: Assets.pnpmWhite },
  bun: { light: Assets.bunBlack, dark: Assets.bunWhite },
  claude_cli: { light: Assets.claudeBlack, dark: Assets.claudeWhite },
  codex_cli: { light: Assets.codexBlack, dark: Assets.codexWhite },
  copilot_cli: { light: Assets.githubBlack, dark: Assets.githubWhite },
  opencode_cli: { light: Assets.opencodeBlack, dark: Assets.opencodeWhite },
  rust: { light: Assets.rustBlack, dark: Assets.rustWhite },
  go: { light: Assets.goBlack, dark: Assets.goWhite },
  typescript: { light: Assets.typescriptBlack, dark: Assets.typescriptWhite },
  java: { light: Assets.javaBlack, dark: Assets.javaWhite },
  cpp: { light: Assets.cppBlack, dark: Assets.cppWhite },
  postgresql: { light: Assets.postgresqlBlack, dark: Assets.postgresqlWhite },
  mongodb: { light: Assets.mongodbBlack, dark: Assets.mongodbWhite },
  chromium: { light: Assets.chromiumBlack, dark: Assets.chromiumWhite },
}

interface Props {
  tool: ToolCheck
  onInstall: (tool: ToolCheck) => void
  onAuthenticate: (tool: ToolCheck) => void
  onGitWizard?: (tool: ToolCheck) => void
  onClaudeWizard?: (tool: ToolCheck) => void
  onCodexWizard?: (tool: ToolCheck) => void
  onBlockedCodexWizard?: (tool: ToolCheck) => void
  onCopilotWizard?: (tool: ToolCheck) => void
  onBlockedCopilotWizard?: (tool: ToolCheck) => void
  onOpenCodeWizard?: (tool: ToolCheck) => void
  onPkgWizard?: (tool: ToolCheck) => void
  onPythonWizard?: (tool: ToolCheck) => void
  onRustWizard?: (tool: ToolCheck) => void
  onGoWizard?: (tool: ToolCheck) => void
  onTypeScriptWizard?: (tool: ToolCheck) => void
  onDockerWizard?: (tool: ToolCheck) => void
  disabledReason?: string | null
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
  if (tool.status === 'missing') return 'Needs setup'
  if (tool.status === 'misconfigured') return 'Needs attention'
  if (tool.auth_status === 'unauthenticated') return 'Ready to sign in'
  if (tool.auth_status === 'authenticated') return 'Ready'
  return tool.version ? `Ready · v${tool.version}` : 'Ready'
}

function statusColor(tool: ToolCheck): string {
  if (tool.status === 'missing') return '#ef4444'
  if (tool.status === 'misconfigured' || tool.auth_status === 'unauthenticated') return '#facc15'
  return '#22c55e'
}

export default function SetupCheckItem({
  tool,
  onInstall,
  onAuthenticate,
  onGitWizard,
  onClaudeWizard,
  onCodexWizard,
  onBlockedCodexWizard,
  onCopilotWizard,
  onBlockedCopilotWizard,
  onOpenCodeWizard,
  onPkgWizard,
  onPythonWizard,
  onRustWizard,
  onGoWizard,
  onTypeScriptWizard,
  onDockerWizard,
  disabledReason,
}: Props) {
  const { colors, isDark } = useTheme()
  const bauhaus = palette.bauhaus
  const asset = toolAssetMap[tool.id]
  const logoSource = asset ? (isDark ? asset.dark : asset.light) : null

  // Git gets a dedicated wizard instead of generic install/configure buttons
  const isGit = tool.id === 'git'
  const gitNeedsAction = isGit && (tool.status === 'missing' || tool.status === 'misconfigured' || tool.auth_status === 'unauthenticated')
  const showGitWizard = isGit && !!onGitWizard

  // Claude CLI gets a dedicated wizard
  const isClaude = tool.id === 'claude_cli'
  const claudeNeedsAction = isClaude && (tool.status === 'missing' || tool.auth_status === 'unauthenticated')
  const showClaudeWizard = isClaude && !!onClaudeWizard

  // Codex CLI gets a dedicated wizard
  const isCodex = tool.id === 'codex_cli'
  const codexNeedsAction = isCodex && (tool.status === 'missing' || tool.auth_status === 'unauthenticated')
  const showCodexWizard = isCodex && !!onCodexWizard
  const codexBlocked = showCodexWizard && codexNeedsAction && !!disabledReason

  const isCopilot = tool.id === 'copilot_cli'
  const copilotNeedsAction = isCopilot && (tool.status === 'missing' || tool.auth_status === 'unauthenticated' || tool.details.trust_configured !== 'true')
  const showCopilotWizard = isCopilot && !!onCopilotWizard
  const copilotBlocked = showCopilotWizard && copilotNeedsAction && !!disabledReason

  const isOpenCode = tool.id === 'opencode_cli'
  const openCodeNeedsAction = isOpenCode && tool.status !== 'installed'
  const showOpenCodeWizard = isOpenCode && !!onOpenCodeWizard

  // Package managers get a bulk wizard
  const isPkgManager = tool.id === 'node' || tool.id === 'npm' || tool.id === 'nvm' || tool.id === 'pnpm' || tool.id === 'bun'
  const pkgNeedsAction = isPkgManager && tool.status === 'missing'
  const showPkgWizard = isPkgManager && !!onPkgWizard

  const isPython = tool.id === 'python'
  const pythonNeedsAction = isPython && (tool.status === 'missing' || tool.status === 'misconfigured')
  const showPythonWizard = isPython && !!onPythonWizard

  const isRust = tool.id === 'rust'
  const rustNeedsAction = isRust && (tool.status === 'missing' || tool.status === 'misconfigured')
  const showRustWizard = isRust && !!onRustWizard

  const isGo = tool.id === 'go'
  const goNeedsAction = isGo && (tool.status === 'missing' || tool.status === 'misconfigured')
  const showGoWizard = isGo && !!onGoWizard

  const isTypeScript = tool.id === 'typescript'
  const tsNeedsAction = isTypeScript && (tool.status === 'missing' || tool.status === 'misconfigured')
  const showTypeScriptWizard = isTypeScript && !!onTypeScriptWizard

  const isDocker = tool.id === 'docker'
  const dockerNeedsAction = isDocker && (tool.status === 'missing' || tool.status === 'misconfigured')
  const showDockerWizard = isDocker && !!onDockerWizard

  const hasWizard = isGit || isClaude || isCodex || isCopilot || isOpenCode || isPkgManager || isPython || isRust || isGo || isTypeScript || isDocker
  const showInstall = !hasWizard && tool.status === 'missing' && tool.install_command
  const showAuth =
    !hasWizard &&
    tool.status !== 'missing' &&
    tool.auth_status === 'unauthenticated' &&
    tool.auth_command
  const showConfigure = !hasWizard && tool.status === 'misconfigured' && tool.auth_command

  const panelBackground = isDark ? '#101010' : '#faf7f0'
  const panelBorder = isDark ? 'rgba(255,255,255,0.1)' : 'rgba(26,26,26,0.08)'
  const accentColor =
    tool.status === 'missing'
      ? bauhaus.red
      : tool.status === 'misconfigured' || tool.auth_status === 'unauthenticated'
        ? bauhaus.yellow
        : bauhaus.blue

  return (
    <View style={[styles.container, { backgroundColor: panelBackground, borderColor: panelBorder }]}>
      <View style={[styles.accentBlock, { backgroundColor: accentColor }]} />
      <View style={styles.header}>
        <View style={styles.logoContainer}>
          {logoSource ? (
            <Image source={logoSource} style={styles.logo} resizeMode="contain" />
          ) : (
            <View style={[styles.logoFallback, { backgroundColor: colors.surface }]} />
          )}
          <View style={[styles.statusDot, { backgroundColor: statusColor(tool), borderColor: panelBackground }]} />
        </View>
        <View style={styles.info}>
          <View style={styles.nameRow}>
            <Text style={[styles.name, { color: colors.text }]}>{tool.name}</Text>
            {tool.required && (
              <Text style={[styles.required, { color: colors.textTertiary }]}>Core</Text>
            )}
          </View>
          <Text style={[styles.status, { color: statusColor(tool) }]}>
            {statusLabel(tool)}
          </Text>
          {tool.details.user_name && (
            <Text style={[styles.path, { color: colors.textTertiary }]}>
              {tool.details.user_name} {'<'}{tool.details.user_email}{'>'}
            </Text>
          )}
        </View>
      </View>

      {showGitWizard && (
        <View style={styles.actions}>
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: colors.primary }]}
            onPress={() => onGitWizard(tool)}
            activeOpacity={0.7}
          >
            <Text style={[styles.actionText, { color: colors.primaryText }]}>
              {gitNeedsAction ? 'Enable Git' : 'Open Git'}
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {showClaudeWizard && (
        <View style={styles.actions}>
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: colors.primary }]}
            onPress={() => onClaudeWizard(tool)}
            activeOpacity={0.7}
          >
            <Text style={[styles.actionText, { color: colors.primaryText }]}>
              {claudeNeedsAction ? 'Enable Claude' : 'Open Claude'}
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {showCodexWizard && (
        <View style={styles.actions}>
          <TouchableOpacity
            style={[
              styles.actionButton,
              { backgroundColor: colors.primary },
              codexBlocked && styles.actionButtonDisabled,
            ]}
            onPress={() => {
              if (codexBlocked) {
                onBlockedCodexWizard?.(tool)
                return
              }
              onCodexWizard(tool)
            }}
            activeOpacity={0.7}
          >
            <Text style={[styles.actionText, { color: colors.primaryText }]}>
              {codexNeedsAction ? 'Enable Codex' : 'Open Codex'}
            </Text>
          </TouchableOpacity>
          {codexBlocked && (
            <>
              <Text style={[styles.inlineHint, { color: colors.textSecondary }]}>
                {disabledReason}
              </Text>
              {onPkgWizard && (
                <TouchableOpacity
                  style={[styles.secondaryActionButton, { borderColor: colors.border }]}
                  onPress={() => onPkgWizard(tool)}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.secondaryActionText, { color: colors.text }]}>Open Package Tools</Text>
                </TouchableOpacity>
              )}
            </>
          )}
        </View>
      )}

      {showPkgWizard && (
        <View style={styles.actions}>
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: colors.primary }]}
            onPress={() => onPkgWizard(tool)}
            activeOpacity={0.7}
          >
            <Text style={[styles.actionText, { color: colors.primaryText }]}>
              {pkgNeedsAction ? 'Enable Package Tools' : 'Open Package Tools'}
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {showCopilotWizard && (
        <View style={styles.actions}>
          <TouchableOpacity
            style={[
              styles.actionButton,
              { backgroundColor: colors.primary },
              copilotBlocked && styles.actionButtonDisabled,
            ]}
            onPress={() => {
              if (copilotBlocked) {
                onBlockedCopilotWizard?.(tool)
                return
              }
              onCopilotWizard?.(tool)
            }}
            activeOpacity={0.7}
          >
            <Text style={[styles.actionText, { color: colors.primaryText }]}>
              {copilotNeedsAction ? 'Enable Copilot' : 'Open Copilot'}
            </Text>
          </TouchableOpacity>
          {copilotBlocked && (
            <>
              <Text style={[styles.inlineHint, { color: colors.textSecondary }]}>
                {disabledReason}
              </Text>
              {onGitWizard && (
                <TouchableOpacity
                  style={[styles.secondaryActionButton, { borderColor: colors.border }]}
                  onPress={() => onGitWizard(tool)}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.secondaryActionText, { color: colors.text }]}>Open Git Setup</Text>
                </TouchableOpacity>
              )}
            </>
          )}
        </View>
      )}

      {showOpenCodeWizard && (
        <View style={styles.actions}>
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: colors.primary }]}
            onPress={() => onOpenCodeWizard(tool)}
            activeOpacity={0.7}
          >
            <Text style={[styles.actionText, { color: colors.primaryText }]}>
              {openCodeNeedsAction ? 'Enable OpenCode' : 'Open OpenCode'}
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {showPythonWizard && (
        <View style={styles.actions}>
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: colors.primary }]}
            onPress={() => onPythonWizard(tool)}
            activeOpacity={0.7}
          >
            <Text style={[styles.actionText, { color: colors.primaryText }]}>
              {pythonNeedsAction ? 'Enable Python' : 'Open Python'}
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {showRustWizard && (
        <View style={styles.actions}>
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: colors.primary }]}
            onPress={() => onRustWizard(tool)}
            activeOpacity={0.7}
          >
            <Text style={[styles.actionText, { color: colors.primaryText }]}>
              {rustNeedsAction ? 'Enable Rust' : 'Open Rust'}
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {showGoWizard && (
        <View style={styles.actions}>
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: colors.primary }]}
            onPress={() => onGoWizard(tool)}
            activeOpacity={0.7}
          >
            <Text style={[styles.actionText, { color: colors.primaryText }]}>
              {goNeedsAction ? 'Enable Go' : 'Open Go'}
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {showTypeScriptWizard && (
        <View style={styles.actions}>
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: colors.primary }]}
            onPress={() => onTypeScriptWizard(tool)}
            activeOpacity={0.7}
          >
            <Text style={[styles.actionText, { color: colors.primaryText }]}>
              {tsNeedsAction ? 'Enable TypeScript' : 'Open TypeScript'}
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {showDockerWizard && (
        <View style={styles.actions}>
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: colors.primary }]}
            onPress={() => onDockerWizard(tool)}
            activeOpacity={0.7}
          >
            <Text style={[styles.actionText, { color: colors.primaryText }]}>
              {dockerNeedsAction ? 'Enable Docker' : 'Open Docker'}
            </Text>
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
              <Text style={[styles.actionText, { color: colors.primaryText }]}>Enable</Text>
            </TouchableOpacity>
          )}
          {(showAuth || showConfigure) && (
            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: colors.primary }]}
              onPress={() => onAuthenticate(tool)}
              activeOpacity={0.7}
            >
              <Text style={[styles.actionText, { color: colors.primaryText }]}>
                {showConfigure ? 'Finish Setup' : 'Sign In'}
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
    borderRadius: 24,
    padding: spacing[4],
    gap: spacing[2],
    overflow: 'hidden',
    shadowColor: '#000000',
    shadowOpacity: 0.1,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 8 },
    elevation: 6,
  },
  accentBlock: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 76,
    height: 76,
    borderBottomLeftRadius: 28,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing[3],
  },
  logoContainer: {
    width: 42,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  logo: {
    width: 30,
    height: 30,
  },
  logoFallback: {
    width: 30,
    height: 30,
    borderRadius: 6,
  },
  statusDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    position: 'absolute',
    bottom: -1,
    right: -1,
    borderWidth: 2.5,
  },
  info: {
    flex: 1,
    gap: 2,
    paddingRight: 44,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
  },
  name: {
    ...typographyScale.base,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  required: {
    ...typographyScale.xs,
    fontWeight: '700',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  status: {
    ...typographyScale.sm,
    fontWeight: '700',
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
    flexWrap: 'wrap',
  },
  actionButton: {
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[2],
    borderRadius: 14,
  },
  actionText: {
    ...typographyScale.sm,
    fontWeight: '600',
  },
  actionButtonDisabled: {
    opacity: 0.55,
  },
  inlineHint: {
    ...typographyScale.xs,
    width: '100%',
    lineHeight: 18,
  },
  secondaryActionButton: {
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[2],
    borderRadius: 14,
    borderWidth: 1,
  },
  secondaryActionText: {
    ...typographyScale.sm,
    fontWeight: '600',
  },
})

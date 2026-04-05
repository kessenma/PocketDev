import React, { useCallback, useState } from 'react'
import { View, Text, TouchableOpacity, StyleSheet, Alert, Animated } from 'react-native'
import { useTheme } from '../contexts/ThemeContext'
import { spacing, borderRadius, typographyScale, palette } from '@pocketdev/shared/theme'
import { useSetupStore } from '../stores/setup'
import SetupChecklist from '../components/setup/SetupChecklist'
import InstallSheet from '../components/setup/InstallSheet'
import AiInspectSheet from '../components/setup/AiInspectSheet'
import GitWizardSheet from '../components/setup/GitWizardSheet'
import ClaudeWizardSheet from '../components/setup/ClaudeWizardSheet'
import CopilotWizardSheet from '../components/setup/CopilotWizardSheet'
import CodexWizardSheet from '../components/setup/CodexWizardSheet'
import PythonWizardSheet from '../components/setup/PythonWizardSheet'
import PackageManagerWizardSheet from '../components/setup/PackageManagerWizardSheet'
import PackageInstallAnimation from '../components/animations/PackageInstallAnimation'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import type { RootStackParamList } from '../navigation/types'
import type { ToolCheck } from '@pocketdev/shared/types'
import AnimatedGradientBackground from '../components/background/AnimatedGradientBackground'
import ConnectedAnimation from '../components/animations/ConnectedAnimation'
import GitHubSetupAnimation from '../components/animations/GitHubSetupAnimation'
import { ArrowRight, ChevronLeft, ShieldCheck, Wrench } from 'lucide-react-native'
import { getCodexBlockedReason, getCopilotBlockedReason, getServerSetupStatus } from '../components/setup/setup-tool-utils'

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'ServerSetup'>
}

export default function ServerSetupScreen({ navigation }: Props) {
  const { colors, isDark } = useTheme()
  const report = useSetupStore((s) => s.report)
  const bauhaus = palette.bauhaus
  const codexBlockedReason = getCodexBlockedReason(report)
  const copilotBlockedReason = getCopilotBlockedReason(report)
  const setupStatus = getServerSetupStatus(report)
  const scrollY = React.useRef(new Animated.Value(0)).current

  const [installTool, setInstallTool] = useState<ToolCheck | null>(null)
  const [installCommand, setInstallCommand] = useState<string | null>(null)
  const [showInstall, setShowInstall] = useState(false)

  const [inspectCommand, setInspectCommand] = useState('')
  const [inspectOutput, setInspectOutput] = useState('')
  const [showInspect, setShowInspect] = useState(false)
  const [showConnected, setShowConnected] = useState(false)
  const [showGitWizard, setShowGitWizard] = useState(false)
  const [showGitHubAnimation, setShowGitHubAnimation] = useState(false)
  const [showClaudeWizard, setShowClaudeWizard] = useState(false)
  const [showCodexWizard, setShowCodexWizard] = useState(false)
  const [showCopilotWizard, setShowCopilotWizard] = useState(false)
  const [showPkgWizard, setShowPkgWizard] = useState(false)
  const [showPkgAnimation, setShowPkgAnimation] = useState(false)
  const [showPythonWizard, setShowPythonWizard] = useState(false)

  const handleConnectedComplete = useCallback(() => {
    navigation.replace('Main')
  }, [navigation])

  const handleGitWizard = useCallback(() => {
    setShowGitWizard(true)
  }, [])

  const handleGitWizardComplete = useCallback(() => {
    setShowGitWizard(false)
    setShowGitHubAnimation(true)
  }, [])

  const handleGitHubAnimationComplete = useCallback(() => {
    setShowGitHubAnimation(false)
  }, [])

  const handleClaudeWizard = useCallback(() => {
    console.log('[ServerSetup] Opening Claude wizard')
    setShowClaudeWizard(true)
  }, [])

  const handleClaudeWizardComplete = useCallback(() => {
    console.log('[ServerSetup] Claude wizard complete')
    setShowClaudeWizard(false)
  }, [])

  const handleCodexWizard = useCallback(() => {
    if (codexBlockedReason) {
      Alert.alert(
        'Enable package tools first',
        codexBlockedReason,
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Open Package Tools', onPress: () => setShowPkgWizard(true) },
        ],
      )
      return
    }
    console.log('[ServerSetup] Opening Codex wizard')
    setShowCodexWizard(true)
  }, [codexBlockedReason])

  const handleCodexWizardComplete = useCallback(() => {
    console.log('[ServerSetup] Codex wizard complete')
    setShowCodexWizard(false)
  }, [])

  const handleCopilotWizard = useCallback(() => {
    if (copilotBlockedReason) {
      Alert.alert(
        'Enable GitHub tools first',
        copilotBlockedReason,
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Open Git Setup', onPress: () => setShowGitWizard(true) },
        ],
      )
      return
    }
    console.log('[ServerSetup] Opening Copilot wizard')
    setShowCopilotWizard(true)
  }, [copilotBlockedReason])

  const handleCopilotWizardComplete = useCallback(() => {
    console.log('[ServerSetup] Copilot wizard complete')
    setShowCopilotWizard(false)
  }, [])

  const handlePkgWizard = useCallback(() => {
    console.log('[ServerSetup] Opening Pkg wizard')
    setShowPkgWizard(true)
  }, [])

  const handleBlockedCodexWizard = useCallback(() => {
    Alert.alert(
      'Enable package tools first',
      codexBlockedReason ?? 'Enable package tools first so Codex can use npm.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Open Package Tools', onPress: () => setShowPkgWizard(true) },
      ],
    )
  }, [codexBlockedReason])

  const handleBlockedCopilotWizard = useCallback(() => {
    Alert.alert(
      'Enable GitHub tools first',
      copilotBlockedReason ?? 'Complete Git and GitHub CLI setup before enabling Copilot.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Open Git Setup', onPress: () => setShowGitWizard(true) },
      ],
    )
  }, [copilotBlockedReason])

  const handlePkgWizardComplete = useCallback(() => {
    console.log('[ServerSetup] Pkg wizard complete')
    setShowPkgWizard(false)
    setShowPkgAnimation(true)
  }, [])

  const handlePkgAnimationComplete = useCallback(() => {
    setShowPkgAnimation(false)
  }, [])

  const handlePythonWizard = useCallback(() => {
    console.log('[ServerSetup] Opening Python wizard')
    setShowPythonWizard(true)
  }, [])

  const handlePythonWizardComplete = useCallback(() => {
    console.log('[ServerSetup] Python wizard complete')
    setShowPythonWizard(false)
  }, [])

  const handleInstall = useCallback((tool: ToolCheck) => {
    setInstallTool(tool)
    setInstallCommand(tool.install_command)
    setShowInstall(true)
  }, [])

  const handleAuthenticate = useCallback((tool: ToolCheck) => {
    setInstallTool(tool)
    setInstallCommand(tool.auth_command)
    setShowInstall(true)
  }, [])

  const handleAiInspect = useCallback((command: string, output: string) => {
    setShowInstall(false)
    setInspectCommand(command)
    setInspectOutput(output)
    setShowInspect(true)
  }, [])

  const handleFixCommand = useCallback((command: string) => {
    setShowInspect(false)
    setInstallTool(null)
    setInstallCommand(command)
    setShowInstall(true)
  }, [])

  const headerCardStyle = {
    backgroundColor: isDark ? 'rgba(14, 14, 14, 0.9)' : 'rgba(250, 248, 242, 0.96)',
    borderColor: isDark ? 'rgba(255, 255, 255, 0.12)' : 'rgba(26, 26, 26, 0.08)',
    shadowColor: '#000000',
  }

  const introHeight = scrollY.interpolate({
    inputRange: [0, 120],
    outputRange: [168, 72],
    extrapolate: 'clamp',
  })

  const introOpacity = scrollY.interpolate({
    inputRange: [0, 70, 120],
    outputRange: [1, 0.8, 0.2],
    extrapolate: 'clamp',
  })

  const subtitleOpacity = scrollY.interpolate({
    inputRange: [0, 40, 90],
    outputRange: [1, 0.45, 0],
    extrapolate: 'clamp',
  })

  const titleScale = scrollY.interpolate({
    inputRange: [0, 120],
    outputRange: [1, 0.92],
    extrapolate: 'clamp',
  })

  const metaTranslateY = scrollY.interpolate({
    inputRange: [0, 120],
    outputRange: [0, -12],
    extrapolate: 'clamp',
  })

  return (
    <AnimatedGradientBackground colors={colors} isDark={isDark} variant="setup">
      <View style={styles.container}>
        <View style={[styles.header, styles.headerCard, headerCardStyle]}>
          <View pointerEvents="none" style={[styles.headerAccent, { backgroundColor: bauhaus.red }]} />
          <Animated.View style={[styles.headerIntro, { height: introHeight, opacity: introOpacity }]}>
            <TouchableOpacity
              style={[styles.backButton, { borderColor: colors.borderStrong }]}
              onPress={() => navigation.replace('Connect')}
              activeOpacity={0.7}
            >
              <ChevronLeft color={colors.text} size={22} strokeWidth={2.25} />
            </TouchableOpacity>
            <View style={styles.eyebrowRow}>
              <ShieldCheck color={colors.textTertiary} size={14} strokeWidth={2.25} />
              <Text style={[styles.eyebrow, { color: colors.textTertiary }]}>Workspace readiness</Text>
            </View>
            <Animated.View style={[styles.titleRow, { transform: [{ scale: titleScale }] }]}>
              <Wrench color={colors.primary} size={24} strokeWidth={2.2} />
              <Text style={[styles.title, { color: colors.text }]}>Workspace Tools</Text>
            </Animated.View>
            <Animated.Text style={[styles.subtitle, { color: colors.textSecondary, opacity: subtitleOpacity }]}>
              Enable the tools your paired workspace uses for coding tasks
            </Animated.Text>
          </Animated.View>
          <Animated.View style={[styles.headerMetaRow, { transform: [{ translateY: metaTranslateY }] }]}>
            <View
              style={[
                styles.statusBlock,
                {
                  backgroundColor: setupStatus.ready ? bauhaus.yellow : (isDark ? 'rgba(255,255,255,0.07)' : 'rgba(26,26,26,0.05)'),
                  borderColor: setupStatus.ready ? bauhaus.yellow : colors.border,
                },
              ]}
            >
              <Text style={[styles.statusBlockLabel, { color: setupStatus.ready ? bauhaus.black : colors.textTertiary }]}>Workspace</Text>
              <Text style={[styles.statusBlockValue, { color: setupStatus.ready ? bauhaus.black : colors.text }]}>
                {setupStatus.ready ? 'Ready' : 'In Progress'}
              </Text>
            </View>
            <View style={[styles.statusBlock, { backgroundColor: bauhaus.blue, borderColor: bauhaus.blue }]}>
              <Text style={[styles.statusBlockLabel, { color: 'rgba(255,255,255,0.72)' }]}>Mode</Text>
              <Text style={[styles.statusBlockValue, { color: '#ffffff' }]}>Guided Setup</Text>
            </View>
          </Animated.View>
        </View>

        <SetupChecklist
          onInstall={handleInstall}
          onAuthenticate={handleAuthenticate}
          onGitWizard={handleGitWizard}
          onClaudeWizard={handleClaudeWizard}
          onCodexWizard={handleCodexWizard}
          onBlockedCodexWizard={handleBlockedCodexWizard}
          onCopilotWizard={handleCopilotWizard}
          onBlockedCopilotWizard={handleBlockedCopilotWizard}
          onPkgWizard={handlePkgWizard}
          onPythonWizard={handlePythonWizard}
          onScroll={Animated.event(
            [{ nativeEvent: { contentOffset: { y: scrollY } } }],
            { useNativeDriver: false },
          )}
        />

        <View style={styles.footer}>
          <TouchableOpacity
            style={[
              styles.continueButton,
              { backgroundColor: setupStatus.ready ? bauhaus.red : colors.border },
            ]}
            onPress={() => setShowConnected(true)}
            disabled={!setupStatus.ready}
            activeOpacity={0.7}
          >
            <View style={styles.continueContent}>
              <Text style={[styles.continueText, { color: colors.primaryText }]}>Continue</Text>
              <ArrowRight color={colors.primaryText} size={18} strokeWidth={2.25} />
            </View>
          </TouchableOpacity>

          <TouchableOpacity onPress={() => setShowConnected(true)} activeOpacity={0.7}>
            <Text style={[styles.skipText, { color: colors.textTertiary }]}>Skip for now</Text>
          </TouchableOpacity>
        </View>

        <InstallSheet
          visible={showInstall}
          tool={installTool}
          command={installCommand}
          onClose={() => setShowInstall(false)}
          onAiInspect={handleAiInspect}
        />

        <AiInspectSheet
          visible={showInspect}
          failedCommand={inspectCommand}
          failedOutput={inspectOutput}
          onClose={() => setShowInspect(false)}
          onFixCommand={handleFixCommand}
        />

        <GitWizardSheet
          visible={showGitWizard}
          onClose={() => setShowGitWizard(false)}
          onComplete={handleGitWizardComplete}
        />

        <ClaudeWizardSheet
          visible={showClaudeWizard}
          onClose={() => setShowClaudeWizard(false)}
          onComplete={handleClaudeWizardComplete}
        />

        <CodexWizardSheet
          visible={showCodexWizard}
          onClose={() => setShowCodexWizard(false)}
          onComplete={handleCodexWizardComplete}
        />

        <CopilotWizardSheet
          visible={showCopilotWizard}
          onClose={() => setShowCopilotWizard(false)}
          onComplete={handleCopilotWizardComplete}
        />

        <PackageManagerWizardSheet
          visible={showPkgWizard}
          onClose={() => setShowPkgWizard(false)}
          onComplete={handlePkgWizardComplete}
        />

        <PythonWizardSheet
          visible={showPythonWizard}
          onClose={() => setShowPythonWizard(false)}
          onComplete={handlePythonWizardComplete}
        />
      </View>
      {showConnected && <ConnectedAnimation onComplete={handleConnectedComplete} />}
      {showGitHubAnimation && (
        <GitHubSetupAnimation onComplete={handleGitHubAnimationComplete} />
      )}
      {showPkgAnimation && (
        <PackageInstallAnimation onComplete={handlePkgAnimationComplete} />
      )}
    </AnimatedGradientBackground>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: spacing[6],
    paddingTop: spacing[12],
    paddingBottom: spacing[5],
    gap: spacing[2],
    marginHorizontal: spacing[4],
    marginTop: spacing[4],
    borderWidth: 1,
    borderRadius: 28,
    overflow: 'hidden',
    shadowOpacity: 0.16,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 12 },
    elevation: 10,
  },
  headerCard: {
    paddingBottom: spacing[5],
  },
  headerIntro: {
    overflow: 'hidden',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing[2],
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  eyebrow: {
    ...typographyScale.xs,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  eyebrowRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
  },
  title: {
    ...typographyScale['2xl'],
    fontWeight: '700',
    letterSpacing: -0.8,
  },
  subtitle: {
    ...typographyScale.sm,
    maxWidth: '88%',
  },
  headerAccent: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 92,
    height: 92,
    borderBottomLeftRadius: 32,
  },
  headerMetaRow: {
    flexDirection: 'row',
    gap: spacing[3],
    marginTop: spacing[2],
  },
  statusBlock: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 18,
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[3],
  },
  statusBlockLabel: {
    ...typographyScale.xs,
    textTransform: 'uppercase',
    fontWeight: '700',
    letterSpacing: 1,
    marginBottom: 4,
  },
  statusBlockValue: {
    ...typographyScale.base,
    fontWeight: '700',
  },
  footer: {
    paddingHorizontal: spacing[6],
    paddingBottom: spacing[10],
    gap: spacing[3],
    alignItems: 'center',
  },
  continueButton: {
    width: '100%',
    borderRadius: 18,
    paddingVertical: spacing[4],
    alignItems: 'center',
    shadowColor: '#000000',
    shadowOpacity: 0.14,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
  },
  continueContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
  },
  continueText: {
    ...typographyScale.base,
    fontWeight: '600',
  },
  skipText: {
    ...typographyScale.sm,
    fontWeight: '500',
  },
})

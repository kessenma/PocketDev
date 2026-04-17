import React, { useCallback, useState } from 'react'
import { View, Text, TouchableOpacity, StyleSheet, Alert, Animated, Image, ActivityIndicator } from 'react-native'
import { useTheme } from '../contexts/ThemeContext'
import { spacing, typographyScale, palette } from '@pocketdev/shared/theme'
import { useSetupStore } from '../stores/setup'
import SetupChecklist from '../components/setup/SetupChecklist'
import InstallSheet from '../components/setup/InstallSheet'
import AiInspectSheet from '../components/setup/AiInspectSheet'
import GitWizardSheet from '../components/setup/GitWizardSheet'
import ClaudeWizardSheet from '../components/setup/ClaudeWizardSheet'
import CopilotWizardSheet from '../components/setup/CopilotWizardSheet'
import CodexWizardSheet from '../components/setup/CodexWizardSheet'
import OpenCodeWizardSheet from '../components/setup/OpenCodeWizardSheet'
import PythonWizardSheet from '../components/setup/PythonWizardSheet'
import RustWizardSheet from '../components/setup/RustWizardSheet'
import GoWizardSheet from '../components/setup/GoWizardSheet'
import TypeScriptWizardSheet from '../components/setup/TypeScriptWizardSheet'
import PackageManagerWizardSheet from '../components/setup/PackageManagerWizardSheet'
import DockerWizardSheet from '../components/setup/DockerWizardSheet'
import MinimaxWizardSheet from '../components/setup/MinimaxWizardSheet'
import DockerSetupAnimation from '../components/animations/DockerSetupAnimation'
import RustSetupAnimation from '../components/animations/RustSetupAnimation'
import TypeScriptSetupAnimation from '../components/animations/TypeScriptSetupAnimation'
import PackageInstallAnimation from '../components/animations/PackageInstallAnimation'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import type { RootStackParamList } from '../navigation/types'
import type { ToolCheck } from '@pocketdev/shared/types'
import AnimatedGradientBackground from '../components/background/AnimatedGradientBackground'
import ConnectedAnimation from '../components/animations/ConnectedAnimation'
import GitHubSetupAnimation from '../components/animations/GitHubSetupAnimation'
import Dialogue from '../components/shared/Dialogue'
import { ArrowRight, Check, ChevronLeft, ShieldCheck, Wrench } from 'lucide-react-native'
import { Assets } from '../../assets'
import { getCodexBlockedReason, getCopilotBlockedReason, getMinimaxBlockedReason, getServerSetupStatus, getSetupProgress } from '../components/setup/setup-tool-utils'

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'ServerSetup'>
}

export default function ServerSetupScreen({ navigation }: Props) {
  const { colors, isDark } = useTheme()
  const report = useSetupStore((s) => s.report)
  const hydrated = useSetupStore((s) => s.hydrated)
  const revalidating = useSetupStore((s) => s.revalidating)
  const reportSource = useSetupStore((s) => s.reportSource)
  const hasLiveConfirmation = useSetupStore((s) => s.hasLiveConfirmation)
  const bauhaus = palette.bauhaus
  const codexBlockedReason = getCodexBlockedReason(report)
  const copilotBlockedReason = getCopilotBlockedReason(report)
  const minimaxBlockedReason = getMinimaxBlockedReason(report)
  const setupStatus = getServerSetupStatus(report)
  const setupProgress = getSetupProgress(report)
  const showingCachedSetup = !!report && revalidating && reportSource === 'cache'
  const checkingSetup = !hydrated || revalidating
  const canContinue = setupStatus.ready && hasLiveConfirmation && !revalidating
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
  const [showOpenCodeWizard, setShowOpenCodeWizard] = useState(false)
  const [showPkgWizard, setShowPkgWizard] = useState(false)
  const [showPkgAnimation, setShowPkgAnimation] = useState(false)
  const [showDockerWizard, setShowDockerWizard] = useState(false)
  const [showDockerAnimation, setShowDockerAnimation] = useState(false)
  const [showPythonWizard, setShowPythonWizard] = useState(false)
  const [showRustWizard, setShowRustWizard] = useState(false)
  const [showRustAnimation, setShowRustAnimation] = useState(false)
  const [showGoWizard, setShowGoWizard] = useState(false)
  const [showTypeScriptWizard, setShowTypeScriptWizard] = useState(false)
  const [showTypeScriptAnimation, setShowTypeScriptAnimation] = useState(false)
  const [showMissingDialogue, setShowMissingDialogue] = useState(false)
  const [showMinimaxWizard, setShowMinimaxWizard] = useState(false)

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

  const handleOpenCodeWizard = useCallback(() => {
    console.log('[ServerSetup] Opening OpenCode wizard')
    setShowOpenCodeWizard(true)
  }, [])

  const handleOpenCodeWizardComplete = useCallback(() => {
    console.log('[ServerSetup] OpenCode wizard complete')
    setShowOpenCodeWizard(false)
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

  const handleDockerWizard = useCallback(() => {
    console.log('[ServerSetup] Opening Docker wizard')
    setShowDockerWizard(true)
  }, [])

  const handleDockerWizardComplete = useCallback(() => {
    console.log('[ServerSetup] Docker wizard complete')
    setShowDockerWizard(false)
    setShowDockerAnimation(true)
  }, [])

  const handleDockerAnimationComplete = useCallback(() => {
    setShowDockerAnimation(false)
  }, [])

  const handleMinimaxWizard = useCallback(() => {
    if (minimaxBlockedReason) {
      Alert.alert(
        'Install OpenCode first',
        minimaxBlockedReason,
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Open OpenCode Setup', onPress: () => setShowOpenCodeWizard(true) },
        ],
      )
      return
    }
    setShowMinimaxWizard(true)
  }, [minimaxBlockedReason])

  const handleMinimaxWizardComplete = useCallback(() => {
    setShowMinimaxWizard(false)
  }, [])

  const handlePythonWizard = useCallback(() => {
    console.log('[ServerSetup] Opening Python wizard')
    setShowPythonWizard(true)
  }, [])

  const handlePythonWizardComplete = useCallback(() => {
    console.log('[ServerSetup] Python wizard complete')
    setShowPythonWizard(false)
  }, [])

  const handleRustWizard = useCallback(() => {
    console.log('[ServerSetup] Opening Rust wizard')
    setShowRustWizard(true)
  }, [])

  const handleRustWizardComplete = useCallback(() => {
    console.log('[ServerSetup] Rust wizard complete')
    setShowRustWizard(false)
    setShowRustAnimation(true)
  }, [])

  const handleRustAnimationComplete = useCallback(() => {
    setShowRustAnimation(false)
  }, [])

  const handleGoWizard = useCallback(() => {
    console.log('[ServerSetup] Opening Go wizard')
    setShowGoWizard(true)
  }, [])

  const handleGoWizardComplete = useCallback(() => {
    console.log('[ServerSetup] Go wizard complete')
    setShowGoWizard(false)
  }, [])

  const handleTypeScriptWizard = useCallback(() => {
    console.log('[ServerSetup] Opening TypeScript wizard')
    setShowTypeScriptWizard(true)
  }, [])

  const handleTypeScriptWizardComplete = useCallback(() => {
    console.log('[ServerSetup] TypeScript wizard complete')
    setShowTypeScriptWizard(false)
    setShowTypeScriptAnimation(true)
  }, [])

  const handleTypeScriptAnimationComplete = useCallback(() => {
    setShowTypeScriptAnimation(false)
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

  const logosHeight = scrollY.interpolate({
    inputRange: [0, 80],
    outputRange: [36, 0],
    extrapolate: 'clamp',
  })

  const logosOpacity = scrollY.interpolate({
    inputRange: [0, 50],
    outputRange: [1, 0],
    extrapolate: 'clamp',
  })

  const STEP_LOGO_MAP: Record<string, { light: any; dark: any }> = {
    git: { light: Assets.gitBlack, dark: Assets.gitWhite },
    npm: { light: Assets.npmBlack, dark: Assets.npmWhite },
    ai: { light: Assets.claudeBlack, dark: Assets.claudeWhite },
    python: { light: Assets.pythonBlack, dark: Assets.pythonWhite },
    rust: { light: Assets.rustBlack, dark: Assets.rustWhite },
    go: { light: Assets.goBlack, dark: Assets.goWhite },
    typescript: { light: Assets.typescriptBlack, dark: Assets.typescriptWhite },
  }

  const workspaceStateLabel =
    !hydrated || (!report && revalidating)
      ? 'Checking…'
      : showingCachedSetup
        ? 'Checking…'
        : revalidating
          ? 'Refreshing'
          : setupStatus.ready
            ? 'Ready'
            : 'In Progress'

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
                  backgroundColor: canContinue ? bauhaus.yellow : (isDark ? 'rgba(255,255,255,0.07)' : 'rgba(26,26,26,0.05)'),
                  borderColor: canContinue ? bauhaus.yellow : colors.border,
                },
              ]}
            >
              <Text style={[styles.statusBlockLabel, { color: canContinue ? bauhaus.black : colors.textTertiary }]}>Workspace</Text>
              <View style={styles.statusBlockValueRow}>
                {checkingSetup && (
                  <ActivityIndicator
                    size="small"
                    color={canContinue ? bauhaus.black : colors.textTertiary}
                  />
                )}
                <Text style={[styles.statusBlockValue, { color: canContinue ? bauhaus.black : colors.text }]}>
                  {workspaceStateLabel}
                </Text>
              </View>
            </View>
            <View style={[styles.statusBlock, { backgroundColor: bauhaus.blue, borderColor: bauhaus.blue }]}>
              <Text style={[styles.statusBlockLabel, { color: 'rgba(255,255,255,0.72)' }]}>Mode</Text>
              <Text style={[styles.statusBlockValue, { color: '#ffffff' }]}>Guided Setup</Text>
            </View>
          </Animated.View>

          {/* Progress bar with logos */}
          <View style={styles.progressSection}>
            <Animated.View style={[styles.progressLogos, { height: logosHeight, opacity: logosOpacity }]}>
              {setupProgress.steps.map((step) => {
                const asset = STEP_LOGO_MAP[step.id]
                return (
                  <View key={step.id} style={styles.progressStep}>
                    <View style={[
                      styles.progressIcon,
                      {
                        backgroundColor: isDark ? 'rgba(255,255,255,0.07)' : 'rgba(26,26,26,0.05)',
                        borderColor: step.done ? bauhaus.yellow : colors.border,
                      },
                    ]}>
                      {asset ? (
                        <Image
                          source={isDark ? asset.dark : asset.light}
                          style={[styles.progressLogoImg, !step.done && styles.progressLogoInactive]}
                          resizeMode="contain"
                        />
                      ) : null}
                      {step.done && (
                        <View style={[styles.progressBadge, { backgroundColor: bauhaus.yellow }]}>
                          <Check color={bauhaus.black} size={8} strokeWidth={3.5} />
                        </View>
                      )}
                    </View>
                    <Text style={[styles.progressLabel, { color: step.done ? colors.text : colors.textTertiary }]}>
                      {step.label}
                    </Text>
                  </View>
                )
              })}
            </Animated.View>
            <View style={styles.progressBarTrack}>
              <View
                style={[
                  styles.progressBarFill,
                  {
                    backgroundColor: setupProgress.fraction === 1 ? bauhaus.yellow : bauhaus.blue,
                    width: `${Math.max(setupProgress.fraction * 100, 2)}%`,
                  },
                ]}
              />
            </View>
          </View>
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
          onOpenCodeWizard={handleOpenCodeWizard}
          onPkgWizard={handlePkgWizard}
          onPythonWizard={handlePythonWizard}
          onRustWizard={handleRustWizard}
          onGoWizard={handleGoWizard}
          onTypeScriptWizard={handleTypeScriptWizard}
          onDockerWizard={handleDockerWizard}
          onMinimaxWizard={handleMinimaxWizard}
          onScroll={Animated.event(
            [{ nativeEvent: { contentOffset: { y: scrollY } } }],
            { useNativeDriver: false },
          )}
        />

        <View style={styles.footer}>
          <TouchableOpacity
            style={[
              styles.continueButton,
              { backgroundColor: canContinue ? bauhaus.red : colors.border },
            ]}
            onPress={() => {
              if (!hydrated || showingCachedSetup || (!hasLiveConfirmation && revalidating)) {
                Alert.alert(
                  'Checking workspace',
                  'PocketDev is still confirming your workspace tools with the server. Please wait a moment.',
                )
                return
              }
              if (!setupStatus.ready) {
                setShowMissingDialogue(true)
                return
              }
              setShowConnected(true)
            }}
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

        {showInstall && (
          <InstallSheet
            tool={installTool}
            command={installCommand}
            onDismiss={() => setShowInstall(false)}
            onAiInspect={handleAiInspect}
          />
        )}

        {showInspect && (
          <AiInspectSheet
            failedCommand={inspectCommand}
            failedOutput={inspectOutput}
            onDismiss={() => setShowInspect(false)}
            onFixCommand={handleFixCommand}
          />
        )}

        {showGitWizard && (
          <GitWizardSheet
            onDismiss={() => setShowGitWizard(false)}
            onComplete={handleGitWizardComplete}
          />
        )}

        {showClaudeWizard && (
          <ClaudeWizardSheet
            onDismiss={() => setShowClaudeWizard(false)}
            onComplete={handleClaudeWizardComplete}
          />
        )}

        {showCodexWizard && (
          <CodexWizardSheet
            onDismiss={() => setShowCodexWizard(false)}
            onComplete={handleCodexWizardComplete}
          />
        )}

        {showCopilotWizard && (
          <CopilotWizardSheet
            onDismiss={() => setShowCopilotWizard(false)}
            onComplete={handleCopilotWizardComplete}
          />
        )}

        {showOpenCodeWizard && (
          <OpenCodeWizardSheet
            onDismiss={() => setShowOpenCodeWizard(false)}
            onComplete={handleOpenCodeWizardComplete}
          />
        )}

        {showPkgWizard && (
          <PackageManagerWizardSheet
            onDismiss={() => setShowPkgWizard(false)}
            onComplete={handlePkgWizardComplete}
          />
        )}

        {showPythonWizard && (
          <PythonWizardSheet
            onDismiss={() => setShowPythonWizard(false)}
            onComplete={handlePythonWizardComplete}
          />
        )}

        {showRustWizard && (
          <RustWizardSheet
            onDismiss={() => setShowRustWizard(false)}
            onComplete={handleRustWizardComplete}
          />
        )}

        {showGoWizard && (
          <GoWizardSheet
            onDismiss={() => setShowGoWizard(false)}
            onComplete={handleGoWizardComplete}
          />
        )}

        {showTypeScriptWizard && (
          <TypeScriptWizardSheet
            onDismiss={() => setShowTypeScriptWizard(false)}
            onComplete={handleTypeScriptWizardComplete}
          />
        )}

        {showDockerWizard && (
          <DockerWizardSheet
            onDismiss={() => setShowDockerWizard(false)}
            onComplete={handleDockerWizardComplete}
          />
        )}

        {showMinimaxWizard && (
          <MinimaxWizardSheet
            onDismiss={() => setShowMinimaxWizard(false)}
            onComplete={handleMinimaxWizardComplete}
          />
        )}

        <Dialogue
          visible={showMissingDialogue}
          variant="alert"
          title="Setup incomplete"
          description={`The following tools still need to be configured:\n\n${setupStatus.missing.map((m) => `•  ${m}`).join('\n')}`}
          onClose={() => setShowMissingDialogue(false)}
        />
      </View>
      {showConnected && <ConnectedAnimation onComplete={handleConnectedComplete} />}
      {showGitHubAnimation && (
        <GitHubSetupAnimation onComplete={handleGitHubAnimationComplete} />
      )}
      {showPkgAnimation && (
        <PackageInstallAnimation onComplete={handlePkgAnimationComplete} />
      )}
      {showDockerAnimation && (
        <DockerSetupAnimation onComplete={handleDockerAnimationComplete} />
      )}
      {showRustAnimation && (
        <RustSetupAnimation onComplete={handleRustAnimationComplete} />
      )}
      {showTypeScriptAnimation && (
        <TypeScriptSetupAnimation onComplete={handleTypeScriptAnimationComplete} />
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
  statusBlockValueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
  },
  progressSection: {
    marginTop: spacing[3],
    gap: spacing[2],
  },
  progressLogos: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    overflow: 'hidden',
    paddingTop: 6,
    paddingHorizontal: 6,
  },
  progressStep: {
    alignItems: 'center',
    gap: 4,
  },
  progressIcon: {
    width: 28,
    height: 28,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressLogoImg: {
    width: 16,
    height: 16,
  },
  progressLogoInactive: {
    opacity: 0.4,
  },
  progressBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    width: 14,
    height: 14,
    borderRadius: 7,
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressLabel: {
    ...typographyScale.xs,
    fontWeight: '600',
    fontSize: 10,
  },
  progressBarTrack: {
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(128,128,128,0.15)',
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 3,
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

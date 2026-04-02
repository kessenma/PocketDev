import React, { useState, useCallback } from 'react'
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native'
import { useTheme } from '../contexts/ThemeContext'
import { spacing, borderRadius, typographyScale } from '@pocketdev/shared/theme'
import { useSetupStore } from '../stores/setup'
import SetupChecklist from '../components/setup/SetupChecklist'
import InstallSheet from '../components/setup/InstallSheet'
import AiInspectSheet from '../components/setup/AiInspectSheet'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import type { RootStackParamList } from '../navigation/types'
import type { ToolCheck } from '@pocketdev/shared/types'
import AnimatedGradientBackground from '../components/background/AnimatedGradientBackground'
import { ArrowRight, ChevronLeft, ShieldCheck, Wrench } from 'lucide-react-native'

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'ServerSetup'>
}

export default function ServerSetupScreen({ navigation }: Props) {
  const { colors, isDark } = useTheme()
  const report = useSetupStore((s) => s.report)

  const [installTool, setInstallTool] = useState<ToolCheck | null>(null)
  const [installCommand, setInstallCommand] = useState<string | null>(null)
  const [showInstall, setShowInstall] = useState(false)

  const [inspectCommand, setInspectCommand] = useState('')
  const [inspectOutput, setInspectOutput] = useState('')
  const [showInspect, setShowInspect] = useState(false)

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
    backgroundColor: isDark ? 'rgba(23, 23, 23, 0.56)' : 'rgba(255, 255, 255, 0.52)',
    borderColor: isDark ? 'rgba(115, 115, 115, 0.3)' : 'rgba(212, 212, 212, 0.64)',
  }

  return (
    <AnimatedGradientBackground colors={colors} isDark={isDark} variant="setup">
      <View style={styles.container}>
        <View style={[styles.header, styles.headerCard, headerCardStyle]}>
          <TouchableOpacity
            style={[styles.backButton, { borderColor: colors.borderStrong }]}
            onPress={() => navigation.replace('Connect')}
            activeOpacity={0.7}
          >
            <ChevronLeft color={colors.text} size={22} strokeWidth={2.25} />
          </TouchableOpacity>
          <View style={styles.eyebrowRow}>
            <ShieldCheck color={colors.textTertiary} size={14} strokeWidth={2.25} />
            <Text style={[styles.eyebrow, { color: colors.textTertiary }]}>Server readiness</Text>
          </View>
          <View style={styles.titleRow}>
            <Wrench color={colors.primary} size={24} strokeWidth={2.2} />
            <Text style={[styles.title, { color: colors.text }]}>Server Setup</Text>
          </View>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            Ensure your server has the required developer tools
          </Text>
        </View>

        <SetupChecklist onInstall={handleInstall} onAuthenticate={handleAuthenticate} />

        <View style={styles.footer}>
          <TouchableOpacity
            style={[
              styles.continueButton,
              { backgroundColor: report?.ready ? colors.primary : colors.border },
            ]}
            onPress={() => navigation.replace('Main')}
            disabled={!report?.ready}
            activeOpacity={0.7}
          >
            <View style={styles.continueContent}>
              <Text style={[styles.continueText, { color: colors.primaryText }]}>Continue</Text>
              <ArrowRight color={colors.primaryText} size={18} strokeWidth={2.25} />
            </View>
          </TouchableOpacity>

          <TouchableOpacity onPress={() => navigation.replace('Main')} activeOpacity={0.7}>
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
      </View>
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
    paddingBottom: spacing[2],
    gap: spacing[1],
    marginHorizontal: spacing[4],
    marginTop: spacing[4],
    borderWidth: 1,
    borderRadius: borderRadius.xl,
  },
  headerCard: {
    paddingBottom: spacing[4],
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing[2],
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
  },
  subtitle: {
    ...typographyScale.sm,
  },
  footer: {
    paddingHorizontal: spacing[6],
    paddingBottom: spacing[10],
    gap: spacing[3],
    alignItems: 'center',
  },
  continueButton: {
    width: '100%',
    borderRadius: borderRadius.lg,
    paddingVertical: spacing[4],
    alignItems: 'center',
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

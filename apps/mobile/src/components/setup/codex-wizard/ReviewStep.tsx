import React from 'react'
import { View, Text, Image, TouchableOpacity, ScrollView, StyleSheet } from 'react-native'
import { useTheme } from '../../../contexts/ThemeContext'
import { spacing, borderRadius, typographyScale } from '@pocketdev/shared/theme'
import { Assets } from '../../../../assets'
import { Check, CircleAlert, ShieldCheck, TerminalSquare } from 'lucide-react-native'
import type { CodexSetupStatus } from '@pocketdev/shared/types'

type WizardAction =
  | { type: 'STEP_COMPLETE'; step: 'review' }

interface Props {
  codexStatus: CodexSetupStatus | null
  npmReady: boolean
  dispatch: (action: WizardAction) => void
}

export default function ReviewStep({ codexStatus, npmReady, dispatch }: Props) {
  const { colors, isDark } = useTheme()

  const installNeeded = !codexStatus?.installed
  const authNeeded = !codexStatus?.authenticated
  const tasks = [
    installNeeded ? 'Install Codex CLI with npm' : 'Codex CLI already installed',
    authNeeded ? 'Sign in with your OpenAI account' : 'OpenAI account already connected',
    'Verify the CLI and sync the stored tool state',
  ]

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.hero}>
          <Image
            source={isDark ? Assets.codexWhite : Assets.codexBlack}
            style={styles.logo}
            resizeMode="contain"
          />
          <Text style={[styles.title, { color: colors.text }]}>Codex setup plan</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            PocketDev will guide installation, sign-in, and verification without dropping you into a raw terminal.
          </Text>
        </View>

        <View style={[styles.statusCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <StatusRow
            icon={npmReady ? <Check color="#22c55e" size={18} strokeWidth={2.25} /> : <CircleAlert color={colors.error} size={18} strokeWidth={2.25} />}
            label="npm prerequisite"
            value={npmReady ? 'Ready' : 'Missing'}
            detail={npmReady ? 'Codex can be installed from the server-wide npm toolchain.' : 'Package managers must be installed before Codex setup can continue.'}
            colors={colors}
          />
          <StatusRow
            icon={<TerminalSquare color={colors.primary} size={18} strokeWidth={2.25} />}
            label="Codex CLI"
            value={codexStatus?.installed ? `Installed${codexStatus.version ? ` · v${codexStatus.version}` : ''}` : 'Not installed'}
            detail={codexStatus?.path ?? 'PocketDev will install Codex globally so the agent can launch it directly.'}
            colors={colors}
          />
          <StatusRow
            icon={<ShieldCheck color={colors.primary} size={18} strokeWidth={2.25} />}
            label="Authentication"
            value={codexStatus?.authenticated ? 'Connected' : 'Needs sign-in'}
            detail={codexStatus?.authenticated
              ? 'Stored provider availability will stay in sync after verification.'
              : 'You will complete a browser-based OpenAI sign-in flow from this wizard.'}
            colors={colors}
          />
        </View>

        <View style={[styles.planCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.planLabel, { color: colors.textTertiary }]}>What happens next</Text>
          {tasks.map((task, index) => (
            <View key={task} style={styles.planRow}>
              <View style={[styles.planNumber, { backgroundColor: colors.primary + '18' }]}>
                <Text style={[styles.planNumberText, { color: colors.primary }]}>{index + 1}</Text>
              </View>
              <Text style={[styles.planText, { color: colors.text }]}>{task}</Text>
            </View>
          ))}
        </View>
      </ScrollView>

      <TouchableOpacity
        style={[styles.continueButton, { backgroundColor: colors.primary }]}
        onPress={() => dispatch({ type: 'STEP_COMPLETE', step: 'review' })}
        activeOpacity={0.7}
      >
        <Text style={[styles.continueText, { color: colors.primaryText }]}>
          {installNeeded || authNeeded ? 'Continue setup' : 'Re-verify Codex'}
        </Text>
      </TouchableOpacity>
    </View>
  )
}

function StatusRow({
  icon,
  label,
  value,
  detail,
  colors,
}: {
  icon: React.ReactNode
  label: string
  value: string
  detail: string
  colors: ReturnType<typeof useTheme>['colors']
}) {
  return (
    <View style={styles.statusRow}>
      <View style={styles.statusIcon}>{icon}</View>
      <View style={styles.statusText}>
        <Text style={[styles.statusLabel, { color: colors.textTertiary }]}>{label}</Text>
        <Text style={[styles.statusValue, { color: colors.text }]}>{value}</Text>
        <Text style={[styles.statusDetail, { color: colors.textSecondary }]}>{detail}</Text>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    gap: spacing[3],
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    gap: spacing[3],
    paddingBottom: spacing[4],
  },
  hero: {
    alignItems: 'center',
    gap: spacing[2],
    paddingTop: spacing[4],
  },
  logo: {
    width: 42,
    height: 42,
  },
  title: {
    ...typographyScale.xl,
    fontWeight: '700',
    textAlign: 'center',
  },
  subtitle: {
    ...typographyScale.sm,
    textAlign: 'center',
  },
  statusCard: {
    borderWidth: 1,
    borderRadius: borderRadius.lg,
    padding: spacing[4],
    gap: spacing[4],
  },
  statusRow: {
    flexDirection: 'row',
    gap: spacing[3],
  },
  statusIcon: {
    width: 20,
    alignItems: 'center',
    marginTop: 2,
  },
  statusText: {
    flex: 1,
    gap: 2,
  },
  statusLabel: {
    ...typographyScale.xs,
    textTransform: 'uppercase',
    fontWeight: '700',
    letterSpacing: 1,
  },
  statusValue: {
    ...typographyScale.base,
    fontWeight: '700',
  },
  statusDetail: {
    ...typographyScale.sm,
    lineHeight: 20,
  },
  planCard: {
    borderWidth: 1,
    borderRadius: borderRadius.lg,
    padding: spacing[4],
    gap: spacing[3],
  },
  planLabel: {
    ...typographyScale.xs,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  planRow: {
    flexDirection: 'row',
    gap: spacing[3],
    alignItems: 'center',
  },
  planNumber: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  planNumberText: {
    ...typographyScale.sm,
    fontWeight: '700',
  },
  planText: {
    ...typographyScale.sm,
    flex: 1,
    lineHeight: 20,
  },
  continueButton: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing[4],
    borderRadius: borderRadius.lg,
  },
  continueText: {
    ...typographyScale.base,
    fontWeight: '600',
  },
})

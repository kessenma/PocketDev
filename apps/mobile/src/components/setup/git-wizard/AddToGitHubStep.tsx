import React, { useState } from 'react'
import { View, Text, TouchableOpacity, StyleSheet, Linking, Image, ScrollView, Dimensions } from 'react-native'
import Clipboard from '@react-native-clipboard/clipboard'
import { useTheme } from '../../../contexts/ThemeContext'
import { spacing, borderRadius } from '@pocketdev/shared/theme'
import { typeStyles } from '../../../theme/typography'
import { Assets } from '../../../../assets'
import { Copy, Check, ExternalLink, ArrowRight } from 'lucide-react-native'

const GITHUB_KEY_URL = 'https://github.com/settings/ssh/new'

type WizardAction = { type: 'STEP_COMPLETE'; step: 'add-to-github' }

interface Props {
  dispatch: (action: WizardAction) => void
  publicKey: string | null
}

export default function AddToGitHubStep({ dispatch, publicKey }: Props) {
  const { colors, isDark } = useTheme()
  const [copied, setCopied] = useState(false)

  function handleCopy() {
    if (publicKey) {
      Clipboard.setString(publicKey)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  function handleOpenGitHub() {
    Linking.openURL(GITHUB_KEY_URL)
  }

  function handleConfirm() {
    dispatch({ type: 'STEP_COMPLETE', step: 'add-to-github' })
  }

  const githubLogo = isDark ? Assets.githubWhite : Assets.githubBlack

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      {/* GitHub logo */}
      <View style={styles.logoRow}>
        <Image source={githubLogo} style={styles.logo} resizeMode="contain" />
      </View>

      <Text style={[styles.title, { color: colors.text }]}>Add Workspace Key to GitHub</Text>
      <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
        Add this workspace key to your GitHub account so it can sync code.
      </Text>

      {/* Key display + copy */}
      {publicKey && (
        <View style={[styles.keyCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.keyText, { color: colors.text }]} numberOfLines={3} selectable>
            {publicKey}
          </Text>
          <TouchableOpacity
            style={[styles.copyButton, { backgroundColor: copied ? '#22c55e' : colors.background }]}
            onPress={handleCopy}
            activeOpacity={0.7}
          >
            {copied ? (
              <>
                <Check color="#fff" size={14} strokeWidth={2.5} />
                <Text style={[styles.copyText, { color: '#fff' }]}>Copied!</Text>
              </>
            ) : (
              <>
                <Copy color={colors.text} size={14} strokeWidth={2.25} />
                <Text style={[styles.copyText, { color: colors.text }]}>Copy Key</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      )}

      {/* Instructions */}
      <View style={[styles.instructionsCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <InstructionStep
          number={1}
          text="Open GitHub key settings"
          action={
            <TouchableOpacity
              style={[styles.linkButton, { backgroundColor: colors.primary }]}
              onPress={handleOpenGitHub}
              activeOpacity={0.7}
            >
              <ExternalLink color={colors.primaryText} size={14} strokeWidth={2.25} />
              <Text style={[styles.linkButtonText, { color: colors.primaryText }]}>Open GitHub</Text>
            </TouchableOpacity>
          }
          colors={colors}
        />
        <InstructionStep
          number={2}
          text={'Name it "PocketDev" (or anything you\'ll recognize)'}
          colors={colors}
        />
        <InstructionStep
          number={3}
          text="Paste the workspace key you copied above into the Key field"
          colors={colors}
        />
        <InstructionStep
          number={4}
          text='Click "Add key"'
          colors={colors}
        />
      </View>

      {/* Reference screenshot */}
      <View style={[styles.screenshotCard, { borderColor: colors.border }]}>
        <Text style={[styles.screenshotLabel, { color: colors.textTertiary }]}>
          Here's what it looks like
        </Text>
        <Image
          source={Assets.githubAddSshScreen}
          style={styles.screenshot}
          resizeMode="contain"
        />
      </View>

      {/* Confirmation */}
      <TouchableOpacity
        style={[styles.confirmButton, { backgroundColor: colors.primary }]}
        onPress={handleConfirm}
        activeOpacity={0.7}
      >
          <Text style={[styles.confirmText, { color: colors.primaryText }]}>I&apos;ve Added the Key</Text>
        <ArrowRight color={colors.primaryText} size={18} strokeWidth={2.25} />
      </TouchableOpacity>
    </ScrollView>
  )
}

function InstructionStep({
  number,
  text,
  action,
  colors,
}: {
  number: number
  text: string
  action?: React.ReactNode
  colors: ReturnType<typeof useTheme>['colors']
}) {
  return (
    <View style={styles.instructionRow}>
      <View style={[styles.numberCircle, { backgroundColor: colors.primary + '20' }]}>
        <Text style={[styles.numberText, { color: colors.primary }]}>{number}</Text>
      </View>
      <View style={styles.instructionContent}>
        <Text style={[styles.instructionText, { color: colors.text }]}>{text}</Text>
        {action}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  contentContainer: {
    gap: spacing[3],
    paddingBottom: spacing[6],
  },
  logoRow: {
    alignItems: 'center',
    marginTop: spacing[4],
  },
  logo: {
    width: 40,
    height: 40,
  },
  title: {
    ...typeStyles.screenTitle,
    textAlign: 'center',
  },
  subtitle: {
    ...typeStyles.bodySmall,
    textAlign: 'center',
    paddingHorizontal: spacing[2],
  },
  keyCard: {
    borderWidth: 1,
    borderRadius: borderRadius.lg,
    padding: spacing[3],
    gap: spacing[2],
  },
  keyText: {
    ...typeStyles.mono,
  },
  copyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing[1],
    paddingVertical: spacing[2],
    borderRadius: borderRadius.md,
  },
  copyText: {
    ...typeStyles.meta,
  },
  instructionsCard: {
    borderWidth: 1,
    borderRadius: borderRadius.lg,
    padding: spacing[4],
    gap: spacing[4],
  },
  instructionRow: {
    flexDirection: 'row',
    gap: spacing[3],
  },
  numberCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  numberText: {
    ...typeStyles.bodyStrong,
  },
  instructionContent: {
    flex: 1,
    gap: spacing[2],
    justifyContent: 'center',
  },
  instructionText: {
    ...typeStyles.bodySmall,
  },
  linkButton: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: spacing[1],
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
    borderRadius: borderRadius.md,
  },
  linkButtonText: {
    ...typeStyles.meta,
  },
  screenshotCard: {
    borderWidth: 1,
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
    paddingTop: spacing[3],
  },
  screenshotLabel: {
    ...typeStyles.sectionTitle,
    paddingHorizontal: spacing[3],
    marginBottom: spacing[2],
  },
  screenshot: {
    width: Dimensions.get('window').width - spacing[4] * 2 - 2,
    height: 200,
    alignSelf: 'center',
  },
  confirmButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing[2],
    paddingVertical: spacing[4],
    borderRadius: borderRadius.lg,
    marginTop: spacing[2],
  },
  confirmText: {
    ...typeStyles.button,
  },
})

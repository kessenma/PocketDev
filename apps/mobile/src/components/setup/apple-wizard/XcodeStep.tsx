import React, { useCallback, useMemo, useState } from 'react'
import { View, Text, TextInput, TouchableOpacity, ScrollView } from 'react-native'
import { ArrowRight, Check, Download, Hammer, TriangleAlert } from 'lucide-react-native'
import type { AppleSetupStatus } from '@pocketdev/shared/types'
import { useTheme } from '../../../contexts/ThemeContext'
import { useConnectionStore } from '../../../stores/connection'
import { fetchAppleSetupStatus, postAppleXcodesCommand } from '../../../services/api'
import { playInstallSuccessHaptic } from '../shared/haptics'
import AppleCommandPanel from './AppleCommandPanel'
import MethodOption from './MethodOption'
import { useAppleCommand } from './useAppleCommand'
import { APPLE_ID_PATTERN, getXcodesPrompts, isAppleStepDone } from './apple-setup-utils'
import { stepStyles as styles } from './styles'

export interface AppleStepProps {
  status: AppleSetupStatus
  onStatus: (status: AppleSetupStatus) => void
  onContinue: () => void
}

type Method = 'app_store' | 'download'

const RUN_COPY: Record<string, { running: string; success: string; failure: string; hint?: string }> = {
  appstore: {
    running: 'Installing Xcode from the App Store…',
    success: 'Xcode installed',
    failure: 'App Store install failed',
    hint: 'This is a large download. If nothing happens, check the Mac — Apple may ask you to confirm there.',
  },
  xcodes: {
    running: 'Downloading Xcode…',
    success: 'Xcode installed',
    failure: 'Xcode download failed',
    hint: 'Usually takes 20–60 minutes. Keep PocketDev open until it finishes.',
  },
  finish: {
    running: 'Finishing Xcode setup…',
    success: 'Xcode is set up',
    failure: 'Xcode setup failed',
  },
  platform: {
    running: 'Downloading the iOS platform…',
    success: 'iOS platform installed',
    failure: 'iOS platform download failed',
    hint: 'A few GB — this can take a while.',
  },
}

export default function XcodeStep({ status, onStatus, onContinue }: AppleStepProps) {
  const { colors } = useTheme()
  const server = useConnectionStore((s) => s.server)
  const [method, setMethod] = useState<Method>('app_store')
  const [appleId, setAppleId] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [preparing, setPreparing] = useState(false)

  const refresh = useCallback(async () => {
    if (!server) return
    try {
      onStatus(await fetchAppleSetupStatus(server.ip, server.port))
    } catch {
      // keep the last known status
    }
  }, [server, onStatus])

  const prompts = useMemo(() => getXcodesPrompts(appleId.trim()), [appleId])
  const runner = useAppleCommand({
    securePrompts: prompts,
    onFinish: (_key, result) => {
      if (result === 'ok') playInstallSuccessHaptic()
      refresh()
    },
  })

  const { xcode, commands } = status
  const busy = runner.running || preparing
  const canRun = runner.connected && !busy
  const copy = RUN_COPY[runner.runKey ?? ''] ?? RUN_COPY.finish
  const done = isAppleStepDone('xcode', status)

  async function handleDownload() {
    if (!server) return
    const email = appleId.trim()
    if (!APPLE_ID_PATTERN.test(email)) {
      setError('Enter the email address of your Apple Account.')
      return
    }
    setError(null)
    setPreparing(true)
    try {
      const command = await postAppleXcodesCommand(server.ip, server.port, email)
      runner.run('xcodes', command)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not prepare the download.')
    } finally {
      setPreparing(false)
    }
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer} keyboardShouldPersistTaps="handled">
      <Text style={[styles.title, { color: colors.text }]}>Xcode</Text>
      <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
        Agents need Xcode on this Mac to build and sign iOS apps.
      </Text>

      {!xcode.installed && (
        <>
          <View style={styles.optionRow}>
            <MethodOption
              title="App Store"
              body="Simplest if this Mac is signed in to the App Store."
              selected={method === 'app_store'}
              onPress={() => setMethod('app_store')}
            />
            <MethodOption
              title="Apple Developer"
              body="Download directly with your Apple Account."
              selected={method === 'download'}
              onPress={() => setMethod('download')}
            />
          </View>

          {method === 'app_store' ? (
            <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Text style={[styles.cardBody, { color: colors.textSecondary }]}>
                Installs the latest Xcode through the Mac App Store. The Mac needs to be signed in to the App Store,
                and Apple may ask you to confirm on the Mac itself. You may be asked for your Mac password.
              </Text>
              <TouchableOpacity
                style={[styles.actionButton, { backgroundColor: colors.primary }, !canRun && styles.disabled]}
                onPress={() => runner.run('appstore', commands.install_xcode_app_store)}
                disabled={!canRun}
                activeOpacity={0.7}
              >
                <Download color={colors.primaryText} size={18} strokeWidth={2.25} />
                <Text style={[styles.buttonText, { color: colors.primaryText }]}>Install from App Store</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Text style={[styles.label, { color: colors.textTertiary }]}>Apple Account email</Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
                value={appleId}
                onChangeText={setAppleId}
                placeholder="name@example.com"
                placeholderTextColor={colors.textTertiary}
                keyboardType="email-address"
                textContentType="emailAddress"
                autoCapitalize="none"
                autoCorrect={false}
                editable={!busy}
              />
              <Text style={[styles.cardBody, { color: colors.textSecondary }]}>
                Xcode is a multi-GB download and usually takes 20–60 minutes. Keep PocketDev open until it finishes.
                Your password and verification code go straight to Apple’s sign-in on your Mac.
              </Text>
              {error ? <Text style={[styles.cardBody, { color: colors.error }]}>{error}</Text> : null}
              <TouchableOpacity
                style={[styles.actionButton, { backgroundColor: colors.primary }, (!canRun || !appleId.trim()) && styles.disabled]}
                onPress={handleDownload}
                disabled={!canRun || !appleId.trim()}
                activeOpacity={0.7}
              >
                <Download color={colors.primaryText} size={18} strokeWidth={2.25} />
                <Text style={[styles.buttonText, { color: colors.primaryText }]}>Download Xcode</Text>
              </TouchableOpacity>
            </View>
          )}
        </>
      )}

      {xcode.installed && (
        <View style={[styles.card, styles.successCard]}>
          <View style={styles.cardHeader}>
            <Check color="#22c55e" size={18} strokeWidth={2.5} />
            <Text style={[styles.cardTitle, styles.successText]}>
              Xcode{xcode.version ? ` ${xcode.version}` : ''} is installed
            </Text>
          </View>
          {xcode.app_path ? (
            <Text style={[styles.cardMeta, { color: colors.textTertiary }]}>{xcode.app_path}</Text>
          ) : null}
          {xcode.build ? (
            <Text style={[styles.cardMeta, { color: colors.textTertiary }]}>Build {xcode.build}</Text>
          ) : null}
        </View>
      )}

      {xcode.installed && xcode.beta && (
        <View style={[styles.card, { backgroundColor: colors.warningBackground, borderColor: colors.warning }]}>
          <View style={styles.cardHeader}>
            <TriangleAlert color={colors.warning} size={18} strokeWidth={2.25} />
            <Text style={[styles.cardTitle, { color: colors.text }]}>This is a beta Xcode</Text>
          </View>
          <Text style={[styles.cardBody, { color: colors.textSecondary }]}>
            Apps built with a beta Xcode can’t be uploaded to the App Store or TestFlight. Install the current
            release from the App Store to ship builds.
          </Text>
        </View>
      )}

      {xcode.installed && commands.finish_xcode && (
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.cardBody, { color: colors.textSecondary }]}>
            Xcode needs a one-time setup: select it as the active developer directory, accept the license and
            install its extra components. You’ll be asked for your Mac password.
          </Text>
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: colors.primary }, !canRun && styles.disabled]}
            onPress={() => runner.run('finish', commands.finish_xcode!)}
            disabled={!canRun}
            activeOpacity={0.7}
          >
            <Hammer color={colors.primaryText} size={18} strokeWidth={2.25} />
            <Text style={[styles.buttonText, { color: colors.primaryText }]}>Finish Xcode setup</Text>
          </TouchableOpacity>
        </View>
      )}

      {xcode.installed && commands.download_ios_platform && (
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.cardBody, { color: colors.textSecondary }]}>
            The iOS platform (simulator and device support) isn’t installed yet. It’s needed to build iOS apps.
          </Text>
          <TouchableOpacity
            style={[styles.secondaryButton, { borderColor: colors.border }, !canRun && styles.disabled]}
            onPress={() => runner.run('platform', commands.download_ios_platform!)}
            disabled={!canRun}
            activeOpacity={0.7}
          >
            <Download color={colors.text} size={16} strokeWidth={2.25} />
            <Text style={[styles.buttonText, { color: colors.text }]}>Download iOS platform</Text>
          </TouchableOpacity>
        </View>
      )}

      <AppleCommandPanel
        runner={runner}
        runningMessage={copy.running}
        successMessage={copy.success}
        failureMessage={copy.failure}
        runningHint={copy.hint}
      />

      {xcode.installed && !busy && (
        done ? (
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: colors.primary }]}
            onPress={onContinue}
            activeOpacity={0.7}
          >
            <Text style={[styles.buttonText, { color: colors.primaryText }]}>Continue</Text>
            <ArrowRight color={colors.primaryText} size={18} strokeWidth={2.25} />
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={[styles.secondaryButton, { borderColor: colors.border }]}
            onPress={onContinue}
            activeOpacity={0.7}
          >
            <Text style={[styles.buttonText, { color: colors.text }]}>Skip for now</Text>
            <ArrowRight color={colors.text} size={16} strokeWidth={2.25} />
          </TouchableOpacity>
        )
      )}
    </ScrollView>
  )
}

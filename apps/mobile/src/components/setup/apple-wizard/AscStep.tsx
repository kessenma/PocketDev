import React, { useCallback, useRef, useState } from 'react'
import { View, Text, TouchableOpacity, ScrollView, Switch } from 'react-native'
import { ArrowRight, Check, Download } from 'lucide-react-native'
import { useTheme } from '../../../contexts/ThemeContext'
import { useConnectionStore } from '../../../stores/connection'
import { fetchAppleSetupStatus, postAppleTelemetry } from '../../../services/api'
import SetupCommandCard from '../shared/SetupCommandCard'
import { playInstallSuccessHaptic } from '../shared/haptics'
import AppleCommandPanel from './AppleCommandPanel'
import { useAppleCommand } from './useAppleCommand'
import type { AppleStepProps } from './XcodeStep'
import { stepStyles as styles } from './styles'

export default function AscStep({ status, onStatus, onContinue }: AppleStepProps) {
  const { colors } = useTheme()
  const server = useConnectionStore((s) => s.server)
  const { asc, commands } = status
  // Telemetry choice made before installing; applied once asc is installed (suggested: off).
  const [shareUsage, setShareUsage] = useState(false)
  const shareUsageRef = useRef(shareUsage)
  shareUsageRef.current = shareUsage
  const [savingTelemetry, setSavingTelemetry] = useState(false)
  const [telemetryError, setTelemetryError] = useState<string | null>(null)

  const applyTelemetry = useCallback(async (enabled: boolean) => {
    if (!server) return
    setSavingTelemetry(true)
    setTelemetryError(null)
    try {
      onStatus(await postAppleTelemetry(server.ip, server.port, enabled))
    } catch (e) {
      setTelemetryError(e instanceof Error ? e.message : 'Could not update the setting.')
    } finally {
      setSavingTelemetry(false)
    }
  }, [server, onStatus])

  const runner = useAppleCommand({
    onFinish: async (_key, result) => {
      if (!server) return
      if (result === 'ok') {
        playInstallSuccessHaptic()
        await applyTelemetry(shareUsageRef.current)
        return
      }
      try {
        onStatus(await fetchAppleSetupStatus(server.ip, server.port))
      } catch {
        // keep the last known status
      }
    },
  })

  const canRun = runner.connected && !runner.running
  const telemetryOn = asc.installed ? asc.telemetry_enabled === true : shareUsage

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      <Text style={[styles.title, { color: colors.text }]}>asc CLI</Text>
      <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
        asc is an open-source command-line tool for App Store Connect. Agents use it to upload builds to TestFlight.
      </Text>

      {asc.installed ? (
        <View style={[styles.card, styles.successCard]}>
          <View style={styles.cardHeader}>
            <Check color="#22c55e" size={18} strokeWidth={2.5} />
            <Text style={[styles.cardTitle, styles.successText]}>
              asc{asc.version ? ` ${asc.version}` : ''} is installed
            </Text>
          </View>
          {asc.path ? <Text style={[styles.cardMeta, { color: colors.textTertiary }]}>{asc.path}</Text> : null}
        </View>
      ) : (
        !runner.running && runner.runState !== 'ok' && (
          <SetupCommandCard
            description="Installs asc with its official install script (asccli.sh)."
            commands={[commands.install_asc]}
          />
        )
      )}

      <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <View style={styles.switchRow}>
          <Text style={[styles.cardTitle, styles.flex, { color: colors.text }]}>Share usage statistics with asc</Text>
          <Switch
            value={telemetryOn}
            onValueChange={(value) => {
              if (asc.installed) applyTelemetry(value)
              else setShareUsage(value)
            }}
            disabled={savingTelemetry || runner.running}
            trackColor={{ true: colors.primary }}
          />
        </View>
        <Text style={[styles.cardBody, { color: colors.textSecondary }]}>
          {asc.installed
            ? 'asc sends pseudonymous usage statistics (which commands ran, not your apps or keys) by default. You can turn it off here.'
            : 'asc sends pseudonymous usage statistics by default. PocketDev turns this off after installing unless you switch it on.'}
        </Text>
        {telemetryError ? <Text style={[styles.cardBody, { color: colors.error }]}>{telemetryError}</Text> : null}
      </View>

      {!asc.installed && !runner.running && (
        <TouchableOpacity
          style={[styles.actionButton, { backgroundColor: colors.primary }, !canRun && styles.disabled]}
          onPress={() => runner.run('asc', commands.install_asc)}
          disabled={!canRun}
          activeOpacity={0.7}
        >
          <Download color={colors.primaryText} size={18} strokeWidth={2.25} />
          <Text style={[styles.buttonText, { color: colors.primaryText }]}>
            {runner.runState === 'fail' ? 'Try again' : 'Install asc'}
          </Text>
        </TouchableOpacity>
      )}

      <AppleCommandPanel
        runner={runner}
        runningMessage="Installing asc…"
        successMessage="asc installed"
        failureMessage="asc install failed"
      />

      {asc.installed && !runner.running && (
        <TouchableOpacity
          style={[styles.actionButton, { backgroundColor: colors.primary }]}
          onPress={onContinue}
          activeOpacity={0.7}
        >
          <Text style={[styles.buttonText, { color: colors.primaryText }]}>Continue</Text>
          <ArrowRight color={colors.primaryText} size={18} strokeWidth={2.25} />
        </TouchableOpacity>
      )}
    </ScrollView>
  )
}

import React, { useState } from 'react'
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native'
import { useTheme } from '../contexts/ThemeContext'
import { pairWithServer } from '../services/api'
import { useConnectionStore } from '../stores/connection'
import { spacing, borderRadius, typographyScale } from '@pocketdev/shared/theme'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import type { RootStackParamList } from '../navigation/types'
import { useAdaptiveLayout } from '../hooks/useAdaptiveLayout'
import AdaptiveShell from '../components/layout/AdaptiveShell'
import SplitViewLayout from '../components/layout/SplitViewLayout'
import AnimatedGradientBackground from '../components/background/AnimatedGradientBackground'
import { LiquidGlassCard } from '../components/shared/LiquidGlassCard'
import QRScanner, { type QRScanResult } from '../components/QRScanner'
import { ArrowRight, Cable, KeyRound, ScanLine, Server, Sparkles } from 'lucide-react-native'

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'Connect'>
}

export default function ConnectScreen({ navigation }: Props) {
  const { colors, isDark } = useTheme()
  const { layoutMode } = useAdaptiveLayout()
  const setPaired = useConnectionStore((s) => s.setPaired)

  const [ip, setIp] = useState(getDefaultHost())
  const [port, setPort] = useState('4387')
  const [codeInput, setCodeInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [scannerVisible, setScannerVisible] = useState(false)

  const normalizedCode = normalizeSetupCode(codeInput)
  const canSubmit = ip.trim() && port.trim() && normalizedCode.trim() && !loading

  const inputStyle = {
    backgroundColor: isDark ? 'rgba(23, 23, 23, 0.7)' : 'rgba(250, 250, 250, 0.92)',
  }
  const titleIconBadgeStyle = {
    backgroundColor: isDark ? 'rgba(59, 130, 246, 0.16)' : 'rgba(37, 99, 235, 0.1)',
    borderColor: isDark ? 'rgba(96, 165, 250, 0.26)' : 'rgba(37, 99, 235, 0.16)',
  }

  async function handleConnect() {
    setError(null)
    setLoading(true)

    try {
      const portNum = parseInt(port, 10)
      if (isNaN(portNum)) throw new Error('Invalid port number')

      const result = await pairWithServer(ip.trim(), portNum, normalizedCode.trim())
      setPaired({ ip: ip.trim(), port: portNum, deviceId: result.deviceId })
      navigation.replace('ServerSetup')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to connect')
    } finally {
      setLoading(false)
    }
  }

  function handleQRScan(result: QRScanResult) {
    setScannerVisible(false)
    setIp(result.host)
    setPort(String(result.port))
    setCodeInput(result.code)
    // Auto-connect after a brief delay for state to settle
    setTimeout(() => {
      setError(null)
      setLoading(true)
      pairWithServer(result.host, result.port, normalizeSetupCode(result.code).trim())
        .then((pairResult) => {
          setPaired({ ip: result.host, port: result.port, deviceId: pairResult.deviceId })
          navigation.replace('ServerSetup')
        })
        .catch((e) => {
          setError(e instanceof Error ? e.message : 'Failed to connect')
        })
        .finally(() => setLoading(false))
    }, 100)
  }

  const form = (
    <LiquidGlassCard style={styles.formCard}>
      <View style={styles.form}>
        {/* QR Scanner Button */}
        <TouchableOpacity
          style={[styles.scanButton, { backgroundColor: colors.primary }]}
          onPress={() => setScannerVisible(true)}
          activeOpacity={0.7}
        >
          <ScanLine color={colors.primaryText} size={20} strokeWidth={2.25} />
          <Text style={[styles.scanButtonText, { color: colors.primaryText }]}>
            Scan QR Code
          </Text>
        </TouchableOpacity>

        <View style={styles.dividerRow}>
          <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
          <Text style={[styles.dividerText, { color: colors.textTertiary }]}>
            or enter manually
          </Text>
          <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
        </View>

        <View style={styles.row}>
          <View style={styles.ipField}>
            <View style={styles.labelRow}>
              <Server color={colors.textSecondary} size={14} strokeWidth={2.25} />
              <Text style={[styles.label, { color: colors.textSecondary }]}>Server IP</Text>
            </View>
            <TextInput
              style={[styles.input, inputStyle, { color: colors.text, borderColor: colors.border }]}
              value={ip}
              onChangeText={setIp}
              placeholder={getDefaultHost()}
              placeholderTextColor={colors.textTertiary}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="default"
            />
          </View>
          <View style={styles.portField}>
            <View style={styles.labelRow}>
              <Cable color={colors.textSecondary} size={14} strokeWidth={2.25} />
              <Text style={[styles.label, { color: colors.textSecondary }]}>Port</Text>
            </View>
            <TextInput
              style={[styles.input, inputStyle, { color: colors.text, borderColor: colors.border }]}
              value={port}
              onChangeText={setPort}
              placeholder="4387"
              placeholderTextColor={colors.textTertiary}
              keyboardType="default"
            />
          </View>
        </View>

        <View style={styles.labelRow}>
          <KeyRound color={colors.textSecondary} size={14} strokeWidth={2.25} />
          <Text style={[styles.label, { color: colors.textSecondary }]}>Passcode</Text>
        </View>
        <TextInput
          style={[styles.input, inputStyle, { color: colors.text, borderColor: colors.border }]}
          value={codeInput}
          onChangeText={setCodeInput}
          placeholder="ABCD-1234"
          placeholderTextColor={colors.textTertiary}
          autoCapitalize="characters"
          autoCorrect={false}
          keyboardType="default"
          maxLength={32}
        />

        <Text style={[styles.helperText, { color: colors.textTertiary }]}>
          iOS simulator uses localhost. Android emulator uses 10.0.2.2.
        </Text>

        {error ? (
          <View style={[styles.errorBox, { backgroundColor: colors.errorBackground }]}>
            <Text style={[styles.errorText, { color: colors.error }]}>{error}</Text>
          </View>
        ) : null}

        <TouchableOpacity
          style={[
            styles.button,
            { backgroundColor: canSubmit ? colors.primary : colors.border },
          ]}
          onPress={handleConnect}
          disabled={!canSubmit}
          activeOpacity={0.7}
        >
          {loading ? (
            <ActivityIndicator color={colors.primaryText} />
          ) : (
            <View style={styles.buttonContent}>
              <Text style={[styles.buttonText, { color: colors.primaryText }]}>Connect</Text>
              <ArrowRight color={colors.primaryText} size={18} strokeWidth={2.25} />
            </View>
          )}
        </TouchableOpacity>
      </View>
    </LiquidGlassCard>
  )

  return (
    <AnimatedGradientBackground colors={colors} isDark={isDark}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <AdaptiveShell maxWidth={1200} style={styles.transparentBackground}>
          {layoutMode === 'phone' ? (
            <View style={styles.phoneConnect}>
              <View
                style={[styles.titleIconBadge, titleIconBadgeStyle]}
              >
                <Server color={colors.primary} size={24} strokeWidth={2.1} />
              </View>
              <Text style={[styles.title, { color: colors.text }]}>PocketDev</Text>
              <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
                Pair with your dev server
              </Text>
              {form}
            </View>
          ) : (
            <SplitViewLayout
              leading={
                <LiquidGlassCard style={styles.heroCard}>
                  <View style={styles.heroCardContent}>
                    <View style={styles.heroEyebrowRow}>
                      <Sparkles color={colors.textTertiary} size={14} strokeWidth={2.25} />
                      <Text style={[styles.heroEyebrow, { color: colors.textTertiary }]}>iPad workspace</Text>
                    </View>
                    <Text style={[styles.heroTitle, { color: colors.text }]}>Build on Linux. Control it from iPad.</Text>
                    <Text style={[styles.heroBody, { color: colors.textSecondary }]}>
                      Pair once, then browse tasks, inspect logs, and manage agent work from a larger touch workspace.
                    </Text>
                  </View>
                </LiquidGlassCard>
              }
              trailing={form}
              leadingWidth={420}
            />
          )}
        </AdaptiveShell>
      </KeyboardAvoidingView>

      <QRScanner
        visible={scannerVisible}
        onScan={handleQRScan}
        onClose={() => setScannerVisible(false)}
      />
    </AnimatedGradientBackground>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  transparentBackground: {
    backgroundColor: 'transparent',
  },
  phoneConnect: {
    flex: 1,
    justifyContent: 'center',
  },
  titleIconBadge: {
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginBottom: spacing[4],
  },
  title: {
    ...typographyScale['4xl'],
    fontWeight: '700',
    textAlign: 'center',
  },
  subtitle: {
    ...typographyScale.base,
    textAlign: 'center',
    marginTop: spacing[2],
    marginBottom: spacing[10],
  },
  form: {
    gap: spacing[3],
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
  },
  formCard: {
    padding: spacing[5],
  },
  row: {
    flexDirection: 'row',
    gap: spacing[3],
  },
  ipField: {
    flex: 2,
  },
  portField: {
    flex: 1,
  },
  label: {
    ...typographyScale.sm,
    fontWeight: '500',
  },
  input: {
    ...typographyScale.base,
    borderWidth: 1,
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
  },
  helperText: {
    ...typographyScale.sm,
  },
  errorBox: {
    padding: spacing[3],
    borderRadius: borderRadius.md,
  },
  errorText: {
    ...typographyScale.sm,
    textAlign: 'center',
  },
  button: {
    borderRadius: borderRadius.lg,
    paddingVertical: spacing[4],
    alignItems: 'center',
    marginTop: spacing[2],
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
  },
  buttonText: {
    ...typographyScale.base,
    fontWeight: '600',
  },
  scanButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing[2],
    borderRadius: borderRadius.lg,
    paddingVertical: spacing[4],
  },
  scanButtonText: {
    ...typographyScale.base,
    fontWeight: '600',
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
  },
  dividerLine: {
    flex: 1,
    height: 1,
  },
  dividerText: {
    ...typographyScale.sm,
  },
  heroCard: {
    flex: 1,
    padding: spacing[6],
  },
  heroCardContent: {
    flex: 1,
    justifyContent: 'center',
  },
  heroEyebrow: {
    ...typographyScale.xs,
    textTransform: 'uppercase',
    fontWeight: '700',
  },
  heroEyebrowRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
  },
  heroTitle: {
    ...typographyScale['3xl'],
    fontWeight: '700',
    marginTop: spacing[2],
  },
  heroBody: {
    ...typographyScale.lg,
    marginTop: spacing[3],
  },
})

function getDefaultHost(): string {
  return Platform.OS === 'android' ? '10.0.2.2' : 'localhost'
}

function normalizeSetupCode(value: string): string {
  const compact = value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8)
  if (compact.length <= 4) return compact
  return `${compact.slice(0, 4)}-${compact.slice(4)}`
}

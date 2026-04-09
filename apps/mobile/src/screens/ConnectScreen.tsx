import React, { useCallback, useState } from 'react'
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native'
import { useTheme } from '../contexts/ThemeContext'
import { fetchPrerequisites, pairWithServer } from '../services/api'
import { useConnectionStore } from '../stores/connection'
import { useSetupStore } from '../stores/setup'
import { palette, spacing, borderRadius, typographyScale } from '@pocketdev/shared/theme'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import type { RootStackParamList } from '../navigation/types'
import { useAdaptiveLayout } from '../hooks/useAdaptiveLayout'
import AdaptiveShell from '../components/layout/AdaptiveShell'
import SplitViewLayout from '../components/layout/SplitViewLayout'
import AnimatedGradientBackground from '../components/background/AnimatedGradientBackground'
import { LiquidGlassCard } from '../components/shared/LiquidGlassCard'
import QRScanner, { type QRScanResult } from '../components/QRScanner'
import { ArrowRight, Link, ScanLine, Server, Unplug } from 'lucide-react-native'
import PairingAnimation from '../components/animations/PairingAnimation'
import type { PrerequisitesReport } from '@pocketdev/shared/types'

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'Connect'>
}

export default function ConnectScreen({ navigation }: Props) {
  const { colors, isDark } = useTheme()
  const { layoutMode } = useAdaptiveLayout()
  const setPaired = useConnectionStore((s) => s.setPaired)
  const unpair = useConnectionStore((s) => s.unpair)
  const connect = useConnectionStore((s) => s.connect)
  const existingServer = useConnectionStore((s) => s.server)

  const [connectionInput, setConnectionInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [scannerVisible, setScannerVisible] = useState(false)
  const [showPairing, setShowPairing] = useState(false)
  const [postPairSetupReady, setPostPairSetupReady] = useState(false)

  const handlePairingComplete = useCallback(() => {
    if (postPairSetupReady) {
      navigation.replace('Main', { screen: 'Settings' })
      return
    }

    navigation.replace('ServerSetup')
  }, [navigation, postPairSetupReady])

  const resolvePostPairDestination = useCallback(async (ip: string, port: number) => {
    try {
      const report = await fetchPrerequisites(ip, port) as PrerequisitesReport
      await useSetupStore.getState().applyLiveReport(report)
      return report.ready
    } catch (e) {
      console.warn('[ConnectScreen] Failed to resolve setup readiness:', e)
      useSetupStore.getState().setFetchError(
        e instanceof Error ? e.message : 'Failed to check prerequisites',
      )
      return false
    }
  }, [])

  const reconnectToExistingServer = useCallback(async () => {
    if (!existingServer || loading) return

    console.log('[ConnectScreen] Reconnecting to existing server:', existingServer)
    setError(null)
    setLoading(true)

    try {
      connect()
      const setupReady = await resolvePostPairDestination(existingServer.ip, existingServer.port)
      if (setupReady) {
        navigation.replace('Main', { screen: 'Settings' })
        return
      }
      navigation.replace('ServerSetup')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to reconnect')
    } finally {
      setLoading(false)
    }
  }, [connect, existingServer, loading, navigation, resolvePostPairDestination])

  const parsed = parseConnectionString(connectionInput)
  const canSubmit = parsed !== null && !loading

  const inputStyle = {
    backgroundColor: isDark ? 'rgba(23, 23, 23, 0.7)' : 'rgba(250, 250, 250, 0.92)',
  }
  async function handleConnect() {
    if (!parsed) return
    setError(null)
    setLoading(true)

    try {
      const secure = parsed.secure ?? false
      const result = await pairWithServer(parsed.host, parsed.port, parsed.code, secure)
      setPaired({ ip: parsed.host, port: parsed.port, deviceId: result.deviceId, secure })
      const setupReady = await resolvePostPairDestination(parsed.host, parsed.port)
      setPostPairSetupReady(setupReady)
      setShowPairing(true)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to connect')
    } finally {
      setLoading(false)
    }
  }

  function handleQRScan(result: QRScanResult) {
    setScannerVisible(false)
    const qrSecure = result.secure ?? false
    const scheme = qrSecure ? 'pocketdevs' : 'pocketdev'
    setConnectionInput(`${scheme}://${result.host}:${result.port}/${result.code}`)
    setTimeout(() => {
      setError(null)
      setLoading(true)
      pairWithServer(result.host, result.port, normalizeSetupCode(result.code).trim(), qrSecure)
        .then(async (pairResult) => {
          setPaired({ ip: result.host, port: result.port, deviceId: pairResult.deviceId, secure: qrSecure })
          const setupReady = await resolvePostPairDestination(result.host, result.port)
          setPostPairSetupReady(setupReady)
          setShowPairing(true)
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
        {/* Existing connection banner */}
        {existingServer && (
          <View style={[styles.existingConnection, { backgroundColor: isDark ? 'rgba(59,130,246,0.1)' : 'rgba(37,99,235,0.08)', borderColor: isDark ? 'rgba(96,165,250,0.26)' : 'rgba(37,99,235,0.16)' }]}>
            <TouchableOpacity
              style={styles.existingConnectionInfo}
              onPress={reconnectToExistingServer}
              disabled={loading}
              activeOpacity={0.7}
            >
              <Server color={colors.primary} size={16} strokeWidth={2.25} />
              <View style={{ flex: 1 }}>
                <Text style={[styles.existingConnectionLabel, { color: colors.textSecondary }]}>Reconnect workspace</Text>
                <Text style={[styles.existingConnectionHost, { color: colors.text }]}>
                  {existingServer.ip}:{existingServer.port}
                </Text>
              </View>
              <ArrowRight color={colors.primary} size={16} strokeWidth={2.25} />
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.unpairButton, { backgroundColor: isDark ? 'rgba(239,68,68,0.15)' : 'rgba(220,38,38,0.1)', borderColor: isDark ? 'rgba(239,68,68,0.3)' : 'rgba(220,38,38,0.2)' }]}
              onPress={unpair}
              activeOpacity={0.7}
            >
              <Unplug color={colors.error} size={16} strokeWidth={2.25} />
              <Text style={[styles.unpairButtonText, { color: colors.error }]}>Unpair</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* QR Scanner Button */}
        <TouchableOpacity
          style={[styles.scanButton, { backgroundColor: colors.primary }]}
          onPress={() => setScannerVisible(true)}
          activeOpacity={0.7}
        >
          <ScanLine color={colors.primaryText} size={20} strokeWidth={2.25} />
          <Text style={[styles.scanButtonText, { color: colors.primaryText }]}>
            Scan Pairing Code
          </Text>
        </TouchableOpacity>

        <View style={styles.dividerRow}>
          <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
          <Text style={[styles.dividerText, { color: colors.textTertiary }]}>
            or paste pairing link
          </Text>
          <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
        </View>

        <View style={styles.labelRow}>
          <Link color={colors.textSecondary} size={14} strokeWidth={2.25} />
          <Text style={[styles.labelText, { color: colors.textSecondary }]}>Pairing Link</Text>
        </View>
        <TextInput
          style={[styles.input, inputStyle, { color: colors.text, borderColor: colors.border }]}
          value={connectionInput}
          onChangeText={setConnectionInput}
          placeholder="pocketdev://192.168.1.1:4387/ABCD1234"
          placeholderTextColor={colors.textTertiary}
          autoCapitalize="none"
          autoCorrect={false}
          autoComplete="off"
          textContentType="none"
          keyboardType="default"
        />

        {parsed ? (
          <View style={[styles.parsedInfo, { backgroundColor: isDark ? 'rgba(34,197,94,0.1)' : 'rgba(22,163,74,0.08)', borderColor: isDark ? 'rgba(34,197,94,0.2)' : 'rgba(22,163,74,0.15)' }]}>
            <Text style={[styles.parsedText, { color: colors.textSecondary }]}>
              <Text style={{ fontWeight: '600' }}>{parsed.host}</Text>:{parsed.port} · {parsed.code}
            </Text>
          </View>
        ) : connectionInput.length > 0 ? (
          <Text style={[styles.helperText, { color: colors.error }]}>
            Could not parse pairing link. Expected format: pocketdev://host:port/code
          </Text>
        ) : (
          <Text style={[styles.helperText, { color: colors.textTertiary }]}>
            Paste the pairing link from your PocketDev workspace, or scan its QR code.
          </Text>
        )}

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
              <Text style={[styles.buttonText, { color: colors.primaryText }]}>Pair Workspace</Text>
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
            <ScrollView
              style={styles.phoneConnect}
              contentContainerStyle={styles.phoneConnectContent}
              keyboardShouldPersistTaps="handled"
            >
              <View style={styles.bauhausDots}>
                <View style={[styles.bauhausDot, { backgroundColor: palette.bauhaus.red }]} />
                <View style={[styles.bauhausDot, { backgroundColor: palette.bauhaus.yellow }]} />
                <View style={[styles.bauhausDot, { backgroundColor: palette.bauhaus.blue }]} />
              </View>
              <Text style={[styles.eyebrow, { color: colors.textTertiary }]}>PAIR WORKSPACE</Text>
              <Text style={[styles.title, { color: colors.text }]}>PocketDev</Text>
              <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
                Connect to your self-hosted coding agent
              </Text>
              {form}
            </ScrollView>
          ) : (
            <SplitViewLayout
              leading={
                <LiquidGlassCard style={styles.heroCard}>
                  <View style={styles.heroCardContent}>
                    <View style={styles.bauhausDots}>
                      <View style={[styles.bauhausDotLg, { backgroundColor: palette.bauhaus.red }]} />
                      <View style={[styles.bauhausDotLg, { backgroundColor: palette.bauhaus.yellow }]} />
                      <View style={[styles.bauhausDotLg, { backgroundColor: palette.bauhaus.blue }]} />
                    </View>
                    <Text style={[styles.heroEyebrow, { color: colors.textTertiary }]}>SELF-HOSTED AGENT</Text>
                    <Text style={[styles.heroTitle, { color: colors.text }]}>From pocket to production.</Text>
                    <Text style={[styles.heroBody, { color: colors.textSecondary }]}>
                      Pair once, then open tasks, review changes, and follow agent progress from anywhere.
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
      {showPairing && <PairingAnimation onComplete={handlePairingComplete} />}
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
  },
  phoneConnectContent: {
    flexGrow: 1,
    justifyContent: 'center' as const,
  },
  bauhausDots: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing[3],
    marginBottom: spacing[4],
  },
  bauhausDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  bauhausDotLg: {
    width: 14,
    height: 14,
    borderRadius: 7,
  },
  eyebrow: {
    ...typographyScale.xs,
    fontWeight: '700',
    textAlign: 'center',
    letterSpacing: 1.3,
    marginBottom: spacing[1],
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
  labelText: {
    ...typographyScale.sm,
    fontWeight: '500',
  },
  formCard: {
    padding: spacing[5],
  },
  input: {
    ...typographyScale.base,
    borderWidth: 1,
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
  },
  parsedInfo: {
    padding: spacing[3],
    borderRadius: borderRadius.md,
    borderWidth: 1,
  },
  parsedText: {
    ...typographyScale.sm,
    textAlign: 'center',
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
    fontWeight: '700',
    letterSpacing: 1.3,
    marginTop: spacing[2],
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
  existingConnection: {
    borderWidth: 1,
    borderRadius: borderRadius.lg,
    padding: spacing[4],
    gap: spacing[3],
  },
  existingConnectionInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
  },
  existingConnectionLabel: {
    ...typographyScale.xs,
    fontWeight: '500',
  },
  existingConnectionHost: {
    ...typographyScale.sm,
    fontWeight: '600',
    marginTop: 2,
  },
  unpairButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing[2],
    borderWidth: 1,
    borderRadius: borderRadius.md,
    paddingVertical: spacing[2],
  },
  unpairButtonText: {
    ...typographyScale.sm,
    fontWeight: '600',
  },
})

/** Parse a connection string in the format: pocketdev://host:port/code or pocketdevs://host:port/code */
function parseConnectionString(input: string): { host: string; port: number; code: string; secure: boolean } | null {
  const trimmed = input.trim()
  if (!trimmed) return null

  // pocketdevs:// = secure (HTTPS), pocketdev:// = plain HTTP
  const urlMatch = trimmed.match(/^pocketdev(s)?:\/\/([^:/]+):(\d+)\/(.+)$/i)
  if (urlMatch) {
    const secure = urlMatch[1] === 's'
    const code = normalizeSetupCode(urlMatch[4]!)
    if (!code) return null
    return { host: urlMatch[2]!, port: parseInt(urlMatch[3]!, 10), code, secure }
  }

  return null
}

function normalizeSetupCode(value: string): string {
  const compact = value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8)
  if (compact.length <= 4) return compact
  return `${compact.slice(0, 4)}-${compact.slice(4)}`
}

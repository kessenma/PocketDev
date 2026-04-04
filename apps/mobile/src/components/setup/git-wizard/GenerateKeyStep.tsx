import React, { useState, useCallback } from 'react'
import {
  View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, ScrollView, Alert,
} from 'react-native'
import Clipboard from '@react-native-clipboard/clipboard'
import { useTheme } from '../../../contexts/ThemeContext'
import { spacing, borderRadius, typographyScale } from '@pocketdev/shared/theme'
import { useConnectionStore } from '../../../stores/connection'
import { postGenerateSshKey, fetchGitPublicKey } from '../../../services/api'
import { Key, Copy, Check, AlertTriangle, ArrowRight } from 'lucide-react-native'
import type { GitSshStatus } from '@pocketdev/shared/types'

type WizardAction =
  | { type: 'STEP_COMPLETE'; step: 'generate-key'; publicKey: string }
  | { type: 'STEP_FAILED'; step: 'generate-key'; error: string }
  | { type: 'SET_PUBLIC_KEY'; key: string }

interface Props {
  dispatch: (action: WizardAction) => void
  sshStatus: GitSshStatus | null
  publicKey: string | null
}

export default function GenerateKeyStep({ dispatch, sshStatus, publicKey }: Props) {
  const { colors } = useTheme()
  const server = useConnectionStore((s) => s.server)
  const [loading, setLoading] = useState(false)
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showOverwriteWarning, setShowOverwriteWarning] = useState(
    sshStatus?.ssh_key_exists && !publicKey,
  )

  const generateKey = useCallback(async (overwrite: boolean) => {
    if (!server) return
    setLoading(true)
    setError(null)
    try {
      const result = await postGenerateSshKey(server.ip, server.port, overwrite)
      if (result.success && result.public_key) {
        dispatch({ type: 'SET_PUBLIC_KEY', key: result.public_key })
        setShowOverwriteWarning(false)
      } else {
        setError(result.error ?? 'Key generation failed')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Key generation failed')
    } finally {
      setLoading(false)
    }
  }, [server, dispatch])

  const loadExisting = useCallback(async () => {
    if (!server) return
    setLoading(true)
    try {
      const key = await fetchGitPublicKey(server.ip, server.port)
      if (key) {
        dispatch({ type: 'SET_PUBLIC_KEY', key })
        setShowOverwriteWarning(false)
      } else {
        setError('Could not read existing key')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load key')
    } finally {
      setLoading(false)
    }
  }, [server, dispatch])

  function handleCopy() {
    if (publicKey) {
      Clipboard.setString(publicKey)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  function handleContinue() {
    if (publicKey) {
      dispatch({ type: 'STEP_COMPLETE', step: 'generate-key', publicKey })
    }
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      <View style={styles.iconRow}>
        <View style={[styles.iconCircle, { backgroundColor: colors.primary + '20' }]}>
          <Key color={colors.primary} size={24} strokeWidth={2} />
        </View>
      </View>

      <Text style={[styles.title, { color: colors.text }]}>Git Access Key</Text>
      <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
        Create a secure key so this workspace can connect to GitHub.
      </Text>

      {/* Overwrite warning */}
      {showOverwriteWarning && (
        <View style={[styles.warningCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={styles.warningHeader}>
            <AlertTriangle color="#facc15" size={18} strokeWidth={2.25} />
            <Text style={[styles.warningTitle, { color: colors.text }]}>
              SSH key already exists
            </Text>
          </View>
          <Text style={[styles.warningText, { color: colors.textSecondary }]}>
            This workspace already has a key ({sshStatus?.ssh_key_type ?? 'unknown'} type).
            You can use the existing key or generate a new one.
          </Text>
          <View style={styles.warningActions}>
            <TouchableOpacity
              style={[styles.warningButton, { backgroundColor: colors.primary }]}
              onPress={loadExisting}
              disabled={loading}
              activeOpacity={0.7}
            >
              <Text style={[styles.warningButtonText, { color: colors.primaryText }]}>Keep Existing</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.warningButton, { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border }]}
              onPress={() => generateKey(true)}
              disabled={loading}
              activeOpacity={0.7}
            >
              <Text style={[styles.warningButtonText, { color: colors.text }]}>Generate New</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Generate button (no existing key) */}
      {!showOverwriteWarning && !publicKey && !loading && (
        <>
          <View style={[styles.infoCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.infoText, { color: colors.textSecondary }]}>
              PocketDev will create a secure Ed25519 key pair for this workspace. It lets GitHub access happen without a password prompt.
            </Text>
            <Text style={[styles.infoDetail, { color: colors.textTertiary }]}>
              The key will be stored at ~/.ssh/id_ed25519
            </Text>
          </View>

          <TouchableOpacity
            style={[styles.generateButton, { backgroundColor: colors.primary }]}
            onPress={() => {
              Alert.alert(
                'Generate Access Key',
                'This will create a new key pair for this workspace. The private key stays with the workspace and the public key will be shared with GitHub.\n\nProceed?',
                [
                  { text: 'Cancel', style: 'cancel' },
                  { text: 'Generate Key', onPress: () => generateKey(false) },
                ],
              )
            }}
            activeOpacity={0.7}
          >
            <Key color={colors.primaryText} size={18} strokeWidth={2.25} />
            <Text style={[styles.buttonText, { color: colors.primaryText }]}>Generate Access Key</Text>
          </TouchableOpacity>
        </>
      )}

      {loading && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Generating key...</Text>
        </View>
      )}

      {error && (
        <View style={[styles.errorCard, { backgroundColor: colors.errorBackground }]}>
          <Text style={[styles.errorText, { color: colors.error }]}>{error}</Text>
        </View>
      )}

      {/* Key display */}
      {publicKey && (
        <>
          <View style={[styles.keyCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.keyLabel, { color: colors.textTertiary }]}>Public Key</Text>
            <Text style={[styles.keyText, { color: colors.text }]} selectable numberOfLines={4}>
              {publicKey}
            </Text>
          </View>

          <TouchableOpacity
            style={[styles.copyButton, { backgroundColor: copied ? '#22c55e' : colors.surface, borderWidth: 1, borderColor: copied ? '#22c55e' : colors.border }]}
            onPress={handleCopy}
            activeOpacity={0.7}
          >
            {copied ? (
              <>
                <Check color="#fff" size={16} strokeWidth={2.5} />
                <Text style={[styles.copyText, { color: '#fff' }]}>Copied!</Text>
              </>
            ) : (
              <>
                <Copy color={colors.text} size={16} strokeWidth={2.25} />
                <Text style={[styles.copyText, { color: colors.text }]}>Copy to Clipboard</Text>
              </>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.continueButton, { backgroundColor: colors.primary }]}
            onPress={handleContinue}
            activeOpacity={0.7}
          >
            <Text style={[styles.buttonText, { color: colors.primaryText }]}>Continue</Text>
            <ArrowRight color={colors.primaryText} size={18} strokeWidth={2.25} />
          </TouchableOpacity>
        </>
      )}
    </ScrollView>
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
  iconRow: {
    alignItems: 'center',
    marginTop: spacing[4],
  },
  iconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    ...typographyScale.xl,
    fontWeight: '700',
    textAlign: 'center',
  },
  subtitle: {
    ...typographyScale.sm,
    textAlign: 'center',
    paddingHorizontal: spacing[4],
  },
  warningCard: {
    borderWidth: 1,
    borderRadius: borderRadius.lg,
    padding: spacing[4],
    gap: spacing[3],
  },
  warningHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
  },
  warningTitle: {
    ...typographyScale.base,
    fontWeight: '600',
  },
  warningText: {
    ...typographyScale.sm,
  },
  warningActions: {
    flexDirection: 'row',
    gap: spacing[2],
  },
  warningButton: {
    flex: 1,
    paddingVertical: spacing[3],
    borderRadius: borderRadius.md,
    alignItems: 'center',
  },
  warningButtonText: {
    ...typographyScale.sm,
    fontWeight: '600',
  },
  infoCard: {
    borderWidth: 1,
    borderRadius: borderRadius.lg,
    padding: spacing[4],
    gap: spacing[2],
  },
  infoText: {
    ...typographyScale.sm,
    lineHeight: 20,
  },
  infoDetail: {
    ...typographyScale.xs,
    fontFamily: 'monospace',
  },
  generateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing[2],
    paddingVertical: spacing[4],
    borderRadius: borderRadius.lg,
  },
  loadingContainer: {
    alignItems: 'center',
    gap: spacing[3],
    paddingVertical: spacing[6],
  },
  loadingText: {
    ...typographyScale.sm,
  },
  errorCard: {
    padding: spacing[3],
    borderRadius: borderRadius.md,
  },
  errorText: {
    ...typographyScale.sm,
  },
  keyCard: {
    borderWidth: 1,
    borderRadius: borderRadius.lg,
    padding: spacing[4],
    gap: spacing[2],
  },
  keyLabel: {
    ...typographyScale.xs,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  keyText: {
    ...typographyScale.xs,
    fontFamily: 'monospace',
    lineHeight: 18,
  },
  copyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing[2],
    paddingVertical: spacing[3],
    borderRadius: borderRadius.lg,
  },
  copyText: {
    ...typographyScale.sm,
    fontWeight: '600',
  },
  continueButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing[2],
    paddingVertical: spacing[4],
    borderRadius: borderRadius.lg,
  },
  buttonText: {
    ...typographyScale.base,
    fontWeight: '600',
  },
})

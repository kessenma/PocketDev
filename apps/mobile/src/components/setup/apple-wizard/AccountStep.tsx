import React, { useCallback, useState } from 'react'
import { View, Text, TextInput, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native'
import { pick, keepLocalCopy, types } from '@react-native-documents/picker'
import RNFS from 'react-native-fs'
import { ArrowRight, Check, FileKey, KeyRound } from 'lucide-react-native'
import type { AppleApiKeyRole, AppleKeyResult } from '@pocketdev/shared/types'
import { useTheme } from '../../../contexts/ThemeContext'
import { useConnectionStore } from '../../../stores/connection'
import { postAppleCreateKeyCommand, postAppleFinishKey, postAppleImportKey } from '../../../services/api'
import { outputHasLine } from '../../../utils/secure-prompts'
import { playInstallSuccessHaptic } from '../shared/haptics'
import AppleCommandPanel from './AppleCommandPanel'
import MethodOption from './MethodOption'
import { useAppleCommand } from './useAppleCommand'
import type { AppleStepProps } from './XcodeStep'
import {
  APPLE_ID_PATTERN,
  ASC_SIGN_IN_PROMPTS,
  ISSUER_ID_PATTERN,
  KEY_CREATED_LINE,
  KEY_ID_PATTERN,
  isLikelyP8Key,
  parseKeyIdFromFileName,
  toReadablePath,
} from './apple-setup-utils'
import { stepStyles as styles } from './styles'

type Mode = 'create' | 'import'

export default function AccountStep({ status, onStatus, onContinue }: AppleStepProps) {
  const { colors } = useTheme()
  const server = useConnectionStore((s) => s.server)
  const { account } = status

  const [replacing, setReplacing] = useState(false)
  const [mode, setMode] = useState<Mode>('create')

  // Create a key
  const [appleId, setAppleId] = useState('')
  const [role, setRole] = useState<AppleApiKeyRole>('ADMIN')
  const [preparing, setPreparing] = useState(false)
  const [finishing, setFinishing] = useState(false)
  const [createError, setCreateError] = useState<string | null>(null)

  // Use an existing key
  const [fileName, setFileName] = useState<string | null>(null)
  const [privateKey, setPrivateKey] = useState<string | null>(null)
  const [keyId, setKeyId] = useState('')
  const [issuerId, setIssuerId] = useState('')
  const [importing, setImporting] = useState(false)
  const [importError, setImportError] = useState<string | null>(null)

  const [result, setResult] = useState<AppleKeyResult | null>(null)

  const finishKey = useCallback(async () => {
    if (!server) return
    setFinishing(true)
    try {
      const res = await postAppleFinishKey(server.ip, server.port)
      onStatus(res.status)
      if (res.ok) {
        playInstallSuccessHaptic()
        setResult(res)
        setReplacing(false)
      } else {
        setCreateError(res.error ?? 'The key was created, but PocketDev couldn’t save it.')
      }
    } catch (e) {
      setCreateError(e instanceof Error ? e.message : 'Could not save the new key.')
    } finally {
      setFinishing(false)
    }
  }, [server, onStatus])

  const runner = useAppleCommand({
    securePrompts: ASC_SIGN_IN_PROMPTS,
    onFinish: (_key, outcome, output) => {
      if (outputHasLine(output, KEY_CREATED_LINE)) {
        finishKey()
        return
      }
      if (outcome === 'fail') {
        setCreateError('Apple didn’t create the key. The terminal output below has the details.')
      }
    },
  })

  const busy = runner.running || preparing || finishing || importing
  const showChoices = !account.configured || replacing

  async function handleCreate() {
    if (!server) return
    const email = appleId.trim()
    if (!APPLE_ID_PATTERN.test(email)) {
      setCreateError('Enter the email address of your Apple Account.')
      return
    }
    setCreateError(null)
    setResult(null)
    setPreparing(true)
    try {
      const res = await postAppleCreateKeyCommand(server.ip, server.port, { apple_id: email, role })
      runner.run('key', res.command)
    } catch (e) {
      setCreateError(e instanceof Error ? e.message : 'Could not start key creation.')
    } finally {
      setPreparing(false)
    }
  }

  async function handlePickKey() {
    setImportError(null)
    let picked
    try {
      ;[picked] = await pick({ type: [types.allFiles] })
    } catch {
      return // cancelled
    }
    if (!picked?.uri) return

    const name = picked.name ?? ''
    let copiedPath: string | null = null
    try {
      // Copy into the app's caches so RNFS can read both iOS file:// and Android content:// picks.
      const [copy] = await keepLocalCopy({
        files: [{ uri: picked.uri, fileName: name || 'AuthKey.p8' }],
        destination: 'cachesDirectory',
      })
      if (copy.status === 'success') copiedPath = toReadablePath(copy.localUri)
      const text: string = await RNFS.readFile(copiedPath ?? toReadablePath(picked.uri), 'utf8')
      if (!isLikelyP8Key(text)) {
        setImportError('That file doesn’t look like an App Store Connect key (.p8).')
        return
      }
      setPrivateKey(text.trim())
      setFileName(name || 'Selected key')
      const parsed = parseKeyIdFromFileName(name)
      if (parsed) setKeyId(parsed)
    } catch {
      setImportError('Couldn’t read that file. Try saving it to Files first.')
    } finally {
      // Don't leave a copy of the private key in the app's caches.
      if (copiedPath) RNFS.unlink(copiedPath).catch(() => {})
    }
  }

  async function handleImport() {
    if (!server || !privateKey) return
    const id = keyId.trim().toUpperCase()
    const issuer = issuerId.trim()
    if (!KEY_ID_PATTERN.test(id)) {
      setImportError('The Key ID is the 10-character code in the file name (AuthKey_XXXXXXXXXX.p8).')
      return
    }
    if (!ISSUER_ID_PATTERN.test(issuer)) {
      setImportError('The Issuer ID looks like 69a6de70-…; it’s shown above the key list in App Store Connect.')
      return
    }
    setImportError(null)
    setResult(null)
    setImporting(true)
    try {
      const res = await postAppleImportKey(server.ip, server.port, { key_id: id, issuer_id: issuer, private_key: privateKey })
      onStatus(res.status)
      if (res.ok) {
        playInstallSuccessHaptic()
        setResult(res)
        setReplacing(false)
        setPrivateKey(null)
        setFileName(null)
      } else {
        setImportError(res.error ?? 'App Store Connect didn’t accept that key.')
      }
    } catch (e) {
      setImportError(e instanceof Error ? e.message : 'Could not import the key.')
    } finally {
      setImporting(false)
    }
  }

  const connectedKeyId = result?.key_id ?? account.key_id

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer} keyboardShouldPersistTaps="handled">
      <Text style={[styles.title, { color: colors.text }]}>Apple account</Text>
      <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
        asc talks to App Store Connect with an API key. This Mac gets its own key, stored in its Keychain.
      </Text>

      {account.configured && !replacing && (
        <View style={[styles.card, styles.successCard]}>
          <View style={styles.cardHeader}>
            <Check color="#22c55e" size={18} strokeWidth={2.5} />
            <Text style={[styles.cardTitle, styles.successText]}>Connected to App Store Connect</Text>
          </View>
          {connectedKeyId ? (
            <Text style={[styles.cardMeta, { color: colors.textTertiary }]}>Key ID {connectedKeyId}</Text>
          ) : null}
          {account.profile_name ? (
            <Text style={[styles.cardMeta, { color: colors.textTertiary }]}>Profile {account.profile_name}</Text>
          ) : null}
          {account.validation === 'failed' && account.validation_error ? (
            <Text style={[styles.cardBody, { color: colors.error }]}>{account.validation_error}</Text>
          ) : null}
        </View>
      )}

      {showChoices && (
        <>
          <View style={styles.optionRow}>
            <MethodOption
              title="Create a key for me"
              body="Recommended. Sign in once and PocketDev sets it up."
              selected={mode === 'create'}
              onPress={() => setMode('create')}
              disabled={busy}
            />
            <MethodOption
              title="Use an existing key"
              body="Pick an AuthKey_….p8 file you already have."
              selected={mode === 'import'}
              onPress={() => setMode('import')}
              disabled={busy}
            />
          </View>

          {mode === 'create' ? (
            <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Text style={[styles.cardBody, { color: colors.textSecondary }]}>
                Signs in to your Apple Account on the Mac and creates an App Store Connect API key for this Mac.
                You need the Account Holder or Admin role in your team. Your password and verification code go
                straight to Apple’s sign-in on your Mac — PocketDev doesn’t save them.
              </Text>

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

              <Text style={[styles.label, { color: colors.textTertiary }]}>Key access</Text>
              <View style={styles.optionRow}>
                <MethodOption
                  title="Admin"
                  body="Recommended. Needed for Xcode automatic signing."
                  selected={role === 'ADMIN'}
                  onPress={() => setRole('ADMIN')}
                  disabled={busy}
                />
                <MethodOption
                  title="App Manager"
                  body="More limited. Automatic signing may not work."
                  selected={role === 'APP_MANAGER'}
                  onPress={() => setRole('APP_MANAGER')}
                  disabled={busy}
                />
              </View>

              {createError ? <Text style={[styles.cardBody, { color: colors.error }]}>{createError}</Text> : null}

              {!runner.running && !finishing && (
                <TouchableOpacity
                  style={[
                    styles.actionButton,
                    { backgroundColor: colors.primary },
                    (!runner.connected || busy || !appleId.trim()) && styles.disabled,
                  ]}
                  onPress={handleCreate}
                  disabled={!runner.connected || busy || !appleId.trim()}
                  activeOpacity={0.7}
                >
                  {preparing
                    ? <ActivityIndicator size="small" color={colors.primaryText} />
                    : <KeyRound color={colors.primaryText} size={18} strokeWidth={2.25} />}
                  <Text style={[styles.buttonText, { color: colors.primaryText }]}>Sign in and create key</Text>
                </TouchableOpacity>
              )}
              {finishing && (
                <View style={styles.cardHeader}>
                  <ActivityIndicator size="small" color={colors.textSecondary} />
                  <Text style={[styles.cardBody, { color: colors.textSecondary }]}>Saving the key on your Mac…</Text>
                </View>
              )}
            </View>
          ) : (
            <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Text style={[styles.cardBody, { color: colors.textSecondary }]}>
                Keys live in App Store Connect → Users and Access → Integrations. Apple only lets you download a .p8
                file once, right after creating the key. The Issuer ID is shown above the key list.
              </Text>

              <TouchableOpacity
                style={[styles.secondaryButton, { borderColor: colors.border }, busy && styles.disabled]}
                onPress={handlePickKey}
                disabled={busy}
                activeOpacity={0.7}
              >
                <FileKey color={colors.text} size={16} strokeWidth={2.25} />
                <Text style={[styles.buttonText, { color: colors.text }]} numberOfLines={1}>
                  {fileName ?? 'Choose .p8 file'}
                </Text>
              </TouchableOpacity>

              <Text style={[styles.label, { color: colors.textTertiary }]}>Key ID</Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
                value={keyId}
                onChangeText={setKeyId}
                placeholder="ABC123DEFG"
                placeholderTextColor={colors.textTertiary}
                autoCapitalize="characters"
                autoCorrect={false}
                maxLength={10}
                editable={!busy}
              />

              <Text style={[styles.label, { color: colors.textTertiary }]}>Issuer ID</Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
                value={issuerId}
                onChangeText={setIssuerId}
                placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                placeholderTextColor={colors.textTertiary}
                autoCapitalize="none"
                autoCorrect={false}
                editable={!busy}
              />

              {importError ? <Text style={[styles.cardBody, { color: colors.error }]}>{importError}</Text> : null}

              <TouchableOpacity
                style={[
                  styles.actionButton,
                  { backgroundColor: colors.primary },
                  (busy || !privateKey || !keyId.trim() || !issuerId.trim()) && styles.disabled,
                ]}
                onPress={handleImport}
                disabled={busy || !privateKey || !keyId.trim() || !issuerId.trim()}
                activeOpacity={0.7}
              >
                {importing
                  ? <ActivityIndicator size="small" color={colors.primaryText} />
                  : <KeyRound color={colors.primaryText} size={18} strokeWidth={2.25} />}
                <Text style={[styles.buttonText, { color: colors.primaryText }]}>Save key on this Mac</Text>
              </TouchableOpacity>
            </View>
          )}
        </>
      )}

      {mode === 'create' && (
        <AppleCommandPanel
          runner={runner}
          runningMessage="Creating your API key…"
          successMessage="API key created"
          failureMessage="Key creation failed"
          runningHint="Apple will ask for your password and a verification code."
        />
      )}

      {account.configured && !busy && (
        <>
          {!replacing ? (
            <TouchableOpacity
              style={[styles.secondaryButton, { borderColor: colors.border }]}
              onPress={() => { setReplacing(true); setResult(null) }}
              activeOpacity={0.7}
            >
              <Text style={[styles.buttonText, { color: colors.text }]}>Use a different key</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={[styles.secondaryButton, { borderColor: colors.border }]}
              onPress={() => setReplacing(false)}
              activeOpacity={0.7}
            >
              <Text style={[styles.buttonText, { color: colors.text }]}>Keep the current key</Text>
            </TouchableOpacity>
          )}
          {!replacing && (
            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: colors.primary }]}
              onPress={onContinue}
              activeOpacity={0.7}
            >
              <Text style={[styles.buttonText, { color: colors.primaryText }]}>Continue</Text>
              <ArrowRight color={colors.primaryText} size={18} strokeWidth={2.25} />
            </TouchableOpacity>
          )}
        </>
      )}
    </ScrollView>
  )
}

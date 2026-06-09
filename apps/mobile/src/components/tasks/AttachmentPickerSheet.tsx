import React, { useRef, useEffect, useState } from 'react'
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native'
import { pick, types } from '@react-native-documents/picker'
import { CheckSquare, Info, Paperclip, Square, Trash2, X } from 'lucide-react-native'
import { borderRadius, spacing } from '@pocketdev/shared/theme'
import { useTheme } from '../../contexts/ThemeContext'
import { Sheet, type SheetHandle } from '../ui/Sheet'
import Tooltip from '../ui/Tooltip'
import { typeStyles } from '../../theme/typography'
import { useAttachmentStore } from '../../stores/attachments'
import { useConnectionStore } from '../../stores/connection'
import { uploadAttachment, listAttachments, deleteAttachment, wipeAttachments, type AttachmentMeta } from '../../services/api'

type Props = {
  onDismiss: () => void
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export default function AttachmentPickerSheet({ onDismiss }: Props) {
  const { colors } = useTheme()
  const sheetRef = useRef<SheetHandle>(null)

  const consentGiven = useAttachmentStore((s) => s.consentGiven)
  const setConsentGiven = useAttachmentStore((s) => s.setConsentGiven)
  const pendingFiles = useAttachmentStore((s) => s.pendingFiles)
  const addPendingFile = useAttachmentStore((s) => s.addPendingFile)
  const updatePendingFile = useAttachmentStore((s) => s.updatePendingFile)
  const removePendingFile = useAttachmentStore((s) => s.removePendingFile)
  const server = useConnectionStore((s) => s.server)

  const [serverFiles, setServerFiles] = useState<AttachmentMeta[]>([])
  const [serverFolder, setServerFolder] = useState('')
  const [loadingServer, setLoadingServer] = useState(false)
  const [wiping, setWiping] = useState(false)

  useEffect(() => {
    if (server) {
      fetchServerFiles()
    }
  }, [server])

  async function fetchServerFiles() {
    if (!server) return
    setLoadingServer(true)
    try {
      const result = await listAttachments(server.ip, server.port)
      setServerFiles(result.attachments)
      setServerFolder(result.folder)
    } catch {
      // non-fatal
    } finally {
      setLoadingServer(false)
    }
  }

  async function handlePickFiles() {
    try {
      const results = await pick({
        allowMultiSelection: true,
        type: [types.allFiles],
      })

      for (const doc of results) {
        if (!doc.uri || !doc.name) continue

        const name = doc.name
        const mimeType = doc.type ?? 'application/octet-stream'
        const size = doc.size ?? 0

        addPendingFile({ uri: doc.uri, name, size, type: mimeType, uploading: true })

        if (!server) {
          updatePendingFile(name, { uploading: false, error: 'Not connected to server' })
          continue
        }

        try {
          const result = await uploadAttachment(server.ip, server.port, doc.uri, name, mimeType)
          updatePendingFile(name, {
            uploading: false,
            serverFilename: result.filename,
            serverFolder: result.folder,
          })
          // Refresh server list after upload
          fetchServerFiles()
        } catch (e: any) {
          updatePendingFile(name, { uploading: false, error: e?.message ?? 'Upload failed' })
        }
      }
    } catch {
      // User cancelled picker — no-op
    }
  }

  async function handleDeleteServerFile(filename: string) {
    if (!server) return
    try {
      await deleteAttachment(server.ip, server.port, filename)
      setServerFiles((prev) => prev.filter((f) => f.filename !== filename))
    } catch {
      Alert.alert('Error', 'Failed to delete file from server.')
    }
  }

  function handleWipeAll() {
    Alert.alert(
      'Wipe All Attachments',
      'This will permanently delete all files from the server attachment folder. Files referenced in past tasks will be shown as removed.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Wipe All',
          style: 'destructive',
          onPress: async () => {
            if (!server) return
            setWiping(true)
            try {
              await wipeAttachments(server.ip, server.port)
              setServerFiles([])
            } catch {
              Alert.alert('Error', 'Failed to wipe attachments.')
            } finally {
              setWiping(false)
            }
          },
        },
      ],
    )
  }

  function handleDismiss() {
    sheetRef.current?.dismiss()
  }

  const uploadingFiles = pendingFiles.filter((f) => f.uploading)
  const uploadedFiles = pendingFiles.filter((f) => f.serverFilename && !f.uploading)
  const errorFiles = pendingFiles.filter((f) => f.error && !f.uploading)

  return (
    <Sheet ref={sheetRef} onDismiss={onDismiss} detents={[0.6, 1]}>
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        {/* Header */}
        <View style={[styles.header, { borderBottomColor: colors.border }]}>
          <View style={styles.headerTitle}>
            <Paperclip color={colors.text} size={18} strokeWidth={2.2} />
            <Text style={[styles.headerText, { color: colors.text }]}>Attachments</Text>
          </View>
          <TouchableOpacity onPress={handleDismiss} activeOpacity={0.7} hitSlop={8}>
            <X color={colors.textSecondary} size={22} strokeWidth={2.25} />
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.body} contentContainerStyle={styles.bodyContent}>
          {/* Consent Banner */}
          {!consentGiven && (
            <View style={[styles.consentBanner, { backgroundColor: colors.panel, borderColor: colors.border }]}>
              <View style={styles.consentHeader}>
                <Text style={[styles.consentTitle, { color: colors.text }]}>Files are uploaded to your server</Text>
                <Tooltip
                  label="Why upload to server?"
                  items={[
                    'The AI agent runs on your remote server, not on your phone.',
                    'Files must be accessible on the server for the AI to read them.',
                    'Attachments are saved in a dedicated folder on your server.',
                    'You can wipe them at any time from this sheet.',
                  ]}
                  direction="bottom"
                >
                  <Info color={colors.textTertiary} size={16} strokeWidth={2.2} />
                </Tooltip>
              </View>
              <Text style={[styles.consentBody, { color: colors.textSecondary }]}>
                Attaching files will upload them to your paired server so the AI agent can access them.
              </Text>
              <TouchableOpacity
                style={styles.consentCheck}
                activeOpacity={0.7}
                onPress={() => setConsentGiven(true)}
              >
                <Square color={colors.textTertiary} size={20} strokeWidth={2.2} />
                <Text style={[styles.consentCheckLabel, { color: colors.text }]}>
                  I understand my files will be saved on this server
                </Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Pick Files Button */}
          {consentGiven && (
            <TouchableOpacity
              style={[styles.pickButton, { backgroundColor: colors.primary }]}
              activeOpacity={0.8}
              onPress={handlePickFiles}
            >
              <Paperclip color="#fff" size={18} strokeWidth={2.2} />
              <Text style={styles.pickButtonText}>Attach Files from Phone</Text>
            </TouchableOpacity>
          )}

          {/* Active uploads */}
          {uploadingFiles.length > 0 && (
            <View style={[styles.section, { borderColor: colors.border }]}>
              <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>Uploading…</Text>
              {uploadingFiles.map((f) => (
                <View key={f.name} style={[styles.fileRow, { borderBottomColor: colors.border }]}>
                  <ActivityIndicator size="small" color={colors.primary} />
                  <View style={styles.fileInfo}>
                    <Text style={[styles.fileName, { color: colors.text }]} numberOfLines={1}>{f.name}</Text>
                    <Text style={[styles.fileMeta, { color: colors.textTertiary }]}>{formatBytes(f.size)}</Text>
                  </View>
                </View>
              ))}
            </View>
          )}

          {/* Upload errors */}
          {errorFiles.map((f) => (
            <View key={f.name} style={[styles.errorRow, { backgroundColor: colors.accentRed + '18', borderColor: colors.accentRed + '40' }]}>
              <Text style={[styles.errorFileName, { color: colors.text }]} numberOfLines={1}>{f.name}</Text>
              <Text style={[styles.errorMsg, { color: colors.accentRed }]}>{f.error}</Text>
              <TouchableOpacity onPress={() => removePendingFile(f.name)} hitSlop={8}>
                <X color={colors.textTertiary} size={14} strokeWidth={2.2} />
              </TouchableOpacity>
            </View>
          ))}

          {/* Successfully uploaded this session */}
          {uploadedFiles.length > 0 && (
            <View style={[styles.section, { borderColor: colors.border }]}>
              <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>Queued for this task ({uploadedFiles.length})</Text>
              {uploadedFiles.map((f) => (
                <View key={f.name} style={[styles.fileRow, { borderBottomColor: colors.border }]}>
                  <CheckSquare color={colors.primary} size={16} strokeWidth={2.2} />
                  <View style={styles.fileInfo}>
                    <Text style={[styles.fileName, { color: colors.text }]} numberOfLines={1}>{f.name}</Text>
                    <Text style={[styles.fileMeta, { color: colors.textTertiary }]}>{formatBytes(f.size)}</Text>
                  </View>
                  <TouchableOpacity onPress={() => removePendingFile(f.name)} hitSlop={8} activeOpacity={0.7}>
                    <X color={colors.textTertiary} size={16} strokeWidth={2.2} />
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          )}

          {/* Server attachment folder info */}
          {serverFolder ? (
            <View style={styles.folderRow}>
              <Text style={[styles.folderLabel, { color: colors.textTertiary }]}>
                Server folder: {serverFolder}
              </Text>
            </View>
          ) : null}

          {/* Previous attachments on server */}
          {consentGiven && (
            <View style={[styles.section, { borderColor: colors.border }]}>
              <View style={styles.sectionHeaderRow}>
                <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
                  On server{serverFiles.length > 0 ? ` (${serverFiles.length})` : ''}
                </Text>
                {loadingServer && <ActivityIndicator size="small" color={colors.textTertiary} />}
                {serverFiles.length > 0 && !wiping && (
                  <TouchableOpacity onPress={handleWipeAll} activeOpacity={0.7} hitSlop={8}>
                    <Text style={[styles.wipeText, { color: colors.accentRed }]}>Wipe all</Text>
                  </TouchableOpacity>
                )}
                {wiping && <ActivityIndicator size="small" color={colors.accentRed} />}
              </View>

              {serverFiles.length === 0 && !loadingServer ? (
                <Text style={[styles.emptyText, { color: colors.textTertiary }]}>
                  No files on server yet.
                </Text>
              ) : null}

              {serverFiles.map((f) => (
                <View key={f.filename} style={[styles.fileRow, { borderBottomColor: colors.border }]}>
                  <View style={styles.fileInfo}>
                    <Text style={[styles.fileName, { color: colors.text }]} numberOfLines={1}>{f.filename}</Text>
                    <Text style={[styles.fileMeta, { color: colors.textTertiary }]}>
                      {formatBytes(f.size)} · {new Date(f.uploadedAt).toLocaleDateString()}
                    </Text>
                  </View>
                  <TouchableOpacity
                    onPress={() => handleDeleteServerFile(f.filename)}
                    activeOpacity={0.7}
                    hitSlop={8}
                  >
                    <Trash2 color={colors.textTertiary} size={16} strokeWidth={2.2} />
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          )}
        </ScrollView>
      </View>
    </Sheet>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
    borderBottomWidth: 2,
  },
  headerTitle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
  },
  headerText: {
    ...typeStyles.sectionTitle,
  },
  body: {
    flex: 1,
  },
  bodyContent: {
    padding: spacing[4],
    gap: spacing[4],
    paddingBottom: spacing[8],
  },
  consentBanner: {
    borderWidth: 2,
    borderRadius: borderRadius.lg,
    padding: spacing[4],
    gap: spacing[3],
  },
  consentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  consentTitle: {
    ...typeStyles.bodyStrong,
  },
  consentBody: {
    ...typeStyles.bodySmall,
  },
  consentCheck: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
  },
  consentCheckLabel: {
    ...typeStyles.bodySmall,
    flex: 1,
  },
  pickButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing[2],
    borderRadius: borderRadius.lg,
    paddingVertical: spacing[3],
  },
  pickButtonText: {
    ...typeStyles.bodyStrong,
    color: '#fff',
  },
  section: {
    borderWidth: 1,
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
    gap: spacing[2],
  },
  sectionTitle: {
    ...typeStyles.meta,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    flex: 1,
  },
  fileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  fileInfo: {
    flex: 1,
    gap: 2,
  },
  fileName: {
    ...typeStyles.bodySmall,
    fontWeight: '600',
  },
  fileMeta: {
    ...typeStyles.meta,
  },
  errorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    borderWidth: 1,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
  },
  errorFileName: {
    ...typeStyles.bodySmall,
    fontWeight: '600',
    flex: 1,
  },
  errorMsg: {
    ...typeStyles.meta,
  },
  wipeText: {
    ...typeStyles.meta,
    fontWeight: '700',
  },
  emptyText: {
    ...typeStyles.bodySmall,
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
  },
  folderRow: {
    paddingHorizontal: spacing[1],
  },
  folderLabel: {
    ...typeStyles.meta,
    fontFamily: 'monospace',
  },
})

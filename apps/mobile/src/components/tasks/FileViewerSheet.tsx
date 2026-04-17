import React, { useEffect, useMemo, useRef, useState } from 'react'
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { TrueSheet } from '@lodev09/react-native-true-sheet'
import { X } from 'lucide-react-native'
import { borderRadius, spacing } from '@pocketdev/shared/theme'
import type { TaskActivity } from '@pocketdev/shared/types'
import { fetchFileContent } from '../../services/api'
import { useConnectionStore } from '../../stores/connection'
import { useTheme } from '../../contexts/ThemeContext'
import CodeViewer from '../files/CodeViewer'
import { inferLanguage, type FileNode } from '../files/model'
import BauhausButton from '../shared/BauhausButton'
import { typeStyles } from '../../theme/typography'

type LineHighlightRange = { start: number; end: number }

type Props = {
  filePath: string
  activity: Extract<TaskActivity, { type: 'tool_use' }>
  onDismiss: () => void
}

function computeHighlights(content: string, metadata: Record<string, unknown> | undefined): LineHighlightRange[] {
  if (!metadata) return []
  const newString = metadata.new_string
  if (!newString || typeof newString !== 'string') return []
  const idx = content.indexOf(newString)
  if (idx === -1) return []
  const start = content.slice(0, idx).split('\n').length
  const end = start + newString.split('\n').length - 1
  return [{ start, end }]
}

export default function FileViewerSheet({ filePath, activity, onDismiss }: Props) {
  const { colors } = useTheme()
  const sheetRef = useRef<TrueSheet>(null)
  const server = useConnectionStore((s) => s.server)
  const [content, setContent] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [wrapLines, setWrapLines] = useState(false)
  const [currentHighlightIndex, setCurrentHighlightIndex] = useState(0)

  useEffect(() => {
    sheetRef.current?.present()
  }, [])

  useEffect(() => {
    if (!server) {
      setError('No server connected')
      setIsLoading(false)
      return
    }
    setIsLoading(true)
    setError(null)
    setContent(null)
    setCurrentHighlightIndex(0)
    fetchFileContent(server.ip, server.port, filePath)
      .then((res) => setContent(res.content))
      .catch((err: unknown) => setError((err as Error)?.message ?? 'Failed to load file'))
      .finally(() => setIsLoading(false))
  }, [filePath, server])

  const lineHighlights = useMemo(() => {
    if (!content) return []
    return computeHighlights(content, activity.metadata)
  }, [content, activity.metadata])

  const scrollToLine = lineHighlights[currentHighlightIndex]?.start

  const filename = filePath.split('/').pop() ?? filePath
  const fileNode: FileNode = useMemo(
    () => ({
      id: filePath,
      name: filename,
      path: filePath,
      kind: 'file',
      language: inferLanguage(filename),
    }),
    [filePath, filename],
  )

  const changedLineCount = lineHighlights.reduce((sum, r) => sum + (r.end - r.start + 1), 0)
  const highlightLabel = changedLineCount > 0 ? `${changedLineCount} changed line${changedLineCount !== 1 ? 's' : ''}` : undefined

  function handlePrev() {
    setCurrentHighlightIndex((i) => (i - 1 + lineHighlights.length) % lineHighlights.length)
  }

  function handleNext() {
    setCurrentHighlightIndex((i) => (i + 1) % lineHighlights.length)
  }

  return (
    <TrueSheet ref={sheetRef} detents={[1]} backgroundColor={colors.background} cornerRadius={24} onDidDismiss={onDismiss}>
      {error ? (
        <View style={styles.errorState}>
          <TouchableOpacity onPress={() => sheetRef.current?.dismiss()} style={styles.closeButton}>
            <X color={colors.text} size={20} strokeWidth={2.25} />
          </TouchableOpacity>
          <Text style={[styles.errorText, { color: colors.textSecondary }]}>{error}</Text>
        </View>
      ) : (
        <>
          <View style={styles.body}>
            <CodeViewer
              file={fileNode}
              content={content}
              isLoading={isLoading}
              wrapLines={wrapLines}
              onToggleWrap={() => setWrapLines((w) => !w)}
              variant="plain"
              lineHighlights={lineHighlights}
              highlightLabel={highlightLabel}
              onBack={() => sheetRef.current?.dismiss()}
              scrollToLine={scrollToLine}
            />
          </View>
          {lineHighlights.length > 1 && (
            <View style={[styles.footer, { borderTopColor: colors.border, backgroundColor: colors.panel }]}>
              <BauhausButton compact variant="secondary" onPress={handlePrev}>
                ↑ Prev
              </BauhausButton>
              <Text style={[styles.counter, { color: colors.textSecondary }]}>
                {currentHighlightIndex + 1} of {lineHighlights.length}
              </Text>
              <BauhausButton compact variant="secondary" onPress={handleNext}>
                ↓ Next
              </BauhausButton>
            </View>
          )}
        </>
      )}
    </TrueSheet>
  )
}

const styles = StyleSheet.create({
  body: {
    flex: 1,
    paddingHorizontal: spacing[3],
    paddingTop: spacing[2],
  },
  errorState: {
    flex: 1,
    padding: spacing[4],
    gap: spacing[3],
  },
  closeButton: {
    alignSelf: 'flex-end',
    padding: spacing[1],
  },
  errorText: {
    ...typeStyles.body,
    borderRadius: borderRadius.lg,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing[3],
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
    borderTopWidth: 1,
  },
  counter: {
    ...typeStyles.meta,
    minWidth: 60,
    textAlign: 'center',
  },
})

import React from 'react'
import { ScrollView, StyleSheet, Text, TouchableOpacity } from 'react-native'
import { ChevronDown, ChevronUp, Terminal } from 'lucide-react-native'
import { borderRadius, spacing } from '@pocketdev/shared/theme'
import { typeStyles } from '../../../theme/typography'
import { useTheme } from '../../../contexts/ThemeContext'
import CopyButton from '../../ui/CopyButton'

interface Props {
  visible: boolean
  onToggle: () => void
  output: string
  scrollRef?: React.RefObject<ScrollView | null>
  label?: string
  copyLabel?: string
  placeholder?: string
}

export default function SetupTerminalPanel({
  visible,
  onToggle,
  output,
  scrollRef,
  label = 'Terminal output',
  copyLabel = 'Copy output',
  placeholder = 'Waiting for output...',
}: Props) {
  const { colors } = useTheme()

  return (
    <>
      <TouchableOpacity
        style={[styles.toggle, { borderColor: colors.border }]}
        onPress={onToggle}
        activeOpacity={0.7}
      >
        <Terminal color={colors.textTertiary} size={16} strokeWidth={2} />
        <Text style={[styles.toggleText, { color: colors.textTertiary }]}>{label}</Text>
        {visible
          ? <ChevronUp color={colors.textTertiary} size={16} strokeWidth={2} />
          : <ChevronDown color={colors.textTertiary} size={16} strokeWidth={2} />}
      </TouchableOpacity>

      {visible && (
        <>
          <ScrollView
            ref={scrollRef}
            style={[styles.outputBox, { backgroundColor: colors.background }]}
            nestedScrollEnabled
          >
            <Text style={[styles.outputText, { color: colors.textSecondary }]} selectable>
              {output || placeholder}
            </Text>
          </ScrollView>
          {output ? <CopyButton value={output} label={copyLabel} /> : null}
        </>
      )}
    </>
  )
}

const styles = StyleSheet.create({
  toggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    borderWidth: 1,
    borderRadius: borderRadius.md,
    paddingVertical: spacing[2],
    paddingHorizontal: spacing[3],
  },
  toggleText: {
    ...typeStyles.bodySmall,
    flex: 1,
  },
  outputBox: {
    borderRadius: borderRadius.lg,
    padding: spacing[4],
    minHeight: 160,
    maxHeight: 260,
  },
  outputText: {
    ...typeStyles.mono,
  },
})

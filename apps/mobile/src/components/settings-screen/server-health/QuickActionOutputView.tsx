import React, { useMemo, useState } from 'react'
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { AlignLeft, Code2 } from 'lucide-react-native'
import { borderRadius, spacing } from '@pocketdev/shared/theme'
import { useTheme } from '../../../contexts/ThemeContext'
import { typeStyles } from '../../../theme/typography'
import CopyButton from '../../ui/CopyButton'

// ── ANSI / parsing utils ──────────────────────────────────────────────────────

// eslint-disable-next-line no-control-regex
const ANSI_PATTERN = /\x1B\[[0-9;]*[mGKHFJSTfu]|\x1B[()][B0]/g

function stripAnsi(s: string): string {
  return s.replace(ANSI_PATTERN, '')
}

type Tone = 'error' | 'warn' | 'success' | 'plain'

function lineTone(line: string): Tone {
  const l = line.toLowerCase()
  if (/\b(error|fail(?:ed)?|critical|fatal|denied)\b/.test(l)) return 'error'
  if (/\b(warn(?:ing)?)\b/.test(l)) return 'warn'
  if (/\b(ok\b|pass(?:ed)?|success|healthy|done|complete)\b/.test(l)) return 'success'
  const pct = line.match(/\b(\d{1,3})%/)
  if (pct) {
    const n = parseInt(pct[1], 10)
    if (n >= 85) return 'error'
    if (n >= 70) return 'warn'
  }
  return 'plain'
}

type RawLine = { key: string; text: string; num: number }
type ParsedLine = { key: string; text: string; tone: Tone; isHeader: boolean }

function toRawLines(clean: string): RawLine[] {
  return clean.split('\n').map((text, i) => ({ key: `${i}`, text, num: i + 1 }))
}

function toParsedLines(clean: string): ParsedLine[] {
  let prevWasBlank = true
  const result: ParsedLine[] = []
  clean.split('\n').forEach((text, i) => {
    if (!text.trim()) { prevWasBlank = true; return }
    result.push({ key: `${i}`, text, tone: lineTone(text), isHeader: prevWasBlank })
    prevWasBlank = false
  })
  return result
}

// ── Component ────────────────────────────────────────────────────────────────

type Props = { output: string; exitCode: number }
type Mode = 'raw' | 'parsed'

export default function QuickActionOutputView({ output, exitCode }: Props) {
  const { colors } = useTheme()
  const [mode, setMode] = useState<Mode>('raw')

  const clean = useMemo(() => stripAnsi(output.trim()), [output])
  const rawLines = useMemo(() => toRawLines(clean), [clean])
  const parsedLines = useMemo(() => toParsedLines(clean), [clean])

  const toneColors: Record<Tone, string> = {
    error: colors.accentRed ?? '#dc2626',
    warn: '#d97706',
    success: '#16a34a',
    plain: colors.text,
  }
  const exitOk = exitCode === 0
  const exitColor = exitOk ? '#16a34a' : (colors.accentRed ?? '#dc2626')

  return (
    <View style={[styles.container, { backgroundColor: colors.panel, borderColor: colors.border }]}>
      <View style={[styles.toolbar, { borderBottomColor: colors.border }]}>
        <View style={styles.toolbarLeft}>
          <ModeChip
            label="Raw"
            Icon={Code2}
            active={mode === 'raw'}
            colors={colors}
            onPress={() => setMode('raw')}
          />
          <ModeChip
            label="Parsed"
            Icon={AlignLeft}
            active={mode === 'parsed'}
            colors={colors}
            onPress={() => setMode('parsed')}
          />
          <View style={[styles.exitBadge, { backgroundColor: `${exitColor}20`, borderColor: exitColor }]}>
            <Text style={[styles.exitText, { color: exitColor }]}>exit {exitCode}</Text>
          </View>
        </View>
        <CopyButton value={clean} />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        nestedScrollEnabled
        showsVerticalScrollIndicator={false}
      >
        {mode === 'raw'
          ? rawLines.map((item) => (
              <View key={item.key} style={styles.rawRow}>
                <Text style={[styles.lineNum, { color: colors.textTertiary }]}>{item.num}</Text>
                <Text style={[styles.rawText, { color: colors.text }]} selectable>
                  {item.text || ' '}
                </Text>
              </View>
            ))
          : parsedLines.map((item) => (
              <Text
                key={item.key}
                selectable
                style={[
                  item.isHeader ? styles.parsedHeader : styles.parsedLine,
                  { color: toneColors[item.tone] },
                ]}
              >
                {item.text}
              </Text>
            ))}
      </ScrollView>
    </View>
  )
}

// ── ModeChip ──────────────────────────────────────────────────────────────────

type ChipProps = {
  label: string
  Icon: React.ComponentType<{ color: string; size: number; strokeWidth: number }>
  active: boolean
  onPress: () => void
  colors: ReturnType<typeof useTheme>['colors']
}

function ModeChip({ label, Icon, active, onPress, colors }: ChipProps) {
  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.chip,
        {
          backgroundColor: active ? `${colors.primary}20` : 'transparent',
          borderColor: active ? colors.primary : colors.border,
        },
      ]}
    >
      <Icon size={12} color={active ? colors.primary : colors.textSecondary} strokeWidth={2} />
      <Text style={[styles.chipLabel, { color: active ? colors.primary : colors.textSecondary }]}>
        {label}
      </Text>
    </Pressable>
  )
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    borderRadius: borderRadius.md,
    borderWidth: 1,
    overflow: 'hidden',
  },
  toolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
    borderBottomWidth: 1,
    gap: spacing[2],
  },
  toolbarLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    flex: 1,
    flexWrap: 'wrap',
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[1],
    borderWidth: 1,
    borderRadius: borderRadius.full,
    paddingHorizontal: spacing[2],
    paddingVertical: 3,
  },
  chipLabel: {
    ...typeStyles.meta,
  },
  exitBadge: {
    borderWidth: 1,
    borderRadius: borderRadius.full,
    paddingHorizontal: spacing[2],
    paddingVertical: 3,
  },
  exitText: {
    ...typeStyles.meta,
  },
  scroll: {
    maxHeight: 240,
  },
  scrollContent: {
    padding: spacing[3],
  },
  rawRow: {
    flexDirection: 'row',
    gap: spacing[3],
    paddingVertical: 1,
  },
  lineNum: {
    ...typeStyles.mono,
    width: 24,
    textAlign: 'right',
  },
  rawText: {
    ...typeStyles.mono,
    flex: 1,
  },
  parsedHeader: {
    ...typeStyles.mono,
    fontWeight: '700',
    marginTop: spacing[2],
    marginBottom: 1,
  },
  parsedLine: {
    ...typeStyles.mono,
    paddingVertical: 1,
  },
})

import React, { useEffect, useRef, useState } from 'react'
import { ScrollView, StyleSheet, Text, View } from 'react-native'
import { palette, borderRadius, spacing } from '@pocketdev/shared/theme'
import { useTheme } from '../../contexts/ThemeContext'
import { useConnectionStore } from '../../stores/connection'
import { Button } from '../ui/Button'
import CopyButton from './CopyButton'
import { typeStyles } from '../../theme/typography'
import ConnectingAnimation from '../animations/ConnectingAnimation'
import ServerWebBrowserSheet from '../browser/ServerWebBrowserSheet'
import { browserSessionUrl } from '../../services/api'
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated'

const BAUHAUS = palette.bauhaus

// Signal bar config — 5 bars that pulse in sequence
const BAR_COUNT = 5
const BAR_WIDTH = 14
const BAR_GAP = 8
const BAR_HEIGHTS = [16, 26, 38, 50, 62]
const BAR_COLORS = [BAUHAUS.red, BAUHAUS.yellow, BAUHAUS.blue, BAUHAUS.red, BAUHAUS.yellow]
const PULSE_DURATION = 600
const PULSE_STAGGER = 120
const PULSE_PAUSE = 800

// Don't hide the disconnected screen until connected for this long,
// prevents rapid blink during connect/disconnect loops.
const STABLE_CONNECTED_DELAY_MS = 2000

export default function ServerDisconnected() {
  const { colors } = useTheme()
  const status = useConnectionStore((s) => s.status)
  const connect = useConnectionStore((s) => s.connect)
  const server = useConnectionStore((s) => s.server)
  const connectionLog = useConnectionStore((s) => s.connectionLog)
  const getConnectionLogText = useConnectionStore((s) => s.getConnectionLogText)
  const [consoleOpen, setConsoleOpen] = useState(false)

  // Track whether we've ever reached a connected state this session.
  // Used to decide which animation to show:
  //   - never connected yet → ConnectingAnimation (first launch / initial connect)
  //   - was connected, now lost → SignalBars + X (mid-use disconnect)
  const [hasEverConnected, setHasEverConnected] = useState(false)

  // Debounce: stay visible until connected for STABLE_CONNECTED_DELAY_MS
  const [visible, setVisible] = useState(status !== 'connected')
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (status === 'connected') {
      setHasEverConnected(true)
      hideTimer.current = setTimeout(() => setVisible(false), STABLE_CONNECTED_DELAY_MS)
    } else if (status === 'disconnected' || status === 'error') {
      if (hideTimer.current) clearTimeout(hideTimer.current)
      hideTimer.current = null
      setVisible(true)
    }
    return () => {
      if (hideTimer.current) clearTimeout(hideTimer.current)
    }
  }, [status])

  if (!server) return null

  // First-launch connecting state: show the connecting animation, no error UI
  if (!hasEverConnected && (status === 'connecting' || status === 'disconnected')) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <ConnectingAnimation />
        <Text style={[styles.title, { color: colors.text }]}>Connecting…</Text>
        <Text style={[styles.body, { color: colors.textSecondary }]}>
          Reaching {server.ip}:{server.port}
        </Text>
      </View>
    )
  }

  if (!visible) return null

  const isError = status === 'error'

  // Show last 30 log entries
  const recentLog = connectionLog.slice(-30)

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.animationArea}>
        <SignalBars />
        {/* X strike-through over the bars */}
        <View style={styles.strikeContainer}>
          <View style={[styles.strikeLine, styles.strikeLeft, { backgroundColor: BAUHAUS.red }]} />
          <View style={[styles.strikeLine, styles.strikeRight, { backgroundColor: BAUHAUS.red }]} />
        </View>
      </View>

      <Text style={[styles.title, { color: colors.text }]}>
        {isError ? 'Server Unreachable' : 'Disconnected'}
      </Text>
      <Text style={[styles.body, { color: colors.textSecondary }]}>
        {isError
          ? `Could not reach ${server.ip}:${server.port} after multiple attempts. Make sure the PocketDev agent is running.`
          : `Lost connection to ${server.ip}:${server.port}.`}
      </Text>

      <Button size="sm" onPress={connect}>
        Retry Connection
      </Button>

      {server && (
        <Button size="sm" variant="secondary" onPress={() => setConsoleOpen(true)}>
          Server Console
        </Button>
      )}

      {consoleOpen && server && (
        <ServerWebBrowserSheet
          title="Server Console"
          initialUrl={browserSessionUrl(server.ip, server.port, '/PocketDev/')}
          onDismiss={() => setConsoleOpen(false)}
        />
      )}

      {recentLog.length > 0 && (
        <View style={[styles.logSection, { borderColor: colors.border }]}>
          <View style={styles.logHeader}>
            <Text style={[styles.logTitle, { color: colors.textSecondary }]}>
              Connection Log ({connectionLog.length} events)
            </Text>
            <CopyButton
              value={getConnectionLogText()}
              label="Logs"
              style={styles.copyButton}
            />
          </View>
          <ScrollView style={styles.logScroll} nestedScrollEnabled>
            {recentLog.map((entry, i) => {
              const ts = new Date(entry.timestamp)
              const timeStr = ts.toISOString().slice(11, 23) // HH:mm:ss.SSS
              const isDisconnect = entry.event === 'status' && entry.detail === 'disconnected'
              const isConnect = entry.event === 'status' && entry.detail === 'connected'
              const isStale = entry.event === 'stale_ignored'
              const logColor = isDisconnect
                ? BAUHAUS.red
                : isConnect
                  ? '#22c55e'
                  : isStale
                    ? BAUHAUS.yellow
                    : colors.textSecondary
              return (
                <Text key={i} style={[styles.logLine, { color: logColor }]}>
                  {timeStr} {entry.event}{entry.detail ? ` ${entry.detail}` : ''}
                </Text>
              )
            })}
          </ScrollView>
        </View>
      )}
    </View>
  )
}

function SignalBars() {
  return (
    <View style={styles.barsRow}>
      {Array.from({ length: BAR_COUNT }).map((_, i) => (
        <SignalBar key={i} index={i} />
      ))}
    </View>
  )
}

function SignalBar({ index }: { index: number }) {
  const opacity = useSharedValue(0.2)

  useEffect(() => {
    const delay = index * PULSE_STAGGER

    opacity.value = withDelay(
      delay,
      withRepeat(
        withSequence(
          withTiming(1, { duration: PULSE_DURATION, easing: Easing.out(Easing.quad) }),
          withTiming(0.2, { duration: PULSE_DURATION, easing: Easing.in(Easing.quad) }),
          withTiming(0.2, { duration: PULSE_PAUSE }),
        ),
        -1,
      ),
    )
  }, [index, opacity])

  const animStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }))

  return (
    <Animated.View
      style={[
        styles.bar,
        {
          width: BAR_WIDTH,
          height: BAR_HEIGHTS[index],
          backgroundColor: BAR_COLORS[index],
          borderRadius: BAR_WIDTH / 4,
        },
        animStyle,
      ]}
    />
  )
}

const BARS_WIDTH = BAR_COUNT * BAR_WIDTH + (BAR_COUNT - 1) * BAR_GAP

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing[6],
    gap: spacing[4],
  },
  animationArea: {
    width: BARS_WIDTH + 40,
    height: BAR_HEIGHTS[BAR_COUNT - 1] + 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing[2],
  },
  barsRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: BAR_GAP,
  },
  bar: {},
  strikeContainer: {
    position: 'absolute', left: 0, right: 0, top: 0, bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  strikeLine: {
    position: 'absolute',
    width: '110%',
    height: 3,
    borderRadius: 1.5,
  },
  strikeLeft: {
    transform: [{ rotate: '45deg' }],
  },
  strikeRight: {
    transform: [{ rotate: '-45deg' }],
  },
  title: {
    ...typeStyles.sectionTitle,
    textAlign: 'center',
  },
  body: {
    ...typeStyles.bodySmall,
    textAlign: 'center',
    maxWidth: 300,
  },
  logSection: {
    width: '100%',
    maxWidth: 400,
    borderWidth: 1,
    borderRadius: borderRadius.md,
    marginTop: spacing[2],
    overflow: 'hidden',
  },
  logHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
  },
  logTitle: {
    ...typeStyles.meta,
    fontWeight: '600',
  },
  copyButton: {
    paddingVertical: spacing[1],
    paddingHorizontal: spacing[2],
  },
  logScroll: {
    maxHeight: 200,
    paddingHorizontal: spacing[3],
    paddingBottom: spacing[3],
  },
  logLine: {
    fontFamily: typeStyles.mono.fontFamily,
    fontSize: 11,
    lineHeight: 16,
  },
})

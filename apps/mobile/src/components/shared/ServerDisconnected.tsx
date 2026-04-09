import React, { useEffect } from 'react'
import { StyleSheet, Text, View } from 'react-native'
import { palette, borderRadius, spacing } from '@pocketdev/shared/theme'
import { useTheme } from '../../contexts/ThemeContext'
import { useConnectionStore } from '../../stores/connection'
import BauhausButton from './BauhausButton'
import { typeStyles } from '../../theme/typography'
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

export default function ServerDisconnected() {
  const { colors } = useTheme()
  const status = useConnectionStore((s) => s.status)
  const connect = useConnectionStore((s) => s.connect)
  const server = useConnectionStore((s) => s.server)

  if (status === 'connected' || !server) return null

  const isError = status === 'error'
  const isDisconnected = status === 'disconnected'

  // Only show for terminal states, not while actively connecting
  if (!isError && !isDisconnected) return null

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

      <BauhausButton compact onPress={connect}>
        Retry Connection
      </BauhausButton>
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
        -1, // infinite
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
    ...StyleSheet.absoluteFillObject,
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
})

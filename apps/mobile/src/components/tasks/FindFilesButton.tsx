import React, { useCallback, useEffect, useRef } from 'react'
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import Animated, {
  Easing,
  interpolate,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSequence,
  withTiming,
} from 'react-native-reanimated'
import { Cpu, Search } from 'lucide-react-native'
import { borderRadius, palette, spacing } from '@pocketdev/shared/theme'
import { useTheme } from '../../contexts/ThemeContext'
import { typeStyles } from '../../theme/typography'

const BAUHAUS = palette.bauhaus
const ANIMATION_DURATION = 1400

type Props = {
  searching: boolean
  onPress: () => void
}

export default function FindFilesButton({ searching, onPress }: Props) {
  const { colors } = useTheme()

  const sweep = useSharedValue(0)
  const accentOpacity = useSharedValue(0)
  const [animating, setAnimating] = React.useState(false)
  const searchDoneRef = useRef(false)

  // Track when the actual search finishes while animation is still running
  useEffect(() => {
    if (!searching && animating) {
      searchDoneRef.current = true
    }
  }, [searching, animating])

  const onAnimationComplete = useCallback(() => {
    setAnimating(false)
    searchDoneRef.current = false
  }, [])

  function handlePress() {
    if (animating) return

    searchDoneRef.current = false
    setAnimating(true)

    // Start animation
    sweep.value = 0
    accentOpacity.value = 0

    sweep.value = withTiming(1, {
      duration: ANIMATION_DURATION,
      easing: Easing.inOut(Easing.cubic),
    }, (finished) => {
      if (finished) runOnJS(onAnimationComplete)()
    })

    accentOpacity.value = withSequence(
      withDelay(300, withTiming(0.9, { duration: 200, easing: Easing.out(Easing.cubic) })),
      withDelay(500, withTiming(0, { duration: 250, easing: Easing.in(Easing.cubic) })),
    )

    // Fire the actual search
    onPress()
  }

  const isActive = animating || searching

  // Magnifying glass sweeps left → right
  const glassStyle = useAnimatedStyle(() => {
    if (sweep.value === 0) return { opacity: 0, transform: [{ translateX: 0 }] }
    return {
      opacity: interpolate(sweep.value, [0, 0.05, 0.85, 1], [0, 1, 1, 0]),
      transform: [
        { translateX: interpolate(sweep.value, [0, 1], [-40, 240]) },
        { scale: interpolate(sweep.value, [0, 0.5, 1], [0.8, 1.1, 0.8]) },
      ],
    }
  })

  // Text dissolves as the glass passes over
  const textStyle = useAnimatedStyle(() => {
    if (sweep.value === 0) return { opacity: 1 }
    return {
      opacity: interpolate(sweep.value, [0, 0.3, 0.55, 0.85, 1], [1, 1, 0, 0, 1]),
    }
  })

  const accentDotStyle = useAnimatedStyle(() => ({
    opacity: accentOpacity.value,
    transform: [
      { scale: interpolate(accentOpacity.value, [0, 0.9], [0.5, 1]) },
    ],
  }))

  const accentBarStyle = useAnimatedStyle(() => ({
    opacity: accentOpacity.value * 0.7,
    transform: [
      { scaleX: interpolate(accentOpacity.value, [0, 0.9], [0.3, 1]) },
    ],
  }))

  return (
    <TouchableOpacity
      style={[styles.button, { borderColor: colors.border, backgroundColor: colors.panelAlt }]}
      onPress={handlePress}
      activeOpacity={0.7}
      disabled={isActive}
    >
      <View style={styles.content}>
        {!isActive && <Cpu color={colors.primary} size={16} strokeWidth={2.2} />}
        <Animated.Text style={[styles.label, { color: colors.primary }, isActive ? textStyle : undefined]}>
          {isActive ? 'Scanning files...' : 'Find related files'}
        </Animated.Text>
      </View>

      {isActive && (
        <View style={styles.sweepLayer} pointerEvents="none">
          <Animated.View style={[styles.glass, glassStyle]}>
            <Search color={BAUHAUS.blue} size={20} strokeWidth={2.5} />
          </Animated.View>

          <Animated.View
            style={[styles.accentDot, { backgroundColor: BAUHAUS.yellow }, accentDotStyle]}
          />
          <Animated.View
            style={[styles.accentBar, { backgroundColor: BAUHAUS.red }, accentBarStyle]}
          />
        </View>
      )}
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  button: {
    overflow: 'hidden',
    borderWidth: 2,
    borderRadius: borderRadius.lg,
    paddingVertical: spacing[3],
    borderStyle: 'dashed',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing[2],
  },
  label: {
    ...typeStyles.bodySmall,
    fontWeight: '700',
  },
  sweepLayer: {
    position: 'absolute', left: 0, right: 0, top: 0, bottom: 0,
    justifyContent: 'center',
  },
  glass: {
    position: 'absolute',
    left: 0,
    alignSelf: 'center',
  },
  accentDot: {
    position: 'absolute',
    width: 6,
    height: 6,
    borderRadius: 3,
    right: '30%',
    top: 6,
  },
  accentBar: {
    position: 'absolute',
    width: 22,
    height: 3,
    borderRadius: 999,
    left: '25%',
    bottom: 7,
    transform: [{ rotate: '-12deg' }],
  },
})

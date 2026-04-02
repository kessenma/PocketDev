import React, { useEffect, useState } from 'react'
import { Dimensions, StyleSheet, View } from 'react-native'
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
  runOnJS,
} from 'react-native-reanimated'
import { palette } from '@pocketdev/shared/theme'

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window')

type BlobConfig = {
  id: string
  color: string
  size: number
  initialX: number
  initialY: number
  rangeX: number
  rangeY: number
  duration: number
  delay: number
  opacity: number
}

type Props = {
  colors: {
    background: string
    backgroundSecondary: string
    primary: string
    primaryHover: string
    accent: string
  }
  isDark: boolean
  variant?: 'connect' | 'setup'
  children?: React.ReactNode
}

function AnimatedBlob({ config }: { config: BlobConfig }) {
  const translateX = useSharedValue(0)
  const translateY = useSharedValue(0)

  useEffect(() => {
    translateX.value = withDelay(
      config.delay,
      withRepeat(
        withSequence(
          withTiming(config.rangeX, {
            duration: config.duration,
            easing: Easing.inOut(Easing.sin),
          }),
          withTiming(-config.rangeX * 0.7, {
            duration: config.duration * 0.8,
            easing: Easing.inOut(Easing.sin),
          }),
        ),
        -1,
        true,
      ),
    )

    translateY.value = withDelay(
      config.delay + 500,
      withRepeat(
        withSequence(
          withTiming(-config.rangeY, {
            duration: config.duration * 1.1,
            easing: Easing.inOut(Easing.sin),
          }),
          withTiming(config.rangeY * 0.6, {
            duration: config.duration * 0.9,
            easing: Easing.inOut(Easing.sin),
          }),
        ),
        -1,
        true,
      ),
    )
  }, [config.delay, config.duration, config.rangeX, config.rangeY, translateX, translateY])

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }, { translateY: translateY.value }],
  }))

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.blob,
        {
          left: config.initialX - config.size / 2,
          top: config.initialY - config.size / 2,
          width: config.size,
          height: config.size,
          borderRadius: config.size / 2,
          backgroundColor: config.color,
          opacity: config.opacity,
        },
        animatedStyle,
      ]}
    />
  )
}

export default function AnimatedGradientBackground({
  colors,
  isDark,
  variant = 'connect',
  children,
}: Props) {
  const overlayStyle = {
    backgroundColor: isDark ? 'rgba(10,10,10,0.72)' : 'rgba(250,250,250,0.82)',
  }
  const [animDone, setAnimDone] = useState(false)
  const contentOpacity = useSharedValue(0)
  const contentScale = useSharedValue(0.985)

  useEffect(() => {
    contentOpacity.value = withTiming(1, { duration: 480, easing: Easing.out(Easing.cubic) }, () => {
      runOnJS(setAnimDone)(true)
    })
    contentScale.value = withSpring(1, { damping: 18, stiffness: 150 })
  }, [contentOpacity, contentScale])

  const contentAnimatedStyle = useAnimatedStyle(() => ({
    opacity: contentOpacity.value,
    transform: [{ scale: contentScale.value }],
  }))

  const blobConfigs: BlobConfig[] =
    variant === 'setup'
      ? [
          {
            id: 'blob1',
            color: colors.primaryHover,
            size: SCREEN_WIDTH * 1.34,
            initialX: SCREEN_WIDTH * 0.1,
            initialY: SCREEN_HEIGHT * 0.08,
            rangeX: 24,
            rangeY: 20,
            duration: 6200,
            delay: 0,
            opacity: isDark ? 0.16 : 0.12,
          },
          {
            id: 'blob2',
            color: colors.accent,
            size: SCREEN_WIDTH * 0.96,
            initialX: SCREEN_WIDTH * 0.92,
            initialY: SCREEN_HEIGHT * 0.16,
            rangeX: 28,
            rangeY: 22,
            duration: 7000,
            delay: 300,
            opacity: isDark ? 0.14 : 0.1,
          },
          {
            id: 'blob3',
            color: colors.backgroundSecondary,
            size: SCREEN_WIDTH * 1.22,
            initialX: SCREEN_WIDTH * 0.56,
            initialY: SCREEN_HEIGHT * 0.44,
            rangeX: 20,
            rangeY: 30,
            duration: 7600,
            delay: 180,
            opacity: isDark ? 0.24 : 0.18,
          },
          {
            id: 'blob4',
            color: colors.primary,
            size: SCREEN_WIDTH * 1.05,
            initialX: SCREEN_WIDTH * 0.18,
            initialY: SCREEN_HEIGHT * 0.86,
            rangeX: 26,
            rangeY: 24,
            duration: 6800,
            delay: 540,
            opacity: isDark ? 0.14 : 0.1,
          },
          {
            id: 'blob5',
            color: isDark ? palette.primary[200] : palette.accent[100],
            size: SCREEN_WIDTH * 0.78,
            initialX: SCREEN_WIDTH * 0.84,
            initialY: SCREEN_HEIGHT * 0.76,
            rangeX: 18,
            rangeY: 28,
            duration: 8200,
            delay: 760,
            opacity: isDark ? 0.1 : 0.08,
          },
        ]
      : [
          {
            id: 'blob1',
            color: colors.primary,
            size: SCREEN_WIDTH * 1.28,
            initialX: SCREEN_WIDTH * 0.22,
            initialY: SCREEN_HEIGHT * 0.12,
            rangeX: 40,
            rangeY: 34,
            duration: 4200,
            delay: 0,
            opacity: isDark ? 0.18 : 0.14,
          },
          {
            id: 'blob2',
            color: colors.accent,
            size: SCREEN_WIDTH * 1.02,
            initialX: SCREEN_WIDTH * 0.78,
            initialY: SCREEN_HEIGHT * 0.2,
            rangeX: 52,
            rangeY: 38,
            duration: 5200,
            delay: 350,
            opacity: isDark ? 0.16 : 0.12,
          },
          {
            id: 'blob3',
            color: colors.primaryHover,
            size: SCREEN_WIDTH * 1.18,
            initialX: SCREEN_WIDTH * 0.48,
            initialY: SCREEN_HEIGHT * 0.54,
            rangeX: 30,
            rangeY: 44,
            duration: 4700,
            delay: 180,
            opacity: isDark ? 0.14 : 0.1,
          },
          {
            id: 'blob4',
            color: colors.backgroundSecondary,
            size: SCREEN_WIDTH * 0.92,
            initialX: SCREEN_WIDTH * 0.16,
            initialY: SCREEN_HEIGHT * 0.8,
            rangeX: 46,
            rangeY: 36,
            duration: 3600,
            delay: 650,
            opacity: isDark ? 0.28 : 0.2,
          },
          {
            id: 'blob5',
            color: isDark ? palette.primary[300] : palette.accent[200],
            size: SCREEN_WIDTH * 0.9,
            initialX: SCREEN_WIDTH * 0.84,
            initialY: SCREEN_HEIGHT * 0.78,
            rangeX: 34,
            rangeY: 46,
            duration: 5600,
            delay: 500,
            opacity: isDark ? 0.12 : 0.1,
          },
        ]

  return (
    <View style={styles.container}>
      <View style={[styles.baseBackground, { backgroundColor: colors.background }]} />
      <View
        pointerEvents="none"
        style={[styles.softOverlay, overlayStyle]}
      />
      <View pointerEvents="none" style={styles.blobLayer}>
        {blobConfigs.map((config) => (
          <AnimatedBlob key={config.id} config={config} />
        ))}
      </View>
      {animDone ? (
        <View style={styles.contentLayer}>{children}</View>
      ) : (
        <Animated.View style={[styles.contentLayer, contentAnimatedStyle]}>{children}</Animated.View>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  baseBackground: {
    ...StyleSheet.absoluteFillObject,
  },
  softOverlay: {
    ...StyleSheet.absoluteFillObject,
  },
  blobLayer: {
    ...StyleSheet.absoluteFillObject,
    overflow: 'hidden',
  },
  blob: {
    position: 'absolute',
  },
  contentLayer: {
    flex: 1,
  },
})

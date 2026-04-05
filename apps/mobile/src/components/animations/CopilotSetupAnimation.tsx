import React, { useEffect } from 'react'
import { Dimensions, Image, StyleSheet, View } from 'react-native'
import { useTheme } from '../../contexts/ThemeContext'
import { Assets } from '../../../assets'
import { palette } from '@pocketdev/shared/theme'
import { useExitFade } from './useExitFade'
import Animated, {
  Easing,
  interpolate,
  type SharedValue,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated'
import { Check, ShieldCheck } from 'lucide-react-native'

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window')

const BAUHAUS = palette.bauhaus
const LIGHT_BG = '#EEF2FF'
const DARK_BG = '#0A0A0A'
const PANEL_BG = '#111827'
const PANEL_LINE = 'rgba(244, 240, 232, 0.74)'

const ICON_FADE_IN = 260
const PANEL_DELAY = 280
const CHIP_STAGGER = 180
const CONNECTOR_DELAY = 720
const SHIELD_DELAY = 1320
const HOLD_DURATION = 980
const MERGE_DURATION = 620
const OUTRO_DURATION = 300
const PANEL_WIDTH = SCREEN_WIDTH * 0.52
const PANEL_HEIGHT = SCREEN_WIDTH * 0.34

const CHIPS = [
  {
    id: 'chip-blue',
    width: SCREEN_WIDTH * 0.24,
    height: SCREEN_WIDTH * 0.08,
    color: BAUHAUS.blue,
    fromX: -SCREEN_WIDTH * 0.5,
    baseX: SCREEN_WIDTH * 0.06,
    baseY: -SCREEN_HEIGHT * 0.12,
    mergeX: SCREEN_WIDTH * 0.1,
    mergeY: -SCREEN_HEIGHT * 0.03,
    delay: 0,
  },
  {
    id: 'chip-yellow',
    width: SCREEN_WIDTH * 0.32,
    height: SCREEN_WIDTH * 0.08,
    color: BAUHAUS.yellow,
    fromX: SCREEN_WIDTH * 0.5,
    baseX: SCREEN_WIDTH * 0.14,
    baseY: -SCREEN_HEIGHT * 0.03,
    mergeX: SCREEN_WIDTH * 0.11,
    mergeY: 0,
    delay: 1,
  },
  {
    id: 'chip-red',
    width: SCREEN_WIDTH * 0.2,
    height: SCREEN_WIDTH * 0.08,
    color: BAUHAUS.red,
    fromX: -SCREEN_WIDTH * 0.5,
    baseX: SCREEN_WIDTH * 0.08,
    baseY: SCREEN_HEIGHT * 0.06,
    mergeX: SCREEN_WIDTH * 0.09,
    mergeY: SCREEN_HEIGHT * 0.03,
    delay: 2,
  },
] as const

type Props = {
  onComplete: () => void
}

export default function CopilotSetupAnimation({ onComplete }: Props) {
  const { isDark } = useTheme()
  const overlayOpacity = useSharedValue(0)
  const { triggerExit } = useExitFade(overlayOpacity, onComplete)
  const iconOpacity = useSharedValue(0)
  const iconScale = useSharedValue(0.74)
  const panelOpacity = useSharedValue(0)
  const panelTranslateY = useSharedValue(28)
  const connectorOpacity = useSharedValue(0)
  const connectorScaleX = useSharedValue(0)
  const pulseProgress = useSharedValue(0)
  const shieldOpacity = useSharedValue(0)
  const shieldScale = useSharedValue(0.6)
  const mergeProgress = useSharedValue(0)
  const fadeProgress = useSharedValue(0)

  useEffect(() => {
    overlayOpacity.value = withTiming(1, { duration: 200, easing: Easing.out(Easing.cubic) })

    iconOpacity.value = withDelay(
      80,
      withTiming(1, { duration: ICON_FADE_IN, easing: Easing.out(Easing.cubic) }),
    )
    iconScale.value = withDelay(
      80,
      withSpring(1, { damping: 14, stiffness: 130 }),
    )

    panelOpacity.value = withDelay(
      PANEL_DELAY,
      withTiming(1, { duration: 260, easing: Easing.out(Easing.cubic) }),
    )
    panelTranslateY.value = withDelay(
      PANEL_DELAY,
      withSpring(0, { damping: 16, stiffness: 110 }),
    )

    connectorOpacity.value = withDelay(
      CONNECTOR_DELAY,
      withTiming(1, { duration: 160, easing: Easing.out(Easing.cubic) }),
    )
    connectorScaleX.value = withDelay(
      CONNECTOR_DELAY,
      withTiming(1, { duration: 260, easing: Easing.out(Easing.cubic) }),
    )
    pulseProgress.value = withDelay(
      CONNECTOR_DELAY + 80,
      withRepeat(
        withSequence(
          withTiming(1, { duration: 500, easing: Easing.inOut(Easing.cubic) }),
          withTiming(0, { duration: 0 }),
        ),
        2,
        false,
      ),
    )

    shieldOpacity.value = withDelay(
      SHIELD_DELAY,
      withTiming(1, { duration: 220, easing: Easing.out(Easing.cubic) }),
    )
    shieldScale.value = withDelay(
      SHIELD_DELAY,
      withSpring(1, { damping: 13, stiffness: 150 }),
    )

    const mergeStart = SHIELD_DELAY + 360 + HOLD_DURATION
    mergeProgress.value = withDelay(
      mergeStart,
      withTiming(1, { duration: MERGE_DURATION, easing: Easing.inOut(Easing.cubic) }),
    )
    fadeProgress.value = withDelay(
      mergeStart + MERGE_DURATION,
      withTiming(1, { duration: OUTRO_DURATION, easing: Easing.in(Easing.cubic) }),
    )

    const totalDuration = mergeStart + MERGE_DURATION + OUTRO_DURATION
    const timeout = setTimeout(() => {
      triggerExit()
    }, totalDuration + 40)

    return () => clearTimeout(timeout)
  }, [
    connectorOpacity,
    connectorScaleX,
    fadeProgress,
    iconOpacity,
    iconScale,
    mergeProgress,
    overlayOpacity,
    panelOpacity,
    panelTranslateY,
    pulseProgress,
    shieldOpacity,
    shieldScale,
    triggerExit,
  ])

  const overlayStyle = useAnimatedStyle(() => ({
    opacity: overlayOpacity.value,
  }))

  const iconStyle = useAnimatedStyle(() => ({
    opacity: iconOpacity.value * (1 - fadeProgress.value),
    transform: [
      { scale: interpolate(mergeProgress.value, [0, 1], [iconScale.value, 0.92]) },
      { translateX: interpolate(mergeProgress.value, [0, 1], [0, SCREEN_WIDTH * 0.05]) },
    ],
  }))

  const panelStyle = useAnimatedStyle(() => ({
    opacity: panelOpacity.value * (1 - fadeProgress.value),
    transform: [
      { translateY: interpolate(mergeProgress.value, [0, 1], [panelTranslateY.value, -SCREEN_HEIGHT * 0.02]) },
      { scale: interpolate(mergeProgress.value, [0, 1], [1, 0.96]) },
    ],
  }))

  const connectorStyle = useAnimatedStyle(() => ({
    opacity: connectorOpacity.value * (1 - fadeProgress.value) * (1 - mergeProgress.value * 0.45),
    transform: [{ scaleX: connectorScaleX.value }],
  }))

  const pulseStyle = useAnimatedStyle(() => ({
    opacity: connectorOpacity.value * (1 - mergeProgress.value) * 0.95,
    transform: [{ translateX: interpolate(pulseProgress.value, [0, 1], [-54, 56]) }],
  }))

  const shieldStyle = useAnimatedStyle(() => ({
    opacity: shieldOpacity.value * (1 - fadeProgress.value),
    transform: [
      { scale: interpolate(mergeProgress.value, [0, 1], [shieldScale.value, 0.78]) },
      { translateY: interpolate(mergeProgress.value, [0, 1], [0, -SCREEN_HEIGHT * 0.02]) },
    ],
  }))

  const bgColor = isDark ? DARK_BG : LIGHT_BG
  const githubLogo = isDark ? Assets.githubCopilotWhite : Assets.githubCopilotBlack

  return (
    <Animated.View style={[styles.overlay, { backgroundColor: bgColor }, overlayStyle]}>
      {CHIPS.map((chip) => (
        <SuggestionChip
          key={chip.id}
          config={chip}
          mergeProgress={mergeProgress}
          fadeProgress={fadeProgress}
        />
      ))}

      <View style={styles.stage} pointerEvents="none">
        <Animated.View style={[styles.logoDock, iconStyle]}>
          <View style={[styles.logoHalo, { backgroundColor: BAUHAUS.blue }]} />
          <Image source={githubLogo} style={styles.logo} resizeMode="contain" />
        </Animated.View>

        <Animated.View style={[styles.connector, connectorStyle]}>
          <View style={[styles.connectorLine, { backgroundColor: BAUHAUS.yellow }]} />
          <Animated.View style={[styles.connectorPulse, { backgroundColor: BAUHAUS.red }, pulseStyle]} />
        </Animated.View>

        <Animated.View style={[styles.panel, panelStyle]}>
          <View style={styles.panelHeader}>
            <View style={[styles.panelDot, { backgroundColor: BAUHAUS.red }]} />
            <View style={[styles.panelDot, { backgroundColor: BAUHAUS.yellow }]} />
            <View style={[styles.panelDot, { backgroundColor: BAUHAUS.blue }]} />
          </View>
          <View style={styles.panelBody}>
            <View style={[styles.panelLine, { width: '62%' }]} />
            <View style={[styles.panelLine, { width: '82%' }]} />
            <View style={[styles.panelLine, { width: '52%' }]} />
            <View style={[styles.panelGhostLine, { backgroundColor: BAUHAUS.blue, width: '68%' }]} />
          </View>
        </Animated.View>

        <Animated.View style={[styles.shieldBadge, shieldStyle]}>
          <View style={[styles.shieldSurface, { backgroundColor: BAUHAUS.black }]}>
            <ShieldCheck color="#F4F0E8" size={20} strokeWidth={2.25} />
          </View>
          <View style={[styles.shieldCheck, { backgroundColor: BAUHAUS.yellow }]}>
            <Check color={BAUHAUS.black} size={12} strokeWidth={3} />
          </View>
        </Animated.View>
      </View>
    </Animated.View>
  )
}

function SuggestionChip({
  config,
  mergeProgress,
  fadeProgress,
}: {
  config: (typeof CHIPS)[number]
  mergeProgress: SharedValue<number>
  fadeProgress: SharedValue<number>
}) {
  const opacity = useSharedValue(0)
  const translateX = useSharedValue(config.fromX)
  const translateY = useSharedValue(config.baseY + 24)
  const scale = useSharedValue(0.84)

  useEffect(() => {
    const delay = PANEL_DELAY + 80 + config.delay * CHIP_STAGGER

    opacity.value = withDelay(
      delay,
      withTiming(0.94, { duration: 220, easing: Easing.out(Easing.cubic) }),
    )
    translateX.value = withDelay(
      delay,
      withSpring(config.baseX, { damping: 16, stiffness: 105 }),
    )
    translateY.value = withDelay(
      delay,
      withSpring(config.baseY, { damping: 17, stiffness: 105 }),
    )
    scale.value = withDelay(
      delay,
      withSpring(1, { damping: 14, stiffness: 110 }),
    )
  }, [config, opacity, scale, translateX, translateY])

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value * (1 - fadeProgress.value),
    borderRadius: interpolate(mergeProgress.value, [0, 1], [14, 6]),
    transform: [
      { translateX: interpolate(mergeProgress.value, [0, 1], [translateX.value, config.mergeX]) },
      { translateY: interpolate(mergeProgress.value, [0, 1], [translateY.value, config.mergeY]) },
      { scaleX: interpolate(mergeProgress.value, [0, 1], [scale.value, PANEL_WIDTH * 0.52 / config.width]) },
      { scaleY: interpolate(mergeProgress.value, [0, 1], [scale.value, PANEL_HEIGHT * 0.12 / config.height]) },
    ],
  }))

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.suggestionChip,
        {
          width: config.width,
          height: config.height,
          backgroundColor: config.color,
          marginLeft: -config.width / 2,
          marginTop: -config.height / 2,
        },
        animatedStyle,
      ]}
    />
  )
}

const LOGO_SIZE = 78

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 100,
  },
  stage: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT * 0.46,
    alignItems: 'center',
    justifyContent: 'center',
  },
  suggestionChip: {
    position: 'absolute',
    left: '50%',
    top: '50%',
  },
  logoDock: {
    position: 'absolute',
    left: SCREEN_WIDTH * 0.12,
    top: '50%',
    width: LOGO_SIZE,
    height: LOGO_SIZE,
    marginTop: -LOGO_SIZE / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoHalo: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 28,
    opacity: 0.12,
  },
  logo: {
    width: LOGO_SIZE,
    height: LOGO_SIZE,
  },
  connector: {
    position: 'absolute',
    left: SCREEN_WIDTH * 0.3,
    top: '50%',
    width: SCREEN_WIDTH * 0.18,
    height: 16,
    marginTop: -8,
    justifyContent: 'center',
  },
  connectorLine: {
    height: 4,
    borderRadius: 999,
    width: '100%',
  },
  connectorPulse: {
    position: 'absolute',
    left: 0,
    width: 22,
    height: 8,
    borderRadius: 999,
  },
  panel: {
    position: 'absolute',
    left: SCREEN_WIDTH * 0.42,
    top: '50%',
    width: PANEL_WIDTH,
    height: PANEL_HEIGHT,
    marginTop: -PANEL_HEIGHT / 2,
    borderRadius: 26,
    backgroundColor: PANEL_BG,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.18,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
  },
  panelHeader: {
    height: 34,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  panelDot: {
    width: 8,
    height: 8,
    borderRadius: 999,
  },
  panelBody: {
    flex: 1,
    paddingHorizontal: 18,
    paddingTop: 16,
    gap: 10,
  },
  panelLine: {
    height: 9,
    borderRadius: 999,
    backgroundColor: PANEL_LINE,
  },
  panelGhostLine: {
    marginTop: 8,
    height: 12,
    borderRadius: 999,
  },
  shieldBadge: {
    position: 'absolute',
    left: SCREEN_WIDTH * 0.79,
    top: '50%',
    marginTop: PANEL_HEIGHT * 0.08,
    width: 54,
    height: 54,
    alignItems: 'center',
    justifyContent: 'center',
  },
  shieldSurface: {
    width: 54,
    height: 54,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  shieldCheck: {
    position: 'absolute',
    right: -2,
    bottom: -2,
    width: 22,
    height: 22,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
})

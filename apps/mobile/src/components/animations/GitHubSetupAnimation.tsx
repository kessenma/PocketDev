import React, { useEffect } from 'react'
import { Dimensions, Image, StyleSheet, View } from 'react-native'
import { useTheme } from '../../contexts/ThemeContext'
import { Assets } from '../../../assets'
import { palette } from '@pocketdev/shared/theme'
import { useExitFade } from './useExitFade'
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSpring,
  withTiming,
} from 'react-native-reanimated'
import { Check, KeyRound, Lock } from 'lucide-react-native'

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window')

const BAUHAUS = palette.bauhaus

const ICON_FADE_IN = 280
const TOKEN_DELAY = 280
const CONNECTOR_DELAY = 640
const REPO_DELAY = 980
const UNLOCK_DELAY = 1500
const HOLD_DURATION = 900

type Props = {
  onComplete: () => void
}

export default function GitHubSetupAnimation({ onComplete }: Props) {
  const { isDark } = useTheme()
  const overlayOpacity = useSharedValue(0)
  const { triggerExit } = useExitFade(overlayOpacity, onComplete)
  const gitOpacity = useSharedValue(0)
  const gitScale = useSharedValue(0.76)
  const tokenOpacity = useSharedValue(0)
  const tokenTranslateX = useSharedValue(40)
  const connectorScale = useSharedValue(0)
  const connectorOpacity = useSharedValue(0)
  const pulseTranslateX = useSharedValue(-80)
  const pulseOpacity = useSharedValue(0)
  const reposOpacity = useSharedValue(0)
  const reposTranslateY = useSharedValue(28)
  const unlockOpacity = useSharedValue(0)
  const unlockScale = useSharedValue(0.7)

  useEffect(() => {
    overlayOpacity.value = withTiming(1, { duration: 200, easing: Easing.out(Easing.cubic) })

    gitOpacity.value = withDelay(
      100,
      withTiming(1, { duration: ICON_FADE_IN, easing: Easing.out(Easing.cubic) }),
    )
    gitScale.value = withDelay(
      100,
      withSpring(1, { damping: 14, stiffness: 120 }),
    )
    tokenOpacity.value = withDelay(
      TOKEN_DELAY,
      withTiming(1, { duration: 240, easing: Easing.out(Easing.cubic) }),
    )
    tokenTranslateX.value = withDelay(
      TOKEN_DELAY,
      withSpring(0, { damping: 15, stiffness: 110 }),
    )
    connectorOpacity.value = withDelay(
      CONNECTOR_DELAY,
      withTiming(1, { duration: 180, easing: Easing.out(Easing.cubic) }),
    )
    connectorScale.value = withDelay(
      CONNECTOR_DELAY,
      withTiming(1, { duration: 240, easing: Easing.out(Easing.cubic) }),
    )
    pulseOpacity.value = withDelay(
      CONNECTOR_DELAY + 100,
      withTiming(1, { duration: 120, easing: Easing.linear }),
    )
    pulseTranslateX.value = withDelay(
      CONNECTOR_DELAY + 100,
      withTiming(72, { duration: 420, easing: Easing.linear }),
    )
    reposOpacity.value = withDelay(
      REPO_DELAY,
      withTiming(1, { duration: 240, easing: Easing.out(Easing.cubic) }),
    )
    reposTranslateY.value = withDelay(
      REPO_DELAY,
      withSpring(0, { damping: 16, stiffness: 105 }),
    )
    unlockOpacity.value = withDelay(
      UNLOCK_DELAY,
      withTiming(1, { duration: 220, easing: Easing.out(Easing.cubic) }),
    )
    unlockScale.value = withDelay(
      UNLOCK_DELAY,
      withSpring(1, { damping: 12, stiffness: 150 }),
    )

    const totalDuration = UNLOCK_DELAY + 700 + HOLD_DURATION
    const timeout = setTimeout(() => {
      triggerExit()
    }, totalDuration)

    return () => clearTimeout(timeout)
  }, [
    overlayOpacity,
    gitOpacity,
    gitScale,
    tokenOpacity,
    tokenTranslateX,
    connectorOpacity,
    connectorScale,
    pulseOpacity,
    pulseTranslateX,
    reposOpacity,
    reposTranslateY,
    unlockOpacity,
    unlockScale,
    triggerExit,
  ])

  const overlayStyle = useAnimatedStyle(() => ({
    opacity: overlayOpacity.value,
  }))

  const gitStyle = useAnimatedStyle(() => ({
    opacity: gitOpacity.value,
    transform: [{ scale: gitScale.value }],
  }))

  const tokenStyle = useAnimatedStyle(() => ({
    opacity: tokenOpacity.value,
    transform: [{ translateX: tokenTranslateX.value }],
  }))

  const connectorStyle = useAnimatedStyle(() => ({
    opacity: connectorOpacity.value,
    transform: [{ scaleX: connectorScale.value }],
  }))

  const pulseStyle = useAnimatedStyle(() => ({
    opacity: pulseOpacity.value,
    transform: [{ translateX: pulseTranslateX.value }],
  }))

  const reposStyle = useAnimatedStyle(() => ({
    opacity: reposOpacity.value,
    transform: [{ translateY: reposTranslateY.value }],
  }))

  const unlockStyle = useAnimatedStyle(() => ({
    opacity: unlockOpacity.value,
    transform: [{ scale: unlockScale.value }],
  }))

  const bgColor = isDark ? 'rgba(10, 10, 10, 0.96)' : BAUHAUS.black
  const gitLogo = isDark ? Assets.gitWhite : Assets.gitBlack

  return (
    <Animated.View style={[styles.overlay, { backgroundColor: bgColor }, overlayStyle]}>
      <View style={styles.stage}>
        <Animated.View style={[styles.gitDock, gitStyle]}>
          <View style={[styles.gitHalo, { backgroundColor: BAUHAUS.blue }]} />
          <View style={styles.gitIconFrame}>
            <Image source={gitLogo} style={styles.icon} resizeMode="contain" />
          </View>
        </Animated.View>

        <Animated.View style={[styles.connector, connectorStyle]}>
          <View style={[styles.connectorLine, { backgroundColor: BAUHAUS.yellow }]} />
          <Animated.View style={[styles.connectorPulse, { backgroundColor: BAUHAUS.red }, pulseStyle]} />
        </Animated.View>

        <Animated.View style={[styles.tokenCard, tokenStyle]}>
          <View style={[styles.tokenAccent, { backgroundColor: BAUHAUS.red }]} />
          <KeyRound color={BAUHAUS.black} size={20} strokeWidth={2.2} />
        </Animated.View>
      </View>

      <Animated.View style={[styles.repoGrid, reposStyle]}>
        <RepoTile tone={BAUHAUS.blue} />
        <RepoTile tone={BAUHAUS.red} />
        <RepoTile tone={BAUHAUS.yellow} />
        <View style={[styles.repoTile, styles.lockedRepoTile]}>
          <View style={[styles.repoTileBar, { backgroundColor: '#9ca3af' }]} />
          <View style={[styles.repoTileLine, { backgroundColor: '#6b7280' }]} />
          <View style={[styles.repoTileLineShort, { backgroundColor: '#6b7280' }]} />
          <Lock color="#e5e7eb" size={16} strokeWidth={2.2} />
          <Animated.View style={[styles.unlockBadge, { backgroundColor: BAUHAUS.yellow }, unlockStyle]}>
            <Check color={BAUHAUS.black} size={14} strokeWidth={3} />
          </Animated.View>
        </View>
      </Animated.View>
    </Animated.View>
  )
}

function RepoTile({ tone }: { tone: string }) {
  return (
    <View style={styles.repoTile}>
      <View style={[styles.repoTileBar, { backgroundColor: tone }]} />
      <View style={[styles.repoTileLine, { backgroundColor: 'rgba(244, 240, 232, 0.72)' }]} />
      <View style={[styles.repoTileLineShort, { backgroundColor: 'rgba(244, 240, 232, 0.4)' }]} />
    </View>
  )
}

const ICON_SIZE = 54

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 100,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 28,
  },
  stage: {
    width: '100%',
    maxWidth: 320,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 32,
  },
  gitDock: {
    width: 92,
    height: 92,
    alignItems: 'center',
    justifyContent: 'center',
  },
  gitHalo: {
    position: 'absolute',
    width: 92,
    height: 92,
    borderRadius: 46,
    opacity: 0.28,
  },
  gitIconFrame: {
    width: 74,
    height: 74,
    borderRadius: 24,
    backgroundColor: 'rgba(244, 240, 232, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  icon: {
    width: ICON_SIZE,
    height: ICON_SIZE,
  },
  connector: {
    width: 84,
    height: 18,
    justifyContent: 'center',
    overflow: 'hidden',
  },
  connectorLine: {
    height: 4,
    borderRadius: 999,
    opacity: 0.95,
  },
  connectorPulse: {
    position: 'absolute',
    width: 22,
    height: 10,
    borderRadius: 999,
    top: 4,
    left: 0,
  },
  tokenCard: {
    width: 64,
    height: 64,
    borderRadius: 18,
    backgroundColor: BAUHAUS.yellow,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  tokenAccent: {
    position: 'absolute',
    width: 24,
    height: 24,
    borderRadius: 12,
    top: -6,
    right: -6,
    opacity: 0.8,
  },
  repoGrid: {
    width: '100%',
    maxWidth: 320,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    justifyContent: 'center',
  },
  repoTile: {
    width: 148,
    minHeight: 88,
    borderRadius: 18,
    backgroundColor: 'rgba(244, 240, 232, 0.1)',
    padding: 14,
    gap: 10,
    position: 'relative',
    overflow: 'hidden',
  },
  lockedRepoTile: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    alignItems: 'flex-start',
    justifyContent: 'flex-start',
  },
  repoTileBar: {
    width: 40,
    height: 10,
    borderRadius: 999,
  },
  repoTileLine: {
    width: '100%',
    height: 6,
    borderRadius: 999,
  },
  repoTileLineShort: {
    width: '64%',
    height: 6,
    borderRadius: 999,
  },
  unlockBadge: {
    position: 'absolute',
    right: 12,
    bottom: 12,
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
})

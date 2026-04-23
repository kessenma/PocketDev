import { useCallback } from 'react'
import {
  Easing,
  type SharedValue,
  withTiming,
  runOnJS,
} from 'react-native-reanimated'

const EXIT_FADE_DURATION = 350

/**
 * Shared hook for graceful fade-out on animation completion.
 *
 * Pass in the overlay opacity shared value — when the animation's hold
 * period ends, call `triggerExit()` instead of `onComplete()` directly.
 * It fades the overlay to 0, then fires onComplete.
 */
export function useExitFade(
  overlayOpacity: SharedValue<number>,
  onComplete: () => void,
  onBeforeFade?: () => void,
) {
  const triggerExit = useCallback(() => {
    onBeforeFade?.()
    overlayOpacity.value = withTiming(
      0,
      { duration: EXIT_FADE_DURATION, easing: Easing.in(Easing.cubic) },
      (finished) => {
        if (finished) {
          runOnJS(onComplete)()
        }
      },
    )
  }, [overlayOpacity, onComplete])

  return { triggerExit, EXIT_FADE_DURATION }
}

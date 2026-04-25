import { useState, useCallback } from 'react'

export function useWizardCompletion() {
  const [animationDone, setAnimationDone] = useState(false)
  const onAnimationComplete = useCallback(() => setAnimationDone(true), [])
  return { animationDone, onAnimationComplete }
}

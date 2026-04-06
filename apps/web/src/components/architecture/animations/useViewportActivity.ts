import { useEffect, useRef, useState } from 'react'

export function useViewportActivity<T extends HTMLElement>(threshold = 0.25) {
  const ref = useRef<T | null>(null)
  const [isInView, setIsInView] = useState(false)
  const [intersectionRatio, setIntersectionRatio] = useState(0)
  const [isDocumentVisible, setIsDocumentVisible] = useState(
    typeof document === 'undefined' ? true : document.visibilityState === 'visible',
  )

  useEffect(() => {
    if (typeof document === 'undefined') {
      return
    }

    const handleVisibility = () => {
      setIsDocumentVisible(document.visibilityState === 'visible')
    }

    handleVisibility()
    document.addEventListener('visibilitychange', handleVisibility)

    return () => {
      document.removeEventListener('visibilitychange', handleVisibility)
    }
  }, [])

  useEffect(() => {
    if (typeof IntersectionObserver === 'undefined' || !ref.current) {
      setIsInView(true)
      setIntersectionRatio(1)
      return
    }

    const thresholds = Array.from({ length: 21 }, (_, index) => index / 20)

    const observer = new IntersectionObserver(
      ([entry]) => {
        setIntersectionRatio(entry.intersectionRatio)
        setIsInView(entry.isIntersecting && entry.intersectionRatio >= threshold)
      },
      { threshold: thresholds },
    )

    observer.observe(ref.current)

    return () => {
      observer.disconnect()
    }
  }, [threshold])

  return {
    ref,
    isActive: isInView && isDocumentVisible,
    progress: isDocumentVisible ? intersectionRatio : 0,
  }
}

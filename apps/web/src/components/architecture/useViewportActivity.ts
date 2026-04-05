import { useEffect, useRef, useState } from 'react'

export function useViewportActivity<T extends HTMLElement>(threshold = 0.25) {
  const ref = useRef<T | null>(null)
  const [isInView, setIsInView] = useState(false)
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
      return
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsInView(entry.isIntersecting && entry.intersectionRatio >= threshold)
      },
      { threshold: [0, threshold, 0.5, 1] },
    )

    observer.observe(ref.current)

    return () => {
      observer.disconnect()
    }
  }, [threshold])

  return {
    ref,
    isActive: isInView && isDocumentVisible,
  }
}

import { useEffect, useState } from 'react'
import DeviceInfo from 'react-native-device-info'
import { Dimensions, type ScaledSize } from 'react-native'

export type LayoutMode = 'phone' | 'tablet' | 'tabletSplit'

export type AdaptiveLayout = {
  isTabletDevice: boolean
  isLandscape: boolean
  windowWidth: number
  windowHeight: number
  layoutMode: LayoutMode
}

const TABLET_SPLIT_MIN_WIDTH = 960

export function deriveLayoutState(
  window: Pick<ScaledSize, 'width' | 'height'>,
  isTabletDevice: boolean,
): AdaptiveLayout {
  const isLandscape = window.width >= window.height
  const layoutMode = !isTabletDevice
    ? 'phone'
    : window.width >= TABLET_SPLIT_MIN_WIDTH
      ? 'tabletSplit'
      : 'tablet'

  return {
    isTabletDevice,
    isLandscape,
    windowWidth: window.width,
    windowHeight: window.height,
    layoutMode,
  }
}

export function useAdaptiveLayout(): AdaptiveLayout {
  const [layout, setLayout] = useState(() =>
    deriveLayoutState(Dimensions.get('window'), DeviceInfo.isTablet()),
  )

  useEffect(() => {
    const isTabletDevice = DeviceInfo.isTablet()
    const subscription = Dimensions.addEventListener('change', ({ window }) => {
      setLayout(deriveLayoutState(window, isTabletDevice))
    })

    return () => subscription.remove()
  }, [])

  return layout
}

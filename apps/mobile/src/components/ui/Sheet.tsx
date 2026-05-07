import React, { useRef, useEffect, useImperativeHandle, type ReactNode } from 'react'
import { TrueSheet } from '@lodev09/react-native-true-sheet'
import type { TrueSheetProps } from '@lodev09/react-native-true-sheet'
import { useTheme } from '../../contexts/ThemeContext'

export type SheetHandle = {
  dismiss: () => void
}

type Props = Omit<TrueSheetProps, 'onDidDismiss' | 'cornerRadius'> & {
  children: ReactNode
  onDismiss: () => void
  cornerRadius?: number
}

export const Sheet = React.forwardRef<SheetHandle, Props>(function Sheet(
  { children, onDismiss, cornerRadius = 24, backgroundColor, ...props },
  ref,
) {
  const sheetRef = useRef<TrueSheet>(null)
  const { colors } = useTheme()

  useImperativeHandle(ref, () => ({
    dismiss: () => sheetRef.current?.dismiss(),
  }))

  useEffect(() => {
    sheetRef.current?.present()
  }, [])

  return (
    <TrueSheet
      ref={sheetRef}
      backgroundColor={backgroundColor ?? colors.background}
      cornerRadius={cornerRadius}
      onDidDismiss={onDismiss}
      {...props}
    >
      {children}
    </TrueSheet>
  )
})

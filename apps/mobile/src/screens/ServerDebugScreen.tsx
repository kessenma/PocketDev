import React from 'react'
import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import { useTheme } from '../contexts/ThemeContext'
import AdaptiveShell from '../components/layout/AdaptiveShell'
import ServerDebugWorkspace from '../components/server-debug/ServerDebugWorkspace'
import type { RootStackParamList } from '../navigation/types'

type Props = NativeStackScreenProps<RootStackParamList, 'ServerDebug'>

export default function ServerDebugScreen(_props: Props) {
  const { colors } = useTheme()

  return (
    <AdaptiveShell style={{ backgroundColor: colors.background }} maxWidth={1400}>
      <ServerDebugWorkspace />
    </AdaptiveShell>
  )
}

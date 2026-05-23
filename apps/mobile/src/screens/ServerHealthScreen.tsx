import React from 'react'
import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import { useTheme } from '../contexts/ThemeContext'
import AdaptiveShell from '../components/layout/AdaptiveShell'
import ServerWorkspace from '../components/settings-screen/server-health/ServerWorkspace'
import type { RootStackParamList } from '../navigation/types'

type Props = NativeStackScreenProps<RootStackParamList, 'ServerHealth'>

export default function ServerHealthScreen(_props: Props) {
  const { colors } = useTheme()

  return (
    <AdaptiveShell style={{ backgroundColor: colors.background }} maxWidth={1400}>
      <ServerWorkspace />
    </AdaptiveShell>
  )
}

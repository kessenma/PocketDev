import React from 'react'
import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import type { RootStackParamList } from '../navigation/types'
import { useTheme } from '../contexts/ThemeContext'
import AdaptiveShell from '../components/layout/AdaptiveShell'
import GitHistoryPane from '../components/git/history/GitHistoryPane'

type Props = NativeStackScreenProps<RootStackParamList, 'GitHistory'>

export default function GitHistoryScreen(_props: Props) {
  const { colors } = useTheme()

  return (
    <AdaptiveShell style={{ backgroundColor: colors.background }} maxWidth={1280}>
      <GitHistoryPane />
    </AdaptiveShell>
  )
}

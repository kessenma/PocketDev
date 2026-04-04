import React from 'react'
import { StyleSheet, View } from 'react-native'
import { useTheme } from '../contexts/ThemeContext'
import AdaptiveShell from '../components/layout/AdaptiveShell'
import { GitWorkspace } from '../components/git'
import { useGitStore } from '../stores/git'

export default function GitScreen() {
  const { colors } = useTheme()
  const refresh = useGitStore((state) => state.refresh)

  React.useEffect(() => {
    refresh()
  }, [refresh])

  return (
    <AdaptiveShell style={{ backgroundColor: colors.background }} maxWidth={1360}>
      <View style={styles.container}>
        <GitWorkspace />
      </View>
    </AdaptiveShell>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
})

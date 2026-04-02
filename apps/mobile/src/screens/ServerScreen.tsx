import React from 'react'
import { StyleSheet, View } from 'react-native'
import { useTheme } from '../contexts/ThemeContext'
import AdaptiveShell from '../components/layout/AdaptiveShell'
import ServerWorkspace from '../components/server-actions/ServerWorkspace'
import { useServerActionsStore } from '../stores/server-actions'

export default function ServerScreen() {
  const { colors } = useTheme()
  const refresh = useServerActionsStore((s) => s.refresh)

  React.useEffect(() => {
    refresh()
  }, [refresh])

  return (
    <AdaptiveShell style={{ backgroundColor: colors.background }} maxWidth={1360}>
      <View style={styles.container}>
        <ServerWorkspace />
      </View>
    </AdaptiveShell>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
})

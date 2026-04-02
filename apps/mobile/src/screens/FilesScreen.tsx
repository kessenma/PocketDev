import React from 'react'
import { StyleSheet, View } from 'react-native'
import { useTheme } from '../contexts/ThemeContext'
import { FileWorkspace } from '../components/files'
import AdaptiveShell from '../components/layout/AdaptiveShell'
import { useFilesStore } from '../stores/files'

export default function FilesScreen() {
  const { colors } = useTheme()
  const refresh = useFilesStore((state) => state.refresh)

  React.useEffect(() => {
    refresh()
  }, [refresh])

  return (
    <AdaptiveShell style={{ backgroundColor: colors.background }} maxWidth={1360}>
      <View style={styles.container}>
        <FileWorkspace />
      </View>
    </AdaptiveShell>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
})

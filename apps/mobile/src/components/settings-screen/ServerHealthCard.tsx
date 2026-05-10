import React from 'react'
import { StyleSheet } from 'react-native'
import { spacing } from '@pocketdev/shared/theme'
import { useTheme } from '../../contexts/ThemeContext'
import { Card, CardTitle } from '../ui/Card'
import ServerWorkspace from './server-health/ServerWorkspace'

export default function ServerHealthCard() {
  const { colors } = useTheme()

  return (
    <Card style={styles.card} accentColor={colors.bracketAccent}>
      <CardTitle>Server Health</CardTitle>
      <ServerWorkspace />
    </Card>
  )
}

const styles = StyleSheet.create({
  card: {
    gap: spacing[3],
  },
})

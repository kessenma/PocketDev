import React from 'react'
import { Modal, SafeAreaView, StyleSheet } from 'react-native'

interface Props {
  backgroundColor: string
  children: React.ReactNode
  onClose: () => void
}

export default function SetupWizardScreen({ backgroundColor, children, onClose }: Props) {
  return (
    <Modal
      visible
      animationType="slide"
      presentationStyle="fullScreen"
      onRequestClose={onClose}
    >
      <SafeAreaView style={[styles.container, { backgroundColor }]}>
        {children}
      </SafeAreaView>
    </Modal>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
})

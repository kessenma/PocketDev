import React, { useCallback, useState } from 'react'
import { View, Text, TouchableOpacity, StyleSheet, Modal } from 'react-native'
import {
  Camera,
  useCameraDevice,
  useCameraPermission,
  useCodeScanner,
} from 'react-native-vision-camera'
import { useTheme } from '../contexts/ThemeContext'
import { spacing, typographyScale } from '@pocketdev/shared/theme'
import { X } from 'lucide-react-native'

export interface QRScanResult {
  host: string
  port: number
  code: string
  secure?: boolean
}

interface Props {
  visible: boolean
  onScan: (result: QRScanResult) => void
  onClose: () => void
}

export default function QRScanner({ visible, onScan, onClose }: Props) {
  const { colors } = useTheme()
  const device = useCameraDevice('back')
  const { hasPermission, requestPermission } = useCameraPermission()
  const [scanned, setScanned] = useState(false)

  const codeScanner = useCodeScanner({
    codeTypes: ['qr'],
    onCodeScanned: (codes) => {
      if (scanned || codes.length === 0) return
      const value = codes[0]?.value
      if (!value) return

      try {
        const data = JSON.parse(value) as Record<string, unknown>
        if (
          typeof data.host === 'string' &&
          typeof data.port === 'number' &&
          typeof data.code === 'string'
        ) {
          setScanned(true)
          onScan({ host: data.host, port: data.port, code: data.code, secure: data.secure === true })
        }
      } catch {
        // Not a valid PocketDev QR code — ignore
      }
    },
  })

  const handleRequestPermission = useCallback(async () => {
    await requestPermission()
  }, [requestPermission])

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="fullScreen">
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        {/* Close button */}
        <TouchableOpacity style={styles.closeButton} onPress={onClose}>
          <View style={[styles.closeCircle, { backgroundColor: 'rgba(0,0,0,0.6)' }]}>
            <X color="#fff" size={24} />
          </View>
        </TouchableOpacity>

        {!hasPermission ? (
          <View style={styles.centered}>
            <Text style={[styles.message, { color: colors.text }]}>
              Camera permission is required to scan QR codes.
            </Text>
            <TouchableOpacity
              style={[styles.permissionButton, { backgroundColor: colors.primary }]}
              onPress={handleRequestPermission}
            >
              <Text style={[styles.permissionButtonText, { color: colors.primaryText }]}>
                Grant Camera Access
              </Text>
            </TouchableOpacity>
          </View>
        ) : !device ? (
          <View style={styles.centered}>
            <Text style={[styles.message, { color: colors.text }]}>
              No camera device found.
            </Text>
          </View>
        ) : (
          <>
            <Camera
              style={StyleSheet.absoluteFill}
              device={device}
              isActive={visible && !scanned}
              codeScanner={codeScanner}
            />
            {/* Overlay with scan hint */}
            <View style={styles.overlay}>
              <View style={styles.scanFrame} />
              <Text style={styles.hint}>
                Point at a PocketDev QR code
              </Text>
            </View>
          </>
        )}
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  closeButton: {
    position: 'absolute',
    top: 60,
    right: 20,
    zIndex: 10,
  },
  closeCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing[6],
  },
  message: {
    ...typographyScale.base,
    textAlign: 'center',
    marginBottom: spacing[4],
  },
  permissionButton: {
    paddingHorizontal: spacing[6],
    paddingVertical: spacing[3],
    borderRadius: 12,
  },
  permissionButtonText: {
    ...typographyScale.base,
    fontWeight: '600',
  },
  overlay: {
    position: 'absolute', left: 0, right: 0, top: 0, bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scanFrame: {
    width: 240,
    height: 240,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.6)',
    borderRadius: 20,
  },
  hint: {
    marginTop: 24,
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
})

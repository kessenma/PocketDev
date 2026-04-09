import { Presets } from 'react-native-pulsar'

export function playInstallSuccessHaptic() {
  try {
    Presets.System.notificationSuccess()
  } catch {
    // Native haptics may be unavailable on some simulators/dev environments.
  }
}

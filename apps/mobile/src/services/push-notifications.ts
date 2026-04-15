/**
 * PocketDev push notification service.
 * Uses notifee for permission requests + APNsDiagnostics for APNs token delivery.
 *
 * Flow:
 *   1. notifee.requestPermission()   → iOS permission dialog
 *   2. APNsDiagnostics.forceRegister() → UIApplication.registerForRemoteNotifications()
 *   3. AppDelegate receives token → APNsDiagnostics.storeDeliveredToken()
 *   4. pollForToken() → reads the stored token
 *   5. registerPushToken() → sends token to agent server
 */
import notifee, { AuthorizationStatus } from '@notifee/react-native'
import { Platform } from 'react-native'
import { apnsDiagnostics } from './apns-diagnostics'
import { registerPushToken, deregisterPushToken } from './api'

const POLL_INTERVAL_MS = 500
const POLL_TIMEOUT_MS = 10_000

/** Request iOS notification permission. Returns true if granted. */
export async function requestNotificationPermission(): Promise<boolean> {
  if (Platform.OS !== 'ios') return false
  const settings = await notifee.requestPermission()
  return settings.authorizationStatus >= AuthorizationStatus.AUTHORIZED
}

/** Get the APNs device token, triggering registration if needed.
 *  Pass force=true to clear any cached token and request a fresh one from APNs.
 *  Returns null on timeout or if running outside iOS. */
export async function getApnsToken(force = false): Promise<string | null> {
  if (!apnsDiagnostics.isAvailable()) return null

  if (force) {
    // Clear any stale cached token so we get a fresh one from APNs
    await apnsDiagnostics.clearStoredToken()
  } else {
    // Check if a token was already delivered (race condition recovery)
    const existing = await apnsDiagnostics.getLastDeliveredToken()
    if (existing?.hasToken && existing.token) {
      await apnsDiagnostics.clearStoredToken()
      return existing.token
    }
  }

  // Trigger registration and poll for the token
  await apnsDiagnostics.forceRegister()

  const deadline = Date.now() + POLL_TIMEOUT_MS
  while (Date.now() < deadline) {
    await new Promise<void>((r) => setTimeout(r, POLL_INTERVAL_MS))
    const result = await apnsDiagnostics.getLastDeliveredToken()
    if (result?.hasToken && result.token) {
      await apnsDiagnostics.clearStoredToken()
      return result.token
    }
  }

  return null
}

/** Full enable flow: request permission → get token → register with agent server. */
export async function enablePushNotifications(server: {
  ip: string
  port: number
  deviceId: string
}): Promise<{ success: boolean; error?: string }> {
  if (Platform.OS !== 'ios') {
    return { success: false, error: 'iOS only' }
  }

  const granted = await requestNotificationPermission()
  if (!granted) {
    return { success: false, error: 'Permission denied' }
  }

  // Force a fresh token from APNs — ensures we don't use a stale cached token
  // that was never registered with the server.
  const token = await getApnsToken(true)
  if (!token) {
    return { success: false, error: 'Could not get APNs token from Apple. Try again.' }
  }

  const env = __DEV__ ? 'development' : 'production'
  try {
    await registerPushToken(server.ip, server.port, server.deviceId, token, env)
  } catch (err) {
    return { success: false, error: 'Could not register with server. Try again.' }
  }
  return { success: true }
}

/** Disable flow: deregister from agent server. */
export async function disablePushNotifications(server: {
  ip: string
  port: number
  deviceId: string
}): Promise<void> {
  await deregisterPushToken(server.ip, server.port, server.deviceId)
}

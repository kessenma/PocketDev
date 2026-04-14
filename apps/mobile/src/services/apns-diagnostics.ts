/**
 * Thin TypeScript wrapper around the APNsDiagnostics native module.
 * The native module handles the token-delivery race condition by using static
 * storage in Swift — the token is kept alive even if JS reloads before reading it.
 */
import { NativeModules, Platform } from 'react-native'

const { APNsDiagnostics: Native } = NativeModules

interface LastDeliveredTokenResult {
  token: string | null
  hasToken: boolean
  ageSeconds?: number
}

function isAvailable(): boolean {
  return Platform.OS === 'ios' && !!Native
}

/** Retrieve the last APNs token delivered by iOS (if any). */
async function getLastDeliveredToken(): Promise<LastDeliveredTokenResult | null> {
  if (!isAvailable()) return null
  try {
    return await Native.getLastDeliveredToken()
  } catch {
    return null
  }
}

/** Clear the stored token after JS has successfully processed it. */
async function clearStoredToken(): Promise<void> {
  if (!isAvailable()) return
  try {
    await Native.clearStoredToken()
  } catch {}
}

/** Trigger UIApplication.registerForRemoteNotifications(). The token is
 *  delivered asynchronously to AppDelegate → storeDeliveredToken().
 *  Poll getLastDeliveredToken() to retrieve it. */
async function forceRegister(): Promise<void> {
  if (!isAvailable()) return
  try {
    await Native.forceRegisterForRemoteNotifications()
  } catch {}
}

export const apnsDiagnostics = { isAvailable, getLastDeliveredToken, clearStoredToken, forceRegister }

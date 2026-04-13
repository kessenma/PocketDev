import { NativeModules } from 'react-native'

const { PushTokenModule } = NativeModules

/**
 * Request APNs registration from iOS. The token is delivered asynchronously
 * by the OS to AppDelegate and stored in UserDefaults. Call getApnsToken()
 * after a short delay to read it.
 */
export async function registerForRemoteNotifications(): Promise<void> {
  if (!PushTokenModule) return
  await PushTokenModule.register()
}

/**
 * Returns the APNs device token stored by AppDelegate, or null if iOS
 * has not yet delivered it (e.g., registration just triggered).
 */
export async function getApnsToken(): Promise<string | null> {
  if (!PushTokenModule) return null
  return PushTokenModule.getToken()
}

/**
 * Poll for the APNs token up to timeoutMs (default 8s), checking every 500ms.
 * Returns the token once available, or null on timeout.
 */
export async function waitForApnsToken(timeoutMs = 8000): Promise<string | null> {
  const deadline = Date.now() + timeoutMs
  while (Date.now() < deadline) {
    const token = await getApnsToken()
    if (token) return token
    await new Promise<void>((r) => setTimeout(r, 500))
  }
  return null
}

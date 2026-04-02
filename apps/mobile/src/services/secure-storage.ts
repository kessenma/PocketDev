import * as Keychain from 'react-native-keychain'

const SERVICE_PREFIX = 'pocketdev-sudo'

/** Save sudo password for a specific server, encrypted in OS keychain */
export async function saveSudoPassword(serverIp: string, password: string): Promise<void> {
  await Keychain.setGenericPassword(`sudo:${serverIp}`, password, {
    service: `${SERVICE_PREFIX}-${serverIp}`,
    accessible: Keychain.ACCESSIBLE.WHEN_UNLOCKED,
  })
}

/** Retrieve stored sudo password for a server, or null if not saved */
export async function getSudoPassword(serverIp: string): Promise<string | null> {
  const creds = await Keychain.getGenericPassword({
    service: `${SERVICE_PREFIX}-${serverIp}`,
  })
  return creds ? creds.password : null
}

/** Clear stored sudo password for a server */
export async function clearSudoPassword(serverIp: string): Promise<void> {
  await Keychain.resetGenericPassword({
    service: `${SERVICE_PREFIX}-${serverIp}`,
  })
}

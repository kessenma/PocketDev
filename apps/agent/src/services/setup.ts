import { randomBytes } from 'node:crypto'
import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { generateKeypair } from '@pocketdev/shared/crypto'
import {
  getDeviceCount,
  insertDevice,
  getConfig,
  setConfig,
} from '../db/index.ts'

interface SetupState {
  code: string
  expiresAt: number
}

let setupState: SetupState | null = null
const DEV_MODE = process.env.POCKETDEV_DEV_MODE === '1'
const DEV_DEVICE_ID = 'dev-device'
const DATA_DIR = process.env.POCKETDEV_DATA_DIR ?? join(process.cwd(), 'data')
const DEV_CREDS_PATH = join(DATA_DIR, 'test-device.json')

/** Hex-encode a Uint8Array */
function toHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

/** Generate a 4-char alpha + 4-digit numeric setup code like "ABCD-1234" */
function generateSetupCode(): string {
  const alpha = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
  const digits = '0123456789'
  const bytes = randomBytes(8)
  let code = ''
  for (let i = 0; i < 4; i++) code += alpha[bytes[i]! % alpha.length]
  code += '-'
  for (let i = 4; i < 8; i++) code += digits[bytes[i]! % digits.length]
  return code
}

/** Ensure the server has a keypair, generating one on first boot */
export function getServerKeypair(): { publicKey: string; privateKey: string } {
  let pubHex = getConfig('server_public_key')
  let privHex = getConfig('server_private_key')

  if (!pubHex || !privHex) {
    const kp = generateKeypair()
    pubHex = toHex(kp.publicKey)
    privHex = toHex(kp.privateKey)
    setConfig('server_public_key', pubHex)
    setConfig('server_private_key', privHex)
  }

  return { publicKey: pubHex, privateKey: privHex }
}

/** Initialize setup mode if no devices are registered */
export function initSetup(): string | null {
  if (getDeviceCount() > 0) return null

  if (DEV_MODE) {
    const devKeypair = generateKeypair()
    const publicKey = toHex(devKeypair.publicKey)
    const privateKey = toHex(devKeypair.privateKey)

    insertDevice(DEV_DEVICE_ID, publicKey, 'dev-device', 'dev')
    mkdirSync(DATA_DIR, { recursive: true })
    writeFileSync(
      DEV_CREDS_PATH,
      JSON.stringify({
        deviceId: DEV_DEVICE_ID,
        publicKey,
        privateKey,
        host: 'localhost',
        port: Number(process.env.POCKETDEV_PORT ?? 4387),
      }, null, 2),
      'utf-8',
    )

    return DEV_DEVICE_ID
  }

  const code = generateSetupCode()
  setupState = {
    code,
    expiresAt: Date.now() + 15 * 60 * 1000, // 15 minutes
  }
  return code
}

/** Check if setup mode is active */
export function isSetupActive(): boolean {
  if (!setupState) return false
  if (Date.now() > setupState.expiresAt) {
    setupState = null
    return false
  }
  return true
}

/** Attempt to pair a device. Returns server info on success, null on failure. */
export function pairDevice(
  code: string,
  publicKey: string,
  deviceName: string,
  platform: string | null,
): { deviceId: string; serverPublicKey: string } | null {
  if (!isSetupActive()) return null
  if (code !== setupState!.code) return null

  // Generate a device ID
  const deviceId = randomBytes(16).toString('hex')

  // Store device
  insertDevice(deviceId, publicKey, deviceName, platform)

  // Get/create server keypair
  const serverKp = getServerKeypair()

  // Disable setup mode
  setupState = null

  return {
    deviceId,
    serverPublicKey: serverKp.publicKey,
  }
}

/** Whether any devices are registered (setup should be disabled) */
export function hasDevices(): boolean {
  return getDeviceCount() > 0
}

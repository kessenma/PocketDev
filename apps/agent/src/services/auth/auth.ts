import { verify } from '@pocketdev/shared/crypto'
import { getDevice, updateDeviceLastSeen } from '../../db/index.ts'

type AuthToken = {
  deviceId: string
  timestamp: number
  signature: string
}

function fromHex(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2)
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.substring(i, i + 2), 16)
  }
  return bytes
}

function decodeAuthToken(authHeader: string | null): AuthToken | null {
  if (!authHeader) return null

  try {
    const token = authHeader.replace(/^PocketDev\s+/i, '')
    return JSON.parse(Buffer.from(token, 'base64').toString()) as AuthToken
  } catch {
    return null
  }
}

export function parseDeviceIdFromAuthHeader(authHeader: string | null): string | null {
  if (process.env.POCKETDEV_DEV_MODE === '1') return 'dev-device'
  return decodeAuthToken(authHeader)?.deviceId ?? null
}

export async function authenticateRequest(authHeader: string | null): Promise<string | null> {
  if (process.env.POCKETDEV_DEV_MODE === '1') return 'dev-device'

  const decoded = decodeAuthToken(authHeader)
  if (!decoded) {
    console.warn('[auth] Failed to decode auth token. Header present:', !!authHeader, 'Header prefix:', authHeader?.slice(0, 20))
    return null
  }

  const timeDiff = Math.abs(Date.now() - decoded.timestamp)
  if (timeDiff > 30_000) {
    console.warn(`[auth] Timestamp rejected: diff=${timeDiff}ms, deviceId=${decoded.deviceId}`)
    return null
  }

  const device = getDevice(decoded.deviceId)
  if (!device) {
    console.warn(`[auth] Device not found: ${decoded.deviceId}`)
    return null
  }

  const message = new TextEncoder().encode(String(decoded.timestamp))
  const sigBytes = fromHex(decoded.signature)
  const pubKeyBytes = fromHex(device.publicKey)

  const valid = await verify(sigBytes, message, pubKeyBytes)
  if (!valid) {
    console.warn(`[auth] Signature verification failed for device ${decoded.deviceId}`)
    return null
  }

  updateDeviceLastSeen(decoded.deviceId)
  return decoded.deviceId
}
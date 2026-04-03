import { signMessage } from './crypto'
import { getServer } from './storage'

export interface PairResponse {
  deviceId: string
  serverPublicKey?: string
}

interface PairResponseWire {
  deviceId?: string
  device_id?: string
  serverId?: string
  server_id?: string
  serverPublicKey?: string
  server_public_key?: string
}

export function normalizePairResponse(data: unknown): PairResponse {
  const payload = data as PairResponseWire
  const deviceId = payload.deviceId ?? payload.device_id ?? payload.serverId ?? payload.server_id

  if (!deviceId) {
    throw new Error('Pairing response missing device ID')
  }

  return {
    deviceId,
    serverPublicKey: payload.serverPublicKey ?? payload.server_public_key,
  }
}

export async function buildPocketDevAuthorizationHeader(timestamp = Date.now()): Promise<string> {
  const server = getServer()
  if (!server) {
    console.warn('[auth] No paired device found in storage')
    throw new Error('No paired device found')
  }

  console.log('[auth] Building auth header:', {
    deviceId: server.deviceId,
    timestamp,
    serverIp: server.ip,
    serverPort: server.port,
  })

  const signature = await signMessage(String(timestamp))
  const token = Buffer.from(
    JSON.stringify({
      deviceId: server.deviceId,
      timestamp,
      signature,
    }),
  ).toString('base64')

  return `PocketDev ${token}`
}


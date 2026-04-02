import { generateKeypair, sign } from '@pocketdev/shared/crypto'
import { saveKeypair, getStoredKeypair } from './storage'

export function generateDeviceKeypair() {
  const keypair = generateKeypair()
  saveKeypair(keypair.publicKey, keypair.privateKey)
  return keypair
}

export function getDeviceKeypair() {
  return getStoredKeypair()
}

export async function signMessage(message: string): Promise<string> {
  const keypair = getStoredKeypair()
  if (!keypair) throw new Error('No device keypair found')
  const encoded = new TextEncoder().encode(message)
  const signature = await sign(encoded, keypair.privateKey)
  return Buffer.from(signature).toString('hex')
}

export function getPublicKeyHex(): string | null {
  const keypair = getStoredKeypair()
  if (!keypair) return null
  return Buffer.from(keypair.publicKey).toString('hex')
}

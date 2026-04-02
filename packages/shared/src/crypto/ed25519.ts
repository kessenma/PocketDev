import * as ed from '@noble/ed25519'
import { sha512 } from '@noble/hashes/sha2.js'

// Required for @noble/ed25519 v2+ — uses pure JS sha512, works in Node/Bun/React Native
ed.etc.sha512Sync = (...m: Uint8Array[]) => sha512(ed.etc.concatBytes(...m))

export interface Keypair {
  publicKey: Uint8Array
  privateKey: Uint8Array
}

export function generateKeypair(): Keypair {
  const privateKey = ed.utils.randomPrivateKey()
  const publicKey = ed.getPublicKey(privateKey)
  return { publicKey, privateKey }
}

export async function sign(message: Uint8Array, privateKey: Uint8Array): Promise<Uint8Array> {
  return ed.sign(message, privateKey)
}

export async function verify(
  signature: Uint8Array,
  message: Uint8Array,
  publicKey: Uint8Array,
): Promise<boolean> {
  return ed.verify(signature, message, publicKey)
}

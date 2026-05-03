import { TOTP } from 'otpauth'
import crypto from 'node:crypto'

const ALGORITHM = 'aes-256-gcm'
const IV_LENGTH = 12

const TOTP_ISSUER = 'PocketDev'
const TOTP_DIGITS = 6
const TOTP_PERIOD = 30
const TOTP_ALGORITHM = 'SHA1'
const TOTP_WINDOW = 1

function getEncryptionKey(): Buffer {
  const key = process.env.TOTP_ENCRYPTION_KEY ?? ''
  if (key.length < 64) throw new Error('TOTP_ENCRYPTION_KEY must be a 64-char hex string')
  return Buffer.from(key, 'hex')
}

export function encryptSecret(secret: string): { encrypted: string; iv: string; tag: string } {
  const key = getEncryptionKey()
  const iv = crypto.randomBytes(IV_LENGTH)
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv) as crypto.CipherGCM

  let encrypted = cipher.update(secret, 'utf8', 'base64')
  encrypted += cipher.final('base64')
  const tag = cipher.getAuthTag()

  return { encrypted, iv: iv.toString('base64'), tag: tag.toString('base64') }
}

export function decryptSecret(encrypted: string, iv: string, tag: string): string {
  const key = getEncryptionKey()
  const decipher = crypto.createDecipheriv(ALGORITHM, key, Buffer.from(iv, 'base64')) as crypto.DecipherGCM
  decipher.setAuthTag(Buffer.from(tag, 'base64'))

  let decrypted = decipher.update(encrypted, 'base64', 'utf8')
  decrypted += decipher.final('utf8')
  return decrypted
}

export function generateTotpSecret(): { secret: string; otpauthUri: string; encrypted: { encrypted: string; iv: string; tag: string } } {
  const totp = new TOTP({
    issuer: TOTP_ISSUER,
    label: 'admin',
    algorithm: TOTP_ALGORITHM,
    digits: TOTP_DIGITS,
    period: TOTP_PERIOD,
  })

  const secret = totp.secret.base32
  const otpauthUri = totp.toString()
  const encrypted = encryptSecret(secret)

  return { secret, otpauthUri, encrypted }
}

export function verifyTotpCode(encryptedSecret: string, iv: string, tag: string, code: string): boolean {
  const secret = decryptSecret(encryptedSecret, iv, tag)
  const totp = new TOTP({ issuer: TOTP_ISSUER, algorithm: TOTP_ALGORITHM, digits: TOTP_DIGITS, period: TOTP_PERIOD, secret })
  return totp.validate({ token: code, window: TOTP_WINDOW }) !== null
}

export function verifyTotpCodeRaw(secret: string, code: string): boolean {
  const totp = new TOTP({ issuer: TOTP_ISSUER, algorithm: TOTP_ALGORITHM, digits: TOTP_DIGITS, period: TOTP_PERIOD, secret })
  return totp.validate({ token: code, window: TOTP_WINDOW }) !== null
}

import { createMMKV, type MMKV } from 'react-native-mmkv'
import type { FileNode } from '../components/files/model'

let storage: MMKV

function getStorage(): MMKV {
  if (!storage) {
    storage = createMMKV({ id: 'pocketdev' })
  }
  return storage
}

const KEYS = {
  PRIVATE_KEY: 'device.privateKey',
  PUBLIC_KEY: 'device.publicKey',
  DEVICE_ID: 'device.id',
  SERVER_IP: 'server.ip',
  SERVER_PORT: 'server.port',
  SERVER_ID: 'server.id',
  SERVER_SECURE: 'server.secure',
  RECENT_PROMPTS: 'recent.prompts',
  NEW_TASK_DRAFT: 'newTask.draft',
  WORKSPACE_NAV_EXPANDED: 'workspace.navExpanded',
  FILE_DIRECTORY_CACHE_PREFIX: 'files.directoryCache',
  ONDEVICE_AI_MODEL_STATUS: 'ondeviceai.modelStatus',
  ONDEVICE_AI_DOWNLOADED_AT: 'ondeviceai.downloadedAt',
  ONDEVICE_AI_INDEX_CACHE_PREFIX: 'ondeviceai.indexCache',
  LEGACY_PREREQUISITES_REPORT: 'setup.prerequisitesReport',
  PUSH_NOTIFICATIONS_ENABLED: 'push.notificationsEnabled',
} as const

// --- Push notifications ---

export function getPushNotificationsEnabled(): boolean {
  return getStorage().getBoolean(KEYS.PUSH_NOTIFICATIONS_ENABLED) ?? false
}

export function setPushNotificationsEnabled(enabled: boolean) {
  getStorage().set(KEYS.PUSH_NOTIFICATIONS_ENABLED, enabled)
}

// --- Keypair ---

export function saveKeypair(publicKey: Uint8Array, privateKey: Uint8Array) {
  getStorage().set(KEYS.PUBLIC_KEY, Buffer.from(publicKey).toString('hex'))
  getStorage().set(KEYS.PRIVATE_KEY, Buffer.from(privateKey).toString('hex'))
}

export function getStoredKeypair(): {
  publicKey: Uint8Array
  privateKey: Uint8Array
} | null {
  const pub = getStorage().getString(KEYS.PUBLIC_KEY)
  const priv = getStorage().getString(KEYS.PRIVATE_KEY)
  if (!pub || !priv) return null
  return {
    publicKey: hexToBytes(pub),
    privateKey: hexToBytes(priv),
  }
}

export function clearKeypair() {
  getStorage().remove(KEYS.PUBLIC_KEY)
  getStorage().remove(KEYS.PRIVATE_KEY)
}

// --- Server ---

export interface StoredServer {
  ip: string
  port: number
  deviceId: string
  secure: boolean
}

export function saveServer(ip: string, port: number, deviceId: string, secure = false) {
  getStorage().set(KEYS.SERVER_IP, ip)
  getStorage().set(KEYS.SERVER_PORT, port)
  getStorage().set(KEYS.DEVICE_ID, deviceId)
  getStorage().set(KEYS.SERVER_ID, deviceId)
  getStorage().set(KEYS.SERVER_SECURE, secure ? 'true' : 'false')
}

export function getServer(): StoredServer | null {
  const ip = getStorage().getString(KEYS.SERVER_IP)
  const port = getStorage().getNumber(KEYS.SERVER_PORT)
  const deviceId = getStorage().getString(KEYS.DEVICE_ID) ?? getStorage().getString(KEYS.SERVER_ID)
  if (!ip || port === undefined || !deviceId) return null
  const secure = getStorage().getString(KEYS.SERVER_SECURE) === 'true'
  return { ip, port, deviceId, secure }
}

export function clearServer() {
  getStorage().remove(KEYS.SERVER_IP)
  getStorage().remove(KEYS.SERVER_PORT)
  getStorage().remove(KEYS.DEVICE_ID)
  getStorage().remove(KEYS.SERVER_ID)
  getStorage().remove(KEYS.SERVER_SECURE)
}

// --- Recent Prompts ---

const MAX_RECENT_PROMPTS = 10

export function getRecentPrompts(): string[] {
  const raw = getStorage().getString(KEYS.RECENT_PROMPTS)
  if (!raw) return []
  return JSON.parse(raw) as string[]
}

export function addRecentPrompt(prompt: string) {
  const existing = getRecentPrompts().filter((p) => p !== prompt)
  const updated = [prompt, ...existing].slice(0, MAX_RECENT_PROMPTS)
  getStorage().set(KEYS.RECENT_PROMPTS, JSON.stringify(updated))
}

// --- New Task Draft ---

export interface StoredNewTaskDraft {
  prompt: string
  selectedProviderId: string
  selectedModelId: string
  selectedTaskMode: 'default' | 'plan'
  lastActionMessage: string
}

export function getNewTaskDraft(): StoredNewTaskDraft | null {
  const raw = getStorage().getString(KEYS.NEW_TASK_DRAFT)
  if (!raw) return null

  try {
    const parsed = JSON.parse(raw) as Partial<StoredNewTaskDraft>
    if (
      typeof parsed.prompt !== 'string' ||
      typeof parsed.selectedProviderId !== 'string' ||
      typeof parsed.selectedModelId !== 'string' ||
      typeof parsed.lastActionMessage !== 'string'
    ) {
      return null
    }

    return {
      prompt: parsed.prompt,
      selectedProviderId: parsed.selectedProviderId,
      selectedModelId: parsed.selectedModelId,
      selectedTaskMode: parsed.selectedTaskMode === 'plan' ? 'plan' : 'default',
      lastActionMessage: parsed.lastActionMessage,
    }
  } catch {
    return null
  }
}

export function saveNewTaskDraft(draft: StoredNewTaskDraft) {
  getStorage().set(KEYS.NEW_TASK_DRAFT, JSON.stringify(draft))
}

// --- Workspace UI ---

export function getWorkspaceNavExpanded(): boolean {
  return getStorage().getBoolean(KEYS.WORKSPACE_NAV_EXPANDED) ?? true
}

export function setWorkspaceNavExpanded(expanded: boolean) {
  getStorage().set(KEYS.WORKSPACE_NAV_EXPANDED, expanded)
}

// --- Files Directory Cache ---

type StoredDirectorySnapshot = {
  base: string
  path: string
  entries: FileNode[]
  cachedAt: number
}

export function getCachedDirectorySnapshot(
  serverId: string,
  path: string,
): StoredDirectorySnapshot | null {
  const raw = getStorage().getString(getDirectoryCacheKey(serverId, path))
  if (!raw) return null

  try {
    const parsed = JSON.parse(raw) as Partial<StoredDirectorySnapshot>
    if (
      typeof parsed.base !== 'string' ||
      typeof parsed.path !== 'string' ||
      typeof parsed.cachedAt !== 'number' ||
      !Array.isArray(parsed.entries)
    ) {
      return null
    }

    return {
      base: parsed.base,
      path: parsed.path,
      entries: parsed.entries as FileNode[],
      cachedAt: parsed.cachedAt,
    }
  } catch {
    return null
  }
}

export function saveCachedDirectorySnapshot(
  serverId: string,
  snapshot: Omit<StoredDirectorySnapshot, 'cachedAt'>,
) {
  const value: StoredDirectorySnapshot = {
    ...snapshot,
    cachedAt: Date.now(),
  }
  getStorage().set(getDirectoryCacheKey(serverId, snapshot.path), JSON.stringify(value))
}

// --- On-Device AI ---

export type OnDeviceAIModelStatus = 'not_downloaded' | 'downloaded'

export function getOnDeviceAIModelStatus(): OnDeviceAIModelStatus {
  const raw = getStorage().getString(KEYS.ONDEVICE_AI_MODEL_STATUS)
  return raw === 'downloaded' ? 'downloaded' : 'not_downloaded'
}

export function setOnDeviceAIModelStatus(status: OnDeviceAIModelStatus) {
  getStorage().set(KEYS.ONDEVICE_AI_MODEL_STATUS, status)
  if (status === 'downloaded') {
    getStorage().set(KEYS.ONDEVICE_AI_DOWNLOADED_AT, Date.now())
  }
}

export interface CachedFileIndex {
  rootPath: string
  paths: string[]
  enrichedTexts: string[]
  vectors: number[][]
  builtAt: number
}

const INDEX_CACHE_TTL = 10 * 60 * 1000 // 10 minutes

export function getCachedFileIndex(rootPath: string): CachedFileIndex | null {
  const key = `${KEYS.ONDEVICE_AI_INDEX_CACHE_PREFIX}:${rootPath}`
  const raw = getStorage().getString(key)
  if (!raw) return null

  try {
    const parsed = JSON.parse(raw) as CachedFileIndex
    if (Date.now() - parsed.builtAt > INDEX_CACHE_TTL) return null
    if (!Array.isArray(parsed.paths) || !Array.isArray(parsed.vectors)) return null
    return parsed
  } catch {
    return null
  }
}

export function saveCachedFileIndex(index: CachedFileIndex) {
  const key = `${KEYS.ONDEVICE_AI_INDEX_CACHE_PREFIX}:${index.rootPath}`
  getStorage().set(key, JSON.stringify(index))
}

// --- Prerequisites Report ---

export function getLegacyPrerequisitesReport(): unknown | null {
  const raw = getStorage().getString(KEYS.LEGACY_PREREQUISITES_REPORT)
  if (!raw) return null
  try {
    return JSON.parse(raw)
  } catch {
    return null
  }
}

export function clearLegacyPrerequisitesReport() {
  getStorage().remove(KEYS.LEGACY_PREREQUISITES_REPORT)
}

// --- Clear All ---

export function clearAll() {
  clearKeypair()
  clearServer()
  getStorage().remove(KEYS.RECENT_PROMPTS)
  getStorage().remove(KEYS.NEW_TASK_DRAFT)
  getStorage().remove(KEYS.LEGACY_PREREQUISITES_REPORT)
}

// --- Helpers ---

function hexToBytes(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2)
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.substring(i, i + 2), 16)
  }
  return bytes
}

function getDirectoryCacheKey(serverId: string, path: string): string {
  return `${KEYS.FILE_DIRECTORY_CACHE_PREFIX}:${serverId}:${path}`
}

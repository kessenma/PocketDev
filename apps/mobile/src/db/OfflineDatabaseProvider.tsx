import React, { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { open, type DB } from '@op-engineering/op-sqlite'
import RNFS from 'react-native-fs'
import { OFFLINE_CREATE_TABLES_SQL, OFFLINE_CREATE_INDEXES_SQL } from './offlineSchema'
import { getStoredKeypair } from '../services/storage'
import { setOfflineStoreDb } from '../stores/offline'
import { useOfflineStore } from '../stores/offline'

interface OfflineDatabaseContextType {
  isReady: boolean
  db: DB | null
}

const OfflineDatabaseContext = createContext<OfflineDatabaseContextType>({
  isReady: false,
  db: null,
})

export function useOfflineDatabase(): OfflineDatabaseContextType {
  return useContext(OfflineDatabaseContext)
}

// Module-level DB reference for stores that can't use hooks
let _offlineDb: DB | null = null

export function getOfflineDb(): DB | null {
  return _offlineDb
}

function deriveEncryptionKey(): string | undefined {
  const keypair = getStoredKeypair()
  if (!keypair) return undefined
  // Use first 32 bytes of Ed25519 private key as 256-bit SQLCipher key (64 hex chars)
  return Buffer.from(keypair.privateKey.slice(0, 32)).toString('hex')
}

export default function OfflineDatabaseProvider({ children }: { children: React.ReactNode }) {
  const [isReady, setIsReady] = useState(false)
  const [db, setDb] = useState<DB | null>(null)

  useEffect(() => {
    void initializeOfflineDatabase()
  }, [])

  async function initializeOfflineDatabase() {
    try {
      const dbDir = `${RNFS.DocumentDirectoryPath}/databases`
      if (!(await RNFS.exists(dbDir))) {
        await RNFS.mkdir(dbDir)
      }

      const database = await openOfflineDb(dbDir)
      await applySchema(database)

      _offlineDb = database
      setDb(database)
      setOfflineStoreDb(database)
      await useOfflineStore.getState().loadAllSnapshots()
      setIsReady(true)
      console.log('[offline-db] Encrypted offline SQLite initialized')
    } catch (error) {
      console.error('[offline-db] Failed to initialize offline SQLite:', error)
      // Don't block the app — offline features just won't work
      setIsReady(true)
    }
  }

  const value = useMemo(() => ({ isReady, db }), [isReady, db])

  return (
    <OfflineDatabaseContext.Provider value={value}>
      {children}
    </OfflineDatabaseContext.Provider>
  )
}

async function openOfflineDb(dbDir: string): Promise<DB> {
  const encryptionKey = deriveEncryptionKey()

  try {
    return open({ name: 'offline.db', location: dbDir, ...(encryptionKey ? { encryptionKey } : {}) })
  } catch (error) {
    console.warn('[offline-db] Failed to open offline.db (key mismatch?), recreating:', error)
    // Key mismatch after re-pair / reinstall — delete and recreate without encryption
    const dbPath = `${dbDir}/offline.db`
    if (await RNFS.exists(dbPath)) {
      await RNFS.unlink(dbPath)
    }
    return open({ name: 'offline.db', location: dbDir })
  }
}

async function applySchema(database: DB): Promise<void> {
  await database.execute('PRAGMA journal_mode=WAL;')
  await database.execute('PRAGMA foreign_keys=ON;')

  const tableStatements = OFFLINE_CREATE_TABLES_SQL.split(';').filter((s) => s.trim())
  for (const statement of tableStatements) {
    await database.execute(statement + ';')
  }

  const indexStatements = OFFLINE_CREATE_INDEXES_SQL.split(';').filter((s) => s.trim())
  for (const statement of indexStatements) {
    await database.execute(statement + ';')
  }
}

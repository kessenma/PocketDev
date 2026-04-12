import React, { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { open, type DB } from '@op-engineering/op-sqlite'
import RNFS from 'react-native-fs'
import { OFFLINE_SCHEMA_STATEMENTS } from './offlineSchema'
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
    const dbDir = `${RNFS.DocumentDirectoryPath}/databases`
    const dbPath = `${dbDir}/offline.db`

    if (!(await RNFS.exists(dbDir))) {
      await RNFS.mkdir(dbDir)
    }

    const dbExists = await RNFS.exists(dbPath)
    const encryptionKey = deriveEncryptionKey()

    try {
      const database = open({ name: 'offline.db', location: dbDir, ...(encryptionKey ? { encryptionKey } : {}) })
      await applySchema(database)
      _offlineDb = database
      setDb(database)
      setOfflineStoreDb(database)
      await useOfflineStore.getState().loadAllSnapshots()
      setIsReady(true)
      console.log('[offline-db] Encrypted offline SQLite initialized')
    } catch (error) {
      // SQLCipher key mismatch or pre-SQLCipher unencrypted file — delete and recreate
      if (dbExists) {
        await RNFS.unlink(dbPath)
      }
      try {
        const database = open({ name: 'offline.db', location: dbDir, ...(encryptionKey ? { encryptionKey } : {}) })
        await applySchema(database)
        _offlineDb = database
        setDb(database)
        setOfflineStoreDb(database)
        await useOfflineStore.getState().loadAllSnapshots()
        setIsReady(true)
        console.log('[offline-db] Offline SQLite initialized after recreation')
      } catch (retryError) {
        console.error('[offline-db] Failed to initialize offline SQLite after retry:', retryError)
        setIsReady(true)
      }
    }
  }

  const value = useMemo(() => ({ isReady, db }), [isReady, db])

  return (
    <OfflineDatabaseContext.Provider value={value}>
      {children}
    </OfflineDatabaseContext.Provider>
  )
}


async function applySchema(database: DB): Promise<void> {
  await database.execute('PRAGMA journal_mode=WAL;')
  await database.execute('PRAGMA foreign_keys=ON;')

  for (const statement of OFFLINE_SCHEMA_STATEMENTS) {
    await database.execute(statement + ';')
  }
}

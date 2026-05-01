import React, { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { open, type DB } from '@op-engineering/op-sqlite'
import RNFS from 'react-native-fs'
import { CREATE_TABLES_SQL, CREATE_INDEXES_SQL } from './schema'
import { initVectorSupport } from './vectorOperations'
import { setTaskStoreDb } from '../stores/tasks'
import { setSetupStoreDb, useSetupStore } from '../stores/setup'

interface DatabaseContextType {
  isReady: boolean
  db: DB | null
}

const DatabaseContext = createContext<DatabaseContextType>({
  isReady: false,
  db: null,
})

export function useDatabase(): DatabaseContextType {
  return useContext(DatabaseContext)
}

// Module-level DB reference for stores that can't use hooks
let _moduleDb: DB | null = null

export function getModuleDb(): DB | null {
  return _moduleDb
}

export default function DatabaseProvider({ children }: { children: React.ReactNode }) {
  const [isReady, setIsReady] = useState(false)
  const [db, setDb] = useState<DB | null>(null)

  useEffect(() => {
    initializeDatabase()
  }, [])

  async function initializeDatabase() {
    try {
      const dbDir = `${RNFS.DocumentDirectoryPath}/databases`
      if (!(await RNFS.exists(dbDir))) {
        await RNFS.mkdir(dbDir)
      }

      const database = open({ name: 'pocketdev.db', location: dbDir })

      // Enable WAL mode + foreign keys
      await database.execute('PRAGMA journal_mode=WAL;')
      await database.execute('PRAGMA foreign_keys=ON;')

      // Create tables
      const tableStatements = CREATE_TABLES_SQL.split(';').filter((s) => s.trim())
      for (const statement of tableStatements) {
        await database.execute(statement + ';')
      }

      // Create indexes
      const indexStatements = CREATE_INDEXES_SQL.split(';').filter((s) => s.trim())
      for (const statement of indexStatements) {
        await database.execute(statement + ';')
      }

      // Additive migrations for existing installs
      await database.execute('ALTER TABLE tasks ADD COLUMN session_id TEXT').catch(() => {})
      await database.execute('ALTER TABLE tasks ADD COLUMN turn_count INTEGER DEFAULT 1').catch(() => {})
      await database.execute('ALTER TABLE tasks ADD COLUMN script_name TEXT').catch(() => {})
      await database.execute("ALTER TABLE git_commits ADD COLUMN origin TEXT DEFAULT 'external'").catch(() => {})
      await database.execute("ALTER TABLE file_embeddings ADD COLUMN content_preview TEXT DEFAULT ''").catch(() => {})

      // Initialize vector support (probes for vec0 extension)
      await initVectorSupport(database)

      // Set module-level ref + store refs
      _moduleDb = database
      setDb(database)
      setTaskStoreDb(database)
      setSetupStoreDb(database)
      setIsReady(true)
      useSetupStore.getState().hydrateFromCache().catch(() => {})
      console.log('[db] PocketDev SQLite initialized (with vector support)')
    } catch (error) {
      console.error('[db] Failed to initialize SQLite:', error)
      setSetupStoreDb(null)
      useSetupStore.setState({ hydrated: true })
      setIsReady(true) // Don't block the app
    }
  }

  const value = useMemo(() => ({ isReady, db }), [isReady, db])

  return (
    <DatabaseContext.Provider value={value}>
      {children}
    </DatabaseContext.Provider>
  )
}

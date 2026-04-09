import React, { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { open, type DB } from '@op-engineering/op-sqlite'
import RNFS from 'react-native-fs'
import { CREATE_TABLES_SQL, CREATE_INDEXES_SQL } from './schema'
import { setTaskStoreDb } from '../stores/tasks'

interface TaskDatabaseContextType {
  isReady: boolean
  db: DB | null
}

const TaskDatabaseContext = createContext<TaskDatabaseContextType>({
  isReady: false,
  db: null,
})

export function useTaskDatabase(): TaskDatabaseContextType {
  return useContext(TaskDatabaseContext)
}

export default function TaskDatabaseProvider({ children }: { children: React.ReactNode }) {
  const [isReady, setIsReady] = useState(false)
  const [db, setDb] = useState<DB | null>(null)

  useEffect(() => {
    void initializeDatabase()
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

      setDb(database)
      setTaskStoreDb(database)
      setIsReady(true)
      console.log('[db] PocketDev SQLite initialized')
    } catch (error) {
      console.error('[db] Failed to initialize SQLite:', error)
      setIsReady(true) // Don't block the app
    }
  }

  const value = useMemo(() => ({ isReady, db }), [isReady, db])

  return (
    <TaskDatabaseContext.Provider value={value}>
      {children}
    </TaskDatabaseContext.Provider>
  )
}

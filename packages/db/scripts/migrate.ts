import { drizzle } from 'drizzle-orm/postgres-js'
import { migrate } from 'drizzle-orm/postgres-js/migrator'
import postgres from 'postgres'
import { fileURLToPath } from 'url'
import path from 'path'

const connectionString = process.env.DATABASE_URL
if (!connectionString) throw new Error('DATABASE_URL is required')

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const migrationsFolder = path.join(__dirname, '..', 'drizzle')

const client = postgres(connectionString, { max: 1 })
const db = drizzle(client)

console.log('Running migrations from:', migrationsFolder)

try {
  await migrate(db, { migrationsFolder })
  console.log('Migrations complete')
} catch (err) {
  console.error('Migration failed:', err)
  process.exit(1)
} finally {
  await client.end()
}

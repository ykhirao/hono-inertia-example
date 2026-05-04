/**
 * libSQL / Turso データベースに Drizzle のマイグレーションを適用する。
 *
 * 使い方:
 *   pnpm db:migrate:local                # :8080 の `turso dev` に対して実行
 *   TURSO_DATABASE_URL=libsql://… \
 *     TURSO_AUTH_TOKEN=… \
 *     pnpm db:migrate:remote             # Turso クラウドに対して実行
 */
import { createClient } from '@libsql/client'
import { drizzle } from 'drizzle-orm/libsql'
import { migrate } from 'drizzle-orm/libsql/migrator'

const url = process.env.TURSO_DATABASE_URL ?? process.env.DATABASE_URL
if (!url) {
  console.error('TURSO_DATABASE_URL (または DATABASE_URL) が必要です')
  process.exit(1)
}

const client = createClient({
  url,
  authToken: process.env.TURSO_AUTH_TOKEN
})

const db = drizzle(client)

console.log(`マイグレーション実行中: ${url}`)
await migrate(db, { migrationsFolder: './drizzle' })
console.log('マイグレーションを適用しました。')

client.close()

/**
 * サンプルデータを投入する。一意制約付きの email に対して INSERT OR IGNORE
 * で挿入するので、何度実行しても安全。
 *   pnpm tsx scripts/seed.ts
 */
import { createClient } from '@libsql/client'
import { drizzle } from 'drizzle-orm/libsql'
import { users } from '../app/db/schema'

const url = process.env.TURSO_DATABASE_URL ?? 'http://127.0.0.1:8080'

const client = createClient({
  url,
  authToken: process.env.TURSO_AUTH_TOKEN
})

const db = drizzle(client)

const sample = [
  { name: 'Alice', email: 'alice@example.com', bio: 'フロントエンドエンジニア。' },
  { name: 'Bob', email: 'bob@example.com', bio: 'バックエンドエンジニア。' }
]

console.log(`シード投入中: ${url}`)
await db.insert(users).values(sample).onConflictDoNothing({ target: users.email })
console.log(`${sample.length} 件のユーザーを投入しました (既存行はそのまま)。`)

client.close()

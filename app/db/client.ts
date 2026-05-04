import { createClient, type Client } from '@libsql/client/web'
import { drizzle, type LibSQLDatabase } from 'drizzle-orm/libsql'
import type { Bindings } from '~/lib/env'
import * as schema from './schema'

export type DB = LibSQLDatabase<typeof schema>

export const createDb = (env: Bindings): DB => {
  const client: Client = createClient({
    url: env.TURSO_DATABASE_URL,
    authToken: env.TURSO_AUTH_TOKEN
  })
  return drizzle(client, { schema })
}

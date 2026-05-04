import { zValidator } from '@hono/zod-validator'
import { eq } from 'drizzle-orm'
import { Hono } from 'hono'
import { html } from 'hono/html'
import { logger } from 'hono/logger'
import type { JSX } from 'hono/jsx/jsx-runtime'
import { z } from 'zod'
import { createDb } from '~/db/client'
import { users } from '~/db/schema'
import type { AppEnv } from '~/lib/env'
import { Home } from '~/pages/Home'
import { UserNew } from '~/pages/UserNew'
import { UserShow } from '~/pages/UserShow'
import { UsersIndex } from '~/pages/UsersIndex'

const userInput = z.object({
  name: z.string().trim().min(1, '名前を入力してください'),
  email: z.email('メールアドレスの形式が正しくありません'),
  bio: z
    .string()
    .trim()
    .max(200, '自己紹介は 200 文字以内で入力してください')
    .optional()
    .default('')
})

const doc = async (page: JSX.Element) => await html`<!doctype html>${page}`

const app = new Hono<AppEnv>()

app.use(logger())

const routes = app
  .get('/', async (c) => c.html(await doc(<Home />)))

  .get('/users', async (c) => {
    const db = createDb(c.env)
    const list = await db.select().from(users).orderBy(users.id)
    return c.html(await doc(<UsersIndex users={list} />))
  })

  .get('/users/new', async (c) => c.html(await doc(<UserNew />)))

  .get('/users/:id{[0-9]+}', async (c) => {
    const db = createDb(c.env)
    const id = Number(c.req.param('id'))
    const [user] = await db.select().from(users).where(eq(users.id, id)).limit(1)
    if (!user) return c.notFound()
    return c.html(await doc(<UserShow user={user} />))
  })

  .post(
    '/users',
    zValidator('form', userInput, async (result, c) => {
      if (!result.success) {
        const fieldErrors = z.flattenError(result.error).fieldErrors
        const errors: Record<string, string> = {}
        for (const [k, msgs] of Object.entries(fieldErrors)) {
          if (msgs && msgs.length > 0) errors[k] = msgs[0]
        }
        const raw = (result as { data?: Record<string, unknown> }).data ?? {}
        return c.html(
          await doc(
            <UserNew
              values={{
                name: typeof raw.name === 'string' ? raw.name : '',
                email: typeof raw.email === 'string' ? raw.email : '',
                bio: typeof raw.bio === 'string' ? raw.bio : ''
              }}
              errors={errors}
            />
          )
        )
      }
    }),
    async (c) => {
      const input = c.req.valid('form')
      const db = createDb(c.env)
      const [created] = await db.insert(users).values(input).returning()
      return c.redirect(`/users/${created.id}`, 303)
    }
  )

  // JSON API — クライアント側で fetch する SPA island から使う想定。
  .get('/api/users', async (c) => {
    const db = createDb(c.env)
    const list = await db.select().from(users).orderBy(users.id)
    return c.json(list)
  })

export type AppType = typeof routes
export default routes

import { Layout } from '~/components/Layout'
import type { User } from '~/db/schema'

export const UserShow = ({ user }: { user: User }) => (
  <Layout title={`${user.name} — ユーザー`}>
    <a href="/users" class="text-sm text-zinc-500 hover:text-orange-600">
      ← ユーザー一覧に戻る
    </a>

    <h1 class="mt-2 text-2xl font-bold">{user.name}</h1>

    <dl class="mt-6 grid grid-cols-[100px_1fr] gap-2 text-sm">
      <dt class="font-semibold text-zinc-500">メール</dt>
      <dd>{user.email}</dd>
      <dt class="font-semibold text-zinc-500">自己紹介</dt>
      <dd class="whitespace-pre-wrap">{user.bio || '—'}</dd>
      <dt class="font-semibold text-zinc-500">登録日</dt>
      <dd>{user.createdAt}</dd>
    </dl>
  </Layout>
)

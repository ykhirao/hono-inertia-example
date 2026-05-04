import { Layout } from '~/components/Layout'
import type { User } from '~/db/schema'

export const UsersIndex = ({ users }: { users: User[] }) => (
  <Layout title="ユーザー一覧">
    <div class="flex items-center justify-between">
      <h1 class="text-2xl font-bold">ユーザー</h1>
      <a
        href="/users/new"
        class="rounded-md bg-orange-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-orange-500"
      >
        新規作成
      </a>
    </div>

    {users.length === 0 ? (
      <p class="mt-8 text-sm text-zinc-500">
        まだユーザーがいません。<a class="text-orange-600 hover:underline" href="/users/new">作成する →</a>
      </p>
    ) : (
      <ul class="mt-6 divide-y divide-zinc-200 rounded-lg border border-zinc-200 bg-white dark:divide-zinc-800 dark:border-zinc-800 dark:bg-zinc-900">
        {users.map((user) => (
          <li key={user.id} class="p-4">
            <a href={`/users/${user.id}`} class="block hover:opacity-80">
              <div class="font-medium">{user.name}</div>
              <div class="text-sm text-zinc-500">{user.email}</div>
            </a>
          </li>
        ))}
      </ul>
    )}
  </Layout>
)

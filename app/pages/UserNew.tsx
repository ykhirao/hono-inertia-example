import { Layout } from '~/components/Layout'

type FieldErrors = Partial<Record<'name' | 'email' | 'bio', string>>

type Props = {
  values?: { name?: string; email?: string; bio?: string }
  errors?: FieldErrors
}

const Field = ({
  name,
  label,
  type = 'text',
  value = '',
  error,
  as = 'input'
}: {
  name: string
  label: string
  type?: string
  value?: string
  error?: string
  as?: 'input' | 'textarea'
}) => (
  <div class="flex flex-col gap-1">
    <label for={name} class="text-sm font-semibold">
      {label}
    </label>
    {as === 'textarea' ? (
      <textarea
        id={name}
        name={name}
        rows={4}
        class="rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm focus:border-orange-500 focus:outline-2 focus:outline-orange-500 dark:border-zinc-700 dark:bg-zinc-900"
      >
        {value}
      </textarea>
    ) : (
      <input
        id={name}
        name={name}
        type={type}
        value={value}
        class="rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm focus:border-orange-500 focus:outline-2 focus:outline-orange-500 dark:border-zinc-700 dark:bg-zinc-900"
      />
    )}
    {error ? <p class="text-sm text-red-600">{error}</p> : null}
  </div>
)

export const UserNew = ({ values = {}, errors = {} }: Props) => (
  <Layout title="ユーザー新規作成">
    <a href="/users" class="text-sm text-zinc-500 hover:text-orange-600">
      ← ユーザー一覧に戻る
    </a>

    <h1 class="mt-2 text-2xl font-bold">ユーザー新規作成</h1>

    <form
      method="post"
      action="/users"
      class="mt-6 flex max-w-md flex-col gap-4"
    >
      <Field name="name" label="名前" value={values.name ?? ''} error={errors.name} />
      <Field
        name="email"
        label="メール"
        type="email"
        value={values.email ?? ''}
        error={errors.email}
      />
      <Field
        name="bio"
        label="自己紹介"
        as="textarea"
        value={values.bio ?? ''}
        error={errors.bio}
      />
      <button
        type="submit"
        class="self-start rounded-md bg-orange-600 px-4 py-2 text-sm font-semibold text-white hover:bg-orange-500"
      >
        作成
      </button>
    </form>
  </Layout>
)

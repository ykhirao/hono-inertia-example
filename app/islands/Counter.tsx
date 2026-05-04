import { useState } from 'hono/jsx'

type Props = {
  initial?: number
  label?: string
}

export const Counter = ({ initial = 0, label = 'カウント' }: Props) => {
  const [count, setCount] = useState(initial)

  return (
    <div class="flex items-center gap-3 rounded-lg border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
      <span class="text-sm font-medium text-zinc-600 dark:text-zinc-300">{label}:</span>
      <span class="min-w-[2ch] text-center text-lg font-semibold tabular-nums">{count}</span>
      <div class="ml-auto flex gap-2">
        <button
          type="button"
          onClick={() => setCount((c) => c - 1)}
          class="rounded-md border border-zinc-300 bg-white px-3 py-1 text-sm font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-700"
        >
          −
        </button>
        <button
          type="button"
          onClick={() => setCount((c) => c + 1)}
          class="rounded-md bg-orange-600 px-3 py-1 text-sm font-medium text-white hover:bg-orange-500"
        >
          +
        </button>
      </div>
    </div>
  )
}

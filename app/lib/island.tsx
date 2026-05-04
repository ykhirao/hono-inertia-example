import type { JSX } from 'hono/jsx/jsx-runtime'

/**
 * SSR されたコンポーネントを包み、対応するクライアント側 island が
 * 見つけてハイドレートできるようにする (`app/client.tsx` 経由)。
 *
 * - `name` は `app/islands/index.ts` に登録されたキーと一致させる。
 * - `props` は JSON にシリアライズされ、クライアントで再度渡される。
 */
type IslandProps<P extends Record<string, unknown>> = {
  name: string
  props?: P
  children: JSX.Element
}

export const Island = <P extends Record<string, unknown>>({
  name,
  props,
  children
}: IslandProps<P>) => (
  <div data-island={name} data-props={JSON.stringify(props ?? {})}>
    {children}
  </div>
)

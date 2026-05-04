import { Layout } from '~/components/Layout'
import { Island } from '~/lib/island'
import { Counter } from '~/islands/Counter'

export const Home = () => (
  <Layout title="ホーム — Hono JSX × Turso">
    <section class="space-y-3">
      <h1 class="text-3xl font-bold tracking-tight">Hono JSX × Turso × Workers</h1>
      <p class="text-zinc-600 dark:text-zinc-400">
        サーバサイドレンダリングされる Hono JSX のページと、クライアントで
        ハイドレートされる SPA islands を組み合わせた最小サンプルです。全体は
        ひとつの Cloudflare Worker としてデプロイされ、libSQL データベースと
        Drizzle 経由で通信します。
      </p>
    </section>

    <section class="mt-10 space-y-4">
      <h2 class="text-lg font-semibold">SPA island のデモ</h2>
      <p class="text-sm text-zinc-600 dark:text-zinc-400">
        下のカウンターはサーバで描画され、その後クライアントでハイドレート
        されます。JS が読み込まれた瞬間から状態とイベントハンドラが有効に
        なります。
      </p>
      <Island name="Counter" props={{ initial: 3, label: 'クリック数' }}>
        <Counter initial={0} label="クリック数" />
      </Island>
    </section>

    <section class="mt-10 space-y-2">
      <h2 class="text-lg font-semibold">試してみる</h2>
      <ul class="list-inside list-disc space-y-1 text-sm text-zinc-600 dark:text-zinc-400">
        <li>
          <a class="text-orange-600 hover:underline" href="/users">/users</a>{' '}
          にアクセスすると Drizzle + Turso による DB 連携 CRUD を確認できます。
        </li>
        <li>テーマ切り替えボタンも island の一例で、ヘッダーでハイドレートされています。</li>
        <li>ブラウザの JS を切ってみてください — ページは描画され、リンクも動作します。</li>
      </ul>
    </section>
  </Layout>
)

import type { JSX } from 'hono/jsx/jsx-runtime'
import { Link, Script, ViteClient } from 'vite-ssr-components/hono'
import { Island } from '~/lib/island'
import { ThemeToggle } from '~/islands/ThemeToggle'

type Props = {
  title?: string
  children: JSX.Element | JSX.Element[]
}

const NavLink = ({ href, label }: { href: string; label: string }) => (
  <a
    href={href}
    class="text-sm font-medium text-zinc-700 hover:text-orange-600 dark:text-zinc-200 dark:hover:text-orange-400"
  >
    {label}
  </a>
)

export const Layout = ({ title = 'Hono JSX × Turso', children }: Props) => (
  <html lang="ja">
    <head>
      <meta charset="UTF-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <title>{title}</title>
      <ViteClient />
      <Link href="/app/styles.css" rel="stylesheet" />
      <Script src="/app/client.tsx" type="module" />
      {/* ノーフラッシュなテーマ適用: 描画前に設定を読む。 */}
      <script
        // biome-ignore lint/security/noDangerouslySetInnerHtml: インラインの初期化スクリプト
        dangerouslySetInnerHTML={{
          __html: `(()=>{try{const t=localStorage.getItem('theme')||(matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light');if(t==='dark')document.documentElement.classList.add('dark');}catch(_){}})()`
        }}
      />
    </head>
    <body class="min-h-screen font-sans antialiased">
      <header class="border-b border-zinc-200 bg-white/80 backdrop-blur dark:border-zinc-800 dark:bg-zinc-950/80">
        <div class="mx-auto flex max-w-3xl items-center justify-between px-6 py-4">
          <a href="/" class="text-base font-semibold tracking-tight">
            Hono <span class="text-orange-600">×</span> Turso
          </a>
          <nav class="flex items-center gap-5">
            <NavLink href="/" label="ホーム" />
            <NavLink href="/users" label="ユーザー" />
            <Island name="ThemeToggle">
              <ThemeToggle />
            </Island>
          </nav>
        </div>
      </header>

      <main class="mx-auto max-w-3xl px-6 py-10">{children}</main>

      <footer class="mx-auto max-w-3xl px-6 py-10 text-center text-xs text-zinc-500">
        Hono · Turso · Cloudflare Workers で構築
      </footer>
    </body>
  </html>
)

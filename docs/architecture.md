# アーキテクチャ

各構成要素の「なぜ」を解説するドキュメント。表面的な API やコマンドについては
[`README.md`](../README.md) と [`AGENTS.md`](../AGENTS.md) を参照。

## 全体像

```
ブラウザ
  ▲    │ HTML (SSR された Hono JSX) + 小さな client.tsx バンドル
  │    ▼
Cloudflare Worker  ──fetch──▶  Turso (libSQL over HTTP)
  (Hono + Drizzle)
```

リクエストは Worker に届き、Hono がルーティングして次を実行する:

1. **このリクエスト用の** Drizzle クライアントを作る (`createDb(c.env)`)。
2. `@libsql/client/web` で HTTP 経由 Turso に問い合わせる。
3. Hono JSX のページを HTML にレンダリングして返す。

その後、ブラウザは `app/client.tsx` をロードし、DOM 内の `[data-island]` ノードを
走査して `hono/jsx/dom` で各 island をハイドレートする。

## ディレクトリ構成

```
app/
  server.tsx          # Hono アプリ: ルーティング + RPC 型 (AppType) を export
  client.tsx          # ブラウザのエントリ: 全 <Island> ノードをハイドレート
  styles.css          # Tailwind v4 のエントリ (@import "tailwindcss")
  components/
    Layout.tsx        # HTML シェル / nav / テーマ初期化 / ViteClient
  pages/              # サーバレンダリングされるページ (Home, UsersIndex, …)
  islands/
    index.ts          # レジストリ — キーは <Island name="…"> と一致させる
    Counter.tsx
    ThemeToggle.tsx
  lib/
    env.ts            # Bindings / AppEnv 型 (env vars の唯一の真実)
    island.tsx        # SSR マーカーを出す <Island> ラッパー
  db/
    schema.ts         # Drizzle スキーマ (users)
    client.ts         # createDb(env) → Drizzle インスタンス
drizzle/              # 生成されたマイグレーション (手で編集しない)
scripts/
  migrate.ts          # マイグレーション適用 (local / remote 両対応)
  seed.ts             # サンプルユーザーを投入
```

## SSR + Islands

### 方針

ページは 100% サーバレンダリング。インタラクティブにする必要のある部分**だけ**を
クライアントでハイドレートする。Astro / Fresh / Marko と同じ考え方:
**必要な場所にだけ最小限の JS を送る**。

### ページがハイドレート可能な HTML になるまで

1. ルートハンドラが `c.html(doc(<Page />))` を返す。`doc` は `hono/html` の
   `` html`<!doctype html>${page}` `` で doctype を前置するだけ。
2. `<Layout>` は `<Script src="/app/client.tsx" type="module" />`
   (`vite-ssr-components/hono` 経由) を含むので、すべてのページに
   クライアントバンドルが付いてくる。
3. インタラクティブにしたい部分はページ側で `<Island>` で包む:

   ```tsx
   <Island name="Counter" props={{ initial: 3 }}>
     <Counter initial={3} />
   </Island>
   ```

   ラッパーが `<div data-island="Counter" data-props='{"initial":3}'>…</div>` を
   出力し、子要素として SSR 結果を含める。
4. クライアントでは `app/client.tsx` が `querySelectorAll('[data-island]')` を実行し、
   `name` を読み `data-props` を JSON パースして、`islands` レジストリから
   コンポーネントを取り出し、`hono/jsx/dom` の `render(<Component {...props}/>, el)` を
   呼ぶ。`render()` は既存マークアップにマッチすれば再レンダリングではなく
   ハイドレートとして振る舞う。

### なぜ動的 import ではなくレジストリか

`app/islands/index.ts` の `islands` オブジェクトは意図的に静的にしてある:

- Vite が静的解析して未使用の island を tree-shake できる。
- `IslandName` 型でサーバ側でも型チェックが効く。
- 規模が小さいうちはこれが最もシンプル。island が増えてきたら、他の構造を
  触らずに名前ごとの `import()` に切り替えれば済む。

### トレードオフ

- **メリット**: JS を切ってもページが動く (フォーム POST もリンク遷移も生きる)。
  クライアントバンドルは islands が必要とするものだけで小さく保てる。
- **デメリット**: クライアントサイドルーターはない。すべてのナビゲーションが
  フルドキュメントロードになる。コンテンツ中心のアプリには十分だが、SPA 的な
  画面遷移が欲しいなら htmx や軽量ルーターを足し、islands ハイドレートは
  そのまま残す形にできる。

## DB レイヤ (Turso + Drizzle)

### なぜ `@libsql/client/web` か

`/web` エントリはネイティブソケットではなく `fetch` を使う。Cloudflare Worker
内で動かせるのはこのバリアントだけ。同じクライアントは Node でも動く
(`scripts/migrate.ts` では `@libsql/client` のデフォルトエントリを使う —
組み込みのマイグレータが `/web` ではない方を要求するため)。

### なぜリクエストごとにインスタンス化するか

```ts
export const createDb = (env: Bindings): DB => {
  const client = createClient({ url: env.TURSO_DATABASE_URL, authToken: env.TURSO_AUTH_TOKEN })
  return drizzle(client, { schema })
}
```

Workers では `env` はリクエストスコープでしか手に入らない — env を捕まえられる
「アプリ起動時」のフックは存在しない。リクエストごとに作り直すのは isolate の
再利用に対しても安全で、各リクエストが正しい認証情報のクライアントを得られる。

### ローカル vs リモート

| | URL | 認証 |
| --- | --- | --- |
| ローカル | `http://127.0.0.1:8080` (turso CLI 開発サーバ) | なし |
| リモート | `libsql://<db>-<org>.turso.io` | `wrangler secret` |

マイグレーションは同じ `scripts/migrate.ts` をどちらにも使い、env vars だけが違う。

## スタイリング (Tailwind v4)

- `app/styles.css` がエントリ: `@import "tailwindcss"`。
- `dark` バリアントは `@custom-variant dark (&:where(.dark, .dark *))` で有効化。
  `<html>` に `dark` クラスを付け外しすることでテーマを切り替える方式。
- `Layout.tsx` のノーフラッシュブートストラップスクリプトが、**描画前に**
  `localStorage.theme` と `prefers-color-scheme` メディアクエリを読み込むので、
  誤ったテーマで一瞬チカっと表示されることがない。
- `ThemeToggle` island が `localStorage` に書き戻し、クラスを付け外しする。

## ビルドパイプライン

`vite build` は 2 つの成果物を吐く。`@cloudflare/vite-plugin` が 2 つ目のビルド
環境を登録するため:

- `dist/client/` — ブラウザ向けバンドル (`client.tsx` + Tailwind CSS)。
- `dist/hono_jsx_turso_workers/` — Worker 向けバンドル (Hono アプリ + Drizzle)。
  `wrangler deploy` はここを読む。

`vite-ssr-components` プラグインは `<Script src="/app/client.tsx" />` を、
開発時には Vite 開発サーバの URL に、ビルド時にはクライアントマニフェストの
ハッシュ付きアセットパスに書き換える。

## 追加するときの手順

### 新しいページ

1. `app/pages/Foo.tsx` を追加 (`Layout` でラップしたコンポーネント)。
2. `app/server.tsx` にルートを追加し `c.html(doc(<Foo />))` を返す。
3. ルートは `app.get(...)` のチェーンビルダーに繋がるので `AppType` に
   自動で反映され、RPC クライアントから見えるようになる。

### 新しい island

[`AGENTS.md` の Architecture cheatsheet](../AGENTS.md#アーキテクチャの要点) を参照。

### 新しい DB テーブル

1. `app/db/schema.ts` を編集。
2. `pnpm db:generate` を実行し、`drizzle/` 配下に生成されたファイルをコミット。
3. ローカルには `pnpm db:migrate:local`、本番には `pnpm db:migrate:remote` で適用。

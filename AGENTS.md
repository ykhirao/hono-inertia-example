# AGENTS.md

このリポジトリで作業する AI コーディングエージェント (Claude Code, Cursor, Copilot など) 向けのガイド。
人間向けの入り口は [`README.md`](./README.md)、初回セットアップ手順は
[`docs/setup.md`](./docs/setup.md)、デプロイ運用は
[`docs/deploy.md`](./docs/deploy.md)、設計の詳細は
[`docs/architecture.md`](./docs/architecture.md) を参照してください。

## プロジェクト概要

Cloudflare Workers 上で動く最小構成のフルスタックサンプル:

- **Server / View**: Hono + Hono JSX (サーバサイドレンダリング)
- **クライアントの対話性**: `hono/jsx/dom` でハイドレートする Islands
- **DB**: Turso (libSQL) を Drizzle ORM (`@libsql/client/web`) 経由で利用
- **スタイリング**: Tailwind CSS v4 (`@tailwindcss/vite`)
- **バンドラ**: Vite + `@cloudflare/vite-plugin`
- **パッケージマネージャ**: pnpm

## セットアップ

```sh
pnpm install
cp .dev.vars.example .dev.vars
pnpm dev          # turso dev (:8080) と vite を concurrently で同時起動
```

初回の DB セットアップ (`pnpm dev` を起動したまま、別ターミナルで一度だけ):

```sh
pnpm db:migrate:local
pnpm db:seed:local
```

その他のコマンド:

| コマンド | 用途 |
| --- | --- |
| `pnpm build` | Vite の本番ビルド (client + worker の 2 バンドル) |
| `pnpm deploy` | `pnpm build` 後に `wrangler deploy` |
| `pnpm db:generate` | `app/db/schema.ts` から新しいマイグレーションを生成 |
| `pnpm db:migrate:remote` | Turso クラウドにマイグレーション適用 (env vars 必須) |
| `pnpm db:studio` | Drizzle Studio を起動 |
| `pnpm cf-typegen` | `wrangler.jsonc` から `worker-configuration.d.ts` を再生成 |

## コードスタイル

- **JSX ランタイムは Hono JSX。React ではない。** 型は `hono/jsx/jsx-runtime` から
  import する (`import type { JSX } from 'hono/jsx/jsx-runtime'`)。React を持ち込まない。
- **パスエイリアス**: アプリのコードは `~/*` で import する
  (例: `~/db/schema`, `~/lib/env`)。`~` は `./app` に解決される
  (`tsconfig.json` と `vite.config.ts` を参照)。
- **Tailwind v4**: クラスは `class=` (Hono JSX なので `className=` ではない)。
  ダークモードはクラスベース — `dark:` バリアントを使う。テーマのブートストラップ
  スクリプトは `app/components/Layout.tsx` にある。
- **サーバ専用ファイル**でだけ `~/db/*` を import する。`app/islands/` 配下から
  Drizzle や `@libsql/*` を import してはいけない (ブラウザで動くため)。
- **コメントは「なぜ」が自明でないときだけ書く。** 自己説明的なコードを優先する。

## アーキテクチャの要点

- **ページ** (`app/pages/*.tsx`) は Hono が SSR する。各ルートハンドラは
  `c.html(doc(<Page/>))` を返す。`doc` は `<!doctype html>` を前置するヘルパ。
- **Islands** (`app/islands/*.tsx`) はクライアントでハイドレートされる対話的な
  コンポーネント。追加手順:
  1. `app/islands/Foo.tsx` を作成。
  2. `app/islands/index.ts` に登録 (`islands.Foo = Foo`)。
  3. ページから `<Island name="Foo" props={...}><Foo {...} /></Island>` で使う。
- **DB アクセス**: ルートハンドラ内で**リクエストごとに** `createDb(c.env)` を呼ぶ。
  Drizzle インスタンスをモジュールスコープでキャッシュしないこと — Workers の
  isolate モデルでは安全でない。
- **Bindings 型** (`app/lib/env.ts`) が env vars の唯一の真実。
  `new Hono<AppEnv>()` のパラメータもここから取る。

理由については [`docs/architecture.md`](./docs/architecture.md) を参照。

## 触るときに気をつけるファイル

- `drizzle/0000_*.sql` および `drizzle/meta/**` — `drizzle-kit` が生成するもの。
  手で編集しない。スキーマを変えるときは `app/db/schema.ts` を編集してから
  `pnpm db:generate` で新しいマイグレーションを作る。
- `wrangler.jsonc` — `main` は `app/server.tsx` を指していること。
  `@libsql/client` を使うため `nodejs_compat` が必須。
- `tsconfig.json` — `jsxImportSource: "hono/jsx"` は重要。React JSX に切り替えない。
- `.dev.vars` — gitignore 対象。`.dev.vars.example` をテンプレートとして使う。
- `local.db` / `local.db-*` — gitignore 対象の Turso ローカル DB ファイル。

## テスト

現状テストスイートはない。機能を追加するときは最低限以下を確認すること:

- `pnpm build` が成功する (型エラーやバンドルエラーを検出)。
- `pnpm dev` でルートが描画され、対象の island がハイドレートされる
  (unknown island や invalid props の警告が出ないこと)。

テストを足すなら Vitest を使い、ソースの隣に `*.test.ts(x)` で置く。

## デプロイ

本番のシークレットは `.dev.vars` ではなく Worker secrets として保存する:

```sh
wrangler secret put TURSO_DATABASE_URL
wrangler secret put TURSO_AUTH_TOKEN
TURSO_DATABASE_URL=<url> TURSO_AUTH_TOKEN=<token> pnpm db:migrate:remote
pnpm deploy
```

## エージェント向けの規約

- 既存ファイルの編集を新規作成より優先する。タスクが要求していない足場や
  抽象化を勝手に追加しない。
- DB スキーマを変更するときは必ず `pnpm db:generate` を実行し、生成された
  SQL をスキーマ変更と一緒にコミットする。
- ルートを追加するときは `app/server.tsx` の `app.get(...).post(...)` チェーンに
  繋げる形で書く。`AppType` (RPC 型) の正確性を保つため。
- 別のパッケージマネージャを混ぜない (`npm install` や `bun add` は使わない)。
  pnpm を使うこと。

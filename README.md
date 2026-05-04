# hono-jsx-turso-workers

[Hono](https://hono.dev) + Hono JSX (SSR) + `hono/jsx/dom` による Islands ハイドレーションのサンプル。
DB は [Turso](https://turso.tech) (libSQL) を [Drizzle ORM](https://orm.drizzle.team) 経由で使用し、
[Cloudflare Workers](https://developers.cloudflare.com/workers/) にデプロイします。

## ページ

- `/` — Home (`<Counter>` island のデモ付き)
- `/users` — ユーザー一覧 / `/users/:id` / `/users/new`
- `GET /api/users` — JSON API

## 起動

```sh
pnpm dev
```

`concurrently` で `turso dev` (`:8080`) と Vite が同時に立ち上がります。

> 初めてこのリポジトリを触るときは、先に [`docs/setup.md`](./docs/setup.md)
> のセットアップ手順を実施してください (依存のインストール / DB の初期化など)。

## よく使うコマンド

| コマンド | 用途 |
| --- | --- |
| `pnpm dev` | 開発サーバ (turso dev + Vite) を起動 |
| `pnpm build` | 本番ビルド (client + worker の 2 バンドル) |
| `pnpm deploy` | ビルドして `wrangler deploy` |
| `pnpm db:generate` | スキーマからマイグレーション SQL を生成 |
| `pnpm db:migrate:local` | ローカル DB にマイグレーション適用 |
| `pnpm db:seed:local` | ローカル DB にサンプルデータ投入 |
| `pnpm db:studio` | Drizzle Studio を起動 |

## ドキュメント

- [`docs/setup.md`](./docs/setup.md) — クローン後のセットアップ (リネーム / Turso・Workers の初期設定)
- [`docs/deploy.md`](./docs/deploy.md) — GitHub Actions による自動デプロイ運用 (develop→staging / main→production)
- [`docs/architecture.md`](./docs/architecture.md) — 設計ノート (SSR + Islands / DB レイヤ / ビルドパイプライン)
- [`AGENTS.md`](./AGENTS.md) — AI コーディングエージェント向けのガイド

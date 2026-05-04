# セットアップ手順

このリポジトリをクローンしたあと、自分のプロジェクトとして動かすために
**1 回だけ**やる作業をまとめたドキュメントです。日々の開発フローや起動方法は
[`README.md`](../README.md)、デプロイ運用は [`docs/deploy.md`](./deploy.md) を参照してください。

## 1. プロジェクト名の一括置換

リポジトリ全体で `my-hono-app` というプレースホルダを使って
います。これを自分のプロジェクト名 (例: `my-app`、英数字と `-` のみ) に
**一括置換**してください。

```sh
# macOS / BSD sed
grep -rl 'my-hono-app' . --exclude-dir=node_modules --exclude-dir=.git \
  | xargs sed -i '' 's/my-hono-app/my-app/g'

# GNU sed (Linux)
grep -rl 'my-hono-app' . --exclude-dir=node_modules --exclude-dir=.git \
  | xargs sed -i 's/my-hono-app/my-app/g'
```

置換対象は以下:

- `package.json` の `name`
- `wrangler.jsonc` の `name` / `env.staging.name` / `env.production.name`
- このドキュメント (`docs/setup.md`, `docs/deploy.md`)

> Cloudflare Workers の `name` は `<name>.<account>.workers.dev` として公開
> されるので、グローバルにユニークな名前にしてください。デプロイ環境ごとに
> `<my-app>-dev` (staging) / `<my-app>-prod` (production) として分かれます。
> Wrangler の制約で `name` は **英数字小文字とハイフンのみ** 使えます。

## 2. 必要なツールのインストール

- [Node.js](https://nodejs.org) (20+)
- [pnpm](https://pnpm.io) — `npm i -g pnpm` または `corepack enable`
- [Turso CLI](https://docs.turso.tech/cli/installation) —
  `brew install tursodatabase/tap/turso`
- [Cloudflare アカウント](https://dash.cloudflare.com/sign-up) (デプロイする場合)

## 3. 依存のインストールとローカル env の用意

```sh
pnpm install
cp .dev.vars.example .dev.vars
```

`.dev.vars` はローカル開発用の環境変数ファイル。`.gitignore` 済み。
ローカルで `turso dev` を使う限りは `.dev.vars.example` のままでも動きます。

## 4. ローカル DB の初期化

`pnpm dev` が `turso dev` を起動 (`:8080`) するので、別ターミナルで
マイグレーションとシードを実行します:

```sh
# 起動したまま
pnpm dev
# 別ターミナルで
pnpm db:migrate:local
pnpm db:seed:local
```

> `local.db` というファイルがリポジトリ直下に作られます (`.gitignore` 済み)。

## 5. Turso クラウドに DB を作成 (dev / prod の 2 つ)

デプロイする場合に必要。`my-hono-app` は手順 1 で置換した名前です。

### 5.1. ログイン

```sh
turso auth login
```

### 5.2. dev / prod の DB を作成

```sh
turso db create my-hono-app-dev
turso db create my-hono-app-prod
```

### 5.3. URL とトークンを取得 (それぞれ)

```sh
# dev (staging 用)
turso db show my-hono-app-dev --url
turso db tokens create my-hono-app-dev

# prod (production 用)
turso db show my-hono-app-prod --url
turso db tokens create my-hono-app-prod
```

### 5.4. `.env.secret` に値を書き込む

`.env.secret.example` をコピーして、5.3 で取得した URL / トークンを埋めます:

```sh
cp .env.secret.example .env.secret
$EDITOR .env.secret
```

中身:

```sh
TURSO_DATABASE_URL_STAGING=libsql://...dev....turso.io
TURSO_AUTH_TOKEN_STAGING=eyJ...

TURSO_DATABASE_URL_PRODUCTION=libsql://...prod....turso.io
TURSO_AUTH_TOKEN_PRODUCTION=eyJ...
```

`.env.secret` は `.gitignore` 済み。コミットされません。

### 5.5. 一括登録

`pnpm init:secrets` で以下を一気にやります:

- `.env.secret` を読み込んで値を検証 (空 / 形式不正なら即終了)
- Cloudflare Workers の secret に登録 (`wrangler secret put`)
- GitHub Actions の Environment secret に登録 (`gh secret set`)

> リモート DB へのマイグレーション適用は GitHub Actions のデプロイ
> ワークフローが自動で行います (`.github/workflows/deploy.yml` の
> `Apply DB migrations` ステップ)。手動で当てたい場合のみ
> `TURSO_DATABASE_URL=... TURSO_AUTH_TOKEN=... pnpm db:migrate:remote`。

事前に以下にログインしておいてください:

```sh
pnpm wrangler login
gh auth login
```

そして実行:

```sh
pnpm init:secrets
```

最後に **GitHub の Repository secrets** にだけ手動登録が必要なものが出力
されるので、その指示に従って登録してください
(`CLOUDFLARE_API_TOKEN` / `CLOUDFLARE_ACCOUNT_ID`)。

### 5.6. 初回デプロイ (任意・動作確認用)

```sh
pnpm wrangler deploy --env staging
pnpm wrangler deploy --env production
```

通常は GitHub に push すれば Actions が自動でデプロイします
([`docs/deploy.md`](./deploy.md) 参照)。

## 6. GitHub Repository secrets の手動登録

Cloudflare の API トークンとアカウント ID は CLI から発行できないため、
ここだけ手動で登録します。

1. [API トークン](https://dash.cloudflare.com/profile/api-tokens) を発行
   (Edit Cloudflare Workers テンプレート)
2. Cloudflare ダッシュボード右サイドバーの "Account ID" をコピー
3. リポジトリに登録:

   ```sh
   gh secret set CLOUDFLARE_API_TOKEN  --body '<上のトークン>'
   gh secret set CLOUDFLARE_ACCOUNT_ID --body '<アカウント ID>'
   ```

> Environment secrets (`TURSO_DATABASE_URL` / `TURSO_AUTH_TOKEN`) は
> 手順 5.4 の `pnpm init:secrets` が自動登録済みです。詳細は
> [`docs/deploy.md`](./deploy.md) を参照。

## 7. (任意) Cloudflare Bindings の型を再生成

`wrangler.jsonc` を編集したあと、Worker 側の env 型を最新化したいときに:

```sh
pnpm cf-typegen
```

`worker-configuration.d.ts` が更新されます。

## トラブルシューティング

- **`pnpm dev` で turso がエラー** → `turso --version` でインストール確認。
  `brew install tursodatabase/tap/turso` で入ります。
- **マイグレーションが当たらない** → `local.db` を削除して再度
  `pnpm db:migrate:local` を実行すると、まっさらな状態から作り直せます。
- **デプロイ後に DB エラー** → `wrangler secret list --env <env>` で
  `TURSO_DATABASE_URL` / `TURSO_AUTH_TOKEN` が登録されているか確認。

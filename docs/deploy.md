# デプロイ

GitHub Actions による自動デプロイの仕組みと運用フロー。初回セットアップ
(リネーム・DB 作成・シークレット登録) は [`docs/setup.md`](./setup.md) を
参照してください。

## 全体像

```
┌─ git push develop ──▶ GitHub Actions (deploy.yml)
│                          ├─ pnpm install / build
│                          ├─ db:migrate:remote (staging DB)
│                          └─ wrangler deploy --env staging
│                                 ↓
│                          my-hono-app-dev (Cloudflare Worker)
│
└─ git push main ─────▶ GitHub Actions (deploy.yml)
                           ├─ pnpm install / build
                           ├─ db:migrate:remote (production DB)
                           └─ wrangler deploy --env production
                                  ↓
                           my-hono-app-prod (Cloudflare Worker)
```

| ブランチ | Wrangler env | Worker 名 | DB 名 |
| --- | --- | --- | --- |
| `develop` | `staging` | `my-hono-app-dev` | `my-hono-app-dev` |
| `main` | `production` | `my-hono-app-prod` | `my-hono-app-prod` |

## ワークフロー

`.github/workflows/deploy.yml` がそれぞれの push を拾って、

1. 依存をインストールしてビルド
2. **GitHub Environments** から該当環境のシークレットを読み込む
3. `pnpm db:migrate:remote` でマイグレーションを適用 (冪等)
4. `wrangler deploy --env <env>` で Worker をデプロイ

`environment: staging | production` を job に指定しているので、GitHub の
[Environments](https://docs.github.com/en/actions/deployment/targeting-different-environments/using-environments-for-deployment)
機能が使えます — Required reviewers を設定すれば本番デプロイに承認を必須化
することもできます。

## 必要なシークレット

### リポジトリ全体 (Settings → Secrets and variables → Actions → Repository secrets)

| Name | 用途 |
| --- | --- |
| `CLOUDFLARE_API_TOKEN` | wrangler が Cloudflare API を叩くため |
| `CLOUDFLARE_ACCOUNT_ID` | デプロイ先のアカウント識別 |

### 環境ごと (Settings → Environments → staging / production → Environment secrets)

| Name | 用途 |
| --- | --- |
| `TURSO_DATABASE_URL` | Actions 上で `db:migrate:remote` を実行するときに使う |
| `TURSO_AUTH_TOKEN` | 同上 |

> Worker ランタイムが使う `TURSO_DATABASE_URL` / `TURSO_AUTH_TOKEN` は
> `wrangler secret put --env <env>` で **別途登録** したもの (Cloudflare 側に
> 保存されている)。GitHub Secrets はマイグレーション CLI 実行のためだけに使う。

## Cloudflare API トークンの作り方

1. https://dash.cloudflare.com/profile/api-tokens を開く
2. "Create Token" → "Edit Cloudflare Workers" テンプレートを選択
3. Account / Zone リソースを必要なアカウントに絞る
4. 生成されたトークンを `CLOUDFLARE_API_TOKEN` に登録

`CLOUDFLARE_ACCOUNT_ID` は Cloudflare ダッシュボード右サイドバーの
"Account ID" からコピー。

## ロールバック

- **直前のデプロイに戻す**: Cloudflare ダッシュボード →
  Workers & Pages → 該当 Worker → Deployments で過去のデプロイをロールバック。
- **コードを戻す**: 安定していた commit を develop / main に push し直す。
  Actions が再度デプロイする。
- **DB 側の戻し**: マイグレーションは下方向への自動適用は行わない。
  破壊的なスキーマ変更を巻き戻す場合は、補正用のマイグレーションを別途
  生成してデプロイする。

## 手動デプロイ (緊急時 / 動作確認)

GitHub Actions を介さずローカルから直接デプロイすることもできます:

```sh
# staging
pnpm wrangler deploy --env staging

# production
pnpm wrangler deploy --env production
```

その場合のマイグレーションは手動で:

```sh
TURSO_DATABASE_URL=<url> TURSO_AUTH_TOKEN=<token> pnpm db:migrate:remote
```

## ブランチ運用の前提

- 機能ブランチ → PR → `develop` にマージ → staging に自動デプロイ
- 動作確認 OK → `develop` を `main` に PR / マージ → production に自動デプロイ

`develop` を経由せず `main` 直 push でも動きますが、本番反映前にステージング
で確認できる利点があるので推奨はこの 2 段階フローです。

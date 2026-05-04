#!/usr/bin/env bash
#
# 初回セットアップ用: .env.secret から TURSO_* を読み込んで
#   - Cloudflare Workers の secret (env ごと) として登録
#   - GitHub Actions の Environment secret として登録
# する。fail-fast: 事前チェックで何かひとつでも欠けていたら、
# 何も書き込まずに即終了する。
# 初回マイグレーションは GitHub Actions のデプロイワークフローが当てるので、
# このスクリプトでは触らない。
#
# 前提:
#   - .env.secret を作成済み (.env.secret.example をコピーして埋める)
#   - pnpm wrangler login 済み (もしくは CLOUDFLARE_API_TOKEN 環境変数)
#   - gh auth login 済み (リポジトリへの admin 権限)
#
# 使い方:
#   pnpm init:secrets

set -euo pipefail

# ----------------------------------------------------------------------
# ユーティリティ
# ----------------------------------------------------------------------
RED=$'\033[31m'
GREEN=$'\033[32m'
YELLOW=$'\033[33m'
RESET=$'\033[0m'

die()  { echo "${RED}✗ $*${RESET}" >&2; exit 1; }
ok()   { echo "${GREEN}✓${RESET} $*"; }
step() { echo; echo "${YELLOW}==>${RESET} $*"; }

# 値の先頭 4 文字を見せて残りはマスク。秘匿情報のサニティチェック用。
mask() {
  local v="${1:-}"
  local n="${#v}"
  if [ "$n" -le 4 ]; then
    printf '%s' "****"
  else
    printf '%s****(%d chars)' "${v:0:4}" "$n"
  fi
}

# ----------------------------------------------------------------------
# 1. 必要な CLI が入っているか
# ----------------------------------------------------------------------
step "前提ツールの確認"

for cmd in gh node pnpm; do
  command -v "$cmd" >/dev/null 2>&1 || die "$cmd コマンドが見つかりません"
  ok "$cmd: $(command -v "$cmd")"
done

# ----------------------------------------------------------------------
# 2. ログイン状態
# ----------------------------------------------------------------------
step "ログイン状態の確認"

gh auth status >/dev/null 2>&1 || die "gh auth login が必要です"
ok "gh: 認証済み"

if [ -z "${CLOUDFLARE_API_TOKEN:-}" ]; then
  pnpm wrangler whoami >/dev/null 2>&1 \
    || die "pnpm wrangler login が必要です (もしくは CLOUDFLARE_API_TOKEN を設定)"
fi
ok "wrangler: 認証済み"

# ----------------------------------------------------------------------
# 3. リポジトリ / プロジェクト名
# ----------------------------------------------------------------------
step "プロジェクト情報の解決"

git rev-parse --is-inside-work-tree >/dev/null 2>&1 \
  || die "git リポジトリの中で実行してください"

REPO_SLUG=$(gh repo view --json nameWithOwner -q .nameWithOwner 2>/dev/null) \
  || die "gh repo view に失敗しました (origin が GitHub リポジトリを指していますか?)"
ok "GitHub リポジトリ: $REPO_SLUG"

PROJECT_NAME=$(node -p "require('./package.json').name" 2>/dev/null || true)

[ -n "$PROJECT_NAME" ] || die "package.json の name が読めません"
[ "$PROJECT_NAME" != "project-name-placeholder" ] \
  || die "package.json の name がプレースホルダのままです。docs/setup.md の手順 1 で一括置換してください"
[[ "$PROJECT_NAME" =~ ^[a-z0-9][a-z0-9-]*$ ]] \
  || die "PROJECT_NAME が wrangler の制約 (英数字小文字とハイフンのみ) を満たしていません: $PROJECT_NAME"
ok "PROJECT_NAME: $PROJECT_NAME"

# ----------------------------------------------------------------------
# 4. .env 読み込み
# ----------------------------------------------------------------------
step ".env.secret の読み込み"

[ -f .env.secret ] || die ".env.secret が見つかりません (.env.secret.example をコピーして埋めてください)"

# .env.secret を安全に読み込む (export つきで読み、終わったら無効化)
set -a
# shellcheck disable=SC1091
source ./.env.secret
set +a
ok ".env.secret をロード"

# ----------------------------------------------------------------------
# 5. 値の検証
# ----------------------------------------------------------------------
step "値の検証"

# macOS 標準の bash 3.2 でも動くよう、連想配列ではなく通常変数で持つ。
URL_STAGING="${TURSO_DATABASE_URL_STAGING:-}"
TOKEN_STAGING="${TURSO_AUTH_TOKEN_STAGING:-}"
URL_PRODUCTION="${TURSO_DATABASE_URL_PRODUCTION:-}"
TOKEN_PRODUCTION="${TURSO_AUTH_TOKEN_PRODUCTION:-}"

validate_url() {
  local label="$1" v="$2"
  [ -n "$v" ] || die "$label が空です (.env.secret を確認)"
  [[ "$v" =~ ^libsql:// ]] || die "$label が libsql:// で始まっていません: $(mask "$v")"
  [ "${#v}" -ge 20 ] || die "$label が短すぎます: $(mask "$v")"
}

validate_token() {
  local label="$1" v="$2"
  [ -n "$v" ] || die "$label が空です (.env.secret を確認)"
  [[ "$v" =~ ^[A-Za-z0-9_.-]+$ ]] || die "$label の文字種が不正です: $(mask "$v")"
  [ "$(awk -F. '{print NF}' <<<"$v")" -eq 3 ] \
    || die "$label が JWT 形式 (3 セグメント) ではありません: $(mask "$v")"
  [ "${#v}" -ge 50 ] || die "$label が短すぎます: $(mask "$v")"
}

validate_url   TURSO_DATABASE_URL_STAGING    "$URL_STAGING"
validate_token TURSO_AUTH_TOKEN_STAGING      "$TOKEN_STAGING"
validate_url   TURSO_DATABASE_URL_PRODUCTION "$URL_PRODUCTION"
validate_token TURSO_AUTH_TOKEN_PRODUCTION   "$TOKEN_PRODUCTION"

ok "staging"
echo "    TURSO_DATABASE_URL_STAGING: $(mask "$URL_STAGING")"
echo "    TURSO_AUTH_TOKEN_STAGING:   $(mask "$TOKEN_STAGING")"
ok "production"
echo "    TURSO_DATABASE_URL_PRODUCTION: $(mask "$URL_PRODUCTION")"
echo "    TURSO_AUTH_TOKEN_PRODUCTION:   $(mask "$TOKEN_PRODUCTION")"

# ----------------------------------------------------------------------
# 6. 書き込みフェーズ (全データ揃ったので順に流す)
# ----------------------------------------------------------------------
step "Cloudflare Workers / GitHub Actions に登録"

# 引数: <wrangler_env> <url> <token>
register_env() {
  local wrangler_env="$1" url="$2" token="$3"

  echo
  echo "  --- ${wrangler_env} ---"

  echo "  -> wrangler secret put (Cloudflare)"
  printf %s "$url"   | pnpm wrangler secret put TURSO_DATABASE_URL --env "$wrangler_env" >/dev/null
  printf %s "$token" | pnpm wrangler secret put TURSO_AUTH_TOKEN   --env "$wrangler_env" >/dev/null

  echo "  -> gh: Environment ${wrangler_env} を作成 (冪等)"
  gh api --silent -X PUT "repos/{owner}/{repo}/environments/${wrangler_env}" >/dev/null

  echo "  -> gh secret set (GitHub Environment)"
  gh secret set TURSO_DATABASE_URL --env "$wrangler_env" --body "$url"
  gh secret set TURSO_AUTH_TOKEN   --env "$wrangler_env" --body "$token"
}

register_env staging    "$URL_STAGING"    "$TOKEN_STAGING"
register_env production "$URL_PRODUCTION" "$TOKEN_PRODUCTION"

# ----------------------------------------------------------------------
# 7. 残作業の案内
# ----------------------------------------------------------------------
cat <<EOF

============================================================
${GREEN}すべての自動登録が完了しました。${RESET}

最後にひとつだけ、GitHub の Repository secrets に手動で登録が必要です
(これらは CLI / API では発行できないため):

  1. Cloudflare ダッシュボードで API トークンを発行
     https://dash.cloudflare.com/profile/api-tokens
     → "Create Token" → "Edit Cloudflare Workers" テンプレート

  2. Cloudflare ダッシュボード右サイドバーの "Account ID" をコピー

  3. 下記コマンドでリポジトリに登録:

     gh secret set CLOUDFLARE_API_TOKEN  --body '<上で発行したトークン>'
     gh secret set CLOUDFLARE_ACCOUNT_ID --body '<アカウント ID>'

これが終われば、main / develop への push で自動デプロイが動きます。
============================================================
EOF

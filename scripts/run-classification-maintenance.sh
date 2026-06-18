#!/bin/zsh
set -euo pipefail

REPO_DIR="$(cd "$(dirname "$0")/.." && pwd)"
PAGES_PROJECT_NAME="${CF_PAGES_PROJECT_NAME:-cmi-map}"
PAGES_PRODUCTION_BRANCH="${CF_PAGES_PRODUCTION_BRANCH:-master}"

export PATH="/Users/andreas/.local/bin:/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin"

cd "$REPO_DIR"

set -a
source ./.env
if [[ -f ./.env.local ]]; then
  source ./.env.local
fi
set +a

auditOutput="$(node ./scripts/audit-all-recommendation-classifications.mjs --apply)"
echo "$auditOutput"

appliedUpdateCount="$(
  printf '%s' "$auditOutput" | node -e "
    const fs = require('node:fs');
    const input = fs.readFileSync(0, 'utf8');
    const match = input.match(/\\{[\\s\\S]*\\}\\s*$/);
    if (!match) process.exit(1);
    const summary = JSON.parse(match[0]);
    process.stdout.write(String(summary.appliedUpdateCount ?? 0));
  "
)"

npm run build

if [[ "$PAGES_PROJECT_NAME" == "cmi-map" && "${ALLOW_CMI_MAP_MAINTENANCE_PRODUCTION_DEPLOY:-0}" != "1" ]]; then
  echo "Production deployment skipped: set ALLOW_CMI_MAP_MAINTENANCE_PRODUCTION_DEPLOY=1 for an intentional cmimap.com deploy."
  exit 0
fi

if [[ "${FORCE_DEPLOY:-0}" != "1" && "$appliedUpdateCount" -eq 0 ]]; then
  echo "No classification updates applied; skipping Cloudflare production deployment."
  exit 0
fi

commitHash="$(git rev-parse HEAD)"
commitMessage="$(git log -1 --pretty=%s)"
deployWorktree="$(mktemp -d /tmp/cmi-map-classification-maintenance.XXXXXX)"
rmdir "$deployWorktree"

cleanup() {
  git worktree remove --force "$deployWorktree" >/dev/null 2>&1 || true
}
trap cleanup EXIT

git worktree add --detach "$deployWorktree" "$commitHash"

if [[ -d "$REPO_DIR/node_modules" ]]; then
  ln -s "$REPO_DIR/node_modules" "$deployWorktree/node_modules"
fi

(
  cd "$deployWorktree"
  set -a
  source "$REPO_DIR/.env"
  set +a
  npm run build
  npx wrangler pages deploy dist \
    --project-name "$PAGES_PROJECT_NAME" \
    --branch "$PAGES_PRODUCTION_BRANCH" \
    --commit-hash "$commitHash" \
    --commit-message "$commitMessage"
)

#!/bin/zsh
set -euo pipefail

cd "/Users/andreas/vibe coding/nomaday app!!/cmi map v1"

export PATH="/Users/andreas/.local/bin:/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin"

set -a
source ./.env
set +a

node ./scripts/audit-all-recommendation-classifications.mjs --apply
npm run build

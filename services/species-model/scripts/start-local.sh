#!/usr/bin/env bash
set -euo pipefail

SERVICE_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PORT="${PORT:-8000}"

cd "$SERVICE_DIR"

if [ ! -d .venv ]; then
  echo "还没有本地虚拟环境，先运行：services/species-model/scripts/bootstrap-local.sh"
  exit 1
fi

source .venv/bin/activate

export SPECIES_MODEL_TOKEN="${SPECIES_MODEL_TOKEN:-dev-token}"
export BIOCLIP_DEVICE="${BIOCLIP_DEVICE:-auto}"
export BIOCLIP_FALLBACK_MODE="${BIOCLIP_FALLBACK_MODE:-never}"
export BIOCLIP_PRELOAD="${BIOCLIP_PRELOAD:-1}"

echo "物种模型服务启动中：http://127.0.0.1:$PORT"
echo "本地测试 token：$SPECIES_MODEL_TOKEN"

exec uvicorn cmi_species_model.app:app --host 0.0.0.0 --port "$PORT"

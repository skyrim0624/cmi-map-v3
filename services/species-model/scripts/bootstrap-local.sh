#!/usr/bin/env bash
set -euo pipefail

SERVICE_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PYTHON_BIN="${PYTHON_BIN:-/opt/homebrew/bin/python3.12}"

cd "$SERVICE_DIR"

if [ ! -x "$PYTHON_BIN" ]; then
  echo "找不到 Python：$PYTHON_BIN"
  echo "请先安装 python@3.12，或设置 PYTHON_BIN=/path/to/python"
  exit 1
fi

"$PYTHON_BIN" -m venv .venv
source .venv/bin/activate
python -m pip install --upgrade pip
python -m pip install -r requirements.txt

echo "本地物种模型环境已准备好：$SERVICE_DIR/.venv"

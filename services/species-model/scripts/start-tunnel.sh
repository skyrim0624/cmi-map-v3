#!/usr/bin/env bash
set -euo pipefail

PORT="${PORT:-8000}"

if ! command -v cloudflared >/dev/null 2>&1; then
  echo "找不到 cloudflared，请先安装 Cloudflare Tunnel。"
  exit 1
fi

echo "正在把本机 http://127.0.0.1:$PORT 暴露为临时 HTTPS 地址。"
echo "复制输出里的 https://*.trycloudflare.com，并在末尾加 /identify。"

exec cloudflared tunnel --url "http://127.0.0.1:$PORT"

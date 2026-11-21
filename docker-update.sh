#!/usr/bin/env bash
# Build lại image và khởi động lại container sau khi sửa code.
# Dùng:
#   ./docker-update.sh            -> cập nhật cả backend + frontend
#   ./docker-update.sh backend    -> chỉ cập nhật backend
#   ./docker-update.sh frontend   -> chỉ cập nhật frontend
set -e
cd "$(dirname "$0")"

if docker compose version >/dev/null 2>&1; then
  COMPOSE="docker compose"
else
  COMPOSE="docker-compose"
fi

SERVICES="${*:-backend frontend}"

echo "==> Build lại: ${SERVICES}"
$COMPOSE build ${SERVICES}

echo "==> Khởi động lại: ${SERVICES}"
$COMPOSE up -d --no-deps ${SERVICES}

echo "==> Dọn image cũ không còn dùng..."
docker image prune -f >/dev/null

echo "==> Xong. Frontend: http://localhost:3010  |  Backend: http://localhost:4010"
$COMPOSE ps

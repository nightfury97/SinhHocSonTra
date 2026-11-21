#!/usr/bin/env bash
# Chạy đồng thời Backend (Express) và Frontend (Vite) cho dev.
set -e
cd "$(dirname "$0")"

if [ ! -d node_modules ]; then
  echo "==> Cài dependencies gốc (concurrently)..."
  npm install
fi

if [ ! -d BackEnd/node_modules ] || [ ! -d FrontEnd/node_modules ]; then
  echo "==> Cài dependencies cho BackEnd/FrontEnd..."
  npm run install:all
fi

if [ ! -f BackEnd/.env ]; then
  echo "==> Tạo BackEnd/.env từ .env.example..."
  cp BackEnd/.env.example BackEnd/.env
fi

if ! docker ps --format '{{.Names}}' 2>/dev/null | grep -q '^shared-mysql$'; then
  echo "==> CẢNH BÁO: container MySQL dùng chung 'shared-mysql' chưa chạy. Khởi động nó trước, hoặc sửa DATABASE_URL trong BackEnd/.env."
fi

echo "==> Chạy Backend (http://localhost:7000) + Frontend (http://localhost:5173)..."
exec npm run dev

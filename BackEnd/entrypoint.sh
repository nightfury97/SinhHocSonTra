#!/bin/sh
# Entry point for the container: wait for MySQL, run migrations, then start the app.
set -e

DB_HOST=${DB_HOST:-host.docker.internal}
DB_PORT=${DB_PORT:-3306}

echo "Waiting for database ${DB_HOST}:${DB_PORT}..."
until nc -z "$DB_HOST" "$DB_PORT" >/dev/null 2>&1; do
  echo "MySQL is unavailable - sleeping"
  sleep 1
done

echo "Database is up. Running migrations..."
npx prisma migrate deploy

exec node dist/server.js

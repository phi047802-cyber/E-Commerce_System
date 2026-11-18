#!/usr/bin/env sh
set -e
[ -f .env ] || cp .env.example .env
docker compose up -d mssql
npx prisma generate
node scripts/db/ensure-database.mjs
npx prisma migrate deploy
npm run prisma:seed
echo "Database ready."

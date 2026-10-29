#!/usr/bin/env bash
set -e

echo "========================================================"
echo " INSTASQUAD - Database Migration and Seed"
echo "========================================================"

if [ ! -f .env ]; then
    cp .env.example .env
fi

echo "[1/3] Generating Prisma Client..."
npx prisma generate

echo "[2/3] Applying Migrations..."
npx prisma migrate dev --name init

echo "[3/3] Seeding Initial Demo Data..."
npm run prisma:seed

echo "[DONE] Database setup completed successfully!"

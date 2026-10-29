#!/usr/bin/env bash
set -e

echo "========================================================"
echo " INSTASQUAD - 1-Click Startup (Linux / macOS)"
echo "========================================================"

if ! command -v node &> /dev/null; then
    echo "[ERROR] Node.js is not installed. Please install Node.js 18+."
    exit 1
fi

if [ ! -f .env ]; then
    echo "[SETUP] Copying .env.example to .env..."
    cp .env.example .env
fi

if [ ! -f prisma/dev.db ]; then
    echo "[SETUP] Database not found. Running setup..."
    npm run setup
fi

echo "[START] Starting Backend API and Frontend..."
npm run dev

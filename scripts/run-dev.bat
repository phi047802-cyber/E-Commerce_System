@echo off
echo ========================================================
echo  INSTASQUAD - 1-Click Startup for Windows
echo ========================================================
echo.

node -v >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Node.js is not installed or not in PATH! Please install Node.js 20+.
    pause
    exit /b 1
)

if not exist .env (
    echo [SETUP] .env file not found, creating from .env.example...
    copy .env.example .env
)

echo [DB] Ensuring SQL Server container is running...
call docker compose up -d mssql

if not exist node_modules\ goto first_setup
if not exist client\node_modules\ goto first_setup
call node scripts\db\ensure-database.mjs
call npx prisma migrate deploy
goto start

:first_setup
echo [SETUP] First run: installing packages, creating database, migrating and seeding...
call npm run setup
if %errorlevel% neq 0 (
    echo [ERROR] Setup failed. See messages above.
    pause
    exit /b 1
)

:start

echo.
echo [START] Starting Backend API and Frontend in parallel...
echo - Backend API:  http://localhost:4000
echo - Frontend Web: http://localhost:5173
echo.
npm run dev

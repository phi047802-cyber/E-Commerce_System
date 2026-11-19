@echo off
echo ========================================================
echo  INSTASQUAD - SQL Server Database Setup (D33)
echo ========================================================
if not exist .env copy .env.example .env
echo [1/4] Starting SQL Server container (skip if you use a local SQL Server)...
call docker compose up -d mssql
echo [2/4] Generating Prisma Client...
call npx prisma generate
echo [3/4] Creating database (if missing) and applying migrations...
call node scripts\db\ensure-database.mjs
call npx prisma migrate deploy
echo [4/4] Seeding demo data...
call npm run prisma:seed
echo [DONE] Database ready.

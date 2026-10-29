@echo off
echo ========================================================
echo  INSTASQUAD - Database Migration and Seed
echo ========================================================
echo.

if not exist .env (
    copy .env.example .env
)

echo [1/3] Generating Prisma Client...
call npx prisma generate

echo [2/3] Applying Migrations...
call npx prisma migrate dev --name init

echo [3/3] Seeding Initial Demo Data...
call npm run prisma:seed

echo.
echo [DONE] Database setup completed successfully!
pause

@echo off
REM Run Production Seeding Script for Windows
REM
REM This script seeds the production database with:
REM - Test users (admin, manager, worker)
REM - Default sites
REM - Legislation references
REM - Safety moments

setlocal enabledelayedexpansion

set "PROD_DB_URL=%1"

if "!PROD_DB_URL!"=="" (
  echo.
  echo ❌ ERROR: Production database URL required
  echo.
  echo Usage:
  echo   seed-production.bat "postgresql://user:pass@host:5432/dbname"
  echo.
  echo To get the URL:
  echo   1. Go to https://railway.app
  echo   2. Open your EHS Portal project
  echo   3. Click 'Database' service
  echo   4. Copy the PostgreSQL connection string
  echo.
  exit /b 1
)

echo.
echo 🚀 Starting production database seeding...
echo.

cd /d "%~dp0\.."
node seeds/seed-production.js "!PROD_DB_URL!"

if !errorlevel! equ 0 (
  echo.
  echo ✅ Seeding completed successfully!
  echo.
) else (
  echo.
  echo ❌ Seeding failed with error code !errorlevel!
  echo.
  exit /b !errorlevel!
)

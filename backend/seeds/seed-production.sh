#!/bin/bash
# Run Production Seeding Script
# 
# This script seeds the production database with:
# - Test users (admin, manager, worker)
# - Default sites
# - Legislation references
# - Safety moments

# Get the production database URL from Railway
# Steps to get it:
# 1. Go to https://railway.app
# 2. Open EHS Portal project
# 3. Click "Database" service
# 4. Copy the connection string from the "Connect" tab

PROD_DB_URL="$1"

if [ -z "$PROD_DB_URL" ]; then
  echo "❌ ERROR: Production database URL required"
  echo ""
  echo "Usage:"
  echo "  ./seed-production.sh \"postgresql://user:pass@host:5432/dbname\""
  echo ""
  echo "To get the URL:"
  echo "  1. Go to https://railway.app"
  echo "  2. Open your EHS Portal project"
  echo "  3. Click 'Database' service"
  echo "  4. Copy the PostgreSQL connection string"
  exit 1
fi

echo "🚀 Starting production database seeding..."
cd "$(dirname "$0")/.."
node seeds/seed-production.js "$PROD_DB_URL"

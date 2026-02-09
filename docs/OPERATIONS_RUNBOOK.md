# Operations Runbook - EHS Portal

## Overview

This runbook provides instructions for operating and maintaining the EHS Portal application in development and production environments.

---

## 1. Application Architecture

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│                 │     │                 │     │                 │
│    Frontend     │────▶│    Backend      │────▶│   PostgreSQL    │
│  (React/Vite)   │     │  (Express.js)   │     │    Database     │
│   Port: 5173    │     │   Port: 3001    │     │   Port: 5432    │
│                 │     │                 │     │                 │
└─────────────────┘     └─────────────────┘     └─────────────────┘
```

---

## 2. Directory Structure

```
CLAUDE/
├── backend/
│   ├── src/
│   │   ├── config/         # Database and environment config
│   │   ├── middleware/     # Auth and role middleware
│   │   ├── routes/         # API route handlers
│   │   └── utils/          # Utility functions
│   ├── migrations/         # Database migrations
│   ├── seeds/              # Seed data scripts
│   ├── tests/              # Backend tests
│   ├── uploads/            # File upload storage
│   └── .env                # Environment variables
├── frontend/
│   ├── src/
│   │   ├── api/            # API client
│   │   ├── auth/           # Authentication context
│   │   ├── components/     # Reusable components
│   │   ├── pages/          # Page components
│   │   ├── styles/         # CSS styles
│   │   └── tests/          # Frontend tests
│   └── vite.config.js      # Vite configuration
└── docs/                   # Documentation
```

---

## 3. Starting the Application

### 3.1 Prerequisites

Ensure the following are installed:
- Node.js v18+
- PostgreSQL 14+
- npm or yarn

### 3.2 Start Database

```bash
# Start PostgreSQL service (Windows)
net start postgresql-x64-14

# Or on macOS/Linux
sudo systemctl start postgresql
# or
brew services start postgresql
```

### 3.3 Start Backend Server

```bash
cd CLAUDE/backend

# Install dependencies (first time only)
npm install

# Start the server
npm start
```

**Expected output:**
```
API listening on port 3001
```

### 3.4 Start Frontend Server

```bash
cd CLAUDE/frontend

# Install dependencies (first time only)
npm install

# Start the dev server
npm run dev
```

**Expected output:**
```
VITE v5.x.x ready in xxx ms
➜ Local: http://localhost:5173/
```

### 3.5 Verify Application

1. Open browser to http://localhost:5173
2. Login with: admin@ehs.local / Admin123!
3. Verify Dashboard loads

---

## 4. Stopping the Application

### 4.1 Stop Frontend

Press `Ctrl+C` in the frontend terminal.

### 4.2 Stop Backend

Press `Ctrl+C` in the backend terminal.

### 4.3 Kill Stuck Processes (Windows)

If the backend port is stuck:

```bash
# Find process using port 3001
netstat -ano | findstr :3001

# Kill the process (replace PID with actual number)
taskkill /F /PID <PID>
```

### 4.4 Kill Stuck Processes (macOS/Linux)

```bash
# Find and kill process on port 3001
lsof -ti:3001 | xargs kill -9

# Or for port 5173
lsof -ti:5173 | xargs kill -9
```

---

## 5. Database Operations

### 5.1 Run Migrations

Migrations create the database schema:

```bash
cd CLAUDE/backend

# Run all migrations
npm run migrate
```

### 5.2 Run Seeds

Seeds populate initial test data:

```bash
cd CLAUDE/backend

# Seed the database
npm run seed
```

This creates:
- 3 users (admin, manager, worker)
- 3 sites (Head Office, Warehouse 1, Distribution Center)
- 5 incident types (Injury, Near Miss, Property Damage, Environmental, Other)

### 5.3 Reset Database

To completely reset the database:

```bash
# Connect to PostgreSQL
psql -U postgres

# Drop and recreate database
DROP DATABASE ehs_portal;
CREATE DATABASE ehs_portal;
\q

# Run migrations and seeds
cd CLAUDE/backend
npm run migrate
npm run seed
```

### 5.4 Database Connection

Connection details are in `backend/.env`:

```
DB_HOST=localhost
DB_PORT=5432
DB_NAME=ehs_portal
DB_USER=postgres
DB_PASSWORD=your_password
```

Or use a connection string:
```
DATABASE_URL=postgresql://postgres:password@localhost:5432/ehs_portal
```

---

## 6. Running Tests

### 6.1 Backend Tests

```bash
cd CLAUDE/backend

# Run all tests
npm test

# Run with coverage
npm run test:coverage

# Run specific test file
npm test -- tests/incidents.test.js
```

**Expected:** 62 tests passing

### 6.2 Frontend Tests

```bash
cd CLAUDE/frontend

# Run all tests
npm test

# Run in watch mode
npm run test:watch
```

**Expected:** 33 tests passing

---

## 7. Environment Configuration

### 7.1 Backend Environment Variables

File: `backend/.env`

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | Backend server port | 3001 |
| `DATABASE_URL` | PostgreSQL connection string | - |
| `DB_HOST` | Database host | localhost |
| `DB_PORT` | Database port | 5432 |
| `DB_NAME` | Database name | ehs_portal |
| `DB_USER` | Database user | postgres |
| `DB_PASSWORD` | Database password | - |
| `JWT_SECRET` | Secret for JWT signing | - |
| `JWT_EXPIRES_IN` | Token expiration | 8h |
| `CORS_ORIGIN` | Allowed CORS origin | http://localhost:5173 |
| `UPLOAD_DIR` | File upload directory | ./uploads |
| `MAX_FILE_SIZE` | Max upload size (bytes) | 10485760 (10MB) |

### 7.2 Frontend Environment Variables

File: `frontend/.env` (optional)

| Variable | Description | Default |
|----------|-------------|---------|
| `VITE_API_URL` | Backend API URL | http://localhost:3001/api |

---

## 8. Troubleshooting

### 8.1 Backend Won't Start

**Error:** `EADDRINUSE: address already in use :::3001`

**Solution:** Kill the process using the port (see section 4.3/4.4)

### 8.2 Database Connection Failed

**Error:** `ECONNREFUSED` or `connection refused`

**Solutions:**
1. Ensure PostgreSQL is running
2. Check credentials in `.env`
3. Verify database exists: `psql -l`

### 8.3 CORS Errors

**Error:** `Access-Control-Allow-Origin` errors in browser console

**Solutions:**
1. Ensure `CORS_ORIGIN` in backend `.env` matches frontend URL
2. Restart backend after changing `.env`

### 8.4 Login Fails

**Error:** Invalid credentials or server error

**Solutions:**
1. Ensure database is seeded: `npm run seed`
2. Check backend logs for errors
3. Verify backend is running on port 3001

### 8.5 File Upload Fails

**Error:** Upload rejected or timeout

**Solutions:**
1. Check file size (max 10MB)
2. Check file type (images, PDFs, documents)
3. Ensure `uploads/` directory exists and is writable

---

## 9. Log Files

### 9.1 Backend Logs

Backend logs to console (stdout/stderr). In development, errors are displayed with stack traces.

### 9.2 Database Logs

PostgreSQL logs location:
- **Windows:** `C:\Program Files\PostgreSQL\14\data\log\`
- **macOS:** `/usr/local/var/log/postgresql.log`
- **Linux:** `/var/log/postgresql/`

---

## 10. Backup & Recovery

### 10.1 Database Backup

```bash
# Create backup
pg_dump -U postgres ehs_portal > backup_$(date +%Y%m%d).sql

# Or with compression
pg_dump -U postgres -Fc ehs_portal > backup_$(date +%Y%m%d).dump
```

### 10.2 Database Restore

```bash
# Restore from SQL file
psql -U postgres ehs_portal < backup_20240115.sql

# Restore from dump file
pg_restore -U postgres -d ehs_portal backup_20240115.dump
```

### 10.3 Attachments Backup

Back up the `backend/uploads/` directory:

```bash
cp -r backend/uploads/ /backup/uploads_$(date +%Y%m%d)/
```

---

## 11. Health Checks

### 11.1 Quick Health Check

```bash
# Check backend
curl http://localhost:3001/api/sites

# Check frontend
curl http://localhost:5173
```

### 11.2 Full System Check

1. Backend responds to API calls
2. Frontend loads in browser
3. Login works with test credentials
4. Can create an incident
5. Database queries execute successfully

---

## 12. Docker Deployment

### 12.1 Prerequisites

- Docker Engine 20.10+
- Docker Compose v2.0+

### 12.2 Build and Start All Services

```bash
cd CLAUDE

# Build all images
docker-compose build

# Start all services (detached)
docker-compose up -d

# Or start with build in one command
docker-compose up -d --build
```

**Services started:**
- `ehs-db` - PostgreSQL database on port 5432
- `ehs-backend` - Express API on port 3001
- `ehs-frontend` - Nginx serving React app on port 8080

### 12.3 Access the Application

Open browser to: **http://localhost:8080**

### 12.4 View Logs

```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f backend
docker-compose logs -f frontend
docker-compose logs -f db
```

### 12.5 Stop Services

```bash
# Stop all services
docker-compose down

# Stop and remove volumes (WARNING: deletes data)
docker-compose down -v
```

### 12.6 Run Migrations in Docker

```bash
# Execute migration in backend container
docker-compose exec backend npm run migrate

# Seed the database
docker-compose exec backend npm run seed
```

### 12.7 Shell Access

```bash
# Backend container
docker-compose exec backend sh

# Database container
docker-compose exec db psql -U postgres -d ehs_portal
```

### 12.8 Rebuild After Code Changes

```bash
# Rebuild specific service
docker-compose build backend
docker-compose up -d backend

# Or rebuild all
docker-compose up -d --build
```

### 12.9 Production Considerations

For production deployment:

1. **Change JWT_SECRET** - Use a strong random secret
2. **Change database password** - Update POSTGRES_PASSWORD and DB_PASSWORD
3. **Use external database** - Consider managed PostgreSQL (RDS, Cloud SQL)
4. **Add SSL/TLS** - Use a reverse proxy with HTTPS
5. **Set resource limits** - Add memory/CPU limits to containers
6. **Use secrets management** - Docker secrets or environment injection

---

## 13. Contact & Escalation

| Issue Type | Contact |
|------------|---------|
| Application bugs | Development team |
| Database issues | DBA team |
| Infrastructure | Operations team |
| Security incidents | Security team |

---

## Document History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2024-01-XX | Dev Team | Initial version |

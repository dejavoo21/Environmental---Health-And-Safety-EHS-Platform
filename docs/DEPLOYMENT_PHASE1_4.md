# Deployment Guide - EHS Portal (Phases 1-4)

| Document Version | 1.0 |
|------------------|-----|
| Author | Solution Architect |
| Date | 2026-02-01 |
| Phase Coverage | 1-4 (Complete System) |

---

## Table of Contents

1. [Architecture Overview](#1-architecture-overview)
2. [Environment Layouts](#2-environment-layouts)
3. [Prerequisites](#3-prerequisites)
4. [Environment Variables](#4-environment-variables)
5. [Non-Docker Deployment](#5-non-docker-deployment)
6. [Docker-Based Deployment](#6-docker-based-deployment)
7. [Database Setup](#7-database-setup)
8. [Operational Concerns](#8-operational-concerns)
9. [Monitoring & Health Checks](#9-monitoring--health-checks)
10. [Backup & Restore](#10-backup--restore)
11. [Troubleshooting](#11-troubleshooting)
12. [Recommended Production Setup](#12-recommended-production-setup)

---

## 1. Architecture Overview

### Components

```
┌─────────────────────────────────────────────────────────────┐
│                      Load Balancer / CDN                     │
│                   (Optional: Cloudflare, AWS ELB)            │
└─────────────────────────────────────────────────────────────┘
                              │
                ┌─────────────┴─────────────┐
                │                           │
    ┌───────────▼──────────┐    ┌──────────▼─────────┐
    │   Web Server (Nginx) │    │  SMTP Server       │
    │   - Serves static    │    │  (Email delivery)  │
    │   - Reverse proxy    │    │                    │
    │   - SSL termination  │    └────────────────────┘
    └──────────┬───────────┘
               │
    ┌──────────▼───────────┐
    │  React Frontend      │
    │  (Static files)      │
    │  - Vite build output │
    └──────────┬───────────┘
               │
    ┌──────────▼───────────┐
    │  Node.js Backend     │
    │  - Express API       │
    │  - JWT auth          │
    │  - Scheduled jobs    │
    │  - File uploads      │
    └──────────┬───────────┘
               │
    ┌──────────▼───────────┐
    │  PostgreSQL Database │
    │  - Main data store   │
    │  - Migration scripts │
    └──────────────────────┘
```

### Technology Stack

| Component | Technology | Version |
|-----------|------------|---------|
| **Frontend** | React + Vite | React 19.2.0 |
| **Backend** | Node.js + Express | Node 18+ |
| **Database** | PostgreSQL | 14+ |
| **Authentication** | JWT + bcrypt | - |
| **Email** | Nodemailer | 7.0+ |
| **Scheduled Jobs** | node-cron | 3.0+ |
| **File Storage** | Filesystem (uploads directory) | - |

### Ports

| Service | Default Port | Configurable Via |
|---------|--------------|------------------|
| Frontend (dev) | 3000 | Vite config |
| Backend API | 3001 | `PORT` env var |
| PostgreSQL | 5432 | `DB_PORT` env var |
| Nginx (if used) | 80/443 | Nginx config |

---

## 2. Environment Layouts

### Local Development

```
Developer Machine
├── PostgreSQL (localhost:5432)
├── Backend (localhost:3001) - npm run dev
└── Frontend (localhost:3000) - npm run dev
```

**Characteristics:**
- Hot reload enabled
- CORS configured for `http://localhost:3000`
- Test database
- Scheduled jobs disabled (`JOBS_ENABLED=false`)

### Staging / UAT

```
Staging Server
├── PostgreSQL (staging-db.internal:5432)
├── Backend (staging-api.example.com) - PM2 / systemd
└── Frontend (staging.example.com) - Nginx serving static build
```

**Characteristics:**
- Production-like configuration
- Separate database from production
- Scheduled jobs enabled with reduced frequency
- Test SMTP server or email sandbox (e.g., Mailtrap)

### Production

```
Production Server(s)
├── PostgreSQL (prod-db.internal:5432 or RDS/managed)
├── Backend (api.example.com) - PM2 / systemd + clustering
├── Frontend (app.example.com) - Nginx + CDN
└── File Storage (uploads volume or S3)
```

**Characteristics:**
- SSL/TLS enforced
- Database replication/backups
- Scheduled jobs enabled
- Real SMTP service (SendGrid, AWS SES, etc.)
- Logging to centralized system (e.g., CloudWatch, ELK)

---

## 3. Prerequisites

### Server Requirements

**Minimum (Small deployment - <100 users):**
- CPU: 2 cores
- RAM: 4 GB
- Disk: 50 GB SSD
- OS: Ubuntu 20.04+ / Amazon Linux 2

**Recommended (Medium deployment - 100-500 users):**
- CPU: 4 cores
- RAM: 8 GB
- Disk: 100 GB SSD
- OS: Ubuntu 22.04 LTS

### Software Dependencies

| Software | Version | Installation |
|----------|---------|--------------|
| Node.js | 18.x or 20.x LTS | `curl -fsSL https://deb.nodesource.com/setup_20.x \| sudo -E bash - && sudo apt-get install -y nodejs` |
| PostgreSQL | 14+ | `sudo apt-get install postgresql postgresql-contrib` |
| Nginx (optional) | 1.18+ | `sudo apt-get install nginx` |
| PM2 (process manager) | Latest | `sudo npm install -g pm2` |
| Git | 2.x | `sudo apt-get install git` |

### Third-Party Services

| Service | Purpose | Examples |
|---------|---------|----------|
| **SMTP Provider** | Email delivery (notifications, digests) | SendGrid, AWS SES, Mailgun, Gmail (dev only) |
| **SSL Certificate** | HTTPS | Let's Encrypt, AWS ACM, commercial CA |
| **Domain Name** | DNS | Namecheap, Route 53, CloudFlare |
| **Backup Storage** | Off-site backups | AWS S3, Azure Blob, Backblaze B2 |

---

## 4. Environment Variables

### Backend Environment Variables

Create a `.env` file in the `backend/` directory:

```bash
# ============================================
# Core Configuration
# ============================================
PORT=3001
NODE_ENV=production

# ============================================
# Database Configuration
# ============================================
# Option 1: Connection string (preferred)
DATABASE_URL=postgresql://user:password@localhost:5432/ehs_portal

# Option 2: Individual parameters (alternative)
DB_HOST=localhost
DB_PORT=5432
DB_NAME=ehs_portal
DB_USER=ehs_user
DB_PASSWORD=your_secure_password_here

# ============================================
# Authentication
# ============================================
JWT_SECRET=your_very_long_random_secret_key_min_32_chars
JWT_EXPIRES_IN=12h

# ============================================
# CORS Configuration
# ============================================
# Frontend URL (production domain)
CORS_ORIGIN=https://app.example.com

# ============================================
# File Uploads (Phase 3)
# ============================================
UPLOADS_DIR=uploads
LOGO_MAX_SIZE_BYTES=2097152
LOGO_ALLOWED_TYPES=image/png,image/jpeg,image/svg+xml

# ============================================
# Export/Reporting (Phase 3)
# ============================================
EXPORT_ROW_LIMIT=10000
EXPORT_RATE_LIMIT_SECONDS=30

# ============================================
# SMTP Configuration (Phase 4)
# ============================================
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=apikey
SMTP_PASS=your_sendgrid_api_key
SMTP_FROM=noreply@example.com

# ============================================
# Notifications (Phase 4)
# ============================================
NOTIFICATION_RETENTION_DAYS=90
DIGEST_DEFAULT_TIME=07:00
DIGEST_DEFAULT_DAY_OF_WEEK=1
ESCALATION_DEFAULT_DAYS=3
EMAIL_MAX_RETRY_ATTEMPTS=3

# ============================================
# Scheduled Jobs (Phase 4)
# ============================================
JOBS_ENABLED=true
CRON_DAILY_DIGEST=0 7 * * *
CRON_WEEKLY_DIGEST=0 7 * * 1
CRON_ESCALATION=0 8 * * *
CRON_EMAIL_RETRY=*/15 * * * *
CRON_CLEANUP=0 2 * * *
```

### Frontend Environment Variables

Create a `.env` file in the `frontend/` directory:

```bash
# API URL (backend endpoint)
VITE_API_URL=https://api.example.com/api
```

**Note:** Vite only exposes variables prefixed with `VITE_` to the client.

### Environment Variable Reference

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| **Core** ||||
| `PORT` | No | `3001` | Backend server port |
| `NODE_ENV` | No | `development` | Environment (`development`, `production`, `test`) |
| **Database** ||||
| `DATABASE_URL` | Yes* | - | Full PostgreSQL connection string |
| `DB_HOST` | Yes* | `localhost` | Database host |
| `DB_PORT` | No | `5432` | Database port |
| `DB_NAME` | Yes* | `ehs_portal` | Database name |
| `DB_USER` | Yes* | `postgres` | Database user |
| `DB_PASSWORD` | Yes* | - | Database password |
| **Auth** ||||
| `JWT_SECRET` | **Yes** | - | Secret key for JWT signing (min 32 chars) |
| `JWT_EXPIRES_IN` | No | `12h` | JWT token expiration |
| `CORS_ORIGIN` | **Yes** | `http://localhost:3000` | Frontend URL for CORS |
| **SMTP** ||||
| `SMTP_HOST` | **Yes** | - | SMTP server hostname |
| `SMTP_PORT` | No | `587` | SMTP port |
| `SMTP_SECURE` | No | `false` | Use TLS (set `true` for port 465) |
| `SMTP_USER` | **Yes** | - | SMTP username |
| `SMTP_PASS` | **Yes** | - | SMTP password/API key |
| `SMTP_FROM` | **Yes** | - | From email address |
| **Jobs** ||||
| `JOBS_ENABLED` | No | `true` | Enable/disable scheduled jobs |

---

## 5. Non-Docker Deployment

### 5.1 Database Setup

1. **Install PostgreSQL:**
   ```bash
   sudo apt-get update
   sudo apt-get install postgresql postgresql-contrib
   ```

2. **Create database and user:**
   ```bash
   sudo -u postgres psql
   ```

   In psql:
   ```sql
   CREATE DATABASE ehs_portal;
   CREATE USER ehs_user WITH ENCRYPTED PASSWORD 'your_secure_password';
   GRANT ALL PRIVILEGES ON DATABASE ehs_portal TO ehs_user;
   \q
   ```

3. **Configure PostgreSQL for remote connections (if needed):**
   Edit `/etc/postgresql/14/main/postgresql.conf`:
   ```
   listen_addresses = 'localhost'  # or '*' for all interfaces
   ```

   Edit `/etc/postgresql/14/main/pg_hba.conf`:
   ```
   host    ehs_portal    ehs_user    127.0.0.1/32    md5
   ```

   Restart PostgreSQL:
   ```bash
   sudo systemctl restart postgresql
   ```

### 5.2 Backend Deployment

1. **Clone repository:**
   ```bash
   cd /opt
   sudo git clone https://github.com/your-org/ehs-portal.git
   cd ehs-portal/CLAUDE/backend
   ```

2. **Install dependencies:**
   ```bash
   npm install --production
   ```

3. **Create .env file:**
   ```bash
   sudo nano .env
   # Paste production environment variables (see section 4)
   ```

4. **Run database migrations:**
   ```bash
   npm run migrate
   ```

5. **Seed initial data (optional):**
   ```bash
   npm run seed
   ```

6. **Test the server:**
   ```bash
   npm start
   # Should start on port 3001
   ```

7. **Set up PM2 for process management:**
   ```bash
   sudo npm install -g pm2
   pm2 start src/index.js --name ehs-backend
   pm2 save
   pm2 startup
   # Follow instructions to enable PM2 on boot
   ```

8. **Configure PM2 ecosystem file (recommended):**
   Create `ecosystem.config.js`:
   ```javascript
   module.exports = {
     apps: [{
       name: 'ehs-backend',
       script: './src/index.js',
       instances: 2,  // Use 2 instances for load balancing
       exec_mode: 'cluster',
       env: {
         NODE_ENV: 'production'
       },
       error_file: '/var/log/ehs-portal/backend-error.log',
       out_file: '/var/log/ehs-portal/backend-out.log',
       log_date_format: 'YYYY-MM-DD HH:mm:ss Z'
     }]
   };
   ```

   Start with ecosystem:
   ```bash
   pm2 start ecosystem.config.js
   ```

### 5.3 Frontend Deployment

1. **Build the frontend:**
   ```bash
   cd /opt/ehs-portal/CLAUDE/frontend
   npm install
   npm run build
   # Creates dist/ directory with static files
   ```

2. **Option A: Serve via Nginx (Recommended)**

   Install Nginx:
   ```bash
   sudo apt-get install nginx
   ```

   Create Nginx configuration (`/etc/nginx/sites-available/ehs-portal`):
   ```nginx
   server {
       listen 80;
       server_name app.example.com;

       # Redirect to HTTPS
       return 301 https://$host$request_uri;
   }

   server {
       listen 443 ssl http2;
       server_name app.example.com;

       # SSL certificates (Let's Encrypt)
       ssl_certificate /etc/letsencrypt/live/app.example.com/fullchain.pem;
       ssl_certificate_key /etc/letsencrypt/live/app.example.com/privkey.pem;

       # Frontend static files
       root /opt/ehs-portal/CLAUDE/frontend/dist;
       index index.html;

       # Gzip compression
       gzip on;
       gzip_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss text/javascript;

       # React Router: serve index.html for all routes
       location / {
           try_files $uri $uri/ /index.html;
       }

       # Proxy API requests to backend
       location /api {
           proxy_pass http://localhost:3001;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection 'upgrade';
           proxy_set_header Host $host;
           proxy_set_header X-Real-IP $remote_addr;
           proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
           proxy_set_header X-Forwarded-Proto $scheme;
           proxy_cache_bypass $http_upgrade;
       }

       # Serve uploaded files (logos, attachments)
       location /uploads {
           alias /opt/ehs-portal/CLAUDE/backend/uploads;
           expires 7d;
           add_header Cache-Control "public, immutable";
       }

       # Security headers
       add_header X-Frame-Options "SAMEORIGIN" always;
       add_header X-Content-Type-Options "nosniff" always;
       add_header X-XSS-Protection "1; mode=block" always;
       add_header Referrer-Policy "no-referrer-when-downgrade" always;
   }
   ```

   Enable the site:
   ```bash
   sudo ln -s /etc/nginx/sites-available/ehs-portal /etc/nginx/sites-enabled/
   sudo nginx -t
   sudo systemctl reload nginx
   ```

3. **Option B: Serve via Backend (Simple, Single Server)**

   Update `backend/src/index.js` to serve static files:
   ```javascript
   // Add after other middleware
   app.use(express.static(path.join(__dirname, '../../frontend/dist')));

   // Add catch-all for React Router (after API routes)
   app.get('*', (req, res) => {
     res.sendFile(path.join(__dirname, '../../frontend/dist/index.html'));
   });
   ```

   Update `.env`:
   ```bash
   CORS_ORIGIN=https://app.example.com
   ```

### 5.4 SSL/TLS Setup

Using **Let's Encrypt** (free):

```bash
sudo apt-get install certbot python3-certbot-nginx
sudo certbot --nginx -d app.example.com -d api.example.com
```

Certbot will automatically:
- Obtain SSL certificates
- Configure Nginx
- Set up auto-renewal

---

## 6. Docker-Based Deployment

### 6.1 Docker Compose Architecture

**Proposed file:** `docker-compose.yml`

```yaml
version: '3.8'

services:
  # PostgreSQL Database
  db:
    image: postgres:14-alpine
    container_name: ehs-db
    restart: unless-stopped
    environment:
      POSTGRES_DB: ehs_portal
      POSTGRES_USER: ehs_user
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    volumes:
      - db-data:/var/lib/postgresql/data
      - ./backend/migrations:/docker-entrypoint-initdb.d
    ports:
      - "5432:5432"
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ehs_user"]
      interval: 10s
      timeout: 5s
      retries: 5

  # Backend API
  backend:
    build:
      context: ./CLAUDE/backend
      dockerfile: Dockerfile
    container_name: ehs-backend
    restart: unless-stopped
    depends_on:
      db:
        condition: service_healthy
    environment:
      NODE_ENV: production
      PORT: 3001
      DATABASE_URL: postgresql://ehs_user:${DB_PASSWORD}@db:5432/ehs_portal
      JWT_SECRET: ${JWT_SECRET}
      CORS_ORIGIN: ${FRONTEND_URL}
      SMTP_HOST: ${SMTP_HOST}
      SMTP_PORT: ${SMTP_PORT}
      SMTP_USER: ${SMTP_USER}
      SMTP_PASS: ${SMTP_PASS}
      SMTP_FROM: ${SMTP_FROM}
      JOBS_ENABLED: ${JOBS_ENABLED:-true}
    volumes:
      - uploads:/app/uploads
      - ./backend/logs:/app/logs
    ports:
      - "3001:3001"
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3001/health"]
      interval: 30s
      timeout: 10s
      retries: 3

  # Frontend (Nginx serving static build)
  frontend:
    build:
      context: ./CLAUDE/frontend
      dockerfile: Dockerfile
    container_name: ehs-frontend
    restart: unless-stopped
    depends_on:
      - backend
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx/nginx.conf:/etc/nginx/nginx.conf:ro
      - ./nginx/ssl:/etc/nginx/ssl:ro
    environment:
      API_URL: http://backend:3001

volumes:
  db-data:
  uploads:
```

### 6.2 Dockerfile Examples

**Backend Dockerfile** (`CLAUDE/backend/Dockerfile`):

```dockerfile
FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy application code
COPY . .

# Create uploads directory
RUN mkdir -p uploads

# Expose port
EXPOSE 3001

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3001/health', (r) => {if (r.statusCode !== 200) throw new Error(r.statusCode)})"

# Run migrations on startup (or use separate init container)
CMD ["sh", "-c", "npm run migrate && npm start"]
```

**Frontend Dockerfile** (`CLAUDE/frontend/Dockerfile`):

```dockerfile
# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

# Production stage
FROM nginx:alpine

# Copy built files
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy nginx config
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
```

### 6.3 Secrets Management

**Option 1: .env file (Development/Staging)**

Create `.env` in the root directory:
```bash
DB_PASSWORD=your_secure_password
JWT_SECRET=your_jwt_secret_min_32_chars
SMTP_HOST=smtp.sendgrid.net
SMTP_USER=apikey
SMTP_PASS=your_api_key
SMTP_FROM=noreply@example.com
FRONTEND_URL=https://app.example.com
```

**Option 2: Docker Secrets (Production)**

```yaml
secrets:
  db_password:
    file: ./secrets/db_password.txt
  jwt_secret:
    file: ./secrets/jwt_secret.txt
  smtp_pass:
    file: ./secrets/smtp_pass.txt

services:
  backend:
    secrets:
      - db_password
      - jwt_secret
      - smtp_pass
    environment:
      DB_PASSWORD_FILE: /run/secrets/db_password
      JWT_SECRET_FILE: /run/secrets/jwt_secret
      SMTP_PASS_FILE: /run/secrets/smtp_pass
```

**Option 3: AWS Secrets Manager / HashiCorp Vault**

Use environment variable injection at runtime.

---

## 7. Database Setup

### 7.1 Initial Setup

1. **Create database:**
   ```sql
   CREATE DATABASE ehs_portal;
   CREATE USER ehs_user WITH ENCRYPTED PASSWORD 'password';
   GRANT ALL PRIVILEGES ON DATABASE ehs_portal TO ehs_user;
   ```

2. **Run migrations:**
   ```bash
   cd backend
   npm run migrate
   ```

   This runs all migration files in order:
   - `001_initial_schema.sql` (Phase 1)
   - `002_phase2_actions_attachments.sql` (Phase 2)
   - `003_phase3_multitenancy.sql` (Phase 3)
   - `004_phase4_notifications.sql` (Phase 4)

3. **Seed initial data (optional):**
   ```bash
   npm run seed  # Creates default users, sites, incident types
   ```

### 7.2 Migration Script

The `scripts/migrate.js` file:
- Reads all `.sql` files from `migrations/` directory
- Executes them in order
- Creates a `schema_migrations` table to track applied migrations
- Idempotent (safe to run multiple times)

### 7.3 Database Backup

**Manual backup:**
```bash
pg_dump -h localhost -U ehs_user -d ehs_portal -F c -b -v -f ehs_portal_backup.dump
```

**Automated daily backup (cron):**
```bash
# Add to crontab (crontab -e)
0 2 * * * pg_dump -h localhost -U ehs_user -d ehs_portal -F c -b -f /backups/ehs_portal_$(date +\%Y\%m\%d).dump
```

**Backup to S3:**
```bash
pg_dump -h localhost -U ehs_user -d ehs_portal -F c -b | aws s3 cp - s3://your-bucket/backups/ehs_portal_$(date +\%Y\%m\%d).dump
```

### 7.4 Database Restore

```bash
pg_restore -h localhost -U ehs_user -d ehs_portal -v ehs_portal_backup.dump
```

---

## 8. Operational Concerns

### 8.1 Scheduled Jobs (Phase 4)

The backend runs scheduled jobs via **node-cron**:

| Job | Schedule | Purpose |
|-----|----------|---------|
| Daily Digest | `0 7 * * *` (7 AM daily) | Email users with daily notifications |
| Weekly Digest | `0 7 * * 1` (7 AM Mondays) | Email users with weekly summary |
| Escalation | `0 8 * * *` (8 AM daily) | Escalate overdue actions |
| Email Retry | `*/15 * * * *` (Every 15 min) | Retry failed email deliveries |
| Cleanup | `0 2 * * *` (2 AM daily) | Delete expired notifications/logs |

**Job Management:**

- Jobs start automatically when the backend starts if `JOBS_ENABLED=true`
- Jobs run in the Node.js process (single instance recommended for jobs to avoid duplication)
- For multi-instance deployments:
  - Option 1: Designate one instance as "job runner" (`JOBS_ENABLED=true`) and disable on others
  - Option 2: Use external scheduler (AWS EventBridge, Kubernetes CronJob) to call `/admin/jobs/digest/trigger`

**Graceful Shutdown:**

The backend handles `SIGTERM` and `SIGINT` signals to:
- Stop accepting new requests
- Finish processing current requests
- Stop cron jobs
- Close database connections

### 8.2 File Uploads

**Storage:**
- Attachments: `backend/uploads/attachments/`
- Logos: `backend/uploads/logos/`

**Size Limits:**
- Logos: 2 MB (configurable via `LOGO_MAX_SIZE_BYTES`)
- Attachments: 10 MB (hardcoded in `attachmentRoutes.js`)

**Backup:**
- Include `uploads/` directory in backup strategy
- For cloud deployments, consider using S3/Azure Blob Storage

**Cleanup:**
- Orphaned files (deleted records) are NOT automatically removed
- Implement periodic cleanup script if needed

### 8.3 Logging

**Backend Logs:**

- **Console output:** Captured by PM2 or Docker
- **Request logging:** Every API request logged (method, path, status, duration)
- **Error logging:** Uncaught errors logged with stack traces

**Log Rotation (PM2):**

PM2 log rotation module:
```bash
pm2 install pm2-logrotate
pm2 set pm2-logrotate:max_size 10M
pm2 set pm2-logrotate:retain 7
```

**Centralized Logging (Production):**

- Forward logs to CloudWatch, ELK, Splunk, or Datadog
- Use structured logging (JSON format)

### 8.4 Email Delivery

**Monitoring:**
- Check `email_logs` table for failed deliveries
- Email retry job attempts up to 3 times
- Monitor SMTP provider dashboard for bounces/spam reports

**Testing:**
- Use Mailtrap.io or similar for staging environments
- Send test notifications via `/admin/jobs/digest/trigger`

---

## 9. Monitoring & Health Checks

### 9.1 Health Check Endpoint

**Endpoint:** `GET /health`

**Response:**
```json
{
  "status": "ok",
  "uptime": 12345,
  "timestamp": "2026-02-01T10:00:00.000Z"
}
```

**Implementation (add to `backend/src/index.js`):**

```javascript
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    uptime: process.uptime(),
    timestamp: new Date().toISOString()
  });
});
```

### 9.2 Monitoring Metrics

**Key Metrics to Monitor:**

| Metric | Target | Alert Threshold |
|--------|--------|-----------------|
| API Response Time | <500ms avg | >1000ms |
| Error Rate | <1% | >5% |
| Database Connections | <50 | >80 |
| CPU Usage | <70% | >90% |
| Memory Usage | <80% | >90% |
| Disk Usage | <70% | >85% |
| Job Success Rate | >95% | <90% |
| Email Delivery Rate | >98% | <95% |

**Tools:**
- **Application Monitoring:** New Relic, Datadog, AppDynamics
- **Infrastructure Monitoring:** Prometheus + Grafana, AWS CloudWatch
- **Uptime Monitoring:** UptimeRobot, Pingdom

### 9.3 Alerting

**Critical Alerts:**
- API down (health check fails)
- Database connection errors
- High error rate (>10%)
- Disk usage >90%
- Scheduled job failures

**Warning Alerts:**
- Slow API responses (>1s)
- High CPU/memory usage
- Email delivery failures

---

## 10. Backup & Restore

### 10.1 Database Backup Strategy

**Automated backups:**

```bash
#!/bin/bash
# /opt/scripts/backup-db.sh

BACKUP_DIR=/backups/postgresql
DATE=$(date +%Y%m%d_%H%M%S)
FILENAME="ehs_portal_$DATE.dump"

# Create backup
pg_dump -h localhost -U ehs_user -d ehs_portal -F c -b -f $BACKUP_DIR/$FILENAME

# Upload to S3
aws s3 cp $BACKUP_DIR/$FILENAME s3://your-bucket/db-backups/

# Keep only last 30 days locally
find $BACKUP_DIR -name "*.dump" -mtime +30 -delete

echo "Backup completed: $FILENAME"
```

**Cron schedule:**
```bash
# Daily at 2 AM
0 2 * * * /opt/scripts/backup-db.sh >> /var/log/backup.log 2>&1
```

### 10.2 File Uploads Backup

**Rsync to remote server:**
```bash
rsync -avz --delete /opt/ehs-portal/CLAUDE/backend/uploads/ backup-server:/backups/uploads/
```

**Sync to S3:**
```bash
aws s3 sync /opt/ehs-portal/CLAUDE/backend/uploads/ s3://your-bucket/uploads-backup/
```

### 10.3 Restore Procedure

1. **Restore database:**
   ```bash
   # Drop existing database (WARNING: destructive)
   dropdb -U postgres ehs_portal
   createdb -U postgres ehs_portal
   pg_restore -h localhost -U ehs_user -d ehs_portal /backups/ehs_portal_20260201.dump
   ```

2. **Restore uploads:**
   ```bash
   aws s3 sync s3://your-bucket/uploads-backup/ /opt/ehs-portal/CLAUDE/backend/uploads/
   ```

3. **Restart services:**
   ```bash
   pm2 restart ehs-backend
   ```

---

## 11. Troubleshooting

### Common Issues

| Issue | Cause | Solution |
|-------|-------|----------|
| **Backend won't start** | Missing env vars | Check `.env` file, ensure all required vars are set |
| **Database connection error** | Wrong credentials or host | Verify `DATABASE_URL` or `DB_*` vars, test with `psql` |
| **CORS errors** | Frontend URL mismatch | Set `CORS_ORIGIN` to exact frontend URL (with https://) |
| **JWT errors** | Secret mismatch or expired | Regenerate `JWT_SECRET`, ensure it's 32+ chars |
| **Emails not sending** | SMTP misconfiguration | Test SMTP credentials, check `email_logs` table |
| **Jobs not running** | `JOBS_ENABLED=false` | Set to `true` and restart backend |
| **File uploads failing** | Permissions or disk space | Check `uploads/` directory permissions, disk space |
| **Frontend shows blank page** | Build artifacts not served | Check Nginx config or backend static file serving |

### Debug Checklist

1. **Check logs:**
   ```bash
   pm2 logs ehs-backend --lines 100
   tail -f /var/log/nginx/error.log
   ```

2. **Test database connection:**
   ```bash
   psql -h localhost -U ehs_user -d ehs_portal
   ```

3. **Test SMTP:**
   ```bash
   # Use swaks or similar tool
   swaks --to test@example.com --server smtp.sendgrid.net:587 --auth LOGIN --auth-user apikey --auth-password YOUR_KEY
   ```

4. **Check disk space:**
   ```bash
   df -h
   ```

5. **Check port availability:**
   ```bash
   sudo netstat -tlnp | grep :3001
   ```

---

## 12. Recommended Production Setup

### Minimal Production Setup (Single Server)

**Infrastructure:**
- 1 server (4 cores, 8GB RAM, 100GB SSD)
- Ubuntu 22.04 LTS
- Domain with SSL (Let's Encrypt)

**Stack:**
- Nginx (reverse proxy, SSL termination, static file serving)
- Node.js backend (PM2 with 2 instances)
- PostgreSQL (local instance with daily backups)
- SMTP provider (SendGrid or AWS SES)

**Estimated Cost:** $30-60/month (DigitalOcean, Linode, or AWS t3.medium)

### Scalable Production Setup (Multi-Server)

**Infrastructure:**
- Load Balancer (AWS ALB, NGINX Plus)
- 2+ Application Servers (backend + cron)
- 1 Managed Database (AWS RDS, Azure Database)
- S3/Blob Storage for uploads
- CDN for static assets (CloudFront, Cloudflare)

**Services:**
- Container orchestration (ECS, Kubernetes) or VM orchestration (Terraform)
- Managed PostgreSQL with read replicas
- Centralized logging (CloudWatch, ELK)
- APM monitoring (New Relic, Datadog)

**Estimated Cost:** $200-500/month (depending on traffic and features)

### Assumptions & Open Questions

**Assumptions:**
1. Small to medium deployment (<500 concurrent users)
2. SMTP provider handles email deliveries (not self-hosted)
3. SSL certificates via Let's Encrypt (free)
4. On-premise or cloud IaaS (not serverless)
5. English language only (i18n not required)

**Open Questions:**
1. **Cloud Provider:** AWS, Azure, GCP, DigitalOcean, or on-premise?
2. **Email Provider:** SendGrid, AWS SES, Mailgun, or self-hosted?
3. **Domain & DNS:** Which registrar? Cloudflare for DNS/CDN?
4. **Compliance Requirements:** GDPR, HIPAA, ISO 27001 certifications needed?
5. **High Availability:** Active-active multi-region or single region with backups?
6. **Scaling:** Expected user growth over next 12 months?
7. **Budget:** Monthly budget for hosting and third-party services?
8. **Monitoring:** Preference for monitoring/alerting tools?

---

## Appendix A: Quick Start Commands

### Local Development
```bash
# Backend
cd backend
npm install
npm run migrate
npm run seed
npm run dev

# Frontend (in new terminal)
cd frontend
npm install
npm run dev
```

### Production Deployment (Non-Docker)
```bash
# Clone and install
git clone <repo> /opt/ehs-portal
cd /opt/ehs-portal/CLAUDE/backend
npm install --production

# Setup database
sudo -u postgres createdb ehs_portal
npm run migrate

# Configure and start
nano .env  # Add production vars
pm2 start ecosystem.config.js

# Build and serve frontend
cd ../frontend
npm install
npm run build
sudo cp -r dist/* /var/www/ehs-portal/
```

### Docker Deployment
```bash
# Clone repository
git clone <repo> /opt/ehs-portal
cd /opt/ehs-portal

# Create .env file
nano .env  # Add all secrets

# Start services
docker-compose up -d

# View logs
docker-compose logs -f backend
```

---

**Document End**

# EHS Portal - Deployment Checklist

| Version | 1.0 |
|---------|-----|
| Date | 2026-02-01 |
| For | Production Deployment (Phases 1-4) |

---

## Pre-Deployment Preparation

### 1. Server Provisioning
- [ ] Server provisioned (Ubuntu 22.04 LTS or similar)
- [ ] Minimum 4GB RAM, 2 CPU cores, 50GB disk
- [ ] Static IP address assigned
- [ ] Domain name configured (DNS A record pointing to server IP)
- [ ] SSH access configured with key-based authentication
- [ ] Firewall rules configured (ports 22, 80, 443, optionally 3001)

### 2. Required Accounts & Services
- [ ] SMTP service account created (SendGrid, AWS SES, or similar)
  - [ ] API key or credentials obtained
  - [ ] Sender email verified
- [ ] Database hosting decided (on-server PostgreSQL or managed service)
- [ ] SSL certificate obtained (Let's Encrypt or commercial)
- [ ] Backup storage configured (S3, local disk, or similar)

### 3. Environment Variables Prepared
- [ ] `.env` file drafted with all required variables (see DEPLOYMENT_PHASE1_4.md section 4)
- [ ] JWT_SECRET generated (min 32 chars, cryptographically random)
- [ ] Database credentials defined
- [ ] SMTP credentials added
- [ ] Frontend API URL configured
- [ ] All Phase 4 notification settings configured

---

## Server Setup (Non-Docker)

### 4. System Dependencies
- [ ] System updated: `sudo apt update && sudo apt upgrade -y`
- [ ] Node.js 18+ installed
  ```bash
  curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
  sudo apt install -y nodejs
  ```
- [ ] PostgreSQL 14+ installed
  ```bash
  sudo apt install -y postgresql postgresql-contrib
  ```
- [ ] Nginx installed: `sudo apt install -y nginx`
- [ ] PM2 installed globally: `sudo npm install -g pm2`
- [ ] Git installed: `sudo apt install -y git`

### 5. PostgreSQL Setup
- [ ] PostgreSQL service running: `sudo systemctl status postgresql`
- [ ] Database user created
  ```bash
  sudo -u postgres createuser ehs_admin -P
  ```
- [ ] Database created
  ```bash
  sudo -u postgres createdb ehs_portal -O ehs_admin
  ```
- [ ] Connection tested
  ```bash
  psql -U ehs_admin -d ehs_portal -h localhost
  ```
- [ ] `pg_hba.conf` configured for md5 authentication (if needed)
- [ ] PostgreSQL restarted if config changed

---

## Application Deployment (Non-Docker)

### 6. Code Deployment
- [ ] Application directory created: `sudo mkdir -p /opt/ehs-portal`
- [ ] Ownership set: `sudo chown $USER:$USER /opt/ehs-portal`
- [ ] Repository cloned
  ```bash
  git clone <your-repo-url> /opt/ehs-portal
  cd /opt/ehs-portal/CLAUDE
  ```
- [ ] Backend dependencies installed
  ```bash
  cd backend
  npm install --production
  ```
- [ ] Frontend dependencies installed
  ```bash
  cd ../frontend
  npm install
  ```

### 7. Backend Configuration
- [ ] `.env` file created in `backend/` directory
  ```bash
  cd /opt/ehs-portal/CLAUDE/backend
  nano .env
  ```
- [ ] All environment variables populated (see DEPLOYMENT_PHASE1_4.md)
- [ ] File permissions secured: `chmod 600 .env`
- [ ] Uploads directory created: `mkdir -p uploads`
- [ ] Uploads directory permissions: `chmod 755 uploads`

### 8. Database Migration
- [ ] Migration scripts verified in `backend/migrations/`
- [ ] Migrations executed in order:
  ```bash
  cd /opt/ehs-portal/CLAUDE/backend
  npm run migrate
  ```
- [ ] Migration success confirmed (check terminal output)
- [ ] Database tables verified
  ```bash
  psql -U ehs_admin -d ehs_portal -c "\dt"
  ```
- [ ] Admin user seeded (if seed script exists): `npm run seed`

### 9. Backend Service Start
- [ ] PM2 ecosystem file verified: `backend/ecosystem.config.js`
- [ ] Backend started with PM2
  ```bash
  cd /opt/ehs-portal/CLAUDE/backend
  pm2 start ecosystem.config.js
  ```
- [ ] PM2 process list checked: `pm2 list`
- [ ] Backend logs checked: `pm2 logs ehs-backend`
- [ ] Backend health endpoint tested
  ```bash
  curl http://localhost:3001/api/health
  ```
- [ ] PM2 startup script configured
  ```bash
  pm2 startup
  pm2 save
  ```

### 10. Frontend Build & Deployment
- [ ] Frontend environment variables set
  ```bash
  cd /opt/ehs-portal/CLAUDE/frontend
  nano .env.production
  ```
- [ ] `VITE_API_URL` points to production backend
- [ ] Frontend built
  ```bash
  npm run build
  ```
- [ ] Build output verified in `dist/` directory
- [ ] Web root directory created: `sudo mkdir -p /var/www/ehs-portal`
- [ ] Built files copied to web root
  ```bash
  sudo cp -r dist/* /var/www/ehs-portal/
  ```
- [ ] File permissions set: `sudo chown -R www-data:www-data /var/www/ehs-portal`

---

## Web Server Configuration

### 11. Nginx Setup
- [ ] Nginx configuration file created
  ```bash
  sudo nano /etc/nginx/sites-available/ehs-portal
  ```
- [ ] Configuration matches template in DEPLOYMENT_PHASE1_4.md section 5.3
- [ ] Configuration includes:
  - [ ] Server name (domain)
  - [ ] Root directory `/var/www/ehs-portal`
  - [ ] Reverse proxy to `http://localhost:3001/api`
  - [ ] Static file serving for React app
  - [ ] SPA fallback (`try_files $uri /index.html`)
  - [ ] Upload size limit (50MB)
- [ ] Symlink created
  ```bash
  sudo ln -s /etc/nginx/sites-available/ehs-portal /etc/nginx/sites-enabled/
  ```
- [ ] Default site disabled (if needed)
  ```bash
  sudo rm /etc/nginx/sites-enabled/default
  ```
- [ ] Nginx configuration tested: `sudo nginx -t`
- [ ] Nginx restarted: `sudo systemctl restart nginx`

### 12. SSL Certificate (Let's Encrypt)
- [ ] Certbot installed
  ```bash
  sudo apt install -y certbot python3-certbot-nginx
  ```
- [ ] Certificate obtained
  ```bash
  sudo certbot --nginx -d yourdomain.com
  ```
- [ ] Auto-renewal tested: `sudo certbot renew --dry-run`
- [ ] Nginx restarted: `sudo systemctl restart nginx`

---

## Verification & Testing

### 13. Application Access
- [ ] Frontend accessible via HTTPS: `https://yourdomain.com`
- [ ] Login page loads correctly
- [ ] Static assets load (CSS, JS, images)
- [ ] No console errors in browser DevTools
- [ ] API requests work (Network tab shows 200 responses)

### 14. Functional Testing
- [ ] User login successful with test account
- [ ] Dashboard loads with correct data
- [ ] Create incident test
- [ ] Create inspection test
- [ ] Create action test
- [ ] Notifications bell appears in header
- [ ] Notification preferences page accessible
- [ ] Admin pages accessible (for admin user)
- [ ] Reports export (CSV/PDF) works
- [ ] File upload works (incident attachments)

### 15. Phase 4 Features Testing
- [ ] Notification bell shows unread count
- [ ] Clicking bell opens dropdown with recent notifications
- [ ] Notifications page displays all notifications
- [ ] Filters work (type, read/unread, date range)
- [ ] Mark as read functionality works
- [ ] Notification preferences can be updated
- [ ] Email preferences save correctly
- [ ] Digest frequency options work
- [ ] Admin escalation settings page loads
- [ ] Escalation settings can be updated

### 16. Scheduled Jobs Verification
- [ ] Backend logs show job scheduler initialized
  ```bash
  pm2 logs ehs-backend | grep "scheduler"
  ```
- [ ] Daily digest job scheduled (check logs for "Daily digest job scheduled")
- [ ] Weekly digest job scheduled
- [ ] Escalation job scheduled
- [ ] Email retry job scheduled
- [ ] Cleanup job scheduled
- [ ] Manual job trigger test (via admin API)
  ```bash
  curl -X POST http://localhost:3001/api/admin/jobs/digest/trigger \
    -H "Authorization: Bearer <admin-token>" \
    -H "Content-Type: application/json" \
    -d '{"type":"daily"}'
  ```

### 17. Email Functionality Testing
- [ ] Test notification email sent (create high-severity incident)
- [ ] Email received in inbox
- [ ] Email links work (navigate to correct entity)
- [ ] Email logs visible in admin panel
- [ ] Failed emails show in logs if SMTP misconfigured

---

## Monitoring & Operations

### 18. Health Checks Setup
- [ ] Health endpoint accessible: `curl https://yourdomain.com/api/health`
- [ ] External monitoring configured (UptimeRobot, Pingdom, or similar)
  - [ ] Endpoint: `https://yourdomain.com/api/health`
  - [ ] Check interval: 5 minutes
  - [ ] Alert contacts configured
- [ ] Database connection monitoring
- [ ] Disk space monitoring (uploads directory)

### 19. Logging Configuration
- [ ] Backend logs accessible via PM2: `pm2 logs ehs-backend`
- [ ] Log rotation configured
  ```bash
  pm2 install pm2-logrotate
  pm2 set pm2-logrotate:max_size 10M
  pm2 set pm2-logrotate:retain 7
  ```
- [ ] Nginx access logs: `/var/log/nginx/access.log`
- [ ] Nginx error logs: `/var/log/nginx/error.log`
- [ ] PostgreSQL logs: `/var/log/postgresql/`
- [ ] Log aggregation configured (optional: Papertrail, Loggly, ELK)

### 20. Backup Configuration
- [ ] Database backup script created (see DEPLOYMENT_PHASE1_4.md section 10.1)
- [ ] Backup cron job configured
  ```bash
  crontab -e
  # Add: 0 2 * * * /opt/ehs-portal/scripts/backup-db.sh
  ```
- [ ] Backup directory created: `mkdir -p /backups/ehs-portal`
- [ ] Backup retention policy configured (30 days)
- [ ] Uploads directory backup configured
  ```bash
  # Add to cron: 0 3 * * * rsync -az /opt/ehs-portal/CLAUDE/backend/uploads/ /backups/ehs-portal/uploads/
  ```
- [ ] Backup restore procedure tested
- [ ] Remote backup sync configured (S3, rsync to remote server, etc.)

---

## Security Hardening

### 21. Server Security
- [ ] UFW firewall enabled
  ```bash
  sudo ufw allow 22/tcp
  sudo ufw allow 80/tcp
  sudo ufw allow 443/tcp
  sudo ufw enable
  ```
- [ ] SSH key-only authentication enforced (password auth disabled)
- [ ] Root login disabled in `/etc/ssh/sshd_config`
- [ ] Fail2ban installed and configured
  ```bash
  sudo apt install -y fail2ban
  sudo systemctl enable fail2ban
  ```
- [ ] System automatic security updates enabled
  ```bash
  sudo apt install -y unattended-upgrades
  sudo dpkg-reconfigure -plow unattended-upgrades
  ```

### 22. Application Security
- [ ] `.env` file secured (permissions 600, not in git)
- [ ] Database user has minimal required permissions
- [ ] JWT_SECRET is strong and unique
- [ ] CORS configured correctly in backend (whitelist frontend domain)
- [ ] Rate limiting enabled in backend (if implemented)
- [ ] File upload restrictions enforced (file types, sizes)
- [ ] SQL injection prevention verified (using parameterized queries)
- [ ] XSS prevention verified (React's built-in escaping)
- [ ] HTTPS enforced (HTTP redirects to HTTPS)
- [ ] Security headers configured in Nginx
  ```nginx
  add_header X-Frame-Options "SAMEORIGIN" always;
  add_header X-Content-Type-Options "nosniff" always;
  add_header X-XSS-Protection "1; mode=block" always;
  ```

---

## Documentation & Handover

### 23. Documentation
- [ ] Production `.env` template documented (without secrets)
- [ ] Server access credentials stored securely (password manager)
- [ ] Database connection details documented
- [ ] SMTP credentials documented
- [ ] SSL certificate renewal process documented
- [ ] Backup/restore procedures documented
- [ ] Incident response plan created
- [ ] Runbook created with common operations:
  - [ ] How to restart backend
  - [ ] How to check logs
  - [ ] How to run migrations
  - [ ] How to create admin user
  - [ ] How to manually trigger jobs

### 24. User Training
- [ ] Admin user accounts created for organization
- [ ] Initial manager accounts created
- [ ] Staff user accounts created (or import procedure documented)
- [ ] User roles assigned correctly
- [ ] Admin training completed (organization settings, user management)
- [ ] User documentation provided (how to log incidents, inspections, actions)
- [ ] Notification preferences training completed

### 25. Go-Live Checklist
- [ ] Stakeholders notified of go-live date
- [ ] Maintenance window scheduled (if migrating from old system)
- [ ] Rollback plan prepared
- [ ] Support contact information shared with users
- [ ] First-day monitoring plan in place
- [ ] Post-deployment verification completed
- [ ] Sign-off obtained from project stakeholders

---

## Post-Deployment

### 26. Week 1 Monitoring
- [ ] Daily health checks for first week
- [ ] Monitor error logs daily
- [ ] Monitor email delivery (check email logs in admin panel)
- [ ] Monitor scheduled job execution (check `scheduled_job_runs` table)
- [ ] Monitor disk usage (uploads directory)
- [ ] Monitor database performance
- [ ] Collect user feedback
- [ ] Address any reported issues

### 27. Ongoing Maintenance
- [ ] Weekly backup verification
- [ ] Monthly security updates: `sudo apt update && sudo apt upgrade`
- [ ] Quarterly SSL certificate check (even with auto-renewal)
- [ ] Quarterly review of logs for anomalies
- [ ] Monitor notification email deliverability
- [ ] Review and clean up old data (use cleanup job or manual scripts)
- [ ] Performance monitoring (response times, query performance)

---

## Deployment Sign-Off

| Role | Name | Date | Signature |
|------|------|------|-----------|
| DevOps/Deployment Engineer | | | |
| Backend Developer | | | |
| Frontend Developer | | | |
| QA Engineer | | | |
| System Administrator | | | |
| Project Manager | | | |
| Product Owner | | | |

---

## Troubleshooting Quick Reference

**Backend won't start:**
- [ ] Check PM2 logs: `pm2 logs ehs-backend --err`
- [ ] Verify DATABASE_URL in `.env`
- [ ] Test database connection: `psql $DATABASE_URL`
- [ ] Check port 3001 not in use: `sudo lsof -i :3001`

**Frontend shows blank page:**
- [ ] Check browser console for errors (F12)
- [ ] Verify `VITE_API_URL` in `.env.production` during build
- [ ] Check Nginx error logs: `sudo tail -f /var/log/nginx/error.log`
- [ ] Verify files copied to `/var/www/ehs-portal`

**Database connection fails:**
- [ ] Check PostgreSQL running: `sudo systemctl status postgresql`
- [ ] Verify database exists: `sudo -u postgres psql -l`
- [ ] Check `pg_hba.conf` authentication settings
- [ ] Test connection with `psql` manually

**Emails not sending:**
- [ ] Check SMTP credentials in `.env`
- [ ] Check email logs in admin panel
- [ ] Check backend logs for SMTP errors: `pm2 logs ehs-backend | grep -i smtp`
- [ ] Verify SMTP server allows connections (firewall/security groups)
- [ ] Test SMTP with simple script or online tool

**Scheduled jobs not running:**
- [ ] Check `JOBS_ENABLED=true` in `.env`
- [ ] Check backend logs for job initialization: `pm2 logs ehs-backend | grep job`
- [ ] Check `scheduled_job_runs` table for execution history
- [ ] Verify cron expressions in `.env`
- [ ] Manually trigger job via admin API for testing

**File uploads failing:**
- [ ] Check `uploads/` directory exists and is writable
- [ ] Check `MAX_FILE_SIZE` in backend `.env`
- [ ] Check Nginx `client_max_body_size` setting
- [ ] Check disk space: `df -h`

---

**End of Checklist**

For detailed instructions on each step, refer to `DEPLOYMENT_PHASE1_4.md`.

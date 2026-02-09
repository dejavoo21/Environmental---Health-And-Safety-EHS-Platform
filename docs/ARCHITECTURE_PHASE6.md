# System Architecture – EHS Portal Phase 6
## Security, Trust & Self-Service

| Item | Detail |
|------|--------|
| Document Version | 1.0 |
| Author | Solution Architect |
| Date | 2026-02-04 |
| Status | Draft |
| Phase | 6 – Security, Trust & Self-Service |

---

## 1. Overview

Phase 6 introduces security-focused components for self-service access management, password reset, two-factor authentication, security audit logging, and theming. The architecture extends the existing authentication layer with enhanced security controls.

**New Components:**
- Access Request Service
- Password Reset Service
- Two-Factor Authentication (2FA) Service
- Security Audit Service
- Theme Service

**New Infrastructure:**
- TOTP secret encryption (AES-256-GCM)
- Rate limiting middleware enhancements
- IP geolocation service (optional)

---

## 2. Component Architecture

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                              PHASE 6 ARCHITECTURE                               │
└─────────────────────────────────────────────────────────────────────────────────┘

                                 ┌─────────────────┐
                                 │     Browser     │
                                 │   (React App)   │
                                 └────────┬────────┘
                                          │
        ┌─────────────────────────────────┼─────────────────────────────────┐
        │                                 │                                 │
        ▼                                 ▼                                 ▼
┌───────────────┐              ┌───────────────────┐              ┌───────────────┐
│ Public Routes │              │  Protected Routes │              │ Admin Routes  │
├───────────────┤              ├───────────────────┤              ├───────────────┤
│ /request-access│              │ /security-centre │              │ /admin/access │
│ /forgot-password│             │ /settings/theme  │              │ /admin/audit  │
│ /reset-password │             │ /2fa/setup       │              └───────┬───────┘
└───────┬───────┘              └─────────┬─────────┘                      │
        │                                │                                 │
        └────────────────────────────────┼─────────────────────────────────┘
                                         │
                                         ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│                              EXPRESS BACKEND                                     │
├─────────────────────────────────────────────────────────────────────────────────┤
│  MIDDLEWARE LAYER                                                                │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐                │
│  │   CORS      │ │Rate Limiter │ │Auth (JWT)   │ │ 2FA Check   │                │
│  │             │ │(Enhanced)   │ │             │ │ Middleware  │                │
│  └─────────────┘ └─────────────┘ └─────────────┘ └─────────────┘                │
├─────────────────────────────────────────────────────────────────────────────────┤
│  ROUTE LAYER                                                                     │
│  ┌───────────────────┐ ┌───────────────────┐ ┌───────────────────┐              │
│  │ Access Request    │ │ Password Reset    │ │ 2FA               │              │
│  │ Routes            │ │ Routes            │ │ Routes            │              │
│  │ POST /request     │ │ POST /forgot      │ │ POST /setup       │              │
│  │ GET /admin/list   │ │ POST /reset       │ │ POST /verify      │              │
│  │ POST /admin/decide│ │ GET /validate     │ │ DELETE /disable   │              │
│  └───────────────────┘ └───────────────────┘ └───────────────────┘              │
│  ┌───────────────────┐ ┌───────────────────┐ ┌───────────────────┐              │
│  │ Security Audit    │ │ Security Centre   │ │ Theme             │              │
│  │ Routes            │ │ Routes            │ │ Routes            │              │
│  │ GET /audit/logs   │ │ GET /me/security  │ │ PUT /me/theme     │              │
│  │ GET /audit/export │ │ GET /me/logins    │ │ GET /org/theme    │              │
│  └───────────────────┘ └───────────────────┘ └───────────────────┘              │
├─────────────────────────────────────────────────────────────────────────────────┤
│  SERVICE LAYER                                                                   │
│  ┌───────────────────┐ ┌───────────────────┐ ┌───────────────────┐              │
│  │ AccessRequest     │ │ PasswordReset     │ │ TwoFactor         │              │
│  │ Service           │ │ Service           │ │ Service           │              │
│  │                   │ │                   │ │                   │              │
│  │ - createRequest   │ │ - requestReset    │ │ - generateSecret  │              │
│  │ - approveRequest  │ │ - validateToken   │ │ - verifyTOTP      │              │
│  │ - rejectRequest   │ │ - resetPassword   │ │ - generateBackups │              │
│  │ - expireStale     │ │ - cleanupTokens   │ │ - encryptSecret   │              │
│  └───────────────────┘ └───────────────────┘ └───────────────────┘              │
│  ┌───────────────────┐ ┌───────────────────┐ ┌───────────────────┐              │
│  │ SecurityAudit     │ │ LoginHistory      │ │ Theme             │              │
│  │ Service           │ │ Service           │ │ Service           │              │
│  │                   │ │                   │ │                   │              │
│  │ - logEvent        │ │ - recordLogin     │ │ - getUserTheme    │              │
│  │ - queryLogs       │ │ - getHistory      │ │ - setUserTheme    │              │
│  │ - exportLogs      │ │ - parseUserAgent  │ │ - getOrgDefault   │              │
│  └───────────────────┘ └───────────────────┘ └───────────────────┘              │
├─────────────────────────────────────────────────────────────────────────────────┤
│  INFRASTRUCTURE                                                                  │
│  ┌───────────────────┐ ┌───────────────────┐ ┌───────────────────┐              │
│  │ Crypto Utils      │ │ Email Templates   │ │ Rate Limit Store  │              │
│  │                   │ │                   │ │                   │              │
│  │ - hashToken       │ │ - welcome.hbs     │ │ - Redis/Memory    │              │
│  │ - encryptAES      │ │ - reset.hbs       │ │ - Per-endpoint    │              │
│  │ - decryptAES      │ │ - reject.hbs      │ │   limits          │              │
│  │ - generateBackup  │ │ - 2fa-enabled.hbs │ │                   │              │
│  └───────────────────┘ └───────────────────┘ └───────────────────┘              │
└─────────────────────────────────────────────────────────────────────────────────┘
                                         │
                                         ▼
                              ┌───────────────────┐
                              │    PostgreSQL     │
                              ├───────────────────┤
                              │ access_requests   │
                              │ password_reset_*  │
                              │ user_2fa          │
                              │ user_backup_codes │
                              │ security_audit_log│
                              │ login_history     │
                              └───────────────────┘
```

---

## 3. Authentication Flow with 2FA

### 3.1 Standard Login (No 2FA)

```
┌────────┐     ┌────────┐     ┌─────────────┐     ┌──────┐
│ Client │     │ Server │     │ AuthService │     │  DB  │
└───┬────┘     └───┬────┘     └──────┬──────┘     └──┬───┘
    │              │                 │               │
    │ POST /login  │                 │               │
    │─────────────>│                 │               │
    │              │ validate creds  │               │
    │              │────────────────>│               │
    │              │                 │ lookup user   │
    │              │                 │──────────────>│
    │              │                 │<──────────────│
    │              │                 │               │
    │              │  check 2FA flag │               │
    │              │<────────────────│               │
    │              │                 │               │
    │              │ 2FA disabled    │               │
    │              │────────────────>│               │
    │              │                 │ generate JWT  │
    │              │                 │               │
    │ { token }    │                 │               │
    │<─────────────│                 │               │
    │              │                 │               │
```

### 3.2 Login with 2FA Enabled

```
┌────────┐     ┌────────┐     ┌─────────────┐     ┌──────────┐     ┌──────┐
│ Client │     │ Server │     │ AuthService │     │ 2FAService│     │  DB  │
└───┬────┘     └───┬────┘     └──────┬──────┘     └─────┬────┘     └──┬───┘
    │              │                 │                  │             │
    │ POST /login  │                 │                  │             │
    │─────────────>│                 │                  │             │
    │              │ validate creds  │                  │             │
    │              │────────────────>│                  │             │
    │              │                 │  lookup user     │             │
    │              │                 │─────────────────────────────> │
    │              │                 │<───────────────────────────── │
    │              │                 │                  │             │
    │              │ 2FA required    │                  │             │
    │              │<────────────────│                  │             │
    │ { requires2FA│                 │                  │             │
    │   tempToken }│                 │                  │             │
    │<─────────────│                 │                  │             │
    │              │                 │                  │             │
    │ POST /2fa/verify               │                  │             │
    │ { tempToken, │                 │                  │             │
    │   code }     │                 │                  │             │
    │─────────────>│                 │                  │             │
    │              │ verify TOTP     │                  │             │
    │              │────────────────────────────────>  │             │
    │              │                 │  get secret      │             │
    │              │                 │                  │────────────>│
    │              │                 │                  │<────────────│
    │              │                 │  validate code   │             │
    │              │<────────────────────────────────── │             │
    │              │                 │                  │             │
    │ { token }    │ generate JWT    │                  │             │
    │<─────────────│                 │                  │             │
```

### 3.3 Temporary Token Design

When 2FA is required, the server issues a **temporary token** (not a full JWT):
- Short-lived (5 minutes)
- Only valid for 2FA verification endpoint
- Contains: user_id, exp, purpose='2fa_pending'
- Signed with same JWT secret

---

## 4. Password Reset Flow

```
┌────────┐     ┌────────┐     ┌────────────────┐     ┌─────────────┐     ┌──────┐
│ Client │     │ Server │     │ PasswordReset  │     │ EmailService│     │  DB  │
└───┬────┘     └───┬────┘     │    Service     │     └──────┬──────┘     └──┬───┘
    │              │          └───────┬────────┘            │               │
    │              │                  │                     │               │
    │ POST /forgot │                  │                     │               │
    │ {email}      │                  │                     │               │
    │─────────────>│                  │                     │               │
    │              │ requestReset     │                     │               │
    │              │─────────────────>│                     │               │
    │              │                  │ lookup user         │               │
    │              │                  │────────────────────────────────────>│
    │              │                  │<────────────────────────────────────│
    │              │                  │                     │               │
    │              │                  │ generate token      │               │
    │              │                  │ (64 bytes random)   │               │
    │              │                  │                     │               │
    │              │                  │ store hash          │               │
    │              │                  │────────────────────────────────────>│
    │              │                  │                     │               │
    │              │                  │ send email          │               │
    │              │                  │────────────────────>│               │
    │              │                  │                     │               │
    │ {message}    │<─────────────────│                     │               │
    │<─────────────│                  │                     │               │
    │              │                  │                     │               │
    │ GET /reset   │                  │                     │               │
    │ ?token=xxx   │                  │                     │               │
    │─────────────>│                  │                     │               │
    │              │ validateToken    │                     │               │
    │              │─────────────────>│                     │               │
    │              │                  │ hash & lookup       │               │
    │              │                  │────────────────────────────────────>│
    │              │                  │<────────────────────────────────────│
    │              │                  │                     │               │
    │ {valid,email}│<─────────────────│                     │               │
    │<─────────────│                  │                     │               │
    │              │                  │                     │               │
    │ POST /reset  │                  │                     │               │
    │ {token,pwd}  │                  │                     │               │
    │─────────────>│                  │                     │               │
    │              │ resetPassword    │                     │               │
    │              │─────────────────>│                     │               │
    │              │                  │ validate & hash pwd │               │
    │              │                  │                     │               │
    │              │                  │ update user         │               │
    │              │                  │────────────────────────────────────>│
    │              │                  │                     │               │
    │              │                  │ mark token used     │               │
    │              │                  │────────────────────────────────────>│
    │              │                  │                     │               │
    │ {success}    │<─────────────────│                     │               │
    │<─────────────│                  │                     │               │
```

---

## 5. Access Request Workflow

```
┌───────────┐     ┌────────┐     ┌────────────────┐     ┌─────────────┐     ┌──────┐
│ Requester │     │ Server │     │ AccessRequest  │     │ EmailService│     │  DB  │
└─────┬─────┘     └───┬────┘     │    Service     │     └──────┬──────┘     └──┬───┘
      │               │          └───────┬────────┘            │               │
      │               │                  │                     │               │
      │ POST /request │                  │                     │               │
      │ {name,email,  │                  │                     │               │
      │  org,role}    │                  │                     │               │
      │──────────────>│                  │                     │               │
      │               │ createRequest    │                     │               │
      │               │─────────────────>│                     │               │
      │               │                  │ validate org        │               │
      │               │                  │────────────────────────────────────>│
      │               │                  │                     │               │
      │               │                  │ check duplicates    │               │
      │               │                  │────────────────────────────────────>│
      │               │                  │                     │               │
      │               │                  │ create request      │               │
      │               │                  │────────────────────────────────────>│
      │               │                  │                     │               │
      │               │                  │ send confirmation   │               │
      │               │                  │────────────────────>│               │
      │               │                  │                     │               │
      │ {refNumber}   │<─────────────────│                     │               │
      │<──────────────│                  │                     │               │

                    ... Admin reviews ...

┌───────────┐     ┌────────┐     ┌────────────────┐     ┌─────────────┐     ┌──────┐
│   Admin   │     │ Server │     │ AccessRequest  │     │ EmailService│     │  DB  │
└─────┬─────┘     └───┬────┘     │    Service     │     └──────┬──────┘     └──┬───┘
      │               │          └───────┬────────┘            │               │
      │ POST /approve │                  │                     │               │
      │ {requestId,   │                  │                     │               │
      │  role}        │                  │                     │               │
      │──────────────>│                  │                     │               │
      │               │ approveRequest   │                     │               │
      │               │─────────────────>│                     │               │
      │               │                  │ create user         │               │
      │               │                  │────────────────────────────────────>│
      │               │                  │                     │               │
      │               │                  │ update request      │               │
      │               │                  │────────────────────────────────────>│
      │               │                  │                     │               │
      │               │                  │ send welcome email  │               │
      │               │                  │────────────────────>│               │
      │               │                  │                     │               │
      │ {success}     │<─────────────────│                     │               │
      │<──────────────│                  │                     │               │
```

---

## 6. Rate Limiting Strategy

### 6.1 Endpoint-Specific Limits

| Endpoint | Limit | Window | Key |
|----------|-------|--------|-----|
| POST /api/auth/login | 10 req | 15 min | IP |
| POST /api/auth/forgot-password | 3 req | 1 hour | Email + IP |
| POST /api/auth/reset-password | 5 req | 15 min | Token |
| POST /api/access-requests | 3 req | 24 hours | Email |
| POST /api/2fa/verify | 5 req | 5 min | Temp Token |

### 6.2 Rate Limiter Configuration

```javascript
// Rate limiter middleware configuration
const rateLimitConfig = {
  login: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 10,
    keyGenerator: (req) => req.ip,
    message: { error: 'Too many login attempts. Please try again later.' }
  },
  forgotPassword: {
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 3,
    keyGenerator: (req) => `${req.body.email}:${req.ip}`,
    message: { error: 'Too many reset requests. Please try again later.' }
  },
  accessRequest: {
    windowMs: 24 * 60 * 60 * 1000, // 24 hours
    max: 3,
    keyGenerator: (req) => req.body.email,
    message: { error: 'Maximum request limit reached. Please try again tomorrow.' }
  }
};
```

---

## 7. Encryption and Secrets Management

### 7.1 TOTP Secret Encryption

TOTP secrets are encrypted at rest using AES-256-GCM:

```javascript
// Environment variable
TOTP_ENCRYPTION_KEY=<64 hex chars = 32 bytes>

// Encryption process
const crypto = require('crypto');

function encryptTOTPSecret(secret) {
  const key = Buffer.from(process.env.TOTP_ENCRYPTION_KEY, 'hex');
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  
  let encrypted = cipher.update(secret, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const authTag = cipher.getAuthTag().toString('hex');
  
  return {
    encrypted: encrypted + authTag,
    iv: iv.toString('hex')
  };
}

function decryptTOTPSecret(encrypted, iv) {
  const key = Buffer.from(process.env.TOTP_ENCRYPTION_KEY, 'hex');
  const ivBuffer = Buffer.from(iv, 'hex');
  const authTag = Buffer.from(encrypted.slice(-32), 'hex');
  const content = encrypted.slice(0, -32);
  
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, ivBuffer);
  decipher.setAuthTag(authTag);
  
  let decrypted = decipher.update(content, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  
  return decrypted;
}
```

### 7.2 Token Hashing

Password reset tokens are stored as SHA-256 hashes:

```javascript
function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

// Token generation
function generateResetToken() {
  return crypto.randomBytes(32).toString('hex'); // 64 hex chars
}
```

### 7.3 Backup Code Generation

```javascript
function generateBackupCodes(count = 10) {
  const codes = [];
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // No I, O, 0, 1
  
  for (let i = 0; i < count; i++) {
    let code = '';
    for (let j = 0; j < 8; j++) {
      code += chars[crypto.randomInt(chars.length)];
    }
    codes.push(code);
  }
  
  return codes;
}
```

---

## 8. Frontend Theme Architecture

### 8.1 CSS Variable-Based Theming

```css
/* Light theme (default) */
:root {
  --bg-primary: #ffffff;
  --bg-secondary: #f8f9fa;
  --text-primary: #212529;
  --text-secondary: #6c757d;
  --border-color: #dee2e6;
  --accent-color: #0d6efd;
  --success-color: #198754;
  --warning-color: #ffc107;
  --error-color: #dc3545;
  --chart-palette: #0d6efd, #198754, #ffc107, #dc3545, #6f42c1;
}

/* Dark theme */
[data-theme="dark"] {
  --bg-primary: #1a1a2e;
  --bg-secondary: #16213e;
  --text-primary: #e5e5e5;
  --text-secondary: #a0a0a0;
  --border-color: #2d2d44;
  --accent-color: #4dabf7;
  --success-color: #40c057;
  --warning-color: #fab005;
  --error-color: #fa5252;
  --chart-palette: #4dabf7, #40c057, #fab005, #fa5252, #9775fa;
}
```

### 8.2 Theme Context (React)

```jsx
// ThemeContext.js
import { createContext, useContext, useState, useEffect } from 'react';

const ThemeContext = createContext();

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(() => {
    // Load from localStorage first for instant render
    return localStorage.getItem('theme') || 'system';
  });

  useEffect(() => {
    const root = document.documentElement;
    let effectiveTheme = theme;
    
    if (theme === 'system') {
      effectiveTheme = window.matchMedia('(prefers-color-scheme: dark)').matches
        ? 'dark'
        : 'light';
    }
    
    root.setAttribute('data-theme', effectiveTheme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  // Sync with backend on login
  const syncTheme = async (userTheme) => {
    setTheme(userTheme);
  };

  return (
    <ThemeContext.Provider value={{ theme, setTheme, syncTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => useContext(ThemeContext);
```

---

## 9. Security Audit Integration

### 9.1 Audit Event Emission

```javascript
// SecurityAuditService.js
class SecurityAuditService {
  static async log(event) {
    const { eventType, organisationId, userId, targetUserId, ip, userAgent, metadata } = event;
    
    await db.query(`
      INSERT INTO security_audit_log 
      (event_type, organisation_id, user_id, target_user_id, ip_address, user_agent, metadata)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
    `, [eventType, organisationId, userId, targetUserId, ip, userAgent, metadata]);
  }

  // Convenience methods
  static async logLoginSuccess(userId, orgId, ip, userAgent) {
    await this.log({
      eventType: 'LOGIN_SUCCESS',
      organisationId: orgId,
      userId,
      ip,
      userAgent
    });
  }

  static async logLoginFailure(attemptedEmail, ip, userAgent, reason) {
    await this.log({
      eventType: 'LOGIN_FAILURE',
      ip,
      userAgent,
      metadata: { attempted_email: attemptedEmail, reason }
    });
  }

  // ... other methods
}
```

### 9.2 Middleware Integration

```javascript
// Wrap auth routes with audit logging
router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  const ip = req.ip;
  const userAgent = req.get('User-Agent');

  try {
    const user = await AuthService.authenticate(email, password);
    
    if (user.has_2fa_enabled) {
      // Return temp token for 2FA
      const tempToken = generateTempToken(user.id);
      return res.json({ requires2FA: true, tempToken });
    }

    // Log success
    await SecurityAuditService.logLoginSuccess(user.id, user.organisation_id, ip, userAgent);
    
    // Update login history
    await LoginHistoryService.record(user.id, user.organisation_id, ip, userAgent, true);
    
    const token = generateJWT(user);
    res.json({ token, user });
    
  } catch (error) {
    // Log failure
    await SecurityAuditService.logLoginFailure(email, ip, userAgent, error.message);
    await LoginHistoryService.record(null, null, ip, userAgent, false, error.message);
    
    res.status(401).json({ error: 'Invalid credentials' });
  }
});
```

---

## 10. Environment Configuration

### 10.1 New Environment Variables

```env
# Phase 6 - Security Configuration

# TOTP 2FA Encryption
TOTP_ENCRYPTION_KEY=<64 hex characters>  # Generate: openssl rand -hex 32

# Password Reset
PASSWORD_RESET_TOKEN_EXPIRY_MINUTES=30
PASSWORD_RESET_MAX_ATTEMPTS=3

# Access Requests
ACCESS_REQUEST_EXPIRY_DAYS=30
ACCESS_REQUEST_EMAIL_VERIFICATION=false  # Optional email verification

# Rate Limiting
RATE_LIMIT_LOGIN_WINDOW_MS=900000       # 15 minutes
RATE_LIMIT_LOGIN_MAX=10
RATE_LIMIT_FORGOT_WINDOW_MS=3600000     # 1 hour
RATE_LIMIT_FORGOT_MAX=3

# Account Lockout
ACCOUNT_LOCKOUT_THRESHOLD=10
ACCOUNT_LOCKOUT_DURATION_MINUTES=15

# Security Audit
SECURITY_AUDIT_RETENTION_DAYS=730        # 2 years
LOGIN_HISTORY_RETENTION_DAYS=90

# Optional: IP Geolocation Service
IP_GEOLOCATION_ENABLED=false
IP_GEOLOCATION_API_KEY=
```

---

## 11. Scheduled Jobs

| Job Name | Schedule | Purpose |
|----------|----------|---------|
| ExpireAccessRequests | Daily 01:00 UTC | Mark stale access requests as expired |
| CleanupResetTokens | Hourly | Delete expired password reset tokens |
| CleanupLoginHistory | Daily 02:00 UTC | Delete login history older than retention |
| ArchiveSecurityAudit | Weekly | Archive old audit logs (future) |
| UnlockAccounts | Every 5 minutes | Unlock accounts past lockout duration |

---

## 12. Document History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2026-02-04 | Solution Architect | Initial draft |

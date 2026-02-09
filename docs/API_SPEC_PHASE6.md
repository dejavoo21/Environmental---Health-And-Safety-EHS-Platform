# API Specification – EHS Portal Phase 6
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

Phase 6 introduces APIs for self-service access requests, password reset, two-factor authentication, security audit logging, and theme management.

**Base URL:** `/api`

**Authentication:** 
- Most endpoints require JWT Bearer token
- Public endpoints marked explicitly
- 2FA verification uses temporary tokens

---

## 2. Access Request APIs

### 2.1 Submit Access Request (Public)

**POST** `/api/access-requests`

Submit a self-service access request to join an organisation.

**Authentication:** None (public)

**Rate Limit:** 3 requests per email per 24 hours

**Request Body:**
```json
{
  "fullName": "John Smith",
  "email": "john.smith@example.com",
  "organisationCode": "ACME",
  "requestedRole": "worker",
  "reason": "New employee in warehouse operations",
  "termsAccepted": true
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| fullName | string | Yes | Full name (2-255 chars) |
| email | string | Yes | Valid email address |
| organisationCode | string | Yes | Organisation code to join |
| requestedRole | string | Yes | `worker` or `manager` |
| reason | string | No | Justification (max 500 chars) |
| termsAccepted | boolean | Yes | Must be true |

**Response (201 Created):**
```json
{
  "success": true,
  "referenceNumber": "AR-2026-0042",
  "message": "Your access request has been submitted. You will receive an email confirmation shortly."
}
```

**Error Responses:**
| Status | Code | Description |
|--------|------|-------------|
| 400 | INVALID_ORG | Organisation code not found |
| 400 | DUPLICATE_REQUEST | Pending request exists for this email |
| 400 | EMAIL_REGISTERED | Email already has an account |
| 400 | VALIDATION_ERROR | Field validation failed |
| 429 | RATE_LIMIT | Too many requests |

---

### 2.2 List Access Requests (Admin)

**GET** `/api/admin/access-requests`

List access requests for the admin's organisation.

**Authentication:** JWT (Admin only)

**Query Parameters:**
| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| status | string | pending | Filter: pending, approved, rejected, expired, all |
| page | integer | 1 | Page number |
| limit | integer | 20 | Items per page (max 100) |
| sort | string | createdAt | Sort field |
| order | string | desc | Sort order: asc, desc |

**Response (200 OK):**
```json
{
  "data": [
    {
      "id": "uuid",
      "referenceNumber": "AR-2026-0042",
      "fullName": "John Smith",
      "email": "john.smith@example.com",
      "requestedRole": "worker",
      "reason": "New employee in warehouse operations",
      "status": "pending",
      "createdAt": "2026-02-04T10:00:00Z",
      "expiresAt": "2026-03-06T10:00:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 5,
    "totalPages": 1
  },
  "counts": {
    "pending": 3,
    "approved": 15,
    "rejected": 2
  }
}
```

---

### 2.3 Get Access Request Details (Admin)

**GET** `/api/admin/access-requests/:id`

Get detailed information about a specific access request.

**Authentication:** JWT (Admin only)

**Response (200 OK):**
```json
{
  "id": "uuid",
  "referenceNumber": "AR-2026-0042",
  "fullName": "John Smith",
  "email": "john.smith@example.com",
  "organisationId": "uuid",
  "organisationCode": "ACME",
  "requestedRole": "worker",
  "reason": "New employee in warehouse operations",
  "status": "pending",
  "termsAccepted": true,
  "ipAddress": "192.168.1.x",
  "createdAt": "2026-02-04T10:00:00Z",
  "expiresAt": "2026-03-06T10:00:00Z",
  "decisionBy": null,
  "decisionAt": null,
  "decisionReason": null
}
```

---

### 2.4 Approve Access Request (Admin)

**POST** `/api/admin/access-requests/:id/approve`

Approve an access request and create the user.

**Authentication:** JWT (Admin only)

**Request Body:**
```json
{
  "role": "worker",
  "siteIds": ["uuid1", "uuid2"],
  "notes": "Internal notes (optional)"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| role | string | No | Override requested role |
| siteIds | array | No | Assign to specific sites |
| notes | string | No | Internal decision notes |

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Access request approved. User has been created and notified.",
  "userId": "uuid",
  "userEmail": "john.smith@example.com"
}
```

---

### 2.5 Reject Access Request (Admin)

**POST** `/api/admin/access-requests/:id/reject`

Reject an access request.

**Authentication:** JWT (Admin only)

**Request Body:**
```json
{
  "reason": "Internal notes about rejection",
  "sendEmail": true
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| reason | string | No | Internal reason (not shared) |
| sendEmail | boolean | No | Send polite rejection email |

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Access request rejected."
}
```

---

## 3. Password Reset APIs

### 3.1 Request Password Reset (Public)

**POST** `/api/auth/forgot-password`

Request a password reset email.

**Authentication:** None (public)

**Rate Limit:** 3 requests per email per hour

**Request Body:**
```json
{
  "email": "user@example.com"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "If this email exists in our system, you will receive password reset instructions."
}
```

**Note:** Same response regardless of whether email exists (no user enumeration).

---

### 3.2 Validate Reset Token (Public)

**GET** `/api/auth/reset-password/validate`

Validate a password reset token before showing the reset form.

**Authentication:** None (public)

**Query Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| token | string | Yes | Reset token from email link |

**Response (200 OK):**
```json
{
  "valid": true,
  "email": "u***@example.com"
}
```

**Error Response (400 Bad Request):**
```json
{
  "valid": false,
  "error": "TOKEN_EXPIRED",
  "message": "This reset link has expired. Please request a new one."
}
```

| Error Code | Description |
|------------|-------------|
| TOKEN_INVALID | Token format invalid or not found |
| TOKEN_EXPIRED | Token has expired |
| TOKEN_USED | Token already used |

---

### 3.3 Reset Password (Public)

**POST** `/api/auth/reset-password`

Set a new password using a valid reset token.

**Authentication:** None (public)

**Rate Limit:** 5 attempts per token

**Request Body:**
```json
{
  "token": "abc123...",
  "newPassword": "NewSecureP@ss123"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| token | string | Yes | Reset token from email |
| newPassword | string | Yes | New password (min 8 chars, complexity required) |

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Your password has been reset. You can now log in with your new password."
}
```

**Error Responses:**
| Status | Code | Description |
|--------|------|-------------|
| 400 | TOKEN_INVALID | Invalid or expired token |
| 400 | PASSWORD_WEAK | Password doesn't meet requirements |
| 400 | PASSWORD_REUSED | Cannot reuse recent passwords |
| 429 | MAX_ATTEMPTS | Too many failed attempts |

---

## 4. Two-Factor Authentication APIs

### 4.1 Initiate 2FA Setup

**POST** `/api/auth/2fa/setup`

Generate TOTP secret and QR code for 2FA setup.

**Authentication:** JWT

**Response (200 OK):**
```json
{
  "secret": "JBSWY3DPEHPK3PXP",
  "qrCodeUrl": "data:image/png;base64,iVBORw0KGgo...",
  "manualEntryKey": "JBSW Y3DP EHPK 3PXP",
  "issuer": "EHS Portal",
  "accountName": "user@example.com"
}
```

**Note:** Secret is stored encrypted but not enabled until verified.

---

### 4.2 Verify and Enable 2FA

**POST** `/api/auth/2fa/verify`

Verify TOTP code and enable 2FA.

**Authentication:** JWT

**Request Body:**
```json
{
  "code": "123456"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "enabled": true,
  "backupCodes": [
    "ABCD1234",
    "EFGH5678",
    "IJKL9012",
    "MNOP3456",
    "QRST7890",
    "UVWX1234",
    "YZAB5678",
    "CDEF9012",
    "GHIJ3456",
    "KLMN7890"
  ],
  "message": "Two-factor authentication is now enabled. Please save your backup codes."
}
```

**Error Responses:**
| Status | Code | Description |
|--------|------|-------------|
| 400 | INVALID_CODE | TOTP code is incorrect |
| 400 | NO_PENDING_SETUP | No 2FA setup in progress |

---

### 4.3 Verify 2FA at Login

**POST** `/api/auth/2fa/login-verify`

Verify 2FA code during login (after password verification).

**Authentication:** Temporary token (from login response)

**Request Body:**
```json
{
  "tempToken": "eyJhbGciOiJIUzI1NiIs...",
  "code": "123456",
  "isBackupCode": false
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| tempToken | string | Yes | Temporary token from login |
| code | string | Yes | 6-digit TOTP or 8-char backup code |
| isBackupCode | boolean | No | True if using backup code |

**Response (200 OK):**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "name": "User Name",
    "role": "manager"
  },
  "backupCodeWarning": null
}
```

**Backup Code Warning Example:**
```json
{
  "backupCodeWarning": {
    "codesRemaining": 2,
    "message": "You have only 2 backup codes remaining. Consider regenerating."
  }
}
```

**Error Responses:**
| Status | Code | Description |
|--------|------|-------------|
| 400 | INVALID_CODE | TOTP/backup code incorrect |
| 400 | TOKEN_EXPIRED | Temp token expired (5 min) |
| 429 | MAX_ATTEMPTS | 5 failed attempts, re-enter password |

---

### 4.4 Disable 2FA

**DELETE** `/api/auth/2fa`

Disable two-factor authentication.

**Authentication:** JWT

**Request Body:**
```json
{
  "code": "123456"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Two-factor authentication has been disabled."
}
```

---

### 4.5 Regenerate Backup Codes

**POST** `/api/auth/2fa/backup-codes/regenerate`

Generate new backup codes (invalidates old codes).

**Authentication:** JWT

**Request Body:**
```json
{
  "code": "123456"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "backupCodes": [
    "ABCD1234",
    "EFGH5678",
    "..."
  ],
  "message": "New backup codes generated. Previous codes are now invalid."
}
```

---

### 4.6 Get 2FA Status

**GET** `/api/auth/2fa/status`

Get current 2FA status for the user.

**Authentication:** JWT

**Response (200 OK):**
```json
{
  "enabled": true,
  "enabledAt": "2026-01-15T10:00:00Z",
  "backupCodesRemaining": 8,
  "lastUsed": "2026-02-04T09:30:00Z"
}
```

---

## 5. Security Centre APIs

### 5.1 Get Security Summary

**GET** `/api/users/me/security`

Get security status for the current user.

**Authentication:** JWT

**Response (200 OK):**
```json
{
  "accountStatus": "active",
  "twoFactorEnabled": true,
  "twoFactorEnabledAt": "2026-01-15T10:00:00Z",
  "backupCodesRemaining": 8,
  "passwordLastChanged": "2026-01-01T10:00:00Z",
  "lastLogin": {
    "at": "2026-02-04T09:30:00Z",
    "ipAddress": "192.168.1.xxx",
    "browser": "Chrome 120",
    "location": "London, UK"
  },
  "failedLoginAttempts": 0,
  "accountLocked": false
}
```

---

### 5.2 Get Login History

**GET** `/api/users/me/login-history`

Get recent login history for the current user.

**Authentication:** JWT

**Query Parameters:**
| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| limit | integer | 20 | Items to return (max 50) |

**Response (200 OK):**
```json
{
  "data": [
    {
      "at": "2026-02-04T09:30:00Z",
      "ipAddress": "192.168.1.xxx",
      "browser": "Chrome 120",
      "deviceType": "desktop",
      "location": "London, UK",
      "success": true,
      "mfaUsed": true
    },
    {
      "at": "2026-02-03T18:15:00Z",
      "ipAddress": "10.0.0.xxx",
      "browser": "Safari 17",
      "deviceType": "mobile",
      "location": "Manchester, UK",
      "success": false,
      "failureReason": "invalid_password"
    }
  ]
}
```

---

### 5.3 Change Password

**POST** `/api/users/me/change-password`

Change the current user's password.

**Authentication:** JWT

**Request Body:**
```json
{
  "currentPassword": "OldP@ssword123",
  "newPassword": "NewSecureP@ss456"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Your password has been changed successfully."
}
```

**Error Responses:**
| Status | Code | Description |
|--------|------|-------------|
| 400 | INCORRECT_PASSWORD | Current password is wrong |
| 400 | PASSWORD_WEAK | New password doesn't meet requirements |
| 400 | PASSWORD_REUSED | Cannot reuse recent passwords |
| 400 | SAME_PASSWORD | New password same as current |

---

## 6. Security Audit APIs

### 6.1 Query Security Audit Log (Admin)

**GET** `/api/admin/security-audit`

Query security audit events.

**Authentication:** JWT (Admin only)

**Query Parameters:**
| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| eventType | string | all | Filter by event type |
| userId | string | - | Filter by user ID |
| startDate | string | 30 days ago | Start date (ISO 8601) |
| endDate | string | now | End date (ISO 8601) |
| ipAddress | string | - | Filter by IP prefix |
| page | integer | 1 | Page number |
| limit | integer | 50 | Items per page (max 200) |

**Event Types:**
- `LOGIN_SUCCESS`, `LOGIN_FAILURE`
- `LOGOUT`
- `PASSWORD_RESET_REQUEST`, `PASSWORD_RESET_COMPLETE`, `PASSWORD_CHANGED`
- `2FA_ENABLED`, `2FA_DISABLED`, `2FA_BACKUP_USED`
- `ACCESS_REQUEST_CREATED`, `ACCESS_REQUEST_APPROVED`, `ACCESS_REQUEST_REJECTED`
- `USER_CREATED`, `USER_ROLE_CHANGED`, `USER_DISABLED`, `USER_ENABLED`
- `ACCOUNT_LOCKED`, `ACCOUNT_UNLOCKED`

**Response (200 OK):**
```json
{
  "data": [
    {
      "id": "uuid",
      "eventType": "LOGIN_SUCCESS",
      "userId": "uuid",
      "userName": "John Smith",
      "ipAddress": "192.168.1.xxx",
      "userAgent": "Mozilla/5.0...",
      "metadata": {},
      "createdAt": "2026-02-04T10:00:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 50,
    "total": 1250,
    "totalPages": 25
  }
}
```

---

### 6.2 Export Security Audit Log (Admin)

**GET** `/api/admin/security-audit/export`

Export security audit log as CSV.

**Authentication:** JWT (Admin only)

**Query Parameters:** Same as query endpoint

**Response (200 OK):**
- Content-Type: `text/csv`
- Content-Disposition: `attachment; filename="security-audit-2026-02-04.csv"`

---

### 6.3 Get Audit Event Details (Admin)

**GET** `/api/admin/security-audit/:id`

Get detailed information about a specific audit event.

**Authentication:** JWT (Admin only)

**Response (200 OK):**
```json
{
  "id": "uuid",
  "eventType": "USER_ROLE_CHANGED",
  "organisationId": "uuid",
  "userId": "uuid",
  "userName": "Admin User",
  "targetUserId": "uuid",
  "targetUserName": "John Smith",
  "ipAddress": "192.168.1.100",
  "userAgent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)...",
  "metadata": {
    "oldRole": "worker",
    "newRole": "manager"
  },
  "createdAt": "2026-02-04T10:00:00Z"
}
```

---

## 7. Theme APIs

### 7.1 Get Theme Preference

**GET** `/api/users/me/theme`

Get current user's theme preference.

**Authentication:** JWT

**Response (200 OK):**
```json
{
  "themePreference": "dark",
  "effectiveTheme": "dark",
  "organisationDefault": "light"
}
```

---

### 7.2 Update Theme Preference

**PUT** `/api/users/me/theme`

Update user's theme preference.

**Authentication:** JWT

**Request Body:**
```json
{
  "themePreference": "dark"
}
```

| Value | Description |
|-------|-------------|
| light | Light mode |
| dark | Dark mode |
| system | Follow OS preference |

**Response (200 OK):**
```json
{
  "success": true,
  "themePreference": "dark"
}
```

---

### 7.3 Get Organisation Theme (Admin)

**GET** `/api/admin/organisation/theme`

Get organisation's default theme setting.

**Authentication:** JWT (Admin only)

**Response (200 OK):**
```json
{
  "defaultTheme": "light"
}
```

---

### 7.4 Update Organisation Theme (Admin)

**PUT** `/api/admin/organisation/theme`

Update organisation's default theme.

**Authentication:** JWT (Admin only)

**Request Body:**
```json
{
  "defaultTheme": "dark"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "defaultTheme": "dark"
}
```

---

## 8. Modified Authentication API

### 8.1 Login (Updated)

**POST** `/api/auth/login`

Login with email and password (updated for 2FA support).

**Authentication:** None (public)

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "P@ssword123"
}
```

**Response - No 2FA (200 OK):**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "name": "User Name",
    "role": "manager",
    "themePreference": "dark"
  }
}
```

**Response - 2FA Required (200 OK):**
```json
{
  "requires2FA": true,
  "tempToken": "eyJhbGciOiJIUzI1NiIs...",
  "message": "Please enter your two-factor authentication code."
}
```

**Error - Account Locked (423 Locked):**
```json
{
  "error": "ACCOUNT_LOCKED",
  "message": "Your account is locked due to too many failed attempts.",
  "unlocksAt": "2026-02-04T10:30:00Z",
  "minutesRemaining": 12
}
```

---

## 9. Error Response Format

All error responses follow this format:

```json
{
  "error": "ERROR_CODE",
  "message": "Human-readable error message",
  "details": {
    "field": "Additional details if applicable"
  }
}
```

---

## 10. Rate Limiting Headers

Rate-limited endpoints include these response headers:

```
X-RateLimit-Limit: 10
X-RateLimit-Remaining: 7
X-RateLimit-Reset: 1707048000
```

---

## 11. Document History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2026-02-04 | Solution Architect | Initial draft |

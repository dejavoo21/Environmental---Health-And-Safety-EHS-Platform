# Test Strategy – EHS Portal Phase 6
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

Phase 6 introduces critical security features that require comprehensive testing beyond standard functional tests. This document outlines the test strategy covering security-specific testing approaches.

### 1.1 Scope

| Feature | Test Priority |
|---------|---------------|
| Self-Service Access Requests | High |
| Self-Service Password Reset | Critical |
| Two-Factor Authentication | Critical |
| Security Audit Trail | High |
| Security Centre | Medium |
| Theme Customisation | Low |

### 1.2 Testing Approach

```
┌─────────────────────────────────────────────────────────────────┐
│                      Phase 6 Test Pyramid                       │
│                                                                 │
│                         ┌───────┐                               │
│                        ╱         ╲                              │
│                       ╱  Security ╲                             │
│                      ╱   Testing   ╲                            │
│                     ╱───────────────╲                           │
│                    ╱   E2E / UAT     ╲                          │
│                   ╱                   ╲                         │
│                  ╱─────────────────────╲                        │
│                 ╱  Integration Tests    ╲                       │
│                ╱                         ╲                      │
│               ╱───────────────────────────╲                     │
│              ╱      Unit Tests             ╲                    │
│             ╱───────────────────────────────╲                   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 2. Unit Testing Strategy

### 2.1 Backend Unit Tests

#### 2.1.1 Password Reset Service

| Test Case | Description |
|-----------|-------------|
| `generateResetToken_createsValidToken` | Token is 64 chars, URL-safe |
| `hashToken_producesConsistentHash` | Same token → same hash |
| `validateToken_acceptsValidToken` | Token within expiry accepted |
| `validateToken_rejectsExpiredToken` | Token past expiry rejected |
| `validateToken_rejectsUsedToken` | Already used token rejected |
| `validateToken_rejectsInvalidHash` | Tampered token rejected |

#### 2.1.2 TOTP Service

| Test Case | Description |
|-----------|-------------|
| `generateSecret_creates32CharBase32` | Secret is valid base32 |
| `encryptSecret_producesValidCiphertext` | AES-256-GCM output valid |
| `decryptSecret_recoversOriginal` | Decrypt matches original |
| `verifyTOTP_acceptsCurrentWindow` | Code within 30s window valid |
| `verifyTOTP_rejectsExpiredCode` | Code outside window rejected |
| `verifyTOTP_rejectsPreviouslyUsed` | Replay attack prevented |
| `generateBackupCodes_creates10Codes` | Exactly 10 codes generated |
| `hashBackupCode_producesValidBcrypt` | Bcrypt hash is valid |

#### 2.1.3 Access Request Service

| Test Case | Description |
|-----------|-------------|
| `createRequest_validatesOrgCode` | Invalid org code rejected |
| `createRequest_checksRegistrationAllowed` | Disabled org rejected |
| `createRequest_preventsDuplicate` | Same email/org rejected |
| `approveRequest_createsUser` | User account created |
| `approveRequest_generatesPassword` | Temp password generated |
| `rejectRequest_updatesStatus` | Status changes to rejected |

### 2.2 Frontend Unit Tests

#### 2.2.1 Component Tests

| Component | Tests |
|-----------|-------|
| `PasswordStrengthMeter` | Displays correct strength levels |
| `OTPInput` | Handles 6-digit input, auto-advances |
| `BackupCodesDisplay` | Download, copy, print work |
| `ThemeToggle` | Cycles through modes correctly |

#### 2.2.2 Hook Tests

| Hook | Tests |
|------|-------|
| `useTheme` | Returns current theme, toggle works |
| `usePasswordValidation` | Validates all password rules |
| `use2FASetup` | Manages setup wizard state |

---

## 3. Integration Testing Strategy

### 3.1 API Integration Tests

#### 3.1.1 Password Reset Flow

```javascript
describe('Password Reset Flow', () => {
  it('POST /forgot-password sends email for valid user');
  it('POST /forgot-password returns success for unknown email (no leak)');
  it('POST /forgot-password rate limits after 3 attempts');
  it('POST /reset-password with valid token changes password');
  it('POST /reset-password with expired token returns 400');
  it('POST /reset-password invalidates token after use');
  it('POST /reset-password rejects password in history');
});
```

#### 3.1.2 2FA Flow

```javascript
describe('2FA Setup Flow', () => {
  it('POST /2fa/setup returns QR code and secret');
  it('POST /2fa/verify accepts valid TOTP code');
  it('POST /2fa/verify rejects invalid code');
  it('POST /2fa/enable activates 2FA for user');
  it('POST /2fa/enable returns backup codes');
  it('POST /2fa/disable with correct password disables 2FA');
  it('POST /2fa/disable with wrong password returns 401');
});

describe('2FA Login Flow', () => {
  it('POST /login with 2FA returns pending state');
  it('POST /login/verify-2fa with valid code completes login');
  it('POST /login/verify-2fa with backup code completes login');
  it('POST /login/verify-2fa with used backup code fails');
  it('POST /login/verify-2fa rate limits after 5 attempts');
});
```

#### 3.1.3 Access Request Flow

```javascript
describe('Access Request Flow', () => {
  it('POST /access-request creates pending request');
  it('POST /access-request validates org code');
  it('POST /access-request prevents duplicate');
  it('GET /admin/access-requests returns pending list');
  it('POST /access-request/:id/approve creates user');
  it('POST /access-request/:id/reject updates status');
});
```

### 3.2 Database Integration Tests

| Test | Description |
|------|-------------|
| Token expiry cleanup | Scheduled job removes expired tokens |
| Audit log insertion | Events logged with correct fields |
| Login history | Attempts recorded with IP/user-agent |
| Password history | Previous passwords stored correctly |

---

## 4. End-to-End Testing Strategy

### 4.1 E2E Test Scenarios

#### 4.1.1 Password Reset E2E

| Scenario | Steps | Expected Result |
|----------|-------|-----------------|
| Happy path | Request reset → Check email → Click link → Enter new password | Password changed, can login |
| Expired link | Wait >30 mins → Click link | "Link expired" message |
| Weak password | Enter "password123" | Validation error shown |
| Already used | Use same link twice | Second attempt fails |

#### 4.1.2 2FA Setup E2E

| Scenario | Steps | Expected Result |
|----------|-------|-----------------|
| Happy path | Security Centre → Enable 2FA → Scan QR → Enter code → Save backup codes | 2FA enabled |
| Manual entry | Use manual code instead of QR | 2FA enabled |
| Wrong code | Enter incorrect TOTP code | Error message, retry allowed |
| Cancel setup | Start setup → Cancel | 2FA remains disabled |

#### 4.1.3 2FA Login E2E

| Scenario | Steps | Expected Result |
|----------|-------|-----------------|
| Happy path | Login → Enter TOTP → Dashboard | Full access granted |
| Backup code | Login → Use backup code | Full access, code consumed |
| Wrong code | Enter wrong code 5 times | Account locked temporarily |

#### 4.1.4 Access Request E2E

| Scenario | Steps | Expected Result |
|----------|-------|-----------------|
| Request → Approve | Submit request → Admin approves | Welcome email received |
| Request → Reject | Submit request → Admin rejects | Rejection email received |
| Invalid org | Enter wrong org code | "Organisation not found" error |

### 4.2 Playwright Test Files

```
tests/
├── e2e/
│   ├── password-reset.spec.ts
│   ├── 2fa-setup.spec.ts
│   ├── 2fa-login.spec.ts
│   ├── access-request.spec.ts
│   ├── security-centre.spec.ts
│   └── theme-switching.spec.ts
```

---

## 5. Security Testing Strategy

### 5.1 OWASP Top 10 Testing

| Vulnerability | Test Approach | Priority |
|---------------|---------------|----------|
| A01 Broken Access Control | Verify 2FA enforced, session management | Critical |
| A02 Cryptographic Failures | Verify encryption at rest, TLS | Critical |
| A03 Injection | SQL injection on all inputs | Critical |
| A04 Insecure Design | Review password reset flow | High |
| A05 Security Misconfiguration | Check headers, CORS, defaults | High |
| A06 Vulnerable Components | Dependency audit | Medium |
| A07 Auth Failures | Brute force, credential stuffing | Critical |
| A08 Integrity Failures | Token tampering, CSRF | High |
| A09 Logging Failures | Verify audit log coverage | Medium |
| A10 SSRF | No external URLs in Phase 6 | Low |

### 5.2 Authentication Security Tests

#### 5.2.1 Password Reset Vulnerabilities

| Test | Attack Vector | Expected Behaviour |
|------|---------------|-------------------|
| Token enumeration | Try to guess valid tokens | Random 64-char makes impractical |
| Email enumeration | Check for different responses | Same response for valid/invalid |
| Token reuse | Use token after password changed | Token invalidated |
| Password spray | Try common passwords | Complexity requirements block |
| History bypass | Set password to previous | Last 5 passwords rejected |

#### 5.2.2 2FA Vulnerabilities

| Test | Attack Vector | Expected Behaviour |
|------|---------------|-------------------|
| TOTP brute force | Try all 6-digit codes | Rate limited after 5 attempts |
| TOTP replay | Use same code twice | Code invalidated after use |
| Backup code reuse | Use same backup code twice | Code marked as used |
| 2FA bypass | Try to access with pending 2FA | Middleware blocks access |
| Secret extraction | Try to read TOTP secret | Encrypted at rest |

#### 5.2.3 Access Request Vulnerabilities

| Test | Attack Vector | Expected Behaviour |
|------|---------------|-------------------|
| Self-approval | User approves own request | Admin role required |
| Org enumeration | Check for different responses | Same response for valid/invalid |
| Request flooding | Submit many requests | Rate limited, duplicate blocked |

### 5.3 Rate Limiting Tests

| Endpoint | Limit | Test Method |
|----------|-------|-------------|
| POST /login | 10/15min | Send 11 requests, verify 429 |
| POST /forgot-password | 3/hour | Send 4 requests, verify 429 |
| POST /login/verify-2fa | 5/15min | Send 6 requests, verify 429 |
| POST /access-request | 3/24h | Send 4 requests, verify 429 |

### 5.4 Encryption Tests

| Component | Verification |
|-----------|--------------|
| TOTP secrets | Encrypted with AES-256-GCM |
| Password reset tokens | Hashed with SHA-256 |
| Backup codes | Hashed with bcrypt |
| Passwords | Hashed with bcrypt (cost 12) |
| Session tokens | Signed with secure secret |

---

## 6. Accessibility Testing

### 6.1 WCAG 2.1 AA Compliance

| Feature | Accessibility Requirements |
|---------|---------------------------|
| OTP Input | Keyboard navigable, screen reader labels |
| QR Code | Manual code alternative always visible |
| Password strength | Announcements for screen readers |
| Theme toggle | Keyboard accessible, state announced |
| Error messages | aria-live regions |

### 6.2 Accessibility Test Tools

| Tool | Purpose |
|------|---------|
| axe-core | Automated accessibility scanning |
| NVDA | Screen reader testing |
| Lighthouse | Accessibility auditing |
| Keyboard-only | Navigation testing |

---

## 7. Performance Testing

### 7.1 Performance Benchmarks

| Operation | Target | Max |
|-----------|--------|-----|
| Password hash (bcrypt) | <200ms | 500ms |
| TOTP verification | <50ms | 100ms |
| Token generation | <10ms | 50ms |
| Audit log insert | <20ms | 50ms |
| Login history query | <100ms | 200ms |

### 7.2 Load Testing Scenarios

| Scenario | Load | Duration |
|----------|------|----------|
| Concurrent logins (with 2FA) | 50 users | 5 min |
| Password reset surge | 100 requests | 1 min |
| Audit log query | 10 concurrent | 1 min |

---

## 8. Test Environment

### 8.1 Environment Configuration

| Component | Test Environment |
|-----------|------------------|
| Database | PostgreSQL (isolated instance) |
| Email | Mailhog (local SMTP trap) |
| TOTP | Fixed test secrets |
| Encryption | Test key (not production) |

### 8.2 Test Data

| Data | Seed |
|------|------|
| Test users | `admin@test.com`, `user@test.com` |
| 2FA-enabled user | `2fa-user@test.com` |
| Org codes | `TEST-ORG-001`, `TEST-ORG-002` |
| Expired token | Pre-seeded expired reset token |

---

## 9. Test Reporting

### 9.1 Coverage Requirements

| Category | Minimum Coverage |
|----------|------------------|
| Unit tests | 80% |
| Integration tests | 90% of endpoints |
| E2E tests | All critical paths |
| Security tests | All OWASP Top 10 |

### 9.2 Defect Severity

| Severity | Definition | SLA |
|----------|------------|-----|
| Critical | Security vulnerability, data loss | Fix before release |
| High | Feature broken, no workaround | Fix before release |
| Medium | Feature degraded, workaround exists | Fix in next sprint |
| Low | Cosmetic, minor UX issue | Backlog |

---

## 10. UAT Test Cases

### 10.1 UAT Scenarios

| ID | Scenario | Role | Steps |
|----|----------|------|-------|
| UAT-6.01 | Request access | New user | Visit request page, submit form, receive confirmation |
| UAT-6.02 | Approve access | Admin | View pending requests, approve with role assignment |
| UAT-6.03 | Password reset | User | Request reset, click email link, set new password |
| UAT-6.04 | Enable 2FA | User | Setup 2FA, scan QR, verify code, save backup codes |
| UAT-6.05 | Login with 2FA | User | Enter credentials, enter TOTP, access granted |
| UAT-6.06 | Use backup code | User | Enter credentials, use backup code, access granted |
| UAT-6.07 | View security info | User | Open Security Centre, view login history |
| UAT-6.08 | Switch theme | User | Toggle theme, verify persistence |
| UAT-6.09 | View audit log | Admin | Open audit log, filter by event type |

---

## 11. Document History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2026-02-04 | Solution Architect | Initial draft |

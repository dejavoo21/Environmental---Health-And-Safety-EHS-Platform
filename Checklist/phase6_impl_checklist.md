# Phase 6 Implementation Checklist
## Security, Trust & Self-Service

| Item | Detail |
|------|--------|
| Document Version | 1.0 |
| Author | Solution Architect |
| Date | 2026-02-04 |
| Phase Duration | 4 Sprints (8 weeks) |

---

## Legend

- ⬜ Not Started
- 🟡 In Progress
- ✅ Completed
- ❌ Blocked/Cancelled

---

## Sprint 1: Foundation (Weeks 1-2)

### Database & Infrastructure

| ID | Task | Owner | Status | Notes |
|----|------|-------|--------|-------|
| S1-001 | Create migration 006_phase6_security.sql | Backend | ⬜ | |
| S1-002 | Add access_requests table | Backend | ⬜ | |
| S1-003 | Add password_reset_tokens table | Backend | ⬜ | |
| S1-004 | Add user_2fa table | Backend | ⬜ | |
| S1-005 | Add user_backup_codes table | Backend | ⬜ | |
| S1-006 | Add security_audit_log table | Backend | ⬜ | |
| S1-007 | Add login_history table | Backend | ⬜ | |
| S1-008 | Add user_password_history table | Backend | ⬜ | |
| S1-009 | Modify users table (failed_attempts, locked_until, theme_preference) | Backend | ⬜ | |
| S1-010 | Modify organisations table (self_registration_allowed, org_code) | Backend | ⬜ | |
| S1-011 | Create indexes for security tables | Backend | ⬜ | |
| S1-012 | Test migration rollback | Backend | ⬜ | |

### Password Reset - Backend

| ID | Task | Owner | Status | Notes |
|----|------|-------|--------|-------|
| S1-013 | Create PasswordResetService | Backend | ⬜ | |
| S1-014 | Implement token generation (crypto.randomBytes) | Backend | ⬜ | |
| S1-015 | Implement token hashing (SHA-256) | Backend | ⬜ | |
| S1-016 | Create POST /forgot-password endpoint | Backend | ⬜ | |
| S1-017 | Create POST /reset-password endpoint | Backend | ⬜ | |
| S1-018 | Create GET /reset-password/verify endpoint | Backend | ⬜ | |
| S1-019 | Create password reset email template | Backend | ⬜ | |
| S1-020 | Implement password validation utility | Backend | ⬜ | |
| S1-021 | Implement password history check | Backend | ⬜ | |
| S1-022 | Add rate limiting for forgot-password (3/hour) | Backend | ⬜ | |
| S1-023 | Unit tests for PasswordResetService | Backend | ⬜ | |
| S1-024 | Integration tests for password reset endpoints | Backend | ⬜ | |

### Password Reset - Frontend

| ID | Task | Owner | Status | Notes |
|----|------|-------|--------|-------|
| S1-025 | Create ForgotPasswordPage component | Frontend | ⬜ | |
| S1-026 | Create ResetPasswordPage component | Frontend | ⬜ | |
| S1-027 | Create PasswordStrengthMeter component | Frontend | ⬜ | |
| S1-028 | Implement password validation rules display | Frontend | ⬜ | |
| S1-029 | Handle expired/invalid token states | Frontend | ⬜ | |
| S1-030 | Add success confirmation page | Frontend | ⬜ | |
| S1-031 | Add forgot password link to login page | Frontend | ⬜ | |
| S1-032 | Add routes for /forgot-password and /reset-password | Frontend | ⬜ | |
| S1-033 | E2E tests for password reset flow | QA | ⬜ | |

### Security Infrastructure

| ID | Task | Owner | Status | Notes |
|----|------|-------|--------|-------|
| S1-034 | Create SecurityAuditService | Backend | ⬜ | |
| S1-035 | Implement logSecurityEvent method | Backend | ⬜ | |
| S1-036 | Add login success/failure logging | Backend | ⬜ | |
| S1-037 | Create LoginHistoryService | Backend | ⬜ | |
| S1-038 | Record login attempts with IP/user-agent | Backend | ⬜ | |
| S1-039 | Create scheduled job: cleanup expired tokens | Backend | ⬜ | |
| S1-040 | Unit tests for SecurityAuditService | Backend | ⬜ | |

---

## Sprint 2: Two-Factor Authentication (Weeks 3-4)

### 2FA - Backend Core

| ID | Task | Owner | Status | Notes |
|----|------|-------|--------|-------|
| S2-001 | Install otplib package | Backend | ⬜ | |
| S2-002 | Create crypto utility for TOTP secret encryption | Backend | ⬜ | |
| S2-003 | Implement encryptTOTPSecret (AES-256-GCM) | Backend | ⬜ | |
| S2-004 | Implement decryptTOTPSecret | Backend | ⬜ | |
| S2-005 | Configure TOTP_ENCRYPTION_KEY environment variable | DevOps | ⬜ | |
| S2-006 | Create TwoFactorAuthService | Backend | ⬜ | |
| S2-007 | Implement TOTP secret generation | Backend | ⬜ | |
| S2-008 | Implement TOTP verification | Backend | ⬜ | |
| S2-009 | Implement TOTP replay prevention | Backend | ⬜ | |

### 2FA - Backup Codes

| ID | Task | Owner | Status | Notes |
|----|------|-------|--------|-------|
| S2-010 | Implement backup code generation (10 codes) | Backend | ⬜ | |
| S2-011 | Implement backup code hashing (bcrypt) | Backend | ⬜ | |
| S2-012 | Implement backup code verification | Backend | ⬜ | |
| S2-013 | Implement backup code invalidation after use | Backend | ⬜ | |
| S2-014 | Implement backup code regeneration | Backend | ⬜ | |

### 2FA - API Endpoints

| ID | Task | Owner | Status | Notes |
|----|------|-------|--------|-------|
| S2-015 | Create POST /2fa/setup endpoint | Backend | ⬜ | |
| S2-016 | Create POST /2fa/verify endpoint | Backend | ⬜ | |
| S2-017 | Create POST /2fa/enable endpoint | Backend | ⬜ | |
| S2-018 | Create POST /2fa/disable endpoint | Backend | ⬜ | |
| S2-019 | Create GET /2fa/status endpoint | Backend | ⬜ | |
| S2-020 | Create POST /2fa/backup-codes/regenerate endpoint | Backend | ⬜ | |
| S2-021 | Create GET /2fa/backup-codes/count endpoint | Backend | ⬜ | |

### 2FA - Login Flow Modification

| ID | Task | Owner | Status | Notes |
|----|------|-------|--------|-------|
| S2-022 | Modify POST /login to check 2FA status | Backend | ⬜ | |
| S2-023 | Return 2fa_pending state when 2FA enabled | Backend | ⬜ | |
| S2-024 | Generate temporary 2FA token | Backend | ⬜ | |
| S2-025 | Create POST /login/verify-2fa endpoint | Backend | ⬜ | |
| S2-026 | Create POST /login/verify-backup-code endpoint | Backend | ⬜ | |
| S2-027 | Add rate limiting for 2FA verification (5/15min) | Backend | ⬜ | |
| S2-028 | Create 2FA verification middleware | Backend | ⬜ | |
| S2-029 | Unit tests for TwoFactorAuthService | Backend | ⬜ | |
| S2-030 | Integration tests for 2FA endpoints | Backend | ⬜ | |
| S2-031 | Integration tests for modified login flow | Backend | ⬜ | |

### 2FA - Frontend

| ID | Task | Owner | Status | Notes |
|----|------|-------|--------|-------|
| S2-032 | Create OTPInput component (6-digit) | Frontend | ⬜ | |
| S2-033 | Create 2FA setup wizard container | Frontend | ⬜ | |
| S2-034 | Create Step 1: QR code display | Frontend | ⬜ | |
| S2-035 | Create manual key copy functionality | Frontend | ⬜ | |
| S2-036 | Create Step 2: Code verification | Frontend | ⬜ | |
| S2-037 | Create Step 3: Backup codes display | Frontend | ⬜ | |
| S2-038 | Create BackupCodesDisplay component | Frontend | ⬜ | |
| S2-039 | Implement backup codes download (TXT) | Frontend | ⬜ | |
| S2-040 | Implement backup codes copy to clipboard | Frontend | ⬜ | |
| S2-041 | Implement backup codes print | Frontend | ⬜ | |
| S2-042 | Create 2FA prompt modal for login | Frontend | ⬜ | |
| S2-043 | Create backup code entry modal | Frontend | ⬜ | |
| S2-044 | Modify login flow to handle 2fa_pending | Frontend | ⬜ | |
| S2-045 | Create 2FA disable confirmation modal | Frontend | ⬜ | |
| S2-046 | E2E tests for 2FA setup flow | QA | ⬜ | |
| S2-047 | E2E tests for 2FA login flow | QA | ⬜ | |
| S2-048 | E2E tests for backup code usage | QA | ⬜ | |

---

## Sprint 3: Access Requests & Security Centre (Weeks 5-6)

### Access Requests - Backend

| ID | Task | Owner | Status | Notes |
|----|------|-------|--------|-------|
| S3-001 | Create AccessRequestService | Backend | ⬜ | |
| S3-002 | Implement org code validation | Backend | ⬜ | |
| S3-003 | Implement self-registration check | Backend | ⬜ | |
| S3-004 | Implement duplicate request prevention | Backend | ⬜ | |
| S3-005 | Create POST /access-request endpoint | Backend | ⬜ | |
| S3-006 | Create GET /admin/access-requests endpoint | Backend | ⬜ | |
| S3-007 | Create GET /admin/access-requests/:id endpoint | Backend | ⬜ | |
| S3-008 | Create POST /admin/access-requests/:id/approve endpoint | Backend | ⬜ | |
| S3-009 | Create POST /admin/access-requests/:id/reject endpoint | Backend | ⬜ | |
| S3-010 | Implement user creation on approval | Backend | ⬜ | |
| S3-011 | Generate temporary password for new users | Backend | ⬜ | |
| S3-012 | Create welcome email template | Backend | ⬜ | |
| S3-013 | Create rejection email template (optional) | Backend | ⬜ | |
| S3-014 | Create access request confirmation email | Backend | ⬜ | |
| S3-015 | Add rate limiting for access-request (3/24h) | Backend | ⬜ | |
| S3-016 | Unit tests for AccessRequestService | Backend | ⬜ | |
| S3-017 | Integration tests for access request endpoints | Backend | ⬜ | |

### Access Requests - Frontend

| ID | Task | Owner | Status | Notes |
|----|------|-------|--------|-------|
| S3-018 | Create RequestAccessPage component | Frontend | ⬜ | |
| S3-019 | Implement form with all required fields | Frontend | ⬜ | |
| S3-020 | Add terms of service checkbox | Frontend | ⬜ | |
| S3-021 | Create success state with reference number | Frontend | ⬜ | |
| S3-022 | Add link to request access from login page | Frontend | ⬜ | |
| S3-023 | Create AdminAccessRequestsPage | Frontend | ⬜ | |
| S3-024 | Implement tabs (Pending/Approved/Rejected/All) | Frontend | ⬜ | |
| S3-025 | Create request list table | Frontend | ⬜ | |
| S3-026 | Create approve modal with role/site selection | Frontend | ⬜ | |
| S3-027 | Create reject modal with reason input | Frontend | ⬜ | |
| S3-028 | Add navigation link under Admin menu | Frontend | ⬜ | |
| S3-029 | E2E tests for access request submission | QA | ⬜ | |
| S3-030 | E2E tests for access request approval | QA | ⬜ | |

### Security Centre - Backend

| ID | Task | Owner | Status | Notes |
|----|------|-------|--------|-------|
| S3-031 | Create GET /security-centre endpoint | Backend | ⬜ | |
| S3-032 | Create GET /login-history endpoint | Backend | ⬜ | |
| S3-033 | Create POST /change-password endpoint | Backend | ⬜ | |
| S3-034 | Implement password reuse prevention | Backend | ⬜ | |
| S3-035 | Add 2FA status to security centre response | Backend | ⬜ | |
| S3-036 | Unit tests for security centre endpoints | Backend | ⬜ | |

### Security Centre - Frontend

| ID | Task | Owner | Status | Notes |
|----|------|-------|--------|-------|
| S3-037 | Create SecurityCentrePage | Frontend | ⬜ | |
| S3-038 | Implement Account Status section | Frontend | ⬜ | |
| S3-039 | Implement Two-Factor Authentication section | Frontend | ⬜ | |
| S3-040 | Implement Password section | Frontend | ⬜ | |
| S3-041 | Implement Login History section | Frontend | ⬜ | |
| S3-042 | Create LoginHistoryTable component | Frontend | ⬜ | |
| S3-043 | Create ChangePasswordModal | Frontend | ⬜ | |
| S3-044 | Add navigation link to Security Centre | Frontend | ⬜ | |
| S3-045 | E2E tests for Security Centre | QA | ⬜ | |

---

## Sprint 4: Theme & Polish (Weeks 7-8)

### Theme System - Backend

| ID | Task | Owner | Status | Notes |
|----|------|-------|--------|-------|
| S4-001 | Add theme_preference column to users | Backend | ⬜ | Already in migration |
| S4-002 | Create PATCH /theme endpoint | Backend | ⬜ | |
| S4-003 | Include theme in user profile response | Backend | ⬜ | |

### Theme System - Frontend

| ID | Task | Owner | Status | Notes |
|----|------|-------|--------|-------|
| S4-004 | Create ThemeContext and ThemeProvider | Frontend | ⬜ | |
| S4-005 | Create useTheme hook | Frontend | ⬜ | |
| S4-006 | Define CSS variables for light theme | Frontend | ⬜ | |
| S4-007 | Define CSS variables for dark theme | Frontend | ⬜ | |
| S4-008 | Implement system theme detection | Frontend | ⬜ | |
| S4-009 | Create ThemeToggle component | Frontend | ⬜ | |
| S4-010 | Add ThemeToggle to header | Frontend | ⬜ | |
| S4-011 | Persist theme to localStorage | Frontend | ⬜ | |
| S4-012 | Sync theme with backend on change | Frontend | ⬜ | |
| S4-013 | Test all components in dark mode | Frontend | ⬜ | |
| S4-014 | Fix component styling issues in dark mode | Frontend | ⬜ | |
| S4-015 | E2E tests for theme switching | QA | ⬜ | |

### Security Audit Log

| ID | Task | Owner | Status | Notes |
|----|------|-------|--------|-------|
| S4-016 | Create GET /admin/security-audit endpoint | Backend | ⬜ | |
| S4-017 | Implement filters (event_type, user, date range) | Backend | ⬜ | |
| S4-018 | Implement pagination | Backend | ⬜ | |
| S4-019 | Implement CSV export | Backend | ⬜ | |
| S4-020 | Create SecurityAuditLogPage | Frontend | ⬜ | |
| S4-021 | Implement filter controls | Frontend | ⬜ | |
| S4-022 | Implement audit log table | Frontend | ⬜ | |
| S4-023 | Implement CSV export button | Frontend | ⬜ | |
| S4-024 | Add navigation link under Admin menu | Frontend | ⬜ | |
| S4-025 | E2E tests for audit log | QA | ⬜ | |

### Account Lockout

| ID | Task | Owner | Status | Notes |
|----|------|-------|--------|-------|
| S4-026 | Implement account lockout on 5 failed attempts | Backend | ⬜ | |
| S4-027 | Create lockout notification email template | Backend | ⬜ | |
| S4-028 | Implement automatic unlock after 15 minutes | Backend | ⬜ | |
| S4-029 | Add admin unlock endpoint | Backend | ⬜ | |
| S4-030 | Show lockout status in user management | Frontend | ⬜ | |
| S4-031 | Add unlock button for admins | Frontend | ⬜ | |

### Quality & Security Review

| ID | Task | Owner | Status | Notes |
|----|------|-------|--------|-------|
| S4-032 | Security review: Password reset flow | Security | ⬜ | |
| S4-033 | Security review: 2FA implementation | Security | ⬜ | |
| S4-034 | Security review: Token handling | Security | ⬜ | |
| S4-035 | Security review: Rate limiting | Security | ⬜ | |
| S4-036 | Security review: Encryption implementation | Security | ⬜ | |
| S4-037 | Penetration testing | Security | ⬜ | |
| S4-038 | Fix security findings (P0/P1) | Backend | ⬜ | |
| S4-039 | Accessibility audit | QA | ⬜ | |
| S4-040 | Fix accessibility issues | Frontend | ⬜ | |
| S4-041 | Performance testing | QA | ⬜ | |
| S4-042 | Fix performance issues | Backend | ⬜ | |

### Documentation & Deployment

| ID | Task | Owner | Status | Notes |
|----|------|-------|--------|-------|
| S4-043 | Update API documentation | Backend | ⬜ | |
| S4-044 | Update user documentation | Tech Writer | ⬜ | |
| S4-045 | Create admin guide for access requests | Tech Writer | ⬜ | |
| S4-046 | Create user guide for 2FA | Tech Writer | ⬜ | |
| S4-047 | Update environment variable documentation | DevOps | ⬜ | |
| S4-048 | Configure production secrets (TOTP key) | DevOps | ⬜ | |
| S4-049 | Deploy to staging | DevOps | ⬜ | |
| S4-050 | UAT testing | QA | ⬜ | |
| S4-051 | UAT sign-off | Stakeholders | ⬜ | |
| S4-052 | Deploy to production | DevOps | ⬜ | |
| S4-053 | Post-deployment verification | DevOps | ⬜ | |
| S4-054 | Monitor error rates | DevOps | ⬜ | |

---

## Summary

| Sprint | Total Tasks | Completed | Progress |
|--------|-------------|-----------|----------|
| Sprint 1 | 40 | 0 | 0% |
| Sprint 2 | 48 | 0 | 0% |
| Sprint 3 | 45 | 0 | 0% |
| Sprint 4 | 54 | 0 | 0% |
| **Total** | **187** | **0** | **0%** |

---

## Document History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2026-02-04 | Solution Architect | Initial draft |

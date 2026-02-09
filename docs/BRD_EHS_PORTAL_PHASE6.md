# Business Requirements Document – EHS Portal Phase 6
## Security, Trust & Self-Service

| Item | Detail |
|------|--------|
| Document Version | 1.0 |
| Author | Solution Architect |
| Date | 2026-02-04 |
| Status | Draft |
| Phase | 6 – Security, Trust & Self-Service |

---

## 1. Executive Summary

Phase 6 elevates the EHS Portal to enterprise-grade security standards by adding self-service capabilities, two-factor authentication, enhanced audit trails, and user experience customisation. These features address the trust and security requirements of larger organisations while improving user autonomy.

### 1.1 Business Context

With Phases 1-5 complete, the EHS Portal provides comprehensive incident management, inspections, actions, notifications, and analytics. However, enterprise customers require:

- **Self-service onboarding:** New users cannot request access without admin intervention
- **Password recovery:** Users depend on admins to reset passwords
- **Enhanced security:** No MFA option increases account compromise risk
- **Security visibility:** Limited visibility into login activity and security events
- **User preferences:** No personalisation options (themes, appearance)

Phase 6 addresses these gaps with a comprehensive security and self-service framework.

### 1.2 Business Goals

| Goal ID | Goal | Success Metric |
|---------|------|----------------|
| G-P6-01 | Reduce admin burden for user management | 70% of new users onboard via self-service |
| G-P6-02 | Eliminate password reset support tickets | 90% of password resets are self-service |
| G-P6-03 | Strengthen account security | 50% of users enable 2FA within 6 months |
| G-P6-04 | Enable security compliance auditing | 100% of security events captured in audit trail |
| G-P6-05 | Improve user experience satisfaction | 80% user satisfaction with theme preferences |
| G-P6-06 | Meet enterprise security requirements | Pass SOC 2 / ISO 27001 security controls |

### 1.3 Scope

**In Scope:**
- Self-service access request with admin approval workflow
- Self-service password reset via email link
- Two-factor authentication (TOTP-based)
- Enhanced security audit trail for security events
- User-facing Security Centre page
- Light/dark theme toggle with per-user persistence
- Recovery/backup codes for 2FA

**Out of Scope:**
- Single Sign-On (SSO) / SAML / OAuth integration – future phase
- SMS-based OTP (cost and compliance considerations)
- Biometric authentication
- Session device management with remote logout
- Full brand customisation (logos, colours) – future phase
- Hardware security keys (FIDO2/WebAuthn)

---

## 2. Stakeholders

| Stakeholder | Role | Interest |
|-------------|------|----------|
| Prospective Users | Access requesters | Simple, transparent access request process |
| Workers | Registered users | Password reset, 2FA, theme preferences |
| Managers | Team leads | View team security status |
| Admins | User administrators | Approve/reject access requests, view audit logs |
| Security Officer | Compliance | Security audit trail, 2FA adoption metrics |
| IT Support | Helpdesk | Reduced password reset tickets |

---

## 3. Business Requirements

### 3.1 Self-Service Access Request (BR-ACCESS)

#### BR-ACCESS-01: Public Access Request Form
**Priority:** Must Have

The system shall provide a public-facing access request form where prospective users can submit a request to join an organisation.

**Form Fields:**
- Full name (required)
- Email address (required, validated format)
- Organisation code or name (required, from dropdown or free text with lookup)
- Requested role (dropdown: Worker, Manager)
- Reason/justification (optional, max 500 characters)
- Acknowledgement checkbox for terms of service

**Acceptance Criteria:**
- Form is accessible without authentication at `/request-access`
- Email address is validated for uniqueness (no existing user/request with same email)
- Organisation lookup validates against active organisations
- Successful submission shows confirmation message with reference number
- Submitter receives email confirmation with request reference

**Capability ID:** C-140

---

#### BR-ACCESS-02: Access Request Queue for Admins
**Priority:** Must Have

Admins shall be able to view and manage pending access requests for their organisation.

**Features:**
- List view of pending requests with: name, email, requested role, date submitted, status
- Filter by status (pending, approved, rejected, expired)
- Sort by date (newest first by default)
- Pagination for large request volumes

**Acceptance Criteria:**
- Only org admins can view requests for their organisation
- Request list refreshes when new requests arrive
- Count of pending requests shown in admin navigation badge

**Capability ID:** C-141

---

#### BR-ACCESS-03: Approve Access Request
**Priority:** Must Have

Admins shall be able to approve access requests, which creates the user account.

**Approval Process:**
1. Admin reviews request details
2. Admin can optionally adjust the assigned role
3. Admin confirms approval
4. System creates user with temporary password
5. System sends welcome email with login instructions and temporary password
6. Request status changes to "approved"

**Acceptance Criteria:**
- Approved user can log in immediately
- Welcome email includes organisation name, role, and login URL
- Temporary password expires after first login (force password change)
- Audit log entry created for approval

**Capability ID:** C-142

---

#### BR-ACCESS-04: Reject Access Request
**Priority:** Must Have

Admins shall be able to reject access requests with an optional reason.

**Rejection Process:**
1. Admin reviews request details
2. Admin clicks "Reject"
3. Admin optionally enters rejection reason
4. System updates request status to "rejected"
5. System sends polite rejection email if configured

**Acceptance Criteria:**
- Rejected requests remain in history for audit purposes
- Rejection reason is stored but not shared verbatim with requester
- Email (if sent) uses polite, non-specific language
- Audit log entry created for rejection

**Capability ID:** C-143

---

#### BR-ACCESS-05: Request Expiry and Spam Protection
**Priority:** Should Have

The system shall implement basic protections against abuse.

**Protections:**
- Pending requests expire after 30 days
- Rate limiting: max 3 requests per email per 24 hours
- CAPTCHA or simple challenge on request form
- Email verification step (optional enhancement)

**Acceptance Criteria:**
- Expired requests auto-marked as "expired"
- Rate limit returns friendly error message
- No duplicate pending requests for same email/org combination

**Capability ID:** C-144

---

### 3.2 Self-Service Password Reset (BR-PWRESET)

#### BR-PWRESET-01: Forgot Password Flow
**Priority:** Must Have

Users shall be able to initiate password reset from the login page.

**Flow:**
1. User clicks "Forgot password?" on login page
2. User enters their email address
3. System validates email format (but does not reveal if user exists)
4. If user exists, system generates secure token and sends reset email
5. User always sees same message: "If this email exists, you will receive reset instructions"

**Acceptance Criteria:**
- No user enumeration (same response whether email exists or not)
- Reset email contains secure, one-time link
- Link is valid for 30 minutes (configurable)
- Reset email includes security warning about unsolicited emails

**Capability ID:** C-145

---

#### BR-PWRESET-02: Password Reset Token
**Priority:** Must Have

The system shall generate and manage secure password reset tokens.

**Token Requirements:**
- Cryptographically random, minimum 32 bytes
- Single-use (invalidated after successful reset)
- Time-limited (default 30 minutes, configurable 15-60 minutes)
- Bound to specific user
- Stored hashed (not plaintext)

**Acceptance Criteria:**
- Token cannot be reused after successful reset
- Token cannot be used after expiry
- New reset request invalidates any existing tokens
- Max 3 reset requests per hour per email (rate limiting)

**Capability ID:** C-146

---

#### BR-PWRESET-03: Reset Password Form
**Priority:** Must Have

Users shall be able to set a new password using the reset link.

**Form Requirements:**
- New password field (with visibility toggle)
- Confirm password field
- Password strength indicator
- Clear validation messages

**Acceptance Criteria:**
- Password must meet complexity requirements (min 8 chars, mixed case, number)
- Form validates token before showing password fields
- Invalid/expired token shows clear error with link to request new reset
- Successful reset redirects to login with success message
- User receives confirmation email after password change

**Capability ID:** C-147

---

#### BR-PWRESET-04: Brute Force Protection
**Priority:** Must Have

The system shall protect against brute force attacks on reset flow.

**Protections:**
- Rate limit reset requests (3 per hour per email)
- Rate limit reset attempts (5 per token, then invalidate)
- Account lockout after 10 failed login attempts (15-minute lockout)
- Log all reset attempts for security audit

**Acceptance Criteria:**
- Rate limiting returns user-friendly messages
- Lockout duration is configurable
- All events logged to security audit trail

**Capability ID:** C-148

---

### 3.3 Two-Factor Authentication (BR-2FA)

#### BR-2FA-01: TOTP Setup Flow
**Priority:** Must Have

Users shall be able to enable TOTP-based two-factor authentication.

**Setup Flow:**
1. User navigates to Security Centre
2. User clicks "Enable Two-Factor Authentication"
3. System generates TOTP secret and displays:
   - QR code for authenticator app scanning
   - Manual entry code (for users who can't scan)
   - Instructions for setup
4. User enters 6-digit code from authenticator to verify
5. If valid, 2FA is enabled
6. User is shown backup/recovery codes (one-time use)

**Acceptance Criteria:**
- QR code uses standard otpauth:// URI format
- Secret is 160-bit minimum, Base32 encoded
- Manual code displayed below QR for accessibility
- Verification requires valid TOTP code
- 10 backup codes generated and displayed for user to save
- User must confirm they have saved backup codes

**Capability ID:** C-150

---

#### BR-2FA-02: Login with 2FA
**Priority:** Must Have

Users with 2FA enabled shall provide a code after password authentication.

**Login Flow:**
1. User enters email and password
2. Password validates successfully
3. System detects 2FA is enabled
4. User is prompted for 6-digit TOTP code
5. User enters code from authenticator app
6. If valid (within time window), login completes
7. If invalid, user can retry (max 5 attempts)

**Acceptance Criteria:**
- TOTP validates current code ±1 time window (30 seconds)
- Invalid code shows error, allows retry
- 5 failed attempts require password re-entry
- Login success/failure logged to security audit

**Capability ID:** C-151

---

#### BR-2FA-03: Backup/Recovery Codes
**Priority:** Must Have

Users shall be able to use backup codes if they lose access to their authenticator.

**Backup Code Features:**
- 10 single-use backup codes generated on 2FA setup
- Each code is 8 characters (alphanumeric, easy to read)
- User can regenerate codes (invalidates old codes)
- Codes work in place of TOTP during login

**Acceptance Criteria:**
- Backup code login logs special audit entry
- Used backup codes cannot be reused
- User warned when using last 3 backup codes
- Regenerating codes requires 2FA verification

**Capability ID:** C-152

---

#### BR-2FA-04: Disable 2FA
**Priority:** Must Have

Users shall be able to disable 2FA from Security Centre.

**Disable Flow:**
1. User navigates to Security Centre
2. User clicks "Disable Two-Factor Authentication"
3. User must enter current TOTP code to confirm
4. 2FA is disabled, secret and backup codes deleted

**Acceptance Criteria:**
- Requires valid TOTP or backup code to disable
- Confirmation dialog warns about reduced security
- Disable event logged to security audit
- User receives email notification that 2FA was disabled

**Capability ID:** C-153

---

#### BR-2FA-05: Admin 2FA Policy (Future)
**Priority:** Could Have

Admins could configure 2FA requirements at organisation level.

**Policy Options:**
- Optional (default) – users choose
- Encouraged – reminder prompts
- Required – enforced for all users

**Note:** This is marked as future enhancement for Phase 6+.

**Capability ID:** C-154 (Future)

---

### 3.4 Enhanced Security Audit Trail (BR-AUDIT)

#### BR-AUDIT-01: Security Event Logging
**Priority:** Must Have

The system shall log all security-relevant events to a dedicated audit trail.

**Events to Log:**
| Event Type | Details Captured |
|------------|------------------|
| LOGIN_SUCCESS | user_id, ip_address, user_agent |
| LOGIN_FAILURE | attempted_email, ip_address, user_agent, reason |
| LOGOUT | user_id |
| PASSWORD_RESET_REQUEST | email (hashed), ip_address |
| PASSWORD_RESET_COMPLETE | user_id, ip_address |
| PASSWORD_CHANGED | user_id, method (self/admin) |
| 2FA_ENABLED | user_id |
| 2FA_DISABLED | user_id |
| 2FA_BACKUP_USED | user_id, backup_code_index |
| 2FA_CODES_REGENERATED | user_id |
| ACCESS_REQUEST_CREATED | request_id, email, org_id |
| ACCESS_REQUEST_APPROVED | request_id, approver_id |
| ACCESS_REQUEST_REJECTED | request_id, approver_id |
| USER_CREATED | user_id, created_by |
| USER_ROLE_CHANGED | user_id, old_role, new_role, changed_by |
| USER_DISABLED | user_id, disabled_by |
| USER_ENABLED | user_id, enabled_by |
| ACCOUNT_LOCKOUT | user_id, reason, ip_address |

**Acceptance Criteria:**
- All events include timestamp (UTC), organisation_id
- IP address captured where applicable
- User agent captured for login events
- Events cannot be modified or deleted
- Retention period configurable (default 2 years)

**Capability ID:** C-155

---

#### BR-AUDIT-02: Security Audit Log Viewer
**Priority:** Must Have

Admins shall be able to view and search the security audit log.

**Features:**
- Filter by event type, date range, user, IP address
- Sort by date (newest first)
- Export to CSV for compliance reporting
- Pagination for large result sets

**Acceptance Criteria:**
- Only admins can access security audit log
- Audit log viewer is read-only
- IP addresses partially masked for privacy (show first 3 octets)
- Export includes all filters applied

**Capability ID:** C-156

---

#### BR-AUDIT-03: Suspicious Activity Alerts (Future)
**Priority:** Could Have

System could detect and alert on suspicious patterns:
- Multiple failed logins from same IP
- Login from new location
- Multiple password resets

**Note:** Marked as future enhancement for Phase 6+.

**Capability ID:** C-157 (Future)

---

### 3.5 User Security Centre (BR-SECURITY)

#### BR-SECURITY-01: Security Centre Page
**Priority:** Must Have

Each user shall have access to a Security Centre page showing their security status.

**Information Displayed:**
- Account status (active, pending password change)
- 2FA status (enabled/disabled with setup/manage links)
- Last login date/time
- Last login IP address (partially masked)
- Password last changed date
- Active sessions (future enhancement)

**Acceptance Criteria:**
- Accessible from user profile menu
- Information is read-only except for action links
- Responsive design works on mobile

**Capability ID:** C-158

---

#### BR-SECURITY-02: Change Password from Security Centre
**Priority:** Must Have

Users shall be able to change their password from Security Centre.

**Change Password Form:**
- Current password (required)
- New password (with strength indicator)
- Confirm new password

**Acceptance Criteria:**
- Validates current password before accepting new
- New password must meet complexity requirements
- Cannot reuse last 5 passwords
- Success shows confirmation, logs event

**Capability ID:** C-159

---

#### BR-SECURITY-03: View Login History
**Priority:** Should Have

Users shall be able to view their recent login activity.

**Information Shown:**
- Date/time of login
- IP address (partially masked)
- Browser/device (parsed from user agent)
- Success/failure status
- Location (if IP geolocation enabled, otherwise "Unknown")

**Acceptance Criteria:**
- Shows last 20 login attempts
- Failed attempts clearly marked
- "Not you?" link for reporting suspicious activity

**Capability ID:** C-160

---

### 3.6 Themes & Appearance (BR-THEME)

#### BR-THEME-01: Light/Dark Mode Toggle
**Priority:** Must Have

Users shall be able to switch between light and dark colour schemes.

**Toggle Location:**
- Header or user profile dropdown
- Quick toggle (no page reload required)

**Behaviour:**
- Default: System preference (if detectable) or light
- User preference persisted in database
- Also cached in localStorage for instant application

**Acceptance Criteria:**
- Toggle applies theme immediately without refresh
- Theme applies to all pages, forms, tables, charts
- Charts update colour palette for dark mode
- Preference survives logout/login

**Capability ID:** C-161

---

#### BR-THEME-02: Theme Persistence
**Priority:** Must Have

User theme preference shall persist across sessions.

**Storage:**
- Stored in user profile (theme_preference: light | dark | system)
- Synced to localStorage for instant load
- Logged-out users retain localStorage preference

**Acceptance Criteria:**
- New users default to 'system'
- Preference synced on login
- LocalStorage used for immediate render (no flash)

**Capability ID:** C-162

---

#### BR-THEME-03: Organisation Default Theme (Future)
**Priority:** Could Have

Admins could set a default theme for their organisation.

**Behaviour:**
- New users inherit org default
- Users can still override with personal preference

**Note:** Marked as future enhancement.

**Capability ID:** C-163 (Future)

---

#### BR-THEME-04: High Contrast Mode (Future)
**Priority:** Could Have

An additional high-contrast theme for accessibility.

**Note:** Marked as future enhancement for accessibility compliance.

**Capability ID:** C-164 (Future)

---

## 4. Non-Functional Requirements

### 4.1 Security

| Requirement | Specification |
|-------------|---------------|
| Token Security | All tokens cryptographically random, stored hashed |
| Rate Limiting | Configurable limits on auth endpoints |
| Audit Retention | Minimum 2 years, configurable |
| Password Policy | Min 8 chars, complexity enforced |
| 2FA Algorithm | TOTP per RFC 6238, SHA-1, 6 digits, 30s window |

### 4.2 Performance

| Requirement | Specification |
|-------------|---------------|
| Login with 2FA | < 500ms additional latency |
| Audit log queries | < 2s for typical filters |
| Theme switch | Instant (< 100ms) |

### 4.3 Compliance

| Standard | Relevant Controls |
|----------|-------------------|
| SOC 2 | Access control, audit logging |
| ISO 27001 | A.9 Access Control, A.12.4 Logging |
| GDPR | Audit log data minimisation |

---

## 5. Dependencies

| Dependency | Phase | Notes |
|------------|-------|-------|
| Email service | Phase 4 | Already implemented for notifications |
| User management | Phase 3 | User CRUD already exists |
| Audit logging | Phase 2 | Base audit log exists, extending |
| JWT authentication | Phase 1 | Adding 2FA layer |

---

## 6. Risks and Mitigations

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| 2FA adoption low | Medium | Low | Clear onboarding, optional initially |
| Users lose authenticator | Medium | Medium | Backup codes, admin reset option |
| Password reset abuse | Low | Medium | Rate limiting, monitoring |
| Access request spam | Low | Low | CAPTCHA, rate limiting |
| Theme implementation complexity | Low | Low | Use CSS variables, proven libraries |

---

## 7. Success Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| Self-service access requests | 70% of new users | Access request vs direct creation ratio |
| Self-service password resets | 90% of resets | Reset flow completions vs admin resets |
| 2FA adoption | 50% within 6 months | Users with 2FA enabled |
| Security audit coverage | 100% events logged | Event types captured vs defined |
| Dark mode usage | 30% of users | Theme preference distribution |
| Support tickets reduction | 50% reduction in password tickets | Helpdesk metrics |

---

## 8. Glossary

| Term | Definition |
|------|------------|
| TOTP | Time-based One-Time Password (RFC 6238) |
| 2FA | Two-Factor Authentication |
| MFA | Multi-Factor Authentication (2FA is a subset) |
| Backup Code | Single-use recovery code for 2FA |
| Access Request | Prospective user's request to join an organisation |
| Security Centre | User-facing page for security settings |

---

## 9. Document History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2026-02-04 | Solution Architect | Initial draft |

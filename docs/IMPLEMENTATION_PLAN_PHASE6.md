# Implementation Plan – EHS Portal Phase 6
## Security, Trust & Self-Service

| Item | Detail |
|------|--------|
| Document Version | 1.0 |
| Author | Solution Architect |
| Date | 2026-02-04 |
| Status | Draft |
| Phase Duration | 4 Sprints (8 weeks) |

---

## 1. Executive Summary

Phase 6 introduces security, trust, and self-service features to the EHS Portal. The implementation is structured into 4 sprints, prioritising foundational security infrastructure before user-facing features.

### 1.1 Key Deliverables

| Sprint | Duration | Focus Area |
|--------|----------|------------|
| Sprint 1 | 2 weeks | Foundation (Password Reset, DB Schema) |
| Sprint 2 | 2 weeks | Two-Factor Authentication |
| Sprint 3 | 2 weeks | Access Requests, Security Centre |
| Sprint 4 | 2 weeks | Theme Customisation, Audit Log, Polish |

### 1.2 Dependencies

| Dependency | Required By | Status |
|------------|-------------|--------|
| SMTP Email Service | Sprint 1 | Existing (from Phase 3) |
| PostgreSQL Extensions | Sprint 1 | To be verified |
| TOTP Library (otplib) | Sprint 2 | To be added |
| QR Code Generator | Sprint 2 | To be added |
| Encryption Key Management | Sprint 2 | To be configured |

---

## 2. Sprint 1: Foundation (Weeks 1-2)

### 2.1 Goals

- Database schema migration for Phase 6
- Password reset implementation (full flow)
- Security utility functions
- Enhanced audit logging infrastructure

### 2.2 Backend Tasks

| ID | Task | Est. Hours | Priority |
|----|------|------------|----------|
| B1.1 | Create migration 006_phase6_security.sql | 4 | P0 |
| B1.2 | Implement password reset token generation | 4 | P0 |
| B1.3 | Implement password reset email with template | 4 | P0 |
| B1.4 | Implement reset password endpoint | 4 | P0 |
| B1.5 | Add token hashing utility (SHA-256) | 2 | P0 |
| B1.6 | Add password validation utility | 2 | P1 |
| B1.7 | Implement password history check | 3 | P1 |
| B1.8 | Add rate limiting middleware for auth endpoints | 4 | P0 |
| B1.9 | Implement security audit log service | 4 | P1 |
| B1.10 | Add login history recording | 3 | P1 |
| B1.11 | Create scheduled job: cleanup expired tokens | 2 | P2 |
| B1.12 | Unit tests for password reset | 4 | P0 |

**Sprint 1 Backend Total: 40 hours**

### 2.3 Frontend Tasks

| ID | Task | Est. Hours | Priority |
|----|------|------------|----------|
| F1.1 | Create ForgotPasswordPage component | 4 | P0 |
| F1.2 | Create ResetPasswordPage component | 6 | P0 |
| F1.3 | Create PasswordStrengthMeter component | 4 | P1 |
| F1.4 | Add password validation rules display | 2 | P1 |
| F1.5 | Handle expired/invalid token states | 2 | P0 |
| F1.6 | Add success confirmation page | 2 | P1 |
| F1.7 | Add route guards for public pages | 2 | P1 |
| F1.8 | E2E tests for password reset flow | 4 | P0 |

**Sprint 1 Frontend Total: 26 hours**

### 2.4 Sprint 1 Deliverables

- [ ] Password reset email sends successfully
- [ ] User can reset password via email link
- [ ] Password strength validation works
- [ ] Expired tokens show proper error message
- [ ] Audit log records password reset events
- [ ] Rate limiting protects forgot-password endpoint

---

## 3. Sprint 2: Two-Factor Authentication (Weeks 3-4)

### 3.1 Goals

- Full TOTP-based 2FA implementation
- Backup codes generation and usage
- Enhanced login flow with 2FA prompt

### 3.2 Backend Tasks

| ID | Task | Est. Hours | Priority |
|----|------|------------|----------|
| B2.1 | Install and configure otplib | 2 | P0 |
| B2.2 | Implement TOTP secret encryption (AES-256-GCM) | 4 | P0 |
| B2.3 | Create 2FA setup endpoint (generate secret) | 4 | P0 |
| B2.4 | Create 2FA verify endpoint | 3 | P0 |
| B2.5 | Create 2FA enable endpoint (after verification) | 3 | P0 |
| B2.6 | Create 2FA disable endpoint (with password) | 3 | P0 |
| B2.7 | Implement backup codes generation | 3 | P0 |
| B2.8 | Implement backup codes verification | 3 | P0 |
| B2.9 | Implement backup codes regeneration | 2 | P1 |
| B2.10 | Modify login endpoint for 2FA flow | 4 | P0 |
| B2.11 | Add 2FA pending state to JWT | 3 | P0 |
| B2.12 | Implement 2FA verification middleware | 3 | P0 |
| B2.13 | Add 2FA status to user profile endpoint | 2 | P1 |
| B2.14 | Unit tests for 2FA flows | 6 | P0 |
| B2.15 | Integration tests for 2FA + login | 4 | P0 |

**Sprint 2 Backend Total: 49 hours**

### 3.3 Frontend Tasks

| ID | Task | Est. Hours | Priority |
|----|------|------------|----------|
| F2.1 | Create OTPInput component (6-digit) | 4 | P0 |
| F2.2 | Create 2FA setup wizard (3 steps) | 8 | P0 |
| F2.3 | Implement QR code display with manual key | 3 | P0 |
| F2.4 | Create BackupCodesDisplay component | 4 | P0 |
| F2.5 | Implement download/copy/print for backup codes | 3 | P1 |
| F2.6 | Create 2FA prompt modal in login flow | 4 | P0 |
| F2.7 | Create backup code entry modal | 3 | P0 |
| F2.8 | Implement 2FA disable confirmation modal | 3 | P1 |
| F2.9 | Add 2FA section to security page | 4 | P0 |
| F2.10 | E2E tests for 2FA setup flow | 4 | P0 |
| F2.11 | E2E tests for 2FA login flow | 4 | P0 |

**Sprint 2 Frontend Total: 44 hours**

### 3.4 Sprint 2 Deliverables

- [ ] User can enable 2FA with authenticator app
- [ ] QR code and manual key both work
- [ ] Backup codes can be downloaded/printed
- [ ] Login requires 2FA code when enabled
- [ ] Backup codes work when authenticator unavailable
- [ ] User can disable 2FA with password confirmation
- [ ] Audit log records all 2FA events

---

## 4. Sprint 3: Access Requests & Security Centre (Weeks 5-6)

### 4.1 Goals

- Self-service access request workflow
- Admin approval interface
- Comprehensive Security Centre page

### 4.2 Backend Tasks

| ID | Task | Est. Hours | Priority |
|----|------|------------|----------|
| B3.1 | Implement access request submission | 4 | P0 |
| B3.2 | Implement access request list (admin) | 3 | P0 |
| B3.3 | Implement access request approval | 4 | P0 |
| B3.4 | Implement access request rejection | 2 | P0 |
| B3.5 | Generate welcome email for approved users | 4 | P0 |
| B3.6 | Generate temporary password for new users | 2 | P0 |
| B3.7 | Implement org_code validation | 2 | P1 |
| B3.8 | Add self_registration_allowed flag check | 1 | P1 |
| B3.9 | Implement Security Centre data endpoint | 4 | P0 |
| B3.10 | Implement login history endpoint | 3 | P0 |
| B3.11 | Implement change password endpoint | 4 | P0 |
| B3.12 | Add password reuse prevention | 2 | P1 |
| B3.13 | Unit tests for access requests | 4 | P0 |
| B3.14 | Unit tests for Security Centre | 3 | P0 |

**Sprint 3 Backend Total: 42 hours**

### 4.3 Frontend Tasks

| ID | Task | Est. Hours | Priority |
|----|------|------------|----------|
| F3.1 | Create RequestAccessPage (public form) | 6 | P0 |
| F3.2 | Create access request success page | 2 | P1 |
| F3.3 | Create Admin Access Requests list page | 6 | P0 |
| F3.4 | Create approve modal with role/site assignment | 4 | P0 |
| F3.5 | Create reject modal | 2 | P0 |
| F3.6 | Create SecurityCentrePage | 8 | P0 |
| F3.7 | Add login history section | 4 | P0 |
| F3.8 | Add change password section | 4 | P0 |
| F3.9 | Add account status section | 2 | P1 |
| F3.10 | Add navigation link to Security Centre | 1 | P1 |
| F3.11 | E2E tests for access request flow | 4 | P0 |
| F3.12 | E2E tests for Security Centre | 4 | P0 |

**Sprint 3 Frontend Total: 47 hours**

### 4.4 Sprint 3 Deliverables

- [ ] Public access request form works
- [ ] Admin can view pending requests
- [ ] Admin can approve with role assignment
- [ ] Approved users receive welcome email
- [ ] Security Centre shows account status
- [ ] Users can view login history
- [ ] Users can change password

---

## 5. Sprint 4: Theme & Polish (Weeks 7-8)

### 5.1 Goals

- Theme customisation (light/dark/system)
- Admin Security Audit Log page
- Account lockout notifications
- Final testing and polish

### 5.2 Backend Tasks

| ID | Task | Est. Hours | Priority |
|----|------|------------|----------|
| B4.1 | Implement theme preference save/load | 2 | P0 |
| B4.2 | Implement security audit log list endpoint | 4 | P0 |
| B4.3 | Add audit log filters (event type, user, date) | 3 | P1 |
| B4.4 | Implement audit log CSV export | 3 | P1 |
| B4.5 | Implement account lockout notification email | 3 | P1 |
| B4.6 | Scheduled job: unlock accounts after lockout | 2 | P1 |
| B4.7 | Performance optimisation for audit log queries | 3 | P2 |
| B4.8 | Security review and fixes | 6 | P0 |
| B4.9 | Documentation updates | 4 | P1 |

**Sprint 4 Backend Total: 30 hours**

### 5.3 Frontend Tasks

| ID | Task | Est. Hours | Priority |
|----|------|------------|----------|
| F4.1 | Implement ThemeContext and provider | 4 | P0 |
| F4.2 | Create CSS variables for light/dark themes | 6 | P0 |
| F4.3 | Create ThemeToggle component | 3 | P0 |
| F4.4 | Add theme to header | 2 | P0 |
| F4.5 | Test all components in dark mode | 4 | P0 |
| F4.6 | Create SecurityAuditLogPage (admin) | 6 | P0 |
| F4.7 | Add filters and pagination | 4 | P1 |
| F4.8 | Add CSV export button | 2 | P1 |
| F4.9 | Add session timeout warning | 3 | P2 |
| F4.10 | Final UI polish and consistency check | 4 | P1 |
| F4.11 | Accessibility audit and fixes | 4 | P0 |
| F4.12 | E2E tests for theme switching | 3 | P1 |
| F4.13 | E2E tests for audit log | 3 | P1 |

**Sprint 4 Frontend Total: 48 hours**

### 5.4 Sprint 4 Deliverables

- [ ] Theme toggle in header works
- [ ] Light/dark/system modes all functional
- [ ] All components render correctly in dark mode
- [ ] Admin can view security audit log
- [ ] Audit log can be exported to CSV
- [ ] Account lockout sends notification email
- [ ] All accessibility checks pass
- [ ] All E2E tests pass

---

## 6. Team Allocation

### 6.1 Recommended Team

| Role | Count | Sprints |
|------|-------|---------|
| Backend Developer | 1 | All |
| Frontend Developer | 1 | All |
| QA Engineer | 0.5 | Sprint 2-4 |
| Security Reviewer | 0.25 | Sprint 4 |

### 6.2 Sprint Capacity

| Sprint | Backend Hours | Frontend Hours | Total |
|--------|---------------|----------------|-------|
| Sprint 1 | 40 | 26 | 66 |
| Sprint 2 | 49 | 44 | 93 |
| Sprint 3 | 42 | 47 | 89 |
| Sprint 4 | 30 | 48 | 78 |
| **Total** | **161** | **165** | **326** |

---

## 7. Risk Management

### 7.1 Technical Risks

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| TOTP secret encryption complexity | Medium | High | Early spike in Sprint 1 |
| Email deliverability issues | Low | Medium | Test with multiple providers |
| Performance with large audit logs | Medium | Medium | Add indexes, pagination |
| Browser compatibility for theme | Low | Low | Test early, use CSS variables |

### 7.2 Schedule Risks

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| 2FA scope creep | Medium | High | Fixed scope per sprint |
| Security review findings | Medium | Medium | Buffer time in Sprint 4 |
| Integration testing delays | Low | Medium | Continuous integration |

---

## 8. Testing Strategy Summary

### 8.1 By Sprint

| Sprint | Focus Areas |
|--------|-------------|
| Sprint 1 | Password reset flows, rate limiting |
| Sprint 2 | 2FA setup, login with 2FA, backup codes |
| Sprint 3 | Access request approval, Security Centre |
| Sprint 4 | Theme switching, audit log, security review |

### 8.2 Test Types

| Type | Coverage |
|------|----------|
| Unit Tests | All services, utilities, validators |
| Integration Tests | API endpoints, database operations |
| E2E Tests | All user flows with Playwright |
| Security Tests | OWASP Top 10, penetration testing |
| Accessibility Tests | WCAG 2.1 AA compliance |

---

## 9. Definition of Done

### 9.1 Feature Level

- [ ] Code complete and reviewed
- [ ] Unit tests written and passing (>80% coverage)
- [ ] Integration tests passing
- [ ] E2E tests passing
- [ ] Security review passed
- [ ] Accessibility checks passed
- [ ] Documentation updated

### 9.2 Sprint Level

- [ ] All P0 tasks completed
- [ ] No critical bugs open
- [ ] Demo completed with stakeholders
- [ ] Sprint retrospective held

### 9.3 Phase Level

- [ ] All features deployed to staging
- [ ] UAT completed and signed off
- [ ] Security audit passed
- [ ] Performance benchmarks met
- [ ] Production deployment completed
- [ ] Monitoring and alerting configured

---

## 10. Deployment Plan

### 10.1 Pre-Deployment Checklist

- [ ] TOTP_ENCRYPTION_KEY configured in secrets
- [ ] SMTP settings verified for all email templates
- [ ] Rate limiting configuration reviewed
- [ ] Backup codes encryption verified
- [ ] Database migration tested in staging

### 10.2 Deployment Steps

1. Run database migration 006_phase6_security.sql
2. Deploy backend with new environment variables
3. Deploy frontend
4. Verify all endpoints responding
5. Run smoke tests
6. Monitor error rates

### 10.3 Rollback Plan

1. Revert frontend deployment
2. Revert backend deployment
3. Run down migration (if data allows)
4. Verify system stability

---

## 11. Document History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2026-02-04 | Solution Architect | Initial draft |

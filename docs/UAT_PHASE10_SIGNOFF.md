# UAT Sign-Off Document – EHS Portal Phase 10
## Integrations, SSO & External Connectivity

---

| Item | Detail |
|------|--------|
| **Document Title** | Phase 10 – Integrations, SSO & External Connectivity UAT Sign-off |
| **Document Version** | 1.0 |
| **Date** | [To be completed] |
| **Prepared By** | [Name, Role] |
| **Reviewed By** | [Name, Role] |
| **Classification** | Internal / Confidential |

---

## 1. Executive Summary

This document records the formal User Acceptance Testing (UAT) sign-off for **Phase 10 – Integrations, SSO & External Connectivity** of the EHS Portal. Upon signature, the undersigned stakeholders confirm that Phase 10 functionality has been tested, verified, and is approved (or not approved) for deployment to Production.

Phase 10 introduces enterprise integration capabilities including Single Sign-On (SSO/OIDC), external API access, and webhook event notifications, enabling the EHS Portal to integrate seamlessly with corporate identity providers and external systems.

---

## 2. Scope of UAT

### 2.1 Phase 10 Functional Scope

Phase 10 delivers the following capabilities:

| Capability | Description |
|------------|-------------|
| **SSO/OIDC Authentication** | Single Sign-On with Azure AD, Okta, and generic OIDC providers |
| **JIT User Provisioning** | Automatic user creation on first SSO login with role mapping from IdP groups |
| **SSO-Only Mode** | Enforce SSO login, disable password authentication for organisation |
| **Role Mapping** | Map Identity Provider groups to EHS Portal roles |
| **API Client Management** | Create, manage, suspend, and revoke API clients with scoped access |
| **API Key Security** | Secure key generation with bcrypt hashing, one-time display |
| **Public REST API** | External API access to incidents, actions, risks, training, users, locations |
| **Scope-Based Authorization** | Fine-grained API permissions (read/write per resource type) |
| **Rate Limiting** | Tiered rate limits (Standard: 1000/min, Premium: 5000/min, Enterprise: 10000/min) |
| **Webhook Configuration** | Configure webhooks for real-time event notifications |
| **Webhook Events** | Event types: incident.*, action.*, risk.*, training.*, user.* |
| **Webhook Delivery** | Signed payloads with HMAC-SHA256, retry with exponential backoff |
| **MS Teams Integration** | Adaptive Card formatting for Teams webhooks |
| **Integration Events Log** | Audit trail of SSO logins, API calls, and webhook deliveries |
| **Multi-Tenant Isolation** | Complete data separation between organisations |
| **Secret Encryption** | AES-256-GCM encryption for SSO client secrets |

### 2.2 UAT Basis

UAT testing was conducted based on:

| Source Document | Location |
|-----------------|----------|
| UAT Test Cases | `EHS_UAT_Phase5_Analytics/EHS_UAT_Phase10_Integrations.csv` |
| Business Requirements | `docs/BRD_EHS_PORTAL_PHASE10.md` |
| API Specification | `docs/API_SPEC_PHASE10.md` |
| Data Model | `docs/DATA_MODEL_PHASE10.md` |
| Architecture | `docs/ARCHITECTURE_PHASE10.md` |
| Implementation Plan | `docs/IMPLEMENTATION_PLAN_PHASE10.md` |
| Implementation Checklist | `Checklist/phase10_impl_checklist.md` |

---

## 3. UAT Environment

### 3.1 Environment Details

| Component | Value |
|-----------|-------|
| **UAT Frontend URL** | [To be completed, e.g., https://uat.ehs-portal.example.com] |
| **UAT API URL** | [To be completed, e.g., https://uat-api.ehs-portal.example.com] |
| **Public API URL** | [To be completed, e.g., https://uat-api.ehs-portal.example.com/api/public/v1] |
| **Database Name** | [To be completed, e.g., ehs_portal_uat] |
| **Application Version** | [To be completed, e.g., v10.0.0] |
| **Git Commit Hash** | [To be completed, e.g., abc123def456] |
| **Deployment Date** | [To be completed] |
| **UAT Start Date** | [To be completed] |
| **UAT End Date** | [To be completed] |

### 3.2 Identity Provider Test Environments

| IdP | Type | Test Tenant | Status |
|-----|------|-------------|--------|
| Azure AD | OIDC | [Tenant ID] | ☐ Available / ☐ Not Available |
| Okta | OIDC | [Okta Domain] | ☐ Available / ☐ Not Available |
| Generic OIDC | OIDC | [Issuer URL] | ☐ Available / ☐ Not Available |

### 3.3 Browser/Device Testing

| Browser/Device | Version | Tested |
|----------------|---------|--------|
| Chrome (Desktop) | [Version] | ☐ Yes / ☐ No |
| Edge (Desktop) | [Version] | ☐ Yes / ☐ No |
| Firefox (Desktop) | [Version] | ☐ Yes / ☐ No |
| Safari (Desktop) | [Version] | ☐ Yes / ☐ No |
| Mobile (Chrome/Safari) | [Version] | ☐ Yes / ☐ No |

---

## 4. Test Summary

### 4.1 Overall Metrics

| Metric | Value |
|--------|-------|
| **Total UAT Scenarios (Phase 10)** | 53 |
| **Passed** | [To be completed] |
| **Failed** | [To be completed] |
| **Blocked / Not Run** | [To be completed] |
| **Pass Rate** | [To be calculated, e.g., 95%] |
| **Total Defects Raised (Phase 10)** | [To be completed] |
| **Critical Defects Outstanding** | [To be completed] |
| **High Defects Outstanding** | [To be completed] |

### 4.2 Results by Wave

| Wave | Scope | Total | Pass | Fail | Blocked | Pass Rate |
|------|-------|-------|------|------|---------|-----------|
| Wave 1 | SSO Configuration & Login | 12 | [#] | [#] | [#] | [%] |
| Wave 2 | API Client Management & Public API | 21 | [#] | [#] | [#] | [%] |
| Wave 3 | Webhooks | 12 | [#] | [#] | [#] | [%] |
| Wave 4 | Security & Integration Events | 13 | [#] | [#] | [#] | [%] |
| **Total** | — | **53** | [#] | [#] | [#] | [%] |

---

## 5. UAT Coverage

### 5.1 Coverage by Feature Area

| Area | UAT IDs | Key Capabilities Tested | Status |
|------|---------|-------------------------|--------|
| **SSO Configuration** | P10-UAT-SSO-01 to P10-UAT-SSO-05 | Provider setup, role mappings, connection test, SSO-only mode | ☐ Complete |
| **SSO Login** | P10-UAT-SSO-06 to P10-UAT-SSO-12 | Login flow, JIT provisioning, role mapping, logout | ☐ Complete |
| **API Client Management** | P10-UAT-API-01 to P10-UAT-API-08 | CRUD, key regeneration, suspend/revoke, usage stats | ☐ Complete |
| **Public API** | P10-UAT-PUB-01 to P10-UAT-PUB-13 | Endpoints, auth, scopes, rate limiting, pagination | ☐ Complete |
| **Webhooks** | P10-UAT-WH-01 to P10-UAT-WH-12 | Configuration, delivery, retry, Teams, history | ☐ Complete |
| **Security** | P10-UAT-SEC-01 to P10-UAT-SEC-10 | Multi-tenancy, encryption, RBAC, HTTPS enforcement | ☐ Complete |
| **Integration Events** | P10-UAT-INT-01 to P10-UAT-INT-03 | Activity logging, filtering, statistics | ☐ Complete |

### 5.2 Business Requirements Traceability

| Requirement ID | Description | UAT Coverage | Status |
|----------------|-------------|--------------|--------|
| BR-INTEG-SSO-01 | SSO/OIDC Authentication | P10-UAT-SSO-* | ☐ Verified |
| BR-INTEG-SSO-02 | JIT User Provisioning | P10-UAT-SSO-07, P10-UAT-SSO-08 | ☐ Verified |
| BR-INTEG-SSO-03 | Role Mapping from IdP | P10-UAT-SSO-03, P10-UAT-SSO-08 | ☐ Verified |
| BR-INTEG-API-01 | API Client Management | P10-UAT-API-* | ☐ Verified |
| BR-INTEG-API-02 | Public REST API | P10-UAT-PUB-* | ☐ Verified |
| BR-INTEG-API-03 | Scope-Based Authorization | P10-UAT-PUB-05 | ☐ Verified |
| BR-INTEG-API-04 | Rate Limiting | P10-UAT-PUB-06, P10-UAT-PUB-07 | ☐ Verified |
| BR-INTEG-WH-01 | Webhook Configuration | P10-UAT-WH-01, P10-UAT-WH-09, P10-UAT-WH-10 | ☐ Verified |
| BR-INTEG-WH-02 | Event Delivery & Retry | P10-UAT-WH-02 to P10-UAT-WH-06 | ☐ Verified |
| BR-INTEG-SEC-01 | Multi-Tenant Isolation | P10-UAT-SEC-01 to P10-UAT-SEC-03 | ☐ Verified |
| BR-INTEG-SEC-02 | Secret Encryption | P10-UAT-SEC-06, P10-UAT-SEC-07 | ☐ Verified |

---

## 6. Defect Summary

### 6.1 Defects by Severity

| Severity | Total Raised | Closed | Open | Accepted |
|----------|--------------|--------|------|----------|
| Critical | [#] | [#] | [#] | [#] |
| High | [#] | [#] | [#] | [#] |
| Medium | [#] | [#] | [#] | [#] |
| Low | [#] | [#] | [#] | [#] |
| **Total** | [#] | [#] | [#] | [#] |

### 6.2 Defect Log

| ID | Severity | UAT ID(s) | Summary | Status | Resolution |
|----|----------|-----------|---------|--------|------------|
| BUG-P10-001 | [Sev] | [UAT-ID] | [Brief description] | ☐ Open / ☐ Closed / ☐ Accepted | [Fix/Workaround] |
| BUG-P10-002 | [Sev] | [UAT-ID] | [Brief description] | ☐ Open / ☐ Closed / ☐ Accepted | [Fix/Workaround] |
| BUG-P10-003 | [Sev] | [UAT-ID] | [Brief description] | ☐ Open / ☐ Closed / ☐ Accepted | [Fix/Workaround] |
| ... | ... | ... | ... | ... | ... |

> **Sign-off Requirement:** All Critical and High severity defects must be Closed or formally Accepted before sign-off can proceed.

### 6.3 Accepted Defects

If any High/Medium defects are accepted for go-live, document justification:

| ID | Severity | Summary | Business Justification | Workaround | Target Fix Date |
|----|----------|---------|------------------------|------------|-----------------|
| [ID] | [Sev] | [Summary] | [Why accepted] | [Workaround] | [Date] |

---

## 7. Risks & Known Issues

### 7.1 Known Issues at Go-Live

| # | Issue Description | Impact | Mitigation | Owner |
|---|-------------------|--------|------------|-------|
| 1 | In-memory rate limiting (not Redis) | Rate limits not shared across server instances | Single instance for UAT; Redis planned for production | [Name] |
| 2 | CIDR notation not supported in IP allowlists | Must specify individual IPs | Document limitation; enhance post-go-live | [Name] |
| 3 | Mock IdP not available for automated testing | Cannot automate full SSO flow in CI/CD | Manual SSO testing required | [Name] |

### 7.2 Residual Risks

| # | Risk Description | Likelihood | Impact | Mitigation |
|---|------------------|------------|--------|------------|
| 1 | IdP configuration errors cause login failures | Low | High | Test connection feature, clear error messages |
| 2 | Webhook endpoint unavailable causes data delays | Medium | Medium | Retry mechanism with exponential backoff |
| 3 | API key compromise | Low | High | Key regeneration, immediate revocation capability |

---

## 8. Security Testing Summary

### 8.1 Security Test Results

| Security Control | Test ID(s) | Result | Notes |
|------------------|------------|--------|-------|
| SSO secrets encrypted at rest (AES-256-GCM) | P10-UAT-SEC-06 | ☐ Pass / ☐ Fail | Verified in database |
| API keys hashed with bcrypt | P10-UAT-SEC-07 | ☐ Pass / ☐ Fail | Only hash stored, not key |
| API keys shown only once | P10-UAT-API-02 | ☐ Pass / ☐ Fail | No retrieval after creation |
| HTTPS required for webhooks | P10-UAT-SEC-08 | ☐ Pass / ☐ Fail | HTTP URLs rejected |
| Multi-tenant data isolation | P10-UAT-SEC-01 to P10-UAT-SEC-03 | ☐ Pass / ☐ Fail | Cross-org access blocked |
| Rate limiting enforced | P10-UAT-PUB-06 | ☐ Pass / ☐ Fail | 429 returned when exceeded |
| Scope enforcement | P10-UAT-PUB-05 | ☐ Pass / ☐ Fail | 403 for insufficient scope |
| PKCE flow for SSO | P10-UAT-SSO-06 | ☐ Pass / ☐ Fail | Code verifier/challenge used |
| SSO state expiry | P10-UAT-SEC-09 | ☐ Pass / ☐ Fail | State expires after 10 minutes |
| Secrets not logged | P10-UAT-SEC-05 | ☐ Pass / ☐ Fail | Logs checked for secrets |

### 8.2 Penetration Testing (if applicable)

| Test | Status | Findings |
|------|--------|----------|
| API Authentication Bypass | ☐ Completed / ☐ Not Done | [Findings] |
| SSO Token Manipulation | ☐ Completed / ☐ Not Done | [Findings] |
| Rate Limit Bypass | ☐ Completed / ☐ Not Done | [Findings] |
| Cross-Tenant Access | ☐ Completed / ☐ Not Done | [Findings] |

---

## 9. Integration Testing Summary

### 9.1 Identity Provider Integration

| IdP | Test Scenarios | Result | Notes |
|-----|----------------|--------|-------|
| Azure AD | Login, JIT, Role Mapping | ☐ Pass / ☐ Fail / ☐ Not Tested | [Notes] |
| Okta | Login, JIT, Role Mapping | ☐ Pass / ☐ Fail / ☐ Not Tested | [Notes] |
| Generic OIDC | Login, JIT | ☐ Pass / ☐ Fail / ☐ Not Tested | [Notes] |

### 9.2 External System Integration

| System | Integration Type | Test Scenarios | Result | Notes |
|--------|------------------|----------------|--------|-------|
| Slack | Webhook | Event notifications | ☐ Pass / ☐ Fail / ☐ Not Tested | [Notes] |
| MS Teams | Webhook | Adaptive Card messages | ☐ Pass / ☐ Fail / ☐ Not Tested | [Notes] |
| External ERP | API | Incident sync | ☐ Pass / ☐ Fail / ☐ Not Tested | [Notes] |

---

## 10. UAT Participants

### 10.1 Testing Team

| Name | Role | Organisation | Contribution |
|------|------|--------------|--------------|
| [Name] | UAT Lead | [Org] | UAT coordination, test execution |
| [Name] | IT/Security Tester | [Org] | Security and integration testing |
| [Name] | Business Tester | [Org] | SSO and user workflow testing |
| [Name] | External Integration Tester | [Org] | API and webhook testing |

### 10.2 Support Team

| Name | Role | Organisation | Contribution |
|------|------|--------------|--------------|
| [Name] | Dev Lead | [Org] | Defect resolution |
| [Name] | DevOps | [Org] | Environment and IdP setup |
| [Name] | IdP Administrator | [Org] | Azure AD / Okta configuration |
| [Name] | Security Analyst | [Org] | Security review |

---

## 11. Conclusion

Based on the execution of the UAT scenarios defined in `EHS_UAT_Phase10_Integrations.csv`:

- **53** test scenarios were defined
- **[#]** scenarios were executed
- **[#]** passed ([%] pass rate)
- **[#]** defects were raised
- **[#]** Critical/High defects remain outstanding: **[0 / #]**

### UAT Outcome

☐ **READY FOR PRODUCTION DEPLOYMENT**
> All Critical and High defects have been resolved. SSO, API, and Webhook functionality meets business requirements and security standards. Approved for production release.

☐ **NOT READY FOR PRODUCTION DEPLOYMENT**
> Outstanding Critical/High defects or security vulnerabilities prevent approval. Remediation required before re-testing.

☐ **CONDITIONAL APPROVAL**
> Approved with accepted known issues as documented in Section 6.3 and Section 7. Post-go-live remediation plan in place.

---

## 12. Sign-Off

By signing below, the undersigned stakeholders confirm that:

1. They have reviewed the UAT results for Phase 10 – Integrations, SSO & External Connectivity
2. All Critical and High defects have been resolved or formally accepted
3. Security controls have been verified as documented in Section 8
4. They approve (or do not approve) the release of Phase 10 to Production

### 12.1 Approval Signatures

| Name | Role | Organisation | Decision | Date | Signature |
|------|------|--------------|----------|------|-----------|
| [Name] | Business Owner / EHS Lead | [Org] | ☐ Approve / ☐ Reject | [Date] | _______________ |
| [Name] | IT / Systems Owner | [Org] | ☐ Approve / ☐ Reject | [Date] | _______________ |
| [Name] | Security / CISO | [Org] | ☐ Approve / ☐ Reject | [Date] | _______________ |
| [Name] | Project Manager | [Org] | ☐ Approve / ☐ Reject | [Date] | _______________ |
| [Name] | Quality Assurance Lead | [Org] | ☐ Approve / ☐ Reject | [Date] | _______________ |

### 12.2 Rejection Notes

If any stakeholder rejects the sign-off, document the reason below:

| Stakeholder | Reason for Rejection | Required Remediation |
|-------------|----------------------|----------------------|
| [Name] | [Reason] | [What must be fixed] |

---

## 13. Attachments

The following documents support this sign-off:

| # | Document | Location |
|---|----------|----------|
| 1 | Completed UAT Test Sheet | `EHS_UAT_Phase5_Analytics/EHS_UAT_Phase10_Integrations.csv` |
| 2 | Business Requirements | `docs/BRD_EHS_PORTAL_PHASE10.md` |
| 3 | API Specification | `docs/API_SPEC_PHASE10.md` |
| 4 | Security Architecture | `docs/ARCHITECTURE_PHASE10.md` |
| 5 | Implementation Checklist | `Checklist/phase10_impl_checklist.md` |
| 6 | Backend Tests | `backend/tests/phase10.test.js` |
| 7 | Evidence Pack | `EHS_Portal_Phase10_UAT/Evidence/` |
| 8 | Defect Log | `EHS_Portal_Phase10_UAT/Defects/` |

---

## 14. Revision History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2026-02-06 | [Author] | Initial UAT Sign-off document for Phase 10 |
| | | | |

---

## 15. Document Control

| Item | Detail |
|------|--------|
| **Document Owner** | [Name, Role] |
| **Distribution** | Project Team, Stakeholders, Security Team, Audit File |
| **Retention Period** | 7 years (or per organisational policy) |
| **Storage Location** | [SharePoint/File Server path] |

---

## Appendix A: API Endpoint Coverage

| Endpoint | Method | Scope Required | UAT Coverage |
|----------|--------|----------------|--------------|
| `/api/public/v1` | GET | Any | P10-UAT-PUB-01 |
| `/api/public/v1/incidents` | GET | incidents:read | P10-UAT-PUB-01 |
| `/api/public/v1/incidents` | POST | incidents:write | P10-UAT-PUB-02 |
| `/api/public/v1/incidents/:id` | GET | incidents:read | P10-UAT-PUB-01 |
| `/api/public/v1/incidents/:id` | PUT | incidents:write | P10-UAT-PUB-02 |
| `/api/public/v1/actions` | GET | actions:read | P10-UAT-PUB-09 |
| `/api/public/v1/actions` | POST | actions:write | P10-UAT-PUB-09 |
| `/api/public/v1/risks` | GET | risks:read | P10-UAT-PUB-10 |
| `/api/public/v1/risks` | POST | risks:write | P10-UAT-PUB-10 |
| `/api/public/v1/training/assignments` | GET | training:read | — |
| `/api/public/v1/users` | GET | users:read | P10-UAT-PUB-11 |
| `/api/public/v1/locations` | GET | locations:read | — |

---

## Appendix B: Webhook Event Types

| Event Type | Trigger | UAT Coverage |
|------------|---------|--------------|
| `incident.created` | New incident created | P10-UAT-WH-02 |
| `incident.updated` | Incident modified | P10-UAT-WH-02 |
| `incident.closed` | Incident closed | — |
| `action.created` | New action created | — |
| `action.updated` | Action modified | — |
| `action.completed` | Action completed | P10-UAT-WH-04 |
| `risk.created` | New risk created | — |
| `risk.updated` | Risk modified | — |
| `training.completed` | Training completed | — |
| `user.created` | New user created (JIT) | P10-UAT-SSO-07 |

---

*End of Document*

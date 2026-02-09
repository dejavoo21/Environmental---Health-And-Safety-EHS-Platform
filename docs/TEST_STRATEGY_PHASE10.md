# Test Strategy – EHS Portal Phase 10
## Integrations, SSO & External Connectivity

| Item | Detail |
|------|--------|
| Document Version | 1.0 |
| Author | QA Lead |
| Date | 2026-02-05 |
| Status | Draft |
| Phase | 10 – Integrations, SSO & External Connectivity |

---

## 1. Overview

This document defines the testing approach for Phase 10 integration capabilities including SSO/OIDC, public API, and webhooks.

### 1.1 Test Principles

- **Security-focused testing:** Prioritize authentication, authorization, and secret handling
- **Integration-heavy:** Many tests require external system interaction (mock or real)
- **End-to-end flows:** Test complete user journeys from IdP login to dashboard
- **Resilience testing:** Verify graceful handling of external system failures

---

## 2. Test Scope

### 2.1 In Scope

| Feature | Test Types |
|---------|------------|
| SSO/OIDC | Unit, Integration, E2E, Security |
| JIT Provisioning | Unit, Integration |
| Role Mapping | Unit, Integration |
| API Client Management | Unit, Integration, API |
| API Key Authentication | Unit, Security, Performance |
| Rate Limiting | Unit, Performance |
| Scope Authorization | Unit, Integration |
| IP Allowlisting | Unit, Integration |
| Public API Endpoints | API, Integration, Performance |
| Webhook Configuration | Unit, Integration |
| Webhook Delivery | Integration, Reliability |
| Retry Logic | Unit, Integration |
| Signature Verification | Unit, Security |
| Admin UI | Component, E2E |

### 2.2 Out of Scope

- Load testing at scale (separate exercise)
- Penetration testing (separate security audit)
- Mobile app SSO (not in Phase 10)
- SAML testing (future phase)

---

## 3. Test Levels

### 3.1 Unit Tests

**Coverage Target:** ≥80%

**Focus Areas:**
- OIDC client wrapper functions
- Token validation logic
- Claim extraction and mapping
- API key hash/verify functions
- Rate limiting calculations
- Signature generation
- Webhook payload formatting

**Tools:** Jest

**Example Tests:**
```javascript
// ssoService.test.js
describe('SSOService', () => {
  describe('mapClaimsToRole', () => {
    it('should return highest priority matching role', () => {
      const claims = { groups: ['EHS-Managers', 'All-Staff'] };
      const mappings = [
        { idp_claim_value: 'EHS-Managers', ehs_role: 'manager', priority: 90 },
        { idp_claim_value: 'All-Staff', ehs_role: 'worker', priority: 0 }
      ];
      expect(mapClaimsToRole(claims, mappings)).toBe('manager');
    });
    
    it('should return default role when no mapping matches', () => {
      const claims = { groups: ['Unknown-Group'] };
      expect(mapClaimsToRole(claims, [], 'worker')).toBe('worker');
    });
  });
});
```

### 3.2 Integration Tests

**Coverage Target:** Key flows

**Focus Areas:**
- SSO callback with token exchange
- API authentication flow
- Webhook delivery and retry
- Database operations

**Tools:** Jest + Supertest

**Test Database:** Separate test database with fixtures

**Example Tests:**
```javascript
// apiAuth.integration.test.js
describe('API Authentication', () => {
  it('should authenticate valid API key', async () => {
    const res = await request(app)
      .get('/api/public/v1/incidents')
      .set('X-API-Key', testApiKey);
    
    expect(res.status).toBe(200);
    expect(res.headers['x-ratelimit-remaining']).toBeDefined();
  });
  
  it('should reject revoked API key', async () => {
    const res = await request(app)
      .get('/api/public/v1/incidents')
      .set('X-API-Key', revokedApiKey);
    
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('auth_revoked');
  });
});
```

### 3.3 API Tests

**Approach:** Contract testing against OpenAPI spec

**Tools:** Jest + Supertest, Postman/Newman

**Test Categories:**
1. **Happy path:** Valid requests return expected responses
2. **Validation:** Invalid inputs are rejected with proper errors
3. **Authorization:** Scope checks are enforced
4. **Pagination:** Large result sets are paginated correctly

### 3.4 End-to-End Tests

**Coverage Target:** Critical user journeys

**Tools:** Playwright

**Test Scenarios:**
1. SSO login flow (mock IdP or real Azure AD)
2. API client creation and key display
3. Webhook creation and test delivery
4. Complete integration configuration

### 3.5 Security Tests

**Focus Areas:**

| Area | Tests |
|------|-------|
| Authentication | Invalid tokens rejected, expired tokens rejected |
| Authorization | Scope enforcement, role-based access |
| Secret Handling | Secrets not logged, encrypted at rest |
| Token Security | Nonce validation, state validation |
| API Security | Rate limiting effective, IP blocking works |
| Injection | SSO callback parameters sanitized |

### 3.6 Performance Tests

**Focus Areas:**

| Metric | Target | Tool |
|--------|--------|------|
| API response time (P95) | <500ms | Artillery |
| Rate limiting accuracy | ±5% of limit | Custom test |
| Webhook delivery latency | <30s | Custom test |
| SSO callback processing | <2s | Playwright |

---

## 4. Test Environments

### 4.1 Environment Configuration

| Environment | SSO IdP | Database | Webhooks |
|-------------|---------|----------|----------|
| Development | Mock IdP | Local Postgres | Mock server |
| Test | Mock IdP | Test Postgres | Mock server |
| Staging | Azure AD (test tenant) | Staging Postgres | Test endpoint |
| Production | Customer IdP | Production Postgres | Customer endpoints |

### 4.2 Mock IdP Setup

For development and automated testing, use a mock OIDC provider:

```javascript
// Mock IdP for testing
const mockIdp = {
  issuer: 'http://localhost:3002',
  authorization_endpoint: 'http://localhost:3002/authorize',
  token_endpoint: 'http://localhost:3002/token',
  jwks_uri: 'http://localhost:3002/.well-known/jwks.json',
  
  // Test users
  users: {
    'admin@test.com': { sub: 'user-1', groups: ['EHS-Admins'] },
    'manager@test.com': { sub: 'user-2', groups: ['EHS-Managers'] },
    'worker@test.com': { sub: 'user-3', groups: ['All-Staff'] }
  }
};
```

### 4.3 Mock Webhook Server

```javascript
// Mock webhook receiver for testing
const mockWebhookServer = express();

mockWebhookServer.post('/webhook', (req, res) => {
  // Verify signature
  const signature = req.headers['x-ehs-signature'];
  const timestamp = req.headers['x-ehs-timestamp'];
  
  // Store for assertion
  receivedWebhooks.push({ body: req.body, signature, timestamp });
  
  res.status(200).json({ received: true });
});
```

---

## 5. Test Data Strategy

### 5.1 Fixture Data

| Entity | Fixtures |
|--------|----------|
| Organisations | 2 test orgs with SSO, 1 without |
| SSO Providers | Azure AD config, Generic OIDC config |
| Role Mappings | 4 mappings per provider |
| API Clients | Active, revoked, suspended clients |
| Webhooks | Enabled, disabled, with failures |
| Integration Events | Recent events for activity log |

### 5.2 Test Accounts

| Email | Role | SSO | Purpose |
|-------|------|-----|---------|
| sso-admin@test.com | Admin | Yes | SSO admin tests |
| sso-manager@test.com | Manager | Yes | SSO user tests |
| sso-worker@test.com | Worker | Yes | JIT provisioning test |
| local-admin@test.com | Admin | No | Local auth tests |

---

## 6. Test Cases Summary

### 6.1 SSO Test Cases (TC-P10-001 to TC-P10-015)

| ID | Test Case | Priority |
|----|-----------|----------|
| TC-P10-001 | SSO login redirects to IdP | High |
| TC-P10-002 | SSO callback creates session | High |
| TC-P10-003 | JIT creates user on first login | High |
| TC-P10-004 | Role mapped from IdP groups | High |
| TC-P10-005 | Invalid state rejected | Critical |
| TC-P10-006 | Expired token rejected | Critical |
| TC-P10-007 | SSO-only mode blocks password | Medium |
| TC-P10-008 | Test connection validates IdP | Medium |
| TC-P10-009 | SSO login audited | Medium |
| TC-P10-010 | User attributes sync on login | Medium |

### 6.2 API Client Test Cases (TC-P10-016 to TC-P10-030)

| ID | Test Case | Priority |
|----|-----------|----------|
| TC-P10-016 | Create API client returns key | High |
| TC-P10-017 | API key authenticates request | Critical |
| TC-P10-018 | Invalid key returns 401 | Critical |
| TC-P10-019 | Revoked client rejected | Critical |
| TC-P10-020 | Rate limiting enforced | High |
| TC-P10-021 | Scope check enforced | Critical |
| TC-P10-022 | IP allowlist blocks denied IPs | High |
| TC-P10-023 | Key regeneration invalidates old | High |
| TC-P10-024 | Usage stats updated | Low |

### 6.3 Webhook Test Cases (TC-P10-031 to TC-P10-045)

| ID | Test Case | Priority |
|----|-----------|----------|
| TC-P10-031 | Webhook delivers event | High |
| TC-P10-032 | Signature included | Critical |
| TC-P10-033 | Retry on failure | High |
| TC-P10-034 | Max retries then fail | Medium |
| TC-P10-035 | Auto-disable on failures | Medium |
| TC-P10-036 | Teams card formatting | Medium |
| TC-P10-037 | Manual retry works | Medium |
| TC-P10-038 | Event filtering works | High |

### 6.4 Public API Test Cases (TC-P10-046 to TC-P10-060)

| ID | Test Case | Priority |
|----|-----------|----------|
| TC-P10-046 | List incidents returns data | High |
| TC-P10-047 | Get incident by ID | High |
| TC-P10-048 | Create incident via API | High |
| TC-P10-049 | Pagination works correctly | Medium |
| TC-P10-050 | Filtering works correctly | Medium |
| TC-P10-051 | Response includes rate headers | Medium |
| TC-P10-052 | Org scoping enforced | Critical |

---

## 7. Defect Management

### 7.1 Severity Levels

| Severity | Definition | Response |
|----------|------------|----------|
| Critical | Security breach, auth bypass | Immediate fix |
| High | Feature not working | Fix before release |
| Medium | Feature degraded | Fix in phase |
| Low | Minor issue | Backlog |

### 7.2 Security Defects

All security-related defects are treated as minimum High severity:
- Authentication bypass
- Authorization failure
- Secret exposure
- Token vulnerabilities
- Injection vulnerabilities

---

## 8. Test Automation

### 8.1 CI/CD Integration

```yaml
# .github/workflows/test-phase10.yml
name: Phase 10 Tests

on: [push, pull_request]

jobs:
  unit-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - run: npm ci
      - run: npm run test:unit:phase10
      
  integration-tests:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:14
      redis:
        image: redis:7
    steps:
      - uses: actions/checkout@v3
      - run: npm ci
      - run: npm run test:integration:phase10
      
  e2e-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - run: npm ci
      - run: npx playwright install
      - run: npm run test:e2e:phase10
```

### 8.2 Test Scripts

```json
{
  "scripts": {
    "test:unit:phase10": "jest --testPathPattern=phase10 --coverage",
    "test:integration:phase10": "jest --testPathPattern=phase10.integration",
    "test:e2e:phase10": "playwright test --grep @phase10",
    "test:api:phase10": "newman run postman/phase10-api.json"
  }
}
```

---

## 9. Acceptance Criteria

### 9.1 Exit Criteria

Phase 10 testing is complete when:

- [ ] All Critical and High priority tests pass
- [ ] Unit test coverage ≥80%
- [ ] No unresolved Critical/High defects
- [ ] Security tests all pass
- [ ] Performance targets met
- [ ] E2E flows complete successfully

### 9.2 Sign-off Requirements

| Role | Responsibility |
|------|----------------|
| QA Lead | Test coverage and quality |
| Security Lead | Security test results |
| Dev Lead | Code quality and fixes |
| Product Owner | UAT acceptance |

---

## 10. Appendix: Test Tool Configuration

### 10.1 Playwright Config

```javascript
// playwright.config.js
module.exports = {
  projects: [
    {
      name: 'phase10',
      testMatch: /.*phase10.*\.spec\.ts/,
      use: {
        baseURL: 'http://localhost:5173'
      }
    }
  ]
};
```

### 10.2 Jest Config

```javascript
// jest.config.js
module.exports = {
  collectCoverageFrom: [
    'src/services/sso*.js',
    'src/services/apiClient*.js',
    'src/services/webhook*.js',
    'src/services/integrationEvent*.js',
    'src/middleware/api*.js',
    'src/utils/encryption.js',
    'src/utils/signatureUtils.js'
  ]
};
```

---

*End of Document*

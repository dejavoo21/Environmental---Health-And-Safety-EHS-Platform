# Test Strategy – Phase 4: Notifications & Escalations

| Item | Detail |
|------|--------|
| Document Version | 1.0 |
| Author | Solution Architect |
| Date | 2026-01-31 |
| Phase | 4 – Notifications & Escalations |

---

## 1. Overview

Phase 4 testing covers notification delivery, user preferences, scheduled jobs, and escalation logic. The strategy emphasizes reliability testing given the critical nature of notifications.

### 1.1 Testing Goals

1. **Reliability**: Notifications are never lost or duplicated
2. **Correctness**: Right notifications to right users
3. **Performance**: Acceptable response times under load
4. **User Experience**: Intuitive notification management

---

## 2. Test Levels

### 2.1 Unit Testing

**Scope:** Individual functions and services

**Coverage Target:** 85%+

**Key Areas:**
- NotificationService methods
- PreferencesService methods
- EmailService methods
- Date/time formatting utilities
- Notification type handlers

**Tools:** Jest

**Example Tests:**
```javascript
describe('NotificationService', () => {
  it('creates notification with correct fields');
  it('returns unread count for user');
  it('marks notification as read');
  it('filters by type correctly');
  it('respects org scoping');
});

describe('PreferencesService', () => {
  it('creates default preferences for new user');
  it('returns existing preferences');
  it('updates preferences correctly');
  it('applies role-based defaults');
});
```

---

### 2.2 Integration Testing

**Scope:** API endpoints with database

**Coverage Target:** 90%+ of endpoints

**Key Areas:**
- Notification CRUD endpoints
- Preferences endpoints
- Notification triggers (action → notification)
- Email dispatch integration

**Tools:** Jest, Supertest

**Example Tests:**
```javascript
describe('GET /api/notifications', () => {
  it('returns paginated notifications for user');
  it('filters by type');
  it('filters by read status');
  it('respects org scoping');
  it('requires authentication');
});

describe('Action assignment → Notification', () => {
  it('creates notification when action assigned');
  it('sends email if preference enabled');
  it('does not send email if preference disabled');
});
```

---

### 2.3 Scheduled Job Testing

**Scope:** Cron job execution

**Key Areas:**
- Daily digest generation
- Weekly digest generation
- Escalation job
- Email retry job
- Cleanup job

**Approach:**
- Unit test job logic separately from scheduling
- Integration test with mock clock
- Manual verification of actual scheduling

**Example Tests:**
```javascript
describe('Daily Digest Job', () => {
  it('queries users with daily preference');
  it('generates correct digest content');
  it('skips users with no content');
  it('logs job run');
  it('handles email failures gracefully');
});

describe('Escalation Job', () => {
  it('finds overdue actions beyond threshold');
  it('creates escalation notifications');
  it('sends escalation emails');
  it('marks actions as escalated');
  it('does not re-escalate');
});
```

---

### 2.4 Frontend Testing

**Scope:** UI components and interactions

**Coverage Target:** 80%+ of components

**Key Areas:**
- NotificationBell component
- NotificationDropdown component
- NotificationsPage
- NotificationPreferencesPage
- Polling logic

**Tools:** Vitest, React Testing Library

**Example Tests:**
```javascript
describe('NotificationBell', () => {
  it('displays unread count badge');
  it('shows 99+ for counts over 99');
  it('opens dropdown on click');
  it('polls for count updates');
});

describe('NotificationDropdown', () => {
  it('displays recent notifications');
  it('shows empty state when none');
  it('marks all as read');
  it('navigates to notification item');
});

describe('NotificationPreferencesPage', () => {
  it('loads current preferences');
  it('saves updated preferences');
  it('shows success toast on save');
  it('validates input fields');
});
```

---

### 2.5 End-to-End Testing

**Scope:** Full user flows

**Tools:** Playwright (recommended) or manual

**Key Scenarios:**

| Scenario | Steps |
|----------|-------|
| E2E-01: Action notification | Create action → Verify bell badge → Open dropdown → Click notification → Verify navigation |
| E2E-02: Mark all read | Multiple unread → Click mark all → Verify badge cleared |
| E2E-03: Preferences | Change preference → Save → Verify email behavior |
| E2E-04: Digest email | Trigger digest → Verify email received (manual/integration) |

---

## 3. Test Categories

### 3.1 Functional Tests

| Category | Test Cases |
|----------|------------|
| Notification creation | TC-NOTIF-01 to TC-NOTIF-10 |
| Notification retrieval | TC-NOTIF-11 to TC-NOTIF-20 |
| Notification actions | TC-NOTIF-21 to TC-NOTIF-30 |
| Preferences | TC-PREF-01 to TC-PREF-15 |
| Digest jobs | TC-DIGEST-01 to TC-DIGEST-15 |
| Escalation | TC-ESC-01 to TC-ESC-15 |

### 3.2 Non-Functional Tests

| Category | Tests |
|----------|-------|
| Performance | API response time < 200ms |
| Reliability | No notification loss under load |
| Scalability | 1000 users with digests |
| Security | Org scoping, auth required |

### 3.3 Negative Tests

| Scenario | Expected Behavior |
|----------|-------------------|
| Invalid notification ID | 404 Not Found |
| Notification from another org | 404 Not Found |
| Invalid preference values | 400 Validation Error |
| Email send failure | Logged, queued for retry |
| Job failure | Logged, does not crash server |

---

## 4. Test Data

### 4.1 Seed Data

```javascript
// Test users
const testUsers = [
  { email: 'admin@test.org', role: 'admin' },
  { email: 'manager@test.org', role: 'manager' },
  { email: 'worker@test.org', role: 'worker' }
];

// Test notifications
const testNotifications = [
  { type: 'action_assigned', isRead: false },
  { type: 'action_overdue', isRead: true },
  { type: 'incident_high_severity', isRead: false, priority: 'high' }
];

// Test preferences
const testPreferences = [
  { digestFrequency: 'daily' },
  { digestFrequency: 'weekly' },
  { digestFrequency: 'none' }
];
```

### 4.2 Mock Data

- Mock SMTP transport for email tests
- Mock clock for scheduled job tests
- Mock notification data for frontend tests

---

## 5. Test Environment

### 5.1 Backend Tests

- Separate test database
- Mocked SMTP (nodemailer mock transport)
- Jest with `--runInBand` for sequential execution
- Transaction rollback after each test

### 5.2 Frontend Tests

- Mock API responses
- React Testing Library with Vitest
- jsdom environment

### 5.3 Integration Tests

- Docker Compose for services (optional)
- Test database with migrations applied
- Real API calls (test environment)

---

## 6. Test Execution

### 6.1 Continuous Integration

```yaml
# .github/workflows/test.yml
test:
  steps:
    - run: npm test -- --coverage
    - run: npm run test:frontend
    - run: npm run test:e2e (optional)
```

### 6.2 Pre-Commit

- Run unit tests
- Run linting

### 6.3 Pre-Merge

- Full test suite
- Coverage report
- Manual review

---

## 7. Coverage Requirements

| Area | Minimum Coverage |
|------|-----------------|
| NotificationService | 90% |
| PreferencesService | 90% |
| Notification API | 90% |
| Scheduled Jobs | 85% |
| Frontend Components | 80% |
| Overall | 85% |

---

## 8. Test Case Summary

| Category | Count |
|----------|-------|
| Notification API | 20 |
| Preferences API | 10 |
| Notification Triggers | 15 |
| Digest Jobs | 12 |
| Escalation | 10 |
| Frontend Components | 18 |
| E2E Scenarios | 5 |
| **Total** | **90** |

---

## 9. Defect Management

### 9.1 Severity Levels

| Severity | Definition | Example |
|----------|------------|---------|
| Critical | Notifications not delivered | Email send fails silently |
| High | Feature not working | Can't mark as read |
| Medium | Incorrect behavior | Wrong timestamp format |
| Low | Minor issue | Spacing in UI |

### 9.2 Response Times

| Severity | Response |
|----------|----------|
| Critical | Fix immediately |
| High | Fix within 24 hours |
| Medium | Fix within sprint |
| Low | Backlog |

---

## 10. Sign-off Criteria

Phase 4 testing is complete when:

- [ ] All unit tests pass
- [ ] All integration tests pass
- [ ] All frontend tests pass
- [ ] Coverage meets thresholds
- [ ] Manual E2E scenarios verified
- [ ] Performance acceptable
- [ ] No critical or high defects open
- [ ] Security review complete

# System Architecture – EHS Portal Phase 9
## Risk Register & Enterprise Risk Management

| Item | Detail |
|------|--------|
| Document Version | 1.0 |
| Author | Solution Architect |
| Date | 2026-02-05 |
| Status | Draft |
| Phase | 9 – Risk Register & Enterprise Risk Management |

---

## 1. Overview

Phase 9 introduces the Risk Register module, providing structured enterprise risk management capabilities integrated with the existing EHS operations platform.

**Key Components:**
- RiskService - Core risk register operations
- RiskScoringService - Likelihood/impact calculations and tolerance
- RiskReviewService - Review scheduling and recording
- RiskLinkService - Entity linking operations
- RiskAnalyticsService - Dashboard and reporting aggregations
- RiskExportService - PDF/Excel generation

---

## 2. High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              FRONTEND                                        │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐             │
│  │  Risk Register  │  │   Risk Detail   │  │  Risk Heatmap   │             │
│  │     Page        │  │     Page        │  │    Dashboard    │             │
│  └────────┬────────┘  └────────┬────────┘  └────────┬────────┘             │
│           │                    │                    │                       │
│  ┌────────┴────────────────────┴────────────────────┴────────┐             │
│  │                      Risk API Client                       │             │
│  └────────────────────────────────────────────────────────────┘             │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    │ HTTP/REST
                                    │ Authorization: Bearer <JWT>
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                               BACKEND                                        │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                         Route Layer                                  │   │
│  │  /api/risks              - Risk CRUD                                │   │
│  │  /api/risks/:id/controls - Control management                       │   │
│  │  /api/risks/:id/links    - Entity linking                           │   │
│  │  /api/risks/:id/reviews  - Review history                           │   │
│  │  /api/risks/heatmap      - Heatmap data                             │   │
│  │  /api/risks/export       - PDF/Excel export                         │   │
│  │  /api/risk-categories    - Category management                      │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                    │                                        │
│  ┌─────────────────────────────────┴───────────────────────────────────┐   │
│  │                        Service Layer                                 │   │
│  │  ┌───────────────┐  ┌─────────────────┐  ┌────────────────────┐    │   │
│  │  │ RiskService   │  │ RiskScoring     │  │ RiskReviewService  │    │   │
│  │  │               │  │ Service         │  │                    │    │   │
│  │  │ - CRUD        │  │ - Calculate     │  │ - Schedule reviews │    │   │
│  │  │ - Search      │  │ - Tolerance     │  │ - Record reviews   │    │   │
│  │  │ - Filter      │  │ - Levels        │  │ - Update dates     │    │   │
│  │  └───────────────┘  └─────────────────┘  └────────────────────┘    │   │
│  │  ┌───────────────┐  ┌─────────────────┐  ┌────────────────────┐    │   │
│  │  │ RiskLink      │  │ RiskAnalytics   │  │ RiskExportService  │    │   │
│  │  │ Service       │  │ Service         │  │                    │    │   │
│  │  │ - Link/unlink │  │ - Heatmap data  │  │ - PDF generation   │    │   │
│  │  │ - Validate    │  │ - Top risks     │  │ - Excel export     │    │   │
│  │  │ - Aggregate   │  │ - Trends        │  │ - Audit pack       │    │   │
│  │  └───────────────┘  └─────────────────┘  └────────────────────┘    │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                    │                                        │
│  ┌─────────────────────────────────┴───────────────────────────────────┐   │
│  │                     Integration Layer                                │   │
│  │  ┌───────────────┐  ┌─────────────────┐  ┌────────────────────┐    │   │
│  │  │ NotificationS │  │ AnalyticsService│  │ AuditLogService    │    │   │
│  │  │ (Phase 4)     │  │ (Phase 5)       │  │ (Phase 2)          │    │   │
│  │  └───────────────┘  └─────────────────┘  └────────────────────┘    │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                            PostgreSQL                                        │
│  ┌────────────┐  ┌────────────┐  ┌────────────┐  ┌────────────────────┐    │
│  │ risks      │  │ risk_      │  │ risk_      │  │ risk_reviews       │    │
│  │            │  │ controls   │  │ links      │  │                    │    │
│  └────────────┘  └────────────┘  └────────────┘  └────────────────────┘    │
│  ┌────────────┐  ┌────────────┐  ┌────────────┐                            │
│  │ risk_      │  │ risk_      │  │ risk_      │                            │
│  │ categories │  │ tolerances │  │ scoring    │                            │
│  └────────────┘  └────────────┘  └────────────┘                            │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Service Responsibilities

### 3.1 RiskService

**File:** `src/services/riskService.js`

| Method | Purpose |
|--------|---------|
| `createRisk(data)` | Create new risk with auto-generated reference |
| `updateRisk(id, data)` | Update risk details, recalculate levels |
| `getRisk(id)` | Get risk by ID with controls and links |
| `listRisks(filters, pagination)` | List with filtering and pagination |
| `searchRisks(query)` | Full-text search across risk fields |
| `changeStatus(id, status, justification)` | Status transition with validation |
| `deleteRisk(id)` | Soft delete (set status to closed) |

### 3.2 RiskScoringService

**File:** `src/services/riskScoringService.js`

| Method | Purpose |
|--------|---------|
| `calculateLevel(score)` | Score to level conversion |
| `calculateScore(likelihood, impact)` | Multiply L × I |
| `getToleranceStatus(level, orgId)` | Check against tolerance thresholds |
| `getScoringMatrix(orgId)` | Get configured scoring criteria |
| `updateScoringMatrix(orgId, data)` | Update scoring criteria |
| `compareTolerance(residualLevel, orgId)` | Tolerance comparison result |

### 3.3 RiskReviewService

**File:** `src/services/riskReviewService.js`

| Method | Purpose |
|--------|---------|
| `recordReview(riskId, data)` | Record review with snapshots |
| `getReviewHistory(riskId)` | List all reviews for risk |
| `getUpcomingReviews(orgId, days)` | Risks due for review |
| `getOverdueReviews(orgId)` | Risks overdue for review |
| `calculateNextReviewDate(risk)` | Calculate based on frequency |
| `sendReviewReminders()` | Trigger notification job |

### 3.4 RiskLinkService

**File:** `src/services/riskLinkService.js`

| Method | Purpose |
|--------|---------|
| `linkEntity(riskId, entityType, entityId, reason)` | Create link |
| `unlinkEntity(riskId, entityType, entityId)` | Remove link |
| `getRiskLinks(riskId)` | Get all links for risk |
| `getEntityRisks(entityType, entityId)` | Get risks linked to entity |
| `validateEntity(entityType, entityId)` | Verify entity exists |
| `getLinkStatistics(riskId)` | Count links by type |

### 3.5 RiskAnalyticsService

**File:** `src/services/riskAnalyticsService.js`

| Method | Purpose |
|--------|---------|
| `getHeatmapData(orgId, filters)` | Aggregate for 5×5 heatmap |
| `getTopRisks(orgId, count, filters)` | Highest residual risks |
| `getRisksByDimension(orgId, dimension)` | By category, site, owner, status |
| `getRiskTrends(orgId, months)` | Historical score trends |
| `getReviewCompliance(orgId)` | Review on-time percentage |
| `getControlEffectiveness(orgId)` | Control rating summary |

### 3.6 RiskExportService

**File:** `src/services/riskExportService.js`

| Method | Purpose |
|--------|---------|
| `exportRegisterExcel(orgId, filters)` | Full register to Excel |
| `exportRegisterPDF(orgId, filters)` | Formatted PDF report |
| `exportRiskDetailPDF(riskId)` | Single risk detail PDF |
| `exportHeatmapImage(orgId)` | Heatmap as PNG |
| `generateAuditPack(orgId, filters)` | Combined audit package |

---

## 4. Integration Points

### 4.1 Phase 2: Actions Integration

**Bidirectional Linking:**
- Actions can be linked as controls for risks
- Risk detail shows related actions
- Action detail shows linked risks

**Status Synchronisation:**
- When action is completed, update control verification date
- Control effectiveness can reference action completion

```javascript
// RiskLinkService integration
async linkAction(riskId, actionId) {
  const action = await actionService.getAction(actionId);
  if (!action) throw new NotFoundError('Action not found');
  
  await this.linkEntity(riskId, 'action', actionId, 'Corrective action');
  await auditLogService.log('risk_link_created', { riskId, actionId });
}
```

### 4.2 Phase 4: Notifications Integration

**Notification Events:**

| Event | Recipients | Timing |
|-------|------------|--------|
| `risk.review_due` | Risk owner | 7, 3, 1 days before |
| `risk.review_overdue` | Risk owner, Manager | Daily when overdue |
| `risk.assigned` | New owner | Immediate |
| `risk.escalated` | Owner, Manager | When level increases |
| `risk.extreme_created` | Admins, Managers | Immediate |
| `control.verification_due` | Control owner | 7 days before |

**Job Integration:**
```javascript
// Background job for review reminders
async processReviewReminders() {
  const upcomingReviews = await riskReviewService.getUpcomingReviews(
    null, // All orgs
    [7, 3, 1] // Days before
  );
  
  for (const risk of upcomingReviews) {
    await notificationService.send({
      type: 'risk.review_due',
      userId: risk.owner_user_id,
      data: { riskId: risk.id, daysUntilDue: risk.days_until_due }
    });
  }
}
```

### 4.3 Phase 5: Analytics Integration

**New Analytics Widgets:**

| Widget | Data Source | Dashboard Location |
|--------|-------------|-------------------|
| Risk Heatmap | `riskAnalyticsService.getHeatmapData()` | Analytics page |
| Top 5 Risks | `riskAnalyticsService.getTopRisks()` | Analytics page |
| Risks by Category | `riskAnalyticsService.getRisksByDimension()` | Analytics page |
| Review Compliance | `riskAnalyticsService.getReviewCompliance()` | Analytics page |

**Site Risk Score Enhancement:**

Phase 5 site_risk_scores can incorporate formal risk register data:
```javascript
// Enhanced site scoring
async calculateSiteRiskScore(siteId) {
  const existingScore = await super.calculateSiteRiskScore(siteId);
  
  // Add formal risk register component
  const siteRisks = await riskService.listRisks({ siteId });
  const riskComponent = siteRisks.reduce((sum, risk) => 
    sum + (risk.residual_score || risk.inherent_score), 0
  );
  
  return {
    ...existingScore,
    formalRiskScore: riskComponent,
    totalScore: existingScore.score + Math.floor(riskComponent / 5)
  };
}
```

### 4.4 Phase 7: Chemicals & Permits Integration

**Chemical-Risk Linking:**
- Chemicals can be linked to risks they present
- SDS information referenced in risk description
- Chemical exposure risks auto-suggested

**Permit-Risk Linking:**
- Permits linked as controls
- Active permit status validates control effectiveness
- Expired permits flag control verification needed

### 4.5 Phase 8: Training Integration

**Training as Control:**
- Training courses linked as controls
- Control effectiveness based on completion rates
- Training gap = control gap identification

```javascript
// Check training control effectiveness
async evaluateTrainingControl(controlId) {
  const link = await riskControlLinkRepository.findByControl(controlId);
  if (link.entity_type !== 'training_course') return null;
  
  const completionRate = await trainingService.getCourseCompletionRate(
    link.entity_id
  );
  
  return {
    effectiveness: completionRate > 90 ? 'effective' : 
                   completionRate > 70 ? 'partially_effective' : 'ineffective',
    completionRate
  };
}
```

---

## 5. Background Jobs

### 5.1 Risk Review Reminder Job

**Schedule:** Daily at 08:00

```javascript
// jobs/riskReviewReminder.js
async function processRiskReviewReminders() {
  const reminderDays = [7, 3, 1];
  
  for (const days of reminderDays) {
    const risks = await riskReviewService.getReviewsDueIn(days);
    
    for (const risk of risks) {
      await notificationService.queue({
        type: 'risk.review_due',
        userId: risk.owner_user_id,
        data: {
          riskId: risk.id,
          riskTitle: risk.title,
          dueDate: risk.next_review_date,
          daysRemaining: days
        }
      });
    }
  }
  
  // Process overdue
  const overdueRisks = await riskReviewService.getOverdueReviews();
  for (const risk of overdueRisks) {
    await notificationService.queue({
      type: 'risk.review_overdue',
      userId: risk.owner_user_id,
      data: { riskId: risk.id, dayOverdue: risk.days_overdue }
    });
  }
}
```

### 5.2 Risk Analytics Aggregation Job

**Schedule:** Nightly at 02:00

```javascript
// jobs/riskAnalyticsAggregation.js
async function aggregateRiskAnalytics() {
  const organisations = await organisationService.getAll();
  
  for (const org of organisations) {
    // Aggregate daily risk snapshot
    await riskAnalyticsService.recordDailySnapshot(org.id, {
      totalRisks: await riskService.count({ organisationId: org.id }),
      byLevel: await riskAnalyticsService.countByLevel(org.id),
      byStatus: await riskAnalyticsService.countByStatus(org.id),
      averageResidualScore: await riskAnalyticsService.avgResidualScore(org.id),
      reviewCompliance: await riskAnalyticsService.getReviewCompliance(org.id)
    });
  }
}
```

### 5.3 Control Verification Reminder Job

**Schedule:** Daily at 09:00

```javascript
// jobs/controlVerificationReminder.js
async function processControlVerificationReminders() {
  const controls = await riskControlRepository.findVerificationDue(7);
  
  for (const control of controls) {
    await notificationService.queue({
      type: 'control.verification_due',
      userId: control.owner_user_id,
      data: {
        controlId: control.id,
        riskId: control.risk_id,
        dueDate: control.next_verification_date
      }
    });
  }
}
```

---

## 6. API Route Structure

```
/api
├── /risks
│   ├── GET    /                    - List risks with filters
│   ├── POST   /                    - Create risk
│   ├── GET    /:id                 - Get risk detail
│   ├── PUT    /:id                 - Update risk
│   ├── DELETE /:id                 - Delete (soft)
│   ├── POST   /:id/status          - Change status
│   │
│   ├── GET    /:id/controls        - List controls
│   ├── POST   /:id/controls        - Add control
│   ├── PUT    /:id/controls/:cid   - Update control
│   ├── DELETE /:id/controls/:cid   - Remove control
│   ├── POST   /:id/controls/:cid/links - Link control to entity
│   │
│   ├── GET    /:id/links           - Get risk links
│   ├── POST   /:id/links           - Create link
│   ├── DELETE /:id/links/:lid      - Remove link
│   │
│   ├── GET    /:id/reviews         - Get review history
│   ├── POST   /:id/reviews         - Record review
│   │
│   ├── GET    /heatmap             - Heatmap data
│   ├── GET    /top                 - Top risks
│   ├── GET    /upcoming-reviews    - Reviews due soon
│   ├── GET    /overdue-reviews     - Overdue reviews
│   │
│   └── POST   /export              - Export risk register
│
├── /risk-categories
│   ├── GET    /                    - List categories
│   ├── POST   /                    - Create category
│   ├── PUT    /:id                 - Update category
│   └── DELETE /:id                 - Deactivate category
│
└── /risk-settings
    ├── GET    /scoring-matrix      - Get scoring criteria
    ├── PUT    /scoring-matrix      - Update scoring criteria
    ├── GET    /tolerances          - Get tolerance thresholds
    └── PUT    /tolerances          - Update tolerances
```

---

## 7. Security & Permissions

### 7.1 Role-Based Access

| Action | Worker | Supervisor | Manager | Admin |
|--------|--------|------------|---------|-------|
| View risk register | Site only | Site only | All | All |
| Create risk | ❌ | ❌ | ✅ | ✅ |
| Edit own risks | ❌ | ❌ | ✅ | ✅ |
| Edit all risks | ❌ | ❌ | ❌ | ✅ |
| Delete risk | ❌ | ❌ | ❌ | ✅ |
| Record review | ❌ | ❌ | ✅ | ✅ |
| Manage categories | ❌ | ❌ | ❌ | ✅ |
| Configure scoring | ❌ | ❌ | ❌ | ✅ |
| Export register | ❌ | ❌ | ✅ | ✅ |

### 7.2 Data Isolation

All risk queries are scoped to the authenticated user's organisation:

```javascript
// Middleware ensures organisation scope
const riskMiddleware = (req, res, next) => {
  req.query.organisationId = req.user.organisationId;
  next();
};
```

---

## 8. Folder Structure Additions

```
backend/src/
├── routes/
│   ├── risks.js              # Risk register routes
│   ├── riskCategories.js     # Category routes
│   └── riskSettings.js       # Settings routes
├── services/
│   ├── riskService.js        # Core risk operations
│   ├── riskScoringService.js # Scoring calculations
│   ├── riskReviewService.js  # Review management
│   ├── riskLinkService.js    # Entity linking
│   ├── riskAnalyticsService.js # Dashboard data
│   └── riskExportService.js  # PDF/Excel export
├── repositories/
│   ├── riskRepository.js
│   ├── riskControlRepository.js
│   ├── riskLinkRepository.js
│   ├── riskReviewRepository.js
│   └── riskCategoryRepository.js
├── jobs/
│   ├── riskReviewReminder.js
│   ├── riskAnalyticsAggregation.js
│   └── controlVerificationReminder.js
└── validators/
    └── riskValidator.js

frontend/src/
├── pages/
│   ├── RiskRegisterPage.jsx      # Risk list view
│   ├── RiskDetailPage.jsx        # Risk detail with tabs
│   ├── RiskHeatmapPage.jsx       # Heatmap dashboard
│   └── RiskSettingsPage.jsx      # Admin settings
├── components/
│   └── risks/
│       ├── RiskForm.jsx          # Create/edit form
│       ├── RiskCard.jsx          # Card component
│       ├── RiskHeatmap.jsx       # 5x5 matrix component
│       ├── RiskControlList.jsx   # Controls list
│       ├── RiskLinkList.jsx      # Links list
│       ├── RiskReviewList.jsx    # Review history
│       ├── RiskScoreDisplay.jsx  # Score badges
│       └── RiskFilters.jsx       # Filter panel
└── hooks/
    ├── useRisks.js
    ├── useRiskDetail.js
    └── useRiskHeatmap.js
```

---

## 9. Revision History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2026-02-05 | Solution Architect | Initial Phase 9 architecture |

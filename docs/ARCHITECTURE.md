# System Architecture - EHS Portal

## 1. Overview

The EHS Portal is a web-based Environmental, Health & Safety management platform built with:

- **Frontend:** React (Vite, JavaScript)
- **Backend:** Node.js + Express (JavaScript)
- **Database:** PostgreSQL
- **Authentication:** JWT + bcrypt

This document describes the core architecture across all phases.

**Phase Coverage:**
- **Phase 1 (Complete):** Core MVP - Auth, Sites, Incidents, Inspections, Dashboard
- **Phase 2 (Complete):** Operational Excellence - Actions/CAPA, Attachments, Audit Log, Help
- **Phase 3 (Complete):** Multi-Organisation & Reporting - Multi-tenancy, User Admin, Exports
- **Phase 4 (Complete):** Notifications & Escalations - In-app notifications, Email digests, Escalation rules
- **Phase 5 (Complete):** Analytics & Insights - Advanced analytics, Risk scoring, Saved views, PDF reports
- **Phase 6 (Complete):** Security, Trust & Self-Service - Access requests, Password reset, 2FA, Theme customisation
- **Phase 7 (Planned):** Chemical & Permit Management - Chemical register, SDS, Permit-to-Work, Permit Board
- **Phase 8 (Planned):** Training & Competence Management - Training catalogue, Sessions, Assignments, Training Matrix
- **Phase 9 (Planned):** Risk Register & Enterprise Risk Management - Risk register, Controls, Reviews, Heatmaps, ERM
- **Phase 10 (Planned):** Integrations, SSO & External Connectivity - OIDC SSO, Public REST API, Webhooks, Teams integration

---

## 2. High-Level Architecture

```
"""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""
"                         CLIENT (Browser)                             "
"  """""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""  "
"  -                    React Frontend (Vite)                       -  "
"  -                                                                -  "
"  -  Pages:                    Components:                         -  "
"  -  - LoginPage               - Layout (Header, Sidebar)          -  "
"  -  - DashboardPage           - KPICards, Charts                  -  "
"  -  - IncidentsPage           - DataTable, FilterBar              -  "
"  -  - InspectionsPage         - Forms (Incident, Inspection)      -  "
"  -  - AdminPage               - Modal, Button, Input              -  "
"  -                                                                -  "
"  -  Context: AuthContext (token, user, role)                      -  "
"  -  API Client: axios with interceptors                           -  "
"  """"""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""  "
"                              -                                       "
"                              - HTTP/REST                             "
"                              - Authorization: Bearer <JWT>           "
"""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""
                               -
"""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""
"                     Node.js + Express Backend                        "
"  """""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""  "
"  -  Middleware Layer                                              -  "
"  -  - cors, express.json                                          -  "
"  -  - requestLogger (logs method, path, status, duration)         -  "
"  -  - authMiddleware (JWT verification)                           -  "
"  -  - roleMiddleware (admin/manager/worker checks)                -  "
"  -  - errorHandler (global error formatting)                      -  "
"  """"""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""  "
"  """""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""  "
"  -  Route Layer                                                   -  "
"  -  - /api/auth/*            (login, me)                          -  "
"  -  - /api/sites/*           (CRUD - admin only for write)        -  "
"  -  - /api/incident-types    (GET - all users)                    -  "
"  -  - /api/incidents/*       (CRUD - role-filtered)               -  "
"  -  - /api/inspection-templates/* (CRUD - admin only for write)   -  "
"  -  - /api/inspections/*     (CRUD - manager/admin for write)     -  "
"  -  - /api/dashboard/summary (GET - all users)                    -  "
"  """"""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""  "
"  """""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""  "
"  -  Service Layer                                                 -  "
"  -  - authService (password hashing, JWT creation)                -  "
"  -  - inspectionService (overall_result calculation)              -  "
"  -  - dashboardService (aggregation queries)                      -  "
"  """"""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""  "
"                              -                                       "
"                              - pg (node-postgres)                    "
"""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""
                               -
"""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""
"                        PostgreSQL Database                           "
"                                                                      "
"  Tables:                                                             "
"  - users                    - inspection_templates                   "
"  - sites                    - inspection_template_items              "
"  - incident_types           - inspections                            "
"  - incidents                - inspection_responses                   "
""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""
```

---

## 3. Layer Responsibilities

| Layer | Responsibility |
|-------|----------------|
| **React Frontend** | UI rendering, form handling, API calls, client-side routing, auth state management |
| **Express Backend** | API routing, request validation, authentication, authorization, business logic |
| **PostgreSQL** | Data persistence, referential integrity, indexing |

---

## 4. Authentication Flow

```
"""""""""""      """""""""""      """""""""""      """""""""""
" Browser -      - React   -      - Express -      - Postgres"
""""""""""""      """"""""""""      """"""""""""      """"""""""""
     -                -                -                "
     - 1. Enter credentials            -                "
     """""""""""""""">"                -                "
     -                -                -                "
     -                - 2. POST /api/auth/login         "
     -                """""""""""""""">"                "
     -                -                -                "
     -                -                - 3. Query user  "
     -                -                """""""""""""""">"
     -                -                -                "
     -                -                - 4. User record "
     -                -                "<""""""""""""""""
     -                -                -                "
     -                -                - 5. bcrypt.compare
     -                -                -                "
     -                -                - 6. jwt.sign({ userId, role })
     -                -                -                "
     -                - 7. { token, user }              "
     -                "<""""""""""""""""                "
     -                -                -                "
     -                - 8. Store token in localStorage  "
     -                -                -                "
     - 9. Redirect to Dashboard        -                "
     "<""""""""""""""""                -                "
     -                -                -                "
     -                - 10. GET /api/dashboard/summary  "
     -                -     Authorization: Bearer <token>
     -                """""""""""""""">"                "
     -                -                -                "
     -                -                - 11. Verify JWT "
     -                -                -                "
     -                -                - 12. Query data "
     -                -                """""""""""""""">"
     -                -                "<""""""""""""""""
     -                -                -                "
     -                - 13. Dashboard data              "
     -                "<""""""""""""""""                "
     -                -                -                "
     - 14. Render dashboard            -                "
     "<""""""""""""""""                -                "
```

### Authentication Details

| Aspect | Implementation |
|--------|----------------|
| Password Storage | bcrypt with cost factor  10 |
| Token Format | JWT with { userId, role } claims |
| Token Expiry | 24 hours |
| Token Storage | localStorage (Phase 1); httpOnly cookies considered for Phase 2 |
| Header Format | `Authorization: Bearer <token>` |

---

## 5. API Communication

- **Base URL:** `http://localhost:3001/api` (dev)
- **Content-Type:** `application/json`
- **Auth Header:** `Authorization: Bearer <jwt_token>`
- **Error Format:** `{ "error": "Human readable message", "code": "ERROR_CODE" }`

### HTTP Status Codes

| Status | Usage |
|--------|-------|
| 200 | Successful GET, PUT |
| 201 | Successful POST (created) |
| 400 | Validation errors, bad request |
| 401 | Missing or invalid token |
| 403 | Insufficient permissions |
| 404 | Resource not found |
| 500 | Server error |

---

## 6. Folder Structure

```
ehs-portal/
""" backend/
"   """ src/
"   -   """ index.js                  # Express app entry point
"   -   """ config/
"   -   -   """ db.js                 # PostgreSQL connection pool
"   -   -   """" env.js                # Environment variable loader
"   -   """ middleware/
"   -   -   """ auth.js               # JWT verification middleware
"   -   -   """ role.js               # Role-based access middleware
"   -   -   """ requestLogger.js      # Request logging
"   -   -   """" errorHandler.js       # Global error handler
"   -   """ routes/
"   -   -   """ index.js              # Route aggregator
"   -   -   """ auth.js               # /api/auth/*
"   -   -   """ sites.js              # /api/sites/*
"   -   -   """ incidentTypes.js      # /api/incident-types
"   -   -   """ incidents.js          # /api/incidents/*
"   -   -   """ inspectionTemplates.js# /api/inspection-templates/*
"   -   -   """ inspections.js        # /api/inspections/*
"   -   -   """" dashboard.js          # /api/dashboard/*
"   -   """ services/
"   -   -   """ authService.js        # Password hashing, JWT
"   -   -   """ inspectionService.js  # overall_result logic
"   -   -   """" dashboardService.js   # Aggregation queries
"   -   """" utils/
"   -       """" logger.js             # Logging utility
"   """ migrations/
"   -   """" 001_initial_schema.sql    # Phase 1 schema
"   """ seeds/
"   -   """" seed.sql                  # Default data
"   """ tests/
"   -   """ unit/                     # Unit tests (TDD)
"   -   """" integration/              # API tests
"   """ package.json
"   """ .env.example
"   """" README.md
"
""" frontend/
"   """ src/
"   -   """ main.jsx                  # React entry point
"   -   """ App.jsx                   # Router configuration
"   -   """ api/
"   -   -   """" client.js             # Axios instance with auth
"   -   """ context/
"   -   -   """" AuthContext.jsx       # Auth state provider
"   -   """ hooks/
"   -   -   """" useAuth.js            # Auth hook
"   -   """ components/
"   -   -   """ Layout/
"   -   -   -   """ Header.jsx
"   -   -   -   """ Sidebar.jsx
"   -   -   -   """" MainLayout.jsx
"   -   -   """ common/
"   -   -   -   """ Button.jsx
"   -   -   -   """ Input.jsx
"   -   -   -   """ Select.jsx
"   -   -   -   """ DataTable.jsx
"   -   -   -   """" Modal.jsx
"   -   -   """ Dashboard/
"   -   -   -   """ KPICard.jsx
"   -   -   -   """ IncidentsByTypeChart.jsx
"   -   -   -   """" SeverityTrendChart.jsx
"   -   -   """ Incidents/
"   -   -   -   """ IncidentList.jsx
"   -   -   -   """ IncidentForm.jsx
"   -   -   -   """" IncidentDetail.jsx
"   -   -   """ Inspections/
"   -   -   -   """ InspectionList.jsx
"   -   -   -   """ InspectionForm.jsx
"   -   -   -   """" InspectionDetail.jsx
"   -   -   """" Admin/
"   -   -       """ SitesManager.jsx
"   -   -       """" TemplatesManager.jsx
"   -   """" pages/
"   -       """ LoginPage.jsx
"   -       """ DashboardPage.jsx
"   -       """ IncidentsPage.jsx
"   -       """ IncidentDetailPage.jsx
"   -       """ NewIncidentPage.jsx
"   -       """ InspectionsPage.jsx
"   -       """ InspectionDetailPage.jsx
"   -       """ NewInspectionPage.jsx
"   -       """" AdminPage.jsx
"   """ public/
"   """ index.html
"   """ vite.config.js
"   """ package.json
"   """" README.md
"
"""" docs/
    """" (documentation files)
```

---

## 7. Security Considerations

| Requirement | Implementation |
|-------------|----------------|
| NFR-SEC-01 | All API endpoints except /auth/login require valid JWT |
| NFR-SEC-02 | Passwords hashed with bcrypt (cost factor  10) |
| NFR-SEC-03 | JWT secret stored in environment variable, not in code |
| NFR-SEC-04 | Role checks enforced at API level, not just UI |
| NFR-SEC-05 | No sensitive data (passwords, tokens) in logs |

---

## 8. Logging Requirements

| Requirement | Implementation |
|-------------|----------------|
| NFR-LOG-01 | All API requests logged: method, path, status, duration |
| NFR-LOG-02 | Errors logged with stack trace (server-side only) |
| NFR-LOG-03 | Auth events (login success/failure) logged |

---

## 9. Phase 2 Architecture Overview (Additive)

Phase 2 adds services on top of the Phase 1 three-tier architecture without changing Phase 1 behavior.

**New backend components (Phase 2):**
- ActionService (Actions/CAPA)
- AttachmentService + FileStorageAdapter (Evidence uploads)
- AuditLogService (immutable audit logging)
- HelpContentService (static help content)
- Overdue Action Scheduler (daily job)

```mermaid
flowchart TB
    subgraph Phase1["Phase 1 (Existing)"]
        FE[React Frontend]
        BE[Express API]
        DB[(PostgreSQL)]
    end

    subgraph Phase2["Phase 2 (Additive)"]
        ActionsSvc[ActionService]
        AttachSvc[AttachmentService]
        AuditSvc[AuditLogService]
        HelpSvc[HelpContentService]
        Storage[FileStorageAdapter]
        Job[Overdue Action Job]
        Files[(File Storage)]
    end

    FE --> BE
    BE --> DB

    BE --> ActionsSvc
    BE --> AttachSvc
    BE --> AuditSvc
    BE --> HelpSvc
    AttachSvc --> Storage --> Files
    Job --> BE

    style Phase1 fill:#F5F5F5
    style Phase2 fill:#E6F7FF
```

---

## 10. Phase 3 Architecture Overview (Additive)

Phase 3 adds multi-organisation (multi-tenant) support and enterprise reporting on top of Phase 1 & 2.

**New backend components (Phase 3):**
- OrganisationService (org profile, settings, logo)
- UserAdminService (org-scoped user CRUD)
- ExportService (CSV streaming for incidents, inspections, actions)
- orgScopeMiddleware (organisation context injection)

**Key architectural changes:**
- JWT token extended with `organisationId` claim
- All queries filter by `organisation_id`
- New `organisations` table as root of all business data

For detailed Phase 3 architecture, see: [ARCHITECTURE_PHASE3.md](./ARCHITECTURE_PHASE3.md)

```mermaid
flowchart TB
    subgraph Phase1["Phase 1 (Core)"]
        FE[React Frontend]
        BE[Express API]
        DB[(PostgreSQL)]
    end

    subgraph Phase2["Phase 2 (Operational)"]
        ActionsSvc[ActionService]
        AttachSvc[AttachmentService]
        AuditSvc[AuditLogService]
        HelpSvc[HelpContentService]
        Files[(File Storage)]
    end

    subgraph Phase3["Phase 3 (Multi-Org)"]
        OrgSvc[OrganisationService]
        UserAdminSvc[UserAdminService]
        ExportSvc[ExportService]
        OrgMW[orgScopeMiddleware]
        Orgs[(organisations table)]
    end

    FE --> BE
    BE --> DB

    BE --> ActionsSvc
    BE --> AttachSvc
    BE --> AuditSvc
    AttachSvc --> Files

    BE --> OrgMW
    OrgMW --> OrgSvc
    OrgMW --> UserAdminSvc
    OrgMW --> ExportSvc
    OrgSvc --> Orgs
    Orgs --> DB

    style Phase1 fill:#F5F5F5
    style Phase2 fill:#E6F7FF
    style Phase3 fill:#FFF7E6
```

### Phase 3 Data Isolation Strategy

| Layer | Mechanism |
|-------|-----------|
| Authentication | JWT contains `organisationId` claim |
| Middleware | `orgScopeMiddleware` validates org context |
| Routes | `req.orgId` injected into all handlers |
| Services | All methods require `orgId` parameter |
| Repositories | All queries filter by `organisation_id` |
| Database | FK constraints to `organisations` table |

---

## 11. Phase 4 Architecture Overview (Additive)

Phase 4 adds a notification and escalation system on top of Phases 1-3.

**New backend components (Phase 4):**
- NotificationService (create, query, mark read, delete)
- PreferencesService (user notification preferences CRUD)
- EmailService extension (notification emails, digests, escalations)
- SchedulerService (node-cron job orchestration)
- Scheduled Jobs: DailyDigest, WeeklyDigest, Escalation, EmailRetry, Cleanup

**Key architectural additions:**
- Polling-based notification badge (30-second interval)
- node-cron scheduled jobs for digests and escalations
- Email logging and retry mechanism
- Per-user notification preferences

For detailed Phase 4 architecture, see: [ARCHITECTURE_PHASE4.md](./ARCHITECTURE_PHASE4.md)

```mermaid
flowchart TB
    subgraph Phase1["Phase 1 (Core)"]
        FE[React Frontend]
        BE[Express API]
        DB[(PostgreSQL)]
    end

    subgraph Phase2["Phase 2 (Operational)"]
        ActionsSvc[ActionService]
        AttachSvc[AttachmentService]
        AuditSvc[AuditLogService]
        Files[(File Storage)]
    end

    subgraph Phase3["Phase 3 (Multi-Org)"]
        OrgSvc[OrganisationService]
        UserAdminSvc[UserAdminService]
        ExportSvc[ExportService]
    end

    subgraph Phase4["Phase 4 (Notifications)"]
        NotifSvc[NotificationService]
        PrefSvc[PreferencesService]
        EmailSvc[EmailService]
        Scheduler[SchedulerService]
        Jobs[Scheduled Jobs]
    end

    FE --> BE
    BE --> DB

    BE --> ActionsSvc
    BE --> AttachSvc
    BE --> AuditSvc
    AttachSvc --> Files

    BE --> OrgSvc
    BE --> UserAdminSvc
    BE --> ExportSvc

    BE --> NotifSvc
    BE --> PrefSvc
    NotifSvc --> EmailSvc
    Scheduler --> Jobs
    Jobs --> NotifSvc
    Jobs --> EmailSvc

    style Phase1 fill:#F5F5F5
    style Phase2 fill:#E6F7FF
    style Phase3 fill:#FFF7E6
    style Phase4 fill:#F0FFF0
```

### Phase 4 Notification Flow

| Trigger | Notification Type | Recipients |
|---------|------------------|------------|
| Action assigned | action_assigned | Assignee |
| Action overdue | action_overdue | Assignee, Creator |
| Action completed | action_completed | Creator |
| High-severity incident | incident_high_severity | All Managers/Admins |
| Escalation threshold | action_escalated | Assignee, Managers, Custom email |

---

## 12. Phase 5 Architecture Overview (Additive)

Phase 5 adds advanced analytics and insights capabilities on top of Phases 1-4.

**New backend components (Phase 5):**
- AnalyticsService (KPI summary, time-series, site comparisons)
- RiskScoreService (site risk calculation, categories, history)
- AggregationService (nightly pre-aggregation job)
- ReportService (PDF generation using Puppeteer)
- Saved Views CRUD (filter configuration persistence)

**Key architectural additions:**
- Pre-aggregated `analytics_daily_summary` table for performance
- Hybrid query approach (aggregated data + live recent data)
- Site risk scores with history tracking for trends
- Scheduled jobs: aggregation (02:00 UTC), risk calculation (03:00 UTC)
- PDF report generation with Puppeteer

For detailed Phase 5 architecture, see: [ARCHITECTURE_PHASE5.md](./ARCHITECTURE_PHASE5.md)

```mermaid
flowchart TB
    subgraph Phase1["Phase 1 (Core)"]
        FE[React Frontend]
        BE[Express API]
        DB[(PostgreSQL)]
    end

    subgraph Phase2["Phase 2 (Operational)"]
        ActionsSvc[ActionService]
        AttachSvc[AttachmentService]
        AuditSvc[AuditLogService]
        Files[(File Storage)]
    end

    subgraph Phase3["Phase 3 (Multi-Org)"]
        OrgSvc[OrganisationService]
        UserAdminSvc[UserAdminService]
        ExportSvc[ExportService]
    end

    subgraph Phase4["Phase 4 (Notifications)"]
        NotifSvc[NotificationService]
        PrefSvc[PreferencesService]
        EmailSvc[EmailService]
        Scheduler[SchedulerService]
    end

    subgraph Phase5["Phase 5 (Analytics)"]
        AnalyticsSvc[AnalyticsService]
        RiskSvc[RiskScoreService]
        AggSvc[AggregationService]
        ReportSvc[ReportService]
        AggTable[(analytics_daily_summary)]
        RiskTable[(site_risk_scores)]
    end

    FE --> BE
    BE --> DB

    BE --> ActionsSvc
    BE --> AttachSvc
    BE --> AuditSvc
    AttachSvc --> Files

    BE --> OrgSvc
    BE --> UserAdminSvc
    BE --> ExportSvc

    BE --> NotifSvc
    BE --> PrefSvc
    NotifSvc --> EmailSvc
    Scheduler --> NotifSvc

    BE --> AnalyticsSvc
    BE --> RiskSvc
    BE --> ReportSvc
    AnalyticsSvc --> AggTable
    RiskSvc --> RiskTable
    AggSvc --> AggTable
    Scheduler --> AggSvc
    Scheduler --> RiskSvc

    style Phase1 fill:#F5F5F5
    style Phase2 fill:#E6F7FF
    style Phase3 fill:#FFF7E6
    style Phase4 fill:#F0FFF0
    style Phase5 fill:#FFF0F5
```

### Phase 5 Analytics Strategy

| Component | Purpose |
|-----------|---------|
| Daily Aggregation | Nightly job pre-computes summaries by site, type, severity, date |
| Hybrid Queries | Use aggregated data for historical, live tables for last 48h |
| Risk Scoring | Calculate site risk scores nightly using weighted formula |
| Saved Views | Persist filter configurations for quick access |
| PDF Reports | Server-side Puppeteer rendering for board packs |

---

## 13. Extensibility for Future Phases

The architecture is designed to support future phases:

| Phase | Extension Points |
|-------|------------------|
| **P6: Security & Self-Service** | Access requests, Password reset, 2FA (TOTP), Theme system |
| **P5+: Risk Register** | Add risks table, risk service, risk matrix component |
| **P5+: SSO** | Add OIDC middleware, user provisioning logic |
| **P5+: External API** | Add external API endpoints with API key authentication |
| **P5+: Configurable Weights** | Admin UI to adjust risk score weights |

### Phase 6 Security Components

Phase 6 introduces new security capabilities:

```
┌─────────────────────────────────────────────────────────────────┐
│                    Phase 6 Security Layer                       │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌───────────────┐  ┌───────────────┐  ┌───────────────────┐   │
│  │ Access Request│  │ Password Reset│  │ Two-Factor Auth   │   │
│  │   Service     │  │   Service     │  │    Service        │   │
│  └───────┬───────┘  └───────┬───────┘  └─────────┬─────────┘   │
│          │                  │                    │             │
│          ▼                  ▼                    ▼             │
│  ┌───────────────────────────────────────────────────────────┐ │
│  │                 Crypto Utilities                          │ │
│  │  - Token generation (64-byte random)                      │ │
│  │  - Token hashing (SHA-256)                                │ │
│  │  - TOTP encryption (AES-256-GCM)                          │ │
│  │  - Backup code hashing (bcrypt)                           │ │
│  └───────────────────────────────────────────────────────────┘ │
│                                                                 │
│  ┌───────────────────────────────────────────────────────────┐ │
│  │               Security Audit Service                      │ │
│  │  - Login tracking                                         │ │
│  │  - Password events                                        │ │
│  │  - 2FA events                                             │ │
│  │  - Access request events                                  │ │
│  └───────────────────────────────────────────────────────────┘ │
│                                                                 │
│  ┌───────────────────────────────────────────────────────────┐ │
│  │                  Theme Provider                           │ │
│  │  - Light / Dark / System modes                            │ │
│  │  - CSS variable injection                                 │ │
│  │  - localStorage + database persistence                    │ │
│  └───────────────────────────────────────────────────────────┘ │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Phase 6 Environment Variables

```
# Two-Factor Authentication
TOTP_ENCRYPTION_KEY=32-byte-hex-key-for-aes256

# Password Reset
PASSWORD_RESET_TOKEN_EXPIRY_MINUTES=30

# Account Lockout
MAX_FAILED_LOGIN_ATTEMPTS=5
ACCOUNT_LOCKOUT_DURATION_MINUTES=15
```

See [ARCHITECTURE_PHASE6.md](./ARCHITECTURE_PHASE6.md) for detailed Phase 6 architecture.

### Phase 7: Chemical & Permit Management (Summary)

Phase 7 introduces new services for chemical register and permit-to-work management.

**New Services:**
- **ChemicalService** - Chemical register CRUD, GHS hazard management, SDS integration
- **ChemicalLocationService** - Storage locations and inventory tracking
- **PermitService** - Permit lifecycle management with state machine
- **PermitTypeService** - Permit type configuration and templates
- **PermitControlService** - Pre/during/post-work control completion
- **PermitConflictService** - Overlap detection for concurrent permits
- **PermitNumberService** - Auto-generation of permit numbers

**New Routes:**
- `/api/chemicals/*` - Chemical register endpoints
- `/api/chemicals/:id/sds` - SDS document management
- `/api/chemicals/:id/locations` - Storage location management
- `/api/permit-types/*` - Permit type configuration
- `/api/permits/*` - Permit CRUD and lifecycle
- `/api/permits/board` - Real-time permit board
- `/api/permits/:id/controls/:controlId` - Control completion
- `/api/permits/check-conflicts` - Conflict detection

**Key Features:**
- Permit state machine: draft → submitted → approved → active → closed/expired/cancelled
- Pre-work control enforcement before activation
- Post-work control enforcement before closure
- Real-time permit board with countdown timers
- SDS expiry tracking and notifications
- GHS hazard classification with pictograms

See [ARCHITECTURE_PHASE7.md](./ARCHITECTURE_PHASE7.md) for detailed Phase 7 architecture.

### Phase 8: Training & Competence Management (Summary)

Phase 8 introduces comprehensive training management including course catalogue, instructor-led sessions, assignments, completions tracking, and competence matrix.

**New Services:**
- **CourseService** - Training course CRUD, prerequisites, refresher linking
- **SessionService** - Instructor-led training session management, enrollment, attendance
- **AssignmentService** - Individual/bulk training assignments, auto-assignment rules
- **CompletionService** - Completion recording, evidence upload, verification
- **MatrixService** - Training matrix generation, gap analysis
- **TrainingNotificationService** - Expiry reminders, assignment notifications
- **TrainingReportService** - Compliance reports, training history

**New Routes:**
- `/api/training/categories/*` - Training category management
- `/api/training/courses/*` - Course catalogue CRUD
- `/api/training/sessions/*` - Session scheduling and management
- `/api/training/enrollments/*` - Session enrollment
- `/api/training/assignments/*` - Training assignments
- `/api/training/assignment-rules/*` - Auto-assignment rule configuration
- `/api/training/completions/*` - Completion recording and verification
- `/api/training/my-training` - User's training dashboard
- `/api/training/matrix` - Training matrix with gap analysis
- `/api/training/requirements/*` - Role/site training requirements
- `/api/training/reports/*` - Training reports and exports

**Background Jobs:**
- **ExpiryCheckJob** (01:00 UTC) - Check expiring certifications, create notifications
- **ReminderJob** (06:00 UTC) - Send due date reminders for assignments
- **AutoAssignmentJob** (02:00 UTC) - Apply auto-assignment rules to new users
- **TrainingAnalyticsAggregationJob** (03:00 UTC) - Aggregate training metrics

**Key Features:**
- Course catalogue with prerequisites and refresher linking
- Instructor-led training (ILT) session scheduling with capacity management
- Individual, bulk (role/site), and automated training assignment
- Completion recording with evidence upload and external training verification
- Training matrix with visual gap analysis
- Validity tracking with expiry notifications (30/14/7/1 day reminders)
- Integration with Actions (link training as corrective action)
- Integration with Analytics (training metrics in dashboards)

See [ARCHITECTURE_PHASE8.md](./ARCHITECTURE_PHASE8.md) for detailed Phase 8 architecture.

### Extensibility Design Decisions

1. **organisation_id on all tables** - Implemented in Phase 3 for multi-tenancy
2. **Modular routes** - Each domain has its own route file for easy extension
3. **Service layer** - Business logic separated from routes for reusability
4. **Component-based frontend** - Reusable components support theming and new features
5. **Repository pattern** - Data access abstracted for consistent org-scoping
6. **Pre-aggregation tables** - Phase 5 pattern for scalable analytics

---

## 12. Development Environment

| Component | Port | URL |
|-----------|------|-----|
| Frontend (Vite) | 5173 | http://localhost:5173 |
| Backend (Express) | 3001 | http://localhost:3001 |
| PostgreSQL | 5432 | localhost:5432 |

### Environment Variables (.env)

```
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/ehs_portal
DB_HOST=localhost
DB_PORT=5432
DB_NAME=ehs_portal
DB_USER=postgres
DB_PASSWORD=postgres

# JWT
JWT_SECRET=your-secret-key-here
JWT_EXPIRES_IN=24h

# Server
PORT=3001
NODE_ENV=development
```

---

## 14. Related Documents

- [DATA_MODEL.md](./DATA_MODEL.md) - Database schema and entity definitions
- [ARCHITECTURE_PHASE3.md](./ARCHITECTURE_PHASE3.md) - Phase 3 architecture details
- [ARCHITECTURE_PHASE4.md](./ARCHITECTURE_PHASE4.md) - Phase 4 architecture details
- [ARCHITECTURE_PHASE5.md](./ARCHITECTURE_PHASE5.md) - Phase 5 architecture details (Analytics)
- [ARCHITECTURE_PHASE6.md](./ARCHITECTURE_PHASE6.md) - Phase 6 architecture details (Security)
- [ARCHITECTURE_PHASE7.md](./ARCHITECTURE_PHASE7.md) - Phase 7 architecture details (Chemicals & Permits)
- [ARCHITECTURE_PHASE8.md](./ARCHITECTURE_PHASE8.md) - Phase 8 architecture details (Training & Competence)
- [API_SPEC_PHASE1.md](./API_SPEC_PHASE1.md) - Phase 1 API specification
- [API_SPEC_PHASE2.md](./API_SPEC_PHASE2.md) - Phase 2 API specification
- [API_SPEC_PHASE3.md](./API_SPEC_PHASE3.md) - Phase 3 API specification
- [API_SPEC_PHASE4.md](./API_SPEC_PHASE4.md) - Phase 4 API specification (Notifications)
- [API_SPEC_PHASE5.md](./API_SPEC_PHASE5.md) - Phase 5 API specification (Analytics)
- [API_SPEC_PHASE6.md](./API_SPEC_PHASE6.md) - Phase 6 API specification (Security)
- [API_SPEC_PHASE7.md](./API_SPEC_PHASE7.md) - Phase 7 API specification (Chemicals & Permits)
- [API_SPEC_PHASE8.md](./API_SPEC_PHASE8.md) - Phase 8 API specification (Training & Competence)
- [FRONTEND_UX_PHASE1.md](./FRONTEND_UX_PHASE1.md) - UI screens and flows
- [FRONTEND_UX_PHASE4.md](./FRONTEND_UX_PHASE4.md) - Phase 4 UI specification
- [FRONTEND_UX_PHASE5.md](./FRONTEND_UX_PHASE5.md) - Phase 5 UI specification (Analytics)
- [FRONTEND_UX_PHASE6.md](./FRONTEND_UX_PHASE6.md) - Phase 6 UI specification (Security)
- [FRONTEND_UX_PHASE7.md](./FRONTEND_UX_PHASE7.md) - Phase 7 UI specification (Chemicals & Permits)
- [FRONTEND_UX_PHASE8.md](./FRONTEND_UX_PHASE8.md) - Phase 8 UI specification (Training & Competence)
- [IMPLEMENTATION_PLAN_PHASE1.md](./IMPLEMENTATION_PLAN_PHASE1.md) - Step-by-step build plan
- [IMPLEMENTATION_PLAN_PHASE5.md](./IMPLEMENTATION_PLAN_PHASE5.md) - Phase 5 implementation plan
- [IMPLEMENTATION_PLAN_PHASE6.md](./IMPLEMENTATION_PLAN_PHASE6.md) - Phase 6 implementation plan
- [IMPLEMENTATION_PLAN_PHASE7.md](./IMPLEMENTATION_PLAN_PHASE7.md) - Phase 7 implementation plan
- [IMPLEMENTATION_PLAN_PHASE8.md](./IMPLEMENTATION_PLAN_PHASE8.md) - Phase 8 implementation plan
- [TEST_STRATEGY_PHASE1.md](./TEST_STRATEGY_PHASE1.md) - Testing approach and coverage
- [TEST_STRATEGY_PHASE5.md](./TEST_STRATEGY_PHASE5.md) - Phase 5 test strategy
- [TEST_STRATEGY_PHASE6.md](./TEST_STRATEGY_PHASE6.md) - Phase 6 test strategy (Security)
- [TEST_STRATEGY_PHASE7.md](./TEST_STRATEGY_PHASE7.md) - Phase 7 test strategy (Chemicals & Permits)
- [TEST_STRATEGY_PHASE8.md](./TEST_STRATEGY_PHASE8.md) - Phase 8 test strategy (Training & Competence)





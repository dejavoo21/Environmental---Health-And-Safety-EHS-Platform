# Phase 2 Implementation Checklist

## Design

- [x] **Phase 2 architecture** - ARCHITECTURE_PHASE2.md and ARCHITECTURE.md updated.
- [x] **Phase 2 workflows** - WORKFLOWS_PHASE2.md completed.
- [x] **Phase 2 journeys** - USER_JOURNEYS.md updated for P2-J1..P2-J11.
- [x] **Phase 2 stories** - USER_STORIES.md updated (US-ACT-01..04, US-ATT-01..03, US-AUD-01..03, US-HELP-01).
- [x] **API spec** - API_SPEC_PHASE2.md created.
- [x] **Frontend UX** - FRONTEND_UX_PHASE2.md created.
- [x] **Implementation plan** - IMPLEMENTATION_PLAN_PHASE2.md created.
- [x] **Test strategy** - TEST_STRATEGY_PHASE2.md created.
- [x] **Phase 2 test cases** - qa/test_cases_phase2.csv created and appended to test_cases_all_phases.csv.


## Backend


### Actions / CAPA

- [x] **Create DB schema for Actions** – Add tables for actions/CAPA linked to incidents and inspections, with fields for assignee, due dates, status, and evidence summary. (002_phase2_actions_attachments_audit.sql)
- [x] **Implement Actions CRUD endpoints** – Add endpoints for creating, updating, listing, and closing actions; enforce RBAC so only allowed roles can assign/close actions. (routes/actions.js)
- [ ] **Implement automatic action creation rules** – Where required, create actions automatically for failed inspection responses or high-severity incidents as per TEST_STRATEGY_PHASE2. (Deferred to future iteration)

### Attachments

- [x] **Create DB schema for attachments** – Add attachments table with file metadata and foreign keys to incidents, inspections, and actions. (002_phase2_actions_attachments_audit.sql)
- [x] **Implement attachment upload/download endpoints** – Add endpoints and storage handling for uploading and retrieving evidence files; apply size/type validation. (routes/attachments.js)

### RBAC Enforcement

- [x] **Centralise RBAC checks** – Introduce reusable helpers or middleware to enforce role-based access for admin/manager/worker on key endpoints. (middleware/requireRole.js used in actions, audit routes)

### Audit Logging

- [x] **Create audit log schema** – Add audit_log table capturing who did what, when, and on which entity for critical operations. (002_phase2_actions_attachments_audit.sql)
- [x] **Implement audit logging hooks** – Write logic to record audit events for login, incident status changes, inspection creation, and action updates. (utils/audit.js, routes/incidents.js, routes/inspections.js, routes/actions.js)

### Help / Docs

- [x] **Serve help content metadata API** – Provide simple endpoints to retrieve in-app help/article metadata for Phase 2 help panel. (routes/help.js)

### Tests

- [x] **Add backend tests for Actions, Attachments, RBAC, and Audit log** – Write tests mapped to Phase 2 TC-IDs to verify actions lifecycle, attachment validation, RBAC rules, and audit records. (tests/actions.test.js, tests/attachments.test.js, tests/auditLogs.test.js, tests/help.test.js)

### Handover

- [x] **Update HANDOVER_TO_CLAUDE.md for Phase 2 backend work** – Summarise implemented Phase 2 backend features, US-IDs, C-IDs, TC-IDs, files changed, and remaining work.

## Frontend


### Actions / CAPA

- [x] **Build Actions list and detail UI** – Create pages for listing and viewing actions with status, due date, and linked incident/inspection. (pages/ActionsListPage.jsx, pages/ActionDetailPage.jsx)
- [x] **Build action creation/editing UI** – Allow managers/admins to create and update actions from incidents/inspections, respecting UX design. (components/CreateActionModal.jsx)
- [x] **Wire Actions UI to API** – Connect Actions UI to actions CRUD endpoints and reflect status changes in the UI.

### Attachments

- [x] **Implement attachments UI components** – Add upload widgets and attachment lists to incidents, inspections, and actions detail views. (components/AttachmentsPanel.jsx)
- [x] **Wire attachments UI to API** – Hook attachment UI to upload/download endpoints with progress and error handling.

### RBAC

- [x] **Apply role-based UI visibility** – Hide/disable admin-only and manager-only actions in the UI based on user role from /auth/me. (Layout.jsx, ActionsListPage.jsx, ActionsPanel.jsx)

### Audit Log

- [x] **Add activity log view** – Created activity log panels for incidents, inspections, and actions detail views. (components/ActivityLogPanel.jsx)

### Help / Docs

- [x] **Add in-app help panel** – Implement help page with topics sidebar and content display. (pages/HelpPage.jsx)

### Tests

- [x] **Add UI tests for Phase 2 features** – Added tests for Actions, Attachments, Activity Log, Help, and CreateActionModal linked to Phase 2 TC-IDs. (tests/ActionsListPage.test.jsx, tests/ActionDetailPage.test.jsx, tests/AttachmentsPanel.test.jsx, tests/ActivityLogPanel.test.jsx, tests/HelpPage.test.jsx, tests/CreateActionModal.test.jsx)

### Handover

- [x] **Update HANDOVER_TO_CLAUDE.md for Phase 2 frontend work** – Summarise implemented Phase 2 frontend features, US-IDs, C-IDs, TC-IDs, files changed, and remaining work.

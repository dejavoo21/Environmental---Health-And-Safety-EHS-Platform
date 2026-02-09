# Phase 3 Implementation Checklist


## Backend


### Multi-Org

- [x] **Extend schema with organisation support** – Add organisation table and org_id foreign keys to relevant entities (users, sites, incidents, inspections, etc.) per DATA_MODEL_PHASE3.
- [x] **Implement org scoping in queries** – Ensure all list/detail endpoints are filtered by the caller's organisation and prevent cross-org access.
- [x] **Org-level settings API** – Add endpoints for retrieving and updating organisation settings such as branding and defaults.

### Exports

- [x] **Implement CSV/Excel export endpoints** – Add export endpoints for incidents, inspections, and actions using filters and pagination-safe query patterns.

### Tests

- [x] **Add backend tests for multi-org isolation and exports** – Verify that data is properly scoped by organisation and that exports obey filters and permissions.

### Handover

- [x] **Update HANDOVER_TO_CLAUDE.md for Phase 3 backend work** – Summarise multi-org and export implementation status with traceability.

## Frontend


### Multi-Org

- [x] **Add organisation selector (if applicable)** – Implemented OrgContext for organisation data and settings.
- [x] **Apply branding/theming per organisation** – Adjusted logos/colours based on organisation settings (OrgLogo component, threshold-based KPI colors).

### Exports

- [x] **Add export controls to key list views** – Implemented ReportsPage with export panels for incidents, inspections, and actions with filters and rate limiting.

### Tests

- [x] **Add tests for org-specific UI behaviour and exports** – Added tests for OrgContext, AdminOrganisationPage, AdminUsersPage, ReportsPage (58 total tests).

### Handover

- [x] **Update HANDOVER_TO_CLAUDE.md for Phase 3 frontend work** – Summarise Phase 3 UI work and remaining tasks.
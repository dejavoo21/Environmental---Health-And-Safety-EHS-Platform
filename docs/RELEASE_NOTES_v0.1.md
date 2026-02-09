# Release Notes - EHS Portal v0.1

**Release Date:** TBD (Pending UAT Completion)
**Version:** 0.1.0
**Status:** UAT Ready

---

## Overview

EHS Portal v0.1 is the initial release of the Environmental, Health & Safety management platform. This release includes complete Phase 1 and Phase 2 functionality, providing organizations with tools to manage safety incidents, conduct inspections, track corrective actions, and maintain compliance documentation.

---

## Key Features

### Incidents Management

- **Report Incidents:** Workers can report safety incidents with details including title, description, site, incident type, severity, and occurrence time.
- **Track Status:** Incidents progress through statuses: Open → Under Investigation → Closed.
- **View History:** Complete audit trail of all incident changes via Activity Logs.
- **Role-Based Access:** Workers see their own incidents; Managers and Admins see all incidents.

### Inspections Management

- **Template-Based Inspections:** Conduct inspections using predefined templates with checklist items.
- **Checklist Responses:** Mark items as Pass, Fail, or N/A with optional notes.
- **Automatic Scoring:** System calculates pass/fail counts and overall status.
- **Link to Actions:** Create corrective actions directly from failed inspection items.

### Actions & CAPA (Corrective and Preventive Actions)

- **Create Actions:** Managers/Admins can create actions from incidents or inspections.
- **Assign to Users:** Actions are assigned to specific team members with due dates.
- **Track Progress:** Actions move through statuses: Open → In Progress → Done.
- **My Actions View:** Workers see only their assigned actions.
- **All Actions View:** Managers/Admins can view and filter all actions in the system.
- **Overdue Tracking:** System identifies overdue actions based on due dates.

### Attachments

- **Upload Files:** Attach documents, photos, and other files to incidents and inspections.
- **Supported Types:** Images (JPG, PNG, GIF), Documents (PDF, DOC, DOCX, XLS, XLSX), Text files.
- **Size Limit:** Maximum 10MB per file.
- **Download:** Users can download attachments for review.

### Activity Logs (Audit Trail)

- **Automatic Logging:** All changes to incidents, inspections, and actions are automatically recorded.
- **Event Types:** Created, Updated, Status Changed, Attachment Added.
- **User Attribution:** Each event records who made the change and when.
- **Compliance Ready:** Provides audit trail for regulatory compliance.

### Help System

- **Contextual Help:** In-app help topics covering all major features.
- **Topic Categories:** Getting Started, Incidents, Inspections, Actions, Attachments, and more.
- **Role-Specific Guidance:** Content relevant to Workers, Managers, and Admins.
- **Contact Support:** Information for reaching the support team.

### Administration

- **User Management:** Admins can create, edit, and manage user accounts with role assignments.
- **Site Management:** Create and manage physical locations/facilities.
- **Incident Types:** Define categories for incident classification.
- **Inspection Templates:** Create reusable inspection checklists with multiple items.

### Dashboard

- **KPI Overview:** At-a-glance metrics for safety performance.
- **Open Incidents Count:** Number of incidents requiring attention.
- **Inspections This Month:** Recent inspection activity.
- **Overdue Actions:** Actions past their due date.
- **Role-Based Visibility:** All authenticated users can view the dashboard.

---

## User Roles

| Role | Capabilities |
|------|--------------|
| **Worker** | Report incidents, view own incidents, complete assigned actions, upload attachments, access help |
| **Manager** | All Worker capabilities + conduct inspections, create/assign actions, view all actions, view activity logs |
| **Admin** | All Manager capabilities + manage users, sites, incident types, templates |

---

## Technical Stack

| Component | Technology |
|-----------|------------|
| **Frontend** | React 18 + Vite |
| **Backend** | Node.js + Express |
| **Database** | PostgreSQL |
| **Authentication** | JWT (JSON Web Tokens) |
| **File Storage** | Local filesystem (uploads directory) |
| **Testing** | Jest (backend), Vitest (frontend) |

---

## Known Limitations

The following items are **not included** in v0.1 and are planned for future releases:

1. **Multi-Tenancy:** Single organization only. No tenant isolation.
2. **Data Export:** No CSV/Excel export functionality.
3. **Email Notifications:** No automated email alerts for actions or incidents.
4. **Reporting & Analytics:** Basic dashboard only. No advanced reporting.
5. **Mobile App:** Web-only. No native mobile application.
6. **SSO/LDAP:** Local authentication only. No enterprise SSO integration.
7. **File Virus Scanning:** Uploaded files are not scanned for malware.
8. **Internationalization:** English only. No multi-language support.
9. **Bulk Operations:** No bulk import/export of data.
10. **API Rate Limiting:** No rate limiting on API endpoints.

---

## Installation Requirements

### Prerequisites

- Node.js v18 or higher
- PostgreSQL 14 or higher
- npm or yarn package manager

### Environment Variables

Backend requires the following environment variables:

```
PORT=3001
DATABASE_URL=postgresql://user:password@localhost:5432/ehs_portal
JWT_SECRET=your-secret-key
CORS_ORIGIN=http://localhost:5173
```

---

## Upgrade Notes

This is the initial release. No upgrade path required.

---

## Bug Fixes

N/A - Initial release.

---

## Security Considerations

- All passwords are hashed using bcrypt (10 rounds).
- JWT tokens expire after 8 hours.
- Role-based access control enforced on all API endpoints.
- Input validation on all user-submitted data.
- SQL injection prevention via parameterized queries.

---

## Test Coverage

| Area | Backend Tests | Frontend Tests |
|------|---------------|----------------|
| Authentication | 5 | 1 |
| Incidents | 8 | 2 |
| Inspections | 7 | 2 |
| Actions | 10 | 11 |
| Attachments | 4 | 4 |
| Activity Logs | 4 | 4 |
| Help | 3 | 5 |
| Admin (Sites, Types, Templates) | 21 | - |
| **Total** | **62** | **33** |

---

## Documentation

The following documentation is available in the `docs/` directory:

- `BRD.md` - Business Requirements Document
- `DATA_MODEL.md` - Database schema and relationships
- `ARCHITECTURE.md` - System architecture overview
- `API_SPEC_PHASE1.md` - Phase 1 API specifications
- `API_SPEC_PHASE2.md` - Phase 2 API specifications
- `UX_SPEC.md` - User experience specifications
- `USER_STORIES.md` - User stories and acceptance criteria
- `TEST_STRATEGY.md` - Testing approach and methodology
- `TEST_CASES.md` - Detailed test case specifications
- `UAT_PHASE1_PHASE2.md` - UAT checklist and scenarios
- `UAT_RESULTS_TEMPLATE.md` - Template for recording UAT results
- `OPERATIONS_RUNBOOK.md` - Operations and maintenance guide

---

## Support

For issues or questions:

- **Email:** support@ehsportal.local
- **Documentation:** See `docs/` directory
- **In-App Help:** Available via Help menu

---

## Contributors

- Development Team
- Product Owner
- QA Team

---

## License

Proprietary - All rights reserved.

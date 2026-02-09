# Frontend & UX Design - EHS Portal (Phase 2)

## 1. Overview

This document defines Phase 2 user interface screens, navigation, and interactions.
Phase 2 extends Phase 1 with:
- Actions / CAPA
- Attachments / Evidence
- Activity Log (audit history)
- In-app Help

### Technology
- React with Vite
- React Router for navigation
- Axios for API calls
- CSS/SCSS for styling

---

## 2. Screen Inventory (Phase 2)

| Screen | Route | Purpose | Journey | Auth |
|--------|-------|---------|---------|------|
| My Actions | `/actions` | View assigned actions | P2-J3 | All roles |
| All Actions | `/actions/all` | View all actions (filters) | P2-J4 | Manager/Admin |
| Action Detail | `/actions/:id` | View action, update status, attachments, activity log | P2-J3, P2-J10 | All roles (RBAC) |
| Help | `/help` | In-app help and support | P2-J11 | All roles |

Phase 2 also adds panels/sections to existing pages:
- Incident Detail (`/incidents/:id`) - Attachments, Activity Log, Actions list
- Inspection Detail (`/inspections/:id`) - Attachments, Activity Log, Actions list

---

## 3. Navigation Updates

Main navigation:
- Dashboard
- Incidents
- Inspections
- Actions (enabled in Phase 2)
- Admin (Sites, Incident Types, Templates)
- Help
- User menu (Logout)

### Role-Based Navigation Visibility

| Menu Item | Worker | Manager | Admin |
|-----------|--------|---------|-------|
| Actions (My Actions) | Yes | Yes | Yes |
| Actions (All Actions) | No | Yes | Yes |
| Help | Yes | Yes | Yes |

---

## 4. Screen Specifications

### 4.1 My Actions Page (`/actions`)

**Purpose:** View and manage actions assigned to the current user (P2-J3)

**Key Components:**
- Page title: "My Actions"
- Filters:
  - Status (All, Open, In Progress, Overdue, Done)
  - Due date range
  - Site (derived from source incident/inspection)
- Actions table columns:
  - Title
  - Source (Incident/Inspection)
  - Site
  - Due Date
  - Status badge
- Empty state: "No actions assigned to you."

**User Actions:**
- Click row to open Action Detail
- Change filters to update list

**Role Behavior:**
- All roles can view My Actions

**States:**
- Loading: skeleton rows
- Empty: show guidance text
- Error: "Unable to load actions"

**References:** US-ACT-03, P2-J3

---

### 4.2 All Actions Page (`/actions/all`)

**Purpose:** View and filter all actions across sites (P2-J4)

**Key Components:**
- Page title: "All Actions"
- Filters:
  - Status
  - Site
  - Due date range
- Actions table columns:
  - Title
  - Assignee
  - Source
  - Site
  - Due Date
  - Status badge

**Role Behavior:**
- Manager/Admin only
- Workers should not see this route or nav entry

**Notes:**
- Site filter uses computed siteId derived from source incident/inspection

**States:**
- Loading, Empty, Error consistent with Phase 1 patterns

**References:** US-ACT-04, P2-J4

---

### 4.3 Action Detail Page (`/actions/:id`)

**Purpose:** View action details, update status, manage attachments, view activity log

**Layout Sections:**
1. Header
   - Action title
   - Status badge or dropdown (assignee, manager, admin)
2. Action Details
   - Description
   - Source link (Incident or Inspection)
   - Assignee
   - Due date
3. Attachments
   - Upload control
   - Attachment list (file name, size, uploaded by, date)
4. Activity Log
   - Timeline list of audit entries

**User Actions:**
- Update status (assignee, manager/admin)
- Upload attachment (assignee, manager/admin)
- Click source link to open incident/inspection detail

**Role Behavior:**
- Workers can view only actions assigned to them
- Activity Log visible only if user can access the action

**States:**
- Loading (full page)
- Empty attachments state
- Empty activity log state

**References:** US-ACT-03, US-AUD-03, US-ATT-03, P2-J3, P2-J10, P2-J7

---

### 4.4 Incident Detail Enhancements (`/incidents/:id`)

**Add Sections:**
- Actions list (linked to incident)
  - "Add Action" button for manager/admin
- Attachments panel
  - Upload control
  - Attachment list
- Activity Log panel
  - Chronological list of audit entries

**Role Behavior:**
- Workers can view attachments and activity log
- Only manager/admin can create actions
 - Activity Log visible only if user can access the incident

**References:** US-ACT-01, US-ATT-01, US-AUD-01, P2-J1, P2-J5, P2-J8

---

### 4.5 Inspection Detail Enhancements (`/inspections/:id`)

**Add Sections:**
- Actions list (linked to inspection)
  - "Create Action" per failed item
- Attachments panel
  - Upload control
  - Attachment list
- Activity Log panel
  - Chronological list of audit entries

**Role Behavior:**
- Managers/Admin can create actions from failed items
- Workers can view attachments and activity log if they can access inspection
 - Activity Log visible only if user can access the inspection

**References:** US-ACT-02, US-ATT-02, US-AUD-02, P2-J2, P2-J6, P2-J9

---

### 4.6 Help Page (`/help`)

**Purpose:** Provide short guidance and support contact (P2-J11)

**Key Components:**
- Page title: "Help"
- FAQ sections:
  - Reporting incidents
  - Performing inspections
  - Managing actions
- Support contact box (email or link)

**States:**
- Loading (if help content fetched from API)
- Error: "Help content unavailable"

**References:** US-HELP-01, P2-J11

---

## 5. Interaction Notes

### Status Updates
- Status dropdown only for users allowed by RBAC.
- When status set to done, show success toast and refresh activity log.

### Attachments
- Show validation errors for file size/type.
- Display file size and uploaded date in list.

### Activity Log
- Display event label, timestamp, and user.
- Read-only list; no edit/delete options.

---

## 6. Common States (Phase 2)

| State | UI Pattern |
|-------|------------|
| Loading | Skeleton rows or spinner |
| Empty list | Friendly message with guidance |
| Error | Inline error banner + retry |

---

## 7. Related Documents

- [API_SPEC_PHASE2.md](./API_SPEC_PHASE2.md) - Phase 2 API specifications
- [WORKFLOWS_PHASE2.md](./WORKFLOWS_PHASE2.md) - Phase 2 workflows
- [USER_JOURNEYS.md](./USER_JOURNEYS.md) - Phase 2 journeys
- [USER_STORIES.md](./USER_STORIES.md) - Phase 2 stories

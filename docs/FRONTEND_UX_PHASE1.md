# Frontend & UX Design - EHS Portal (Phase 1)

## 1. Overview

This document defines all user interface screens, navigation, and user flows for Phase 1 of the EHS Portal.

### Technology
- React with Vite
- React Router for navigation
- Axios for API calls
- Recharts for charts
- CSS/SCSS for styling (no specific framework mandated)

---

## 2. Screen Inventory

| Screen | Route | Purpose | Journey | Auth |
|--------|-------|---------|---------|------|
| Login | `/login` | Authenticate user | P1-J1 | Public |
| Dashboard | `/` | KPIs, charts, recent activity | P1-J1, P1-J7 | All roles |
| Incidents List | `/incidents` | View/filter incidents | P1-J2, P1-J3 | All roles |
| New Incident | `/incidents/new` | Create incident form | P1-J2 | All roles |
| Incident Detail | `/incidents/:id` | View/update incident | P1-J3 | All roles |
| Inspections List | `/inspections` | View/filter inspections | P1-J6 | All roles |
| New Inspection | `/inspections/new` | Perform inspection | P1-J6 | Manager/Admin |
| Inspection Detail | `/inspections/:id` | View inspection results | P1-J6 | All roles |
| Admin - Sites | `/admin/sites` | Manage sites | P1-J4 | Admin only |
| Admin - Incident Types | `/admin/incident-types` | Manage incident types | P1-J4 | Admin only |
| Admin - Templates | `/admin/templates` | Manage templates | P1-J5 | Admin only |
| Template Detail | `/admin/templates/:id` | Edit template items | P1-J5 | Admin only |

---

## 3. Navigation Structure

Main navigation:
- Dashboard
- Incidents
- Inspections
- Actions (Coming Soon, disabled)
- Admin (dropdown: Sites, Incident Types, Templates)
- User menu (Logout)

### Role-Based Navigation Visibility

| Menu Item | Worker | Manager | Admin |
|-----------|--------|---------|-------|
| Dashboard | Yes | Yes | Yes |
| Incidents | Yes | Yes | Yes |
| Inspections | Yes (read-only) | Yes | Yes |
| Actions (Coming Soon) | Visible (disabled) | Visible (disabled) | Visible (disabled) |
| Admin | No | No | Yes |

**Related Test Cases:** TC-AUTH-05

---

## 4. Screen Specifications

### 4.1 Login Page (`/login`)

**Purpose:** Authenticate user and establish session

**Wireframe:**
```
"""""""""""""""""""""""""""""""""""""""""""""""
"              EHS Portal                      "
"                                             "
"  """""""""""""""""""""""""""""""""""""""    "
"  -         Email                       -    "
"  """"""""""""""""""""""""""""""""""""""""    "
"                                             "
"  """""""""""""""""""""""""""""""""""""""    "
"  -         Password                    -    "
"  """"""""""""""""""""""""""""""""""""""""    "
"                                             "
"  """""""""""""""""""""""""""""""""""""""    "
"  -            Login                    -    "
"  """"""""""""""""""""""""""""""""""""""""    "
"                                             "
"  [Error message area]                       "
"                                             "
""""""""""""""""""""""""""""""""""""""""""""""""
```

**UI Elements:**
- Email input field (required)
- Password input field (required)
- Login button
- Error message display area

**Data Loading:** None

**API Calls:** POST /api/auth/login

**User Actions:**
1. Enter email and password
2. Click Login button
3. On success: Store token in localStorage, redirect to `/`
4. On failure: Display error message "Invalid email or password"

**Validation:**
- Email format validation
- Both fields required

**Related Test Cases:** TC-AUTH-01, TC-AUTH-02

---

### 4.2 Dashboard Page (`/`)

**Purpose:** Overview of safety performance (P1-J7)

**Wireframe:**
```
"""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""
" Header: [Logo] [Dashboard] [Incidents] [Inspections] [Admin-] [User-] "
"""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""
"                                                                     "
"  """""""""""" """""""""""" """""""""""" """""""""""" """"""""""""  "
"  - Total    - " Open     - " Last 30d - " Insp     - " Failed   -  "
"  - Incidents" - Incidents" - Incidents" - Last 30d - " Last 30d -  "
"  -    47    - "    12    - "     8    - "    15    - "     3    -  "
"  """"""""""""" """"""""""""" """"""""""""" """"""""""""" """""""""""""  "
"                                                                     "
"  """"""""""""""""""""""""""""""" """""""""""""""""""""""""""""""   "
"  - Incidents by Type (Bar)    - " Severity Trend (Line)       -   "
"  -                            - "                             -   "
"  -  ----                      - "    /\    /\                 -   "
"  -  ---- ----                 - "   /  \  /  \                -   "
"  -  ---- ---- ----            - "  /    \/    \               -   "
"  -  Inj  NM   PD   Env        - "  Jan Feb Mar Apr            -   "
"  """""""""""""""""""""""""""""""" """"""""""""""""""""""""""""""""   "
"                                                                     "
"  """""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""   "
"  - Recent Incidents                                            -   "
"  - Date       - Title              - Severity - Status         -   "
"  - 2025-01-10 - Slip in warehouse  - Medium   - Open           -   "
"  - 2025-01-09 - Near miss at dock  - Low      - Closed         -   "
"  """"""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""   "
"                                                                     "
"  """""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""   "
"  - Recent Inspections                                          -   "
"  - Date       - Template      - Site        - Result           -   "
"  - 2025-01-10 - Fire Safety   - Warehouse 1 - Pass             -   "
"  - 2025-01-08 - General Safety" Head Office - Fail             -   "
"  """"""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""   "
"                                                                     "
""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""
```

**UI Elements:**
- 5 KPI cards showing key metrics
- Bar chart: Incidents by Type (using Recharts)
- Line chart: Severity Trend over 12 months (using Recharts)
- Recent Incidents table (5-10 rows, clickable)
- Recent Inspections table (5-10 rows, clickable)

**Data Loading:** GET /api/dashboard/summary on mount

**User Actions:**
- Click incident row ' Navigate to `/incidents/:id`
- Click inspection row ' Navigate to `/inspections/:id`

**KPI Card Details:**
| Card | Data Source | Color Indicator |
|------|-------------|-----------------|
| Total Incidents | kpis.totalIncidents | Neutral |
| Open Incidents | kpis.openIncidents | Warning if > 0 |
| Incidents (30d) | kpis.incidentsLast30Days | Neutral |
| Inspections (30d) | kpis.inspectionsLast30Days | Neutral |
| Failed (30d) | kpis.failedInspectionsLast30Days | Danger if > 0 |

**Related Test Cases:** TC-DASH-01, TC-DASH-02, TC-DASH-03, TC-DASH-04

---

### 4.3 Incidents List Page (`/incidents`)

**Purpose:** View and filter all incidents (P1-J2, P1-J3)

**Wireframe:**
```
"""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""
" Incidents                                        [+ New Incident]   "
"""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""
" Filters: [Status: All -] [Site: All -]                             "
"""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""
" Date -     - Title          - Type     - Site       - Severity - Status "
" 2025-01-10 - Slip in WH     - Injury   - Warehouse 1" Medium   - Open   "
" 2025-01-09 - Near miss dock - Near Miss" Head Office" Low      - Closed "
" 2025-01-08 - Equipment fail - Property - Warehouse 2" High     - Under  "
"""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""
" Empty state: "No incidents found. Click 'New Incident' to create." "
""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""
```

**UI Elements:**
- Page title "Incidents"
- "New Incident" button (top right)
- Filter bar with dropdowns:
  - Status: All, Open, Under Investigation, Closed
  - Site: All, [list of sites]
- Data table with columns:
  - Date (sortable)
  - Title
  - Type
  - Site
  - Severity (with color badge)
  - Status (with color badge)
- Empty state message when no incidents

**Data Loading:**
- GET /api/incidents on mount
- Re-fetch when filters change

**Query Parameters:**
- `?status=open` when status filter selected
- `?siteId=uuid` when site filter selected

**User Actions:**
- Change filter ' Reload incidents with new params
- Click "New Incident" ' Navigate to `/incidents/new`
- Click table row ' Navigate to `/incidents/:id`
- Click column header ' Sort table

**Severity Badge Colors:**
- Low: Green
- Medium: Yellow
- High: Orange
- Critical: Red

**Status Badge Colors:**
- Open: Blue
- Under Investigation: Yellow
- Closed: Gray

**Related Test Cases:** TC-INC-04, TC-INC-05, TC-INC-06

---

### 4.4 New Incident Form (`/incidents/new`)

**Purpose:** Create new incident (P1-J2)

**Wireframe:**
```
"""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""
" New Incident                                                        "
"""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""
"                                                                     "
"  Title *                                                            "
"  """""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""   "
"  -                                                             -   "
"  """"""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""   "
"                                                                     "
"  """""""""""""""""""""""  """""""""""""""""""""""                  "
"  - Incident Type *   - -  - Site *            - -                  "
"  """"""""""""""""""""""""  """"""""""""""""""""""""                  "
"                                                                     "
"  """""""""""""""""""""""  """""""""""""""""""""""                  "
"  - Severity *        - -  - Date/Time *      - "                  "
"  """"""""""""""""""""""""  """"""""""""""""""""""""                  "
"                                                                     "
"  Description                                                        "
"  """""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""   "
"  -                                                             -   "
"  -                                                             -   "
"  """"""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""   "
"                                                                     "
"  [Cancel]                                              [Save]       "
"                                                                     "
"  [Validation error messages]                                        "
""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""
```

**UI Elements:**
- Page title "New Incident"
- Form fields:
  - Title (text input, required, max 200 chars)
  - Incident Type (dropdown, required)
  - Site (dropdown, required)
  - Severity (dropdown: Low, Medium, High, Critical, required)
  - Date/Time (datetime picker, required, default to now)
  - Description (textarea, optional)
- Cancel button (navigates back)
- Save button (submits form)
- Validation error display area

**Data Loading:**
- GET /api/incident-types (populate type dropdown)
- GET /api/sites (populate site dropdown)

**API Calls:** POST /api/incidents on Save

**User Actions:**
1. Fill required fields
2. Click Save
3. On success: Redirect to `/incidents`
4. On validation error: Show field-specific error messages

**Validation Rules:**
- Title: Required, max 200 characters
- Incident Type: Required
- Site: Required
- Severity: Required
- Date/Time: Required, not in future

**Related Test Cases:** TC-INC-01, TC-INC-02, TC-INC-03, TC-REF-02

---

### 4.5 Incident Detail Page (`/incidents/:id`)

**Purpose:** View/update incident (P1-J3)

**Wireframe:**
```
"""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""
"  Back to Incidents                                                 "
"""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""
" Slip in warehouse                              [Status: Open -]     "
"                                                (dropdown for mgr/admin)
"""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""
"                                                                     "
"  Type: Injury            Site: Warehouse 1                          "
"  Severity: Medium        Occurred: 2025-01-10 14:30                 "
"  Reported by: John Doe   Created: 2025-01-10 15:00                  "
"                                                                     "
"""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""
" Description                                                         "
" Employee slipped on wet floor near loading bay. Minor injury to     "
" knee. Area was marked as wet but signage had fallen over.           "
"                                                                     "
""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""
```

**UI Elements:**
- Back link - Back to Incidents"
- Incident title as heading
- Status dropdown (manager/admin only) or status badge (worker)
- Details grid:
  - Type
  - Site
  - Severity (with color badge)
  - Occurred date/time
  - Reported by (name)
  - Created date/time
- Description section

**Data Loading:** GET /api/incidents/:id on mount

**User Actions:**
- Click "Back to Incidents" ' Navigate to `/incidents`
- Change status dropdown (manager/admin) ' PUT /api/incidents/:id
  - Show success message on save
  - Show error message on failure

**Role-Based Behavior:**
- Worker: Status displayed as badge (not editable)
- Manager/Admin: Status displayed as dropdown (editable)

**Related Test Cases:** TC-INC-07, TC-INC-08

---

### 4.6 Inspections List Page (`/inspections`)

**Purpose:** View all inspections (P1-J6)

**Wireframe:**
```
"""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""
" Inspections                                     [+ New Inspection]  "
"""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""
" Filters: [Site: All -] [Template: All -] [Result: All -]           "
"""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""
" Date -     - Template       - Site        - Performed By - Result  "
" 2025-01-10 - Fire Safety    - Warehouse 1 - Jane Smith   - " Pass  "
" 2025-01-08 - General Safety - Head Office - Bob Johnson  - - Fail  "
"""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""
" Empty state: "No inspections found."                                "
""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""
```

**UI Elements:**
- Page title "Inspections"
- "New Inspection" button (manager/admin only)
- Filter bar:
  - Site dropdown
  - Template dropdown
  - Result dropdown: All, Pass, Fail
- Data table with columns:
  - Date (sortable)
  - Template name
  - Site name
  - Performed By (name)
  - Result (Pass/Fail with icon)
- Empty state message

**Data Loading:**
- GET /api/inspections on mount
- Re-fetch when filters change

**User Actions:**
- Change filter ' Reload with params
- Click "New Inspection" ' Navigate to `/inspections/new`
- Click table row ' Navigate to `/inspections/:id`

**Role-Based Behavior:**
- Worker: "New Inspection" button hidden
- Manager/Admin: "New Inspection" button visible

**Related Test Cases:** TC-INSP-07

---

### 4.7 New Inspection Form (`/inspections/new`)

**Purpose:** Perform an inspection (P1-J6)

**Wireframe:**
```
"""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""
" New Inspection                                                      "
"""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""
"  """""""""""""""""""""""  """""""""""""""""""""""                  "
"  - Site *            - -  - Template *        - -                  "
"  """"""""""""""""""""""""  """"""""""""""""""""""""                  "
"                                                                     "
"  """""""""""""""""""""""                                           "
"  - Date/Time *      - "                                           "
"  """"""""""""""""""""""""                                           "
"                                                                     "
"  Notes                                                              "
"  """""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""   "
"  -                                                             -   "
"  """"""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""   "
"""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""
" Checklist (loaded when template selected)                           "
"                                                                     "
" Equipment                                                           "
" """""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""  "
" - Fire extinguishers accessible    [OK -]  [Comment: ______]    -  "
" - First aid kit stocked            [OK -]  [Comment: ______]    -  "
" """"""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""  "
"                                                                     "
" Egress                                                              "
" """""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""  "
" - Emergency exits clear            [Not OK-] [Comment: Blocked] -  "
" - Exit signs illuminated           [N/A -]  [Comment: ______]   -  "
" """"""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""  "
"                                                                     "
"  [Cancel]                                      [Submit Inspection]  "
""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""
```

**UI Elements:**
- Page title "New Inspection"
- Header form:
  - Site dropdown (required)
  - Template dropdown (required)
  - Date/Time picker (required, default to now)
  - Notes textarea (optional)
- Checklist section (appears after template selected):
  - Grouped by category
  - For each item:
    - Label text
    - Result dropdown: OK, Not OK, N/A (required)
    - Comment input (optional)
- Cancel button
- Submit Inspection button

**Data Loading:**
- GET /api/sites (populate site dropdown)
- GET /api/inspection-templates (populate template dropdown)
- GET /api/inspection-templates/:id when template selected (load items)

**API Calls:** POST /api/inspections on Submit

**User Actions:**
1. Select site
2. Select template ' Load checklist items
3. Set result for each item
4. Add optional comments
5. Click Submit Inspection
6. On success: Redirect to `/inspections`
7. On error: Show validation messages

**Validation Rules:**
- Site: Required
- Template: Required
- Date/Time: Required
- Each checklist item must have a result selected

**Related Test Cases:** TC-INSP-04, TC-INSP-05

---

### 4.8 Inspection Detail Page (`/inspections/:id`)

**Purpose:** View inspection results (P1-J6)

**Wireframe:**
```
"""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""
"  Back to Inspections                                               "
"""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""
" Fire Safety Inspection                         [Result: - FAIL]     "
"""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""
"                                                                     "
"  Site: Warehouse 1         Performed: 2025-01-10 10:00              "
"  Inspector: Jane Smith                                              "
"                                                                     "
"""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""
" Notes                                                               "
" Emergency exit on west side needs immediate attention.              "
"""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""
" Checklist Results                                                   "
"                                                                     "
" Item                          - Category  - Result - Comment        "
" Fire extinguishers accessible - Equipment - " OK   -                "
" First aid kit stocked         - Equipment - " OK   -                "
" Emergency exits clear         - Egress    - - Not OK" Blocked by boxes"
" Exit signs illuminated        - Egress    - " N/A  - Under repair   "
"                                                                     "
""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""
```

**UI Elements:**
- Back link - Back to Inspections"
- Template name as heading
- Overall result badge (Pass = green, Fail = red)
- Details section:
  - Site
  - Performed date/time
  - Inspector name
- Notes section (if notes exist)
- Checklist results table:
  - Item label
  - Category
  - Result (with icon: - OK, - Not OK, - N/A)
  - Comment

**Data Loading:** GET /api/inspections/:id on mount

**User Actions:**
- Click "Back to Inspections" ' Navigate to `/inspections`

**Related Test Cases:** TC-INSP-08

---

### 4.9 Admin - Sites Page (`/admin/sites`)

**Purpose:** Manage sites (P1-J4) - Admin only

**Wireframe:**
```
"""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""
" Site Management                                      [+ Add Site]   "
"""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""
" Name              - Code   - Actions                                "
" Head Office       - HO     - [Edit]                                 "
" Warehouse 1       - WH1    - [Edit]                                 "
" Distribution Ctr  - DC1    - [Edit]                                 "
"""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""
"                                                                     "
" Modal (Add/Edit Site):                                              "
" """""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""    "
" - Site Name *  [________________________]                     -    "
" - Site Code    [________________________]                     -    "
" -                                                             -    "
" - [Cancel]                                         [Save]     -    "
" - [Error: Site code already exists]                           -    "
" """"""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""    "
""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""
```

**UI Elements:**
- Page title "Site Management"
- "Add Site" button
- Sites table:
  - Name
  - Code
  - Actions (Edit button)
- Modal for Add/Edit:
  - Site Name input (required)
  - Site Code input (optional, unique)
  - Cancel and Save buttons
  - Error message area

**Data Loading:** GET /api/sites on mount

**API Calls:**
- POST /api/sites (create)
- PUT /api/sites/:id (update)

**User Actions:**
- Click "Add Site" ' Open modal
- Fill form ' Click Save ' POST /api/sites
- Click "Edit" on row ' Open modal with values ' PUT /api/sites/:id

**Validation:**
- Name: Required
- Code: Optional but unique if provided

**Related Test Cases:** TC-SITE-01, TC-SITE-02, TC-SITE-03

---

### 4.10 Admin - Incident Types Page (`/admin/incident-types`)

**Purpose:** Manage incident types (P1-J4) - Admin only

**Wireframe:**
```
| Incident Types                                  [+ Add Type] |
|--------------------------------------------------------------|
| Name                | Description         | Status | Actions |
| Injury              | Physical injury     | Active | [Edit]  |
| Near Miss           | Close call          | Active | [Edit]  |
| Fire Hazard         | Fire-related event  | Inactive | [Edit] |

Modal (Add/Edit Type):
| Name *        [____________________] |
| Description   [____________________] |
| Status        [Active v]             |
| [Cancel]                          [Save] |
| [Error: Type name already exists]        |
```

**UI Elements:**
- Page title "Incident Types"
- "Add Type" button
- Incident types table:
  - Name
  - Description
  - Status (Active/Inactive)
  - Actions (Edit button)
- Modal for Add/Edit:
  - Name input (required)
  - Description input (optional)
  - Status toggle (Active/Inactive)
  - Cancel and Save buttons
  - Error message area

**Data Loading:** GET /api/incident-types on mount

**API Calls:**
- POST /api/incident-types (create)
- PUT /api/incident-types/:id (update)
- PATCH /api/incident-types/:id (deactivate/reactivate)

**User Actions:**
- Click "Add Type" -> Open modal
- Fill form -> Click Save -> POST /api/incident-types
- Click "Edit" -> Open modal -> PUT /api/incident-types/:id
- Change status -> PATCH /api/incident-types/:id

**Validation:**
- Name: Required, unique

**Related Test Cases:** TC-REF-03, TC-REF-04

---

### 4.11 Admin - Templates Page (`/admin/templates`)

**Purpose:** Manage inspection templates (P1-J5) - Admin only

**Wireframe:**
```
"""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""
" Inspection Templates                            [+ New Template]    "
"""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""
" Name                  - Description            - Items - Actions    "
" Fire Safety           - Monthly fire checklist - 10    - [Edit]     "
" General Safety        - Weekly safety check    - 15    - [Edit]     "
" Forklift Inspection   - Daily forklift check   - 8     - [Edit]     "
""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""
```

**UI Elements:**
- Page title "Inspection Templates"
- "New Template" button
- Templates table:
  - Name
  - Description
  - Item count
  - Actions (Edit button)

**Data Loading:** GET /api/inspection-templates on mount

**User Actions:**
- Click "New Template" ' Navigate to `/admin/templates/new`
- Click "Edit" ' Navigate to `/admin/templates/:id`

**Related Test Cases:** TC-INSP-01

---

### 4.12 Template Detail Page (`/admin/templates/:id`)

**Purpose:** Edit template and items (P1-J5) - Admin only

**Wireframe:**
```
"""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""
"  Back to Templates                                                 "
"""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""
" Template Name *                                                     "
" """""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""    "
" - Fire Safety Inspection                                      -    "
" """"""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""    "
"                                                                     "
" Description                                                         "
" """""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""    "
" - Monthly fire safety checklist for all sites                 -    "
" """"""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""    "
"""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""
" Checklist Items                                      [+ Add Item]   "
"                                                                     "
" # - Label                       - Category  - Actions               "
" 1 - Fire extinguishers access.  - Equipment - [Edit] [Delete] ["] "
" 2 - First aid kit stocked       - Equipment - [Edit] [Delete] ["] "
" 3 - Emergency exits clear       - Egress    - [Edit] [Delete] ["] "
"""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""
"                                                     [Save Template] "
""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""
```

**UI Elements:**
- Back link - Back to Templates"
- Template Name input (required)
- Description textarea (optional)
- Checklist Items section:
  - "Add Item" button
  - Items table with:
    - Order number
    - Label
    - Category
    - Actions: Edit, Delete, Reorder arrows
- Save Template button

**Data Loading:**
- GET /api/inspection-templates/:id on mount (edit mode)
- Empty form for new template

**API Calls:**
- POST /api/inspection-templates (create)
- PUT /api/inspection-templates/:id (update)

**User Actions:**
- Edit template name/description
- Click "Add Item" ' Show inline form or modal
- Click "Edit" on item ' Edit inline or modal
- Click "Delete" on item ' Confirm then remove
- Drag or use arrows to reorder items
- Click "Save Template" ' Submit all changes

**Related Test Cases:** TC-INSP-02, TC-INSP-03

---

## 5. Component Library

### 5.1 Common Components

| Component | Purpose | Props |
|-----------|---------|-------|
| Button | Primary/secondary actions | variant, onClick, disabled, loading |
| Input | Text input fields | label, value, onChange, error, required |
| Select | Dropdown selection | label, options, value, onChange, error |
| DateTimePicker | Date/time selection | value, onChange, maxDate |
| DataTable | Display tabular data | columns, data, onRowClick, sortable |
| Modal | Dialog overlays | isOpen, onClose, title, children |
| Badge | Status/severity indicators | variant, children |
| KPICard | Dashboard metrics | title, value, icon, trend |
| FilterBar | Filter controls | filters, onChange |

### 5.2 Layout Components

| Component | Purpose |
|-----------|---------|
| MainLayout | Wrapper with header/sidebar |
| Header | Top navigation bar |
| Sidebar | Side navigation (if used) |
| PageHeader | Page title and actions |

---

## 6. State Management

### Auth Context

```javascript
// AuthContext provides:
{
  user: { id, email, firstName, lastName, role } | null,
  token: string | null,
  isAuthenticated: boolean,
  isLoading: boolean,
  login: (email, password) => Promise,
  logout: () => void
}
```

### Local Component State

- Form state managed with useState or form library
- List data fetched on mount and stored in component state
- Filters stored in URL query params where appropriate

---

## 7. Error Handling

### API Errors

- Display user-friendly messages, not raw API errors
- Show field-specific errors for validation failures
- Show toast/alert for general errors

### Loading States

- Show loading spinner while fetching data
- Disable form submit button while saving
- Show skeleton loaders for cards/tables

### Empty States

- Display helpful message when no data
- Provide action to create first item

---

## 8. Related Documents

- [ARCHITECTURE.md](./ARCHITECTURE.md) - System architecture
- [API_SPEC_PHASE1.md](./API_SPEC_PHASE1.md) - API specifications
- [USER_JOURNEYS.md](./USER_JOURNEYS.md) - User flow definitions
- [TEST_STRATEGY_PHASE1.md](./TEST_STRATEGY_PHASE1.md) - UI test cases





Nice, this is the fun part 😄 – let’s turn this into a **full product design** from first MVP to a serious, competitive EHS platform.

I’ll lay it out as:

1. Phase overview (high-level roadmap)
2. Phase 1 – Core operational MVP (what you already specced)
3. Phase 2 – Operational excellence (CAPA, attachments, RBAC…)
4. Phase 3 – Enterprise / multi-tenant & reporting
5. Phase 4 – Analytics & intelligence
6. Phase 5 – Ecosystem & integrations
7. Final consolidated domain model (all entities)

You can copy this into `PRODUCT_DESIGN.md` and then slice it per phase for Claude.

---

## 1. Phase Overview

**Phase 1 – Core Operational MVP**

* Auth, users, roles (simple)
* Sites
* Incident management
* Inspection templates & inspections
* Dashboard (KPIs + trends)
* Basic admin screens

**Phase 2 – Operational Excellence**

* CAPA / Action items module
* Attachments (photos/docs)
* Role-based access control (RBAC) switched on
* Advanced filtering & search
* Audit log

**Phase 3 – Enterprise & Multi-Tenant**

* Multi-organisation model (SaaS-ready)
* Org-level configuration (branding, settings)
* Scheduled reports / exports
* Stronger security & compliance features

**Phase 4 – Analytics & Intelligence**

* Trend analysis (site, type, severity)
* “Hotspot” identification (sites, departments, recurring issues)
* Risk register & risk dashboard
* Simple recommendations (not heavy AI, but smart helpers)

**Phase 5 – Ecosystem & Integrations**

* Email/Teams/Slack notifications
* SSO (OIDC)
* API keys / external API for customers
* Integration hooks (HR, ERP, maintenance systems)

Below is the detailed design.

---

## 2. Phase 1 – Core Operational MVP (Build First)

### 2.1 Goals

* A single organisation can:

  * Log in
  * Capture incidents
  * Perform inspections using templates
  * See a dashboard with key metrics
  * Maintain sites and inspection templates
* All flows work end-to-end.

### 2.2 Modules

Already largely specced, but summarised:

1. **Auth & Users**

   * Login, register, current user (`/auth/login`, `/auth/register`, `/auth/me`)
   * User fields: email, first_name, last_name, role, password_hash
   * Role initially: `admin`, `manager`, `worker` (not heavily enforced yet)

2. **Sites**

   * CRUD (create/update via UI)
   * Used in incidents & inspections

3. **Incidents**

   * Create incidents with type, site, severity, date/time
   * List & detail views
   * Stored in Postgres

4. **Inspection Templates & Checklists**

   * Templates (name, description)
   * Checklist items (label, category)
   * Admin UI to manage them

5. **Inspections**

   * Based on templates and sites
   * Checklist responses (ok/not_ok/n/a, comment)
   * Overall result pass/fail (derived)

6. **Dashboard**

   * KPI tiles (total, open, 30-day stats)
   * Incidents by type
   * Severity trend over time
   * Recent incidents & inspections

### 2.3 Data Model (Phase 1)

Entities:

* User
* Site
* IncidentType
* Incident
* InspectionTemplate
* InspectionTemplateItem
* Inspection
* InspectionResponse

You already have this defined in detail; Phase 1 implementation uses that exactly.

---

## 3. Phase 2 – Operational Excellence (Next Big Step)

This is where you move from “nice basic system” to **real EHS operations tool**.

### 3.1 Goals

* Go beyond recording; manage **follow-up actions**.
* Attach evidence (photos, docs).
* Enforce **RBAC** so admins vs workers see appropriate features.
* Improve search and traceability (audit log).

### 3.2 New Modules & Features

#### 3.2.1 CAPA / Action Items Module

**Use case:**
After an incident or inspection finding, someone must:

* Assign corrective/preventive actions to people
* Track their status and due dates

**Entity: ActionItem**

* `id` (UUID, PK)
* `title`
* `description`
* `source_type` (`incident`, `inspection`)
* `source_id` (FK to Incident or Inspection)
* `assigned_to` (FK → User)
* `created_by` (FK → User)
* `due_date`
* `status` (`open`, `in_progress`, `done`, `overdue`)
* `priority` (`low`, `medium`, `high`, `critical`) – optional
* `created_at`, `updated_at`

**Backend:**

* Routes `/api/actions`:

  * `GET /api/actions?assignedTo=me&status=open`
  * `GET /api/actions/:id`
  * `POST /api/actions`
  * `PUT /api/actions/:id` (update status, comment, etc.)

**Frontend:**

* “Actions” section:

  * “My Actions” view (assigned_to = current user)
  * “All Actions” (admin/manager)
* Ability to create action items from:

  * Incident detail page (button: “Add Action”)
  * Inspection detail page (button next to failed items: “Create Action”)

#### 3.2.2 Attachments / Evidence

**Use case:**
Upload photos or documents for incidents and inspections.

**Entity: Attachment**

* `id` (UUID)
* `linked_type` (`incident`, `inspection`, `action_item`)
* `linked_id`
* `file_name`
* `file_type`
* `file_size`
* `storage_path` or `url`
* `uploaded_by` → User
* `uploaded_at`

**Backend:**

* File upload endpoint (e.g. `POST /api/attachments`)
* Either:

  * Store on disk (local dev) under a folder like `/uploads`
  * Or prepare for cloud (S3-ready)

**Frontend:**

* On incident/inspection detail:

  * Files list + upload button
  * Show thumbnails or file icons

#### 3.2.3 RBAC (Role-Based Access Control) Switched On

**Phase 1:** roles exist but not enforced heavily.
**Phase 2:** enforce them.

**Role behaviours:**

* `admin`

  * Full access to everything (including Users & Org config in later phases)
* `manager`

  * Full access to:

    * Incidents
    * Inspections
    * Actions
  * Read-only to Sites/Templates (or limited editing, you decide)
* `worker`

  * Can:

    * Create incidents
    * See incidents they reported
    * See inspections (read-only)
    * See their assigned actions

**Implementation:**

* Middleware like `requireRole(['admin'])` for:

  * `/api/sites`
  * `/api/inspection-templates`
  * User management (later)
* Frontend hides admin UI sections for non-admins.

#### 3.2.4 Advanced Filtering & Search

**Incidents:**

* Filter by:

  * Site
  * Severity
  * Status
  * Type
  * Date range
* Search by:

  * Free text (title, description) – simple `ILIKE` in Postgres

**Inspections:**

* Filter by:

  * Site
  * Template
  * Result (pass/fail)
  * Date range

Add query params to `GET /api/incidents` and `GET /api/inspections`.

#### 3.2.5 Audit Log

**Use case:**
Trace who changed what and when.

**Entity: AuditLog**

* `id` (UUID)
* `user_id` → User
* `entity_type` (`incident`, `inspection`, `action_item`, `site`, `template`)
* `entity_id`
* `action` (`created`, `updated`, `status_changed`, etc.)
* `details` (JSON or text, e.g. `{"from_status":"open","to_status":"closed"}`)
* `created_at`

**Backend:**

* Utility to write logs on:

  * Incident create/update
  * Inspection create
  * Action create/status change

**Frontend:**

* Panel on Incident/Inspection detail:

  * “Activity Log” listing actions in time order.

---

## 4. Phase 3 – Enterprise & Multi-Tenant

Now you’re aiming at **multiple clients / multiple business units**.

### 4.1 Goals

* Support multiple organisations (tenants) on one platform.
* Org-specific configuration & branding.
* Scheduled reports & exports.

### 4.2 Multi-Organisation Architecture

**Entity: Organisation**

* `id` (UUID)
* `name`
* `slug` (subdomain style: `acme`, `olive`, optional)
* `created_at`

**Linking:**

* User → Organisation:

  * Simplest: add `organisation_id` column on `users`.
* Every customer-owned entity gets an `organisation_id`:

  * Site, IncidentType (or global), Incident, ActionItem, InspectionTemplate, Inspection, Attachment, AuditLog.

**Rules:**

* All queries **must** filter by `organisation_id = currentUser.organisation_id`.
* No cross-org access.

### 4.3 Org-Level Settings & Branding

Entity: OrganisationSetting

* `organisation_id`
* `key`
* `value` (JSON or text)

Examples:

* `branding.primaryColor`
* `branding.logoUrl`
* `notifications.incidentEmailGroup`

Frontend:

* Admin-only “Organisation Settings” screen:

  * Logo upload (optional)
  * Primary colour
  * Default severity options, etc.

### 4.4 Reporting & Exports

**Features:**

* CSV/Excel export for:

  * Incidents
  * Inspections
  * Actions
* Scheduled reports:

  * Weekly summary emailed to defined recipients:

    * New incidents
    * Open actions
    * Failed inspections

Backend:

* Report endpoints (e.g. `/api/reports/incidents?format=csv&dateFrom=...`)
* Later: a simple scheduler (cron, hosted job) for periodic emails.

---

## 5. Phase 4 – Analytics & Intelligence

Now we turn data into **insights**.

### 5.1 Goals

* Understand trends across time, sites, types.
* Identify hotspots and recurring issues.
* Introduce risk register.

### 5.2 Trend Analysis & Hotspots

Extend dashboard and add an “Analytics” section.

**Features:**

* Incident trends by:

  * Site
  * Type
  * Severity
* Heatmaps:

  * Sites vs incident counts
  * Templates vs failed inspections

Add backend endpoints for aggregated queries, e.g.:

* `/api/analytics/incidents-by-site`
* `/api/analytics/findings-by-template`

### 5.3 Risk Register

Entity: RiskEntry

* `id` (UUID)
* `organisation_id`
* `title`
* `description`
* `site_id` (optional)
* `likelihood` (1–5)
* `impact` (1–5)
* `risk_score` (computed: e.g. L×I or mapped to levels)
* `status` (`open`, `mitigated`, `accepted`)
* `owner_id` (User)
* `linked_incident_id` (optional)
* `linked_action_item_id` (optional)
* `created_at`, `updated_at`

UI:

* “Risk Register” screen.
* Risk matrix view:

  * Likelihood vs impact grid with numbers in each cell.

### 5.4 Simple “Intelligence”

Without heavy ML, you can still provide smart hints:

* “Top 3 sites by incident rate”
* “Top 5 recurring incident titles / keywords”
* “Templates with highest fail rate”

Backend just does grouped/ordered queries; frontend presents as “Insights”.

---

## 6. Phase 5 – Ecosystem & Integrations

This is when it starts to feel like part of a **larger enterprise environment**.

### 6.1 Notifications & Channels

Already partially specced, now expand.

**Notification types:**

* Incident created
* Action assigned / overdue
* Inspection failed

**Channels:**

* Email:

  * Use standard SMTP or a service (e.g. SendGrid)
* Chat:

  * Webhook integrations for Teams/Slack (basic JSON payload)

Entity: NotificationConfig (per organisation)

* `id`
* `organisation_id`
* `type` (`incident_created`, `action_assigned`, etc.)
* `channel` (`email`, `teams`, `slack`)
* `target` (email address, webhook URL, etc.)
* `enabled`

### 6.2 SSO / Identity

* Support SSO via:

  * OIDC (Azure AD, Okta, etc.)
* Users mapped from IdP groups to roles (`admin`, `manager`, `worker`).

Backend:

* OIDC login endpoint
* Token exchange logic
* User auto-provisioning based on email/domain or group claims.

### 6.3 External API & Webhooks

* API keys or OAuth for third-party integrations.
* Endpoints for:

  * Creating incidents from external systems
  * Querying incidents/inspections/actions
* Webhooks for:

  * Incident created/updated
  * Action status changes

Allow other tools (e.g. maintenance system, HR system) to sync data.

---

## 7. Final Consolidated Domain Model (All Phases)

For your **ultimate target system**, your domain looks like:

### Core

* **User**
* **Organisation**
* **Site**
* **IncidentType**
* **Incident**
* **InspectionTemplate**
* **InspectionTemplateItem**
* **Inspection**
* **InspectionResponse**

### Operational Excellence

* **ActionItem**
* **Attachment**
* **AuditLog**

### Analytics & Risk

* **RiskEntry**

### Config & Integrations

* **OrganisationSetting**
* **NotificationConfig**

You can tell Claude:

* **Phase 1:** implement only the “Core” subset, but design the schema so adding the others is straightforward (e.g., all core tables already have `organisation_id` even if you start with a single org).
* **Phase 2+**: add the additional entities and endpoints, using the same architecture and patterns.

---

If you want, I can now take this “Phase 1 → 5” design and turn it into a **roadmap table** with columns (Phase, Feature, Entity changes, APIs, UI changes) so you have a super clear checklist to track progress.

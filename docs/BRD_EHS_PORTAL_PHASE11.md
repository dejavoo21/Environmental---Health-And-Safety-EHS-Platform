# BRD – Phase 11: Safety Advisor & Site Intelligence

## 1. Introduction

Phase 11 extends the EHS Portal with a Safety Advisor and Site Intelligence layer.  
The goal is to give workers and supervisors contextual safety information – weather, PPE guidance, safety moments, and relevant legislation – before and during work at a given site.

This document focuses on business requirements. Technical details are covered in:

- DATA_MODEL_PHASE11.md  
- ARCHITECTURE_PHASE11.md  
- API_SPEC_PHASE11.md  
- FRONTEND_UX_PHASE11.md  

Capabilities in this phase map to checklist IDs **C-270 – C-299**.

---

## 2. Business Goals

1. **G1 – Proactive Safety Awareness**  
   Users see a “Safety Advisor” panel with relevant weather, PPE, and safety messages before starting or continuing work.

2. **G2 – Site-Specific Intelligence**  
   Each site has a clear mapping to weather location, applicable legislation, and environmental/medical acts.

3. **G3 – Consistent Safety Moments**  
   Organisations can schedule, rotate, and target Safety Moments per site, role, or activity.

4. **G4 – Integrated With Workflows**  
   Safety Advisor appears naturally inside existing workflows (incidents, inspections, permits, actions, training, My Actions).

5. **G5 – Measurable Compliance**  
   The organisation can report on Safety Moment acknowledgements and pre-task safety checks.

---

## 3. In Scope (Phase 11)

- Safety Moments library and scheduling.
- Site location data (lat/lng, region, timezone) for weather mapping.
- Weather integration and caching for each site.
- Site legislation and environmental/medical act references.
- PPE recommendation rules per site / task type / weather conditions.
- Safety Advisor surfaces:
  - Dashboard widgets.
  - Panels on task/detail pages (incidents, inspections, permits, actions, training).
  - “Pre-Task Safety” view when a user opens a task from My Actions or training assignments.
- Admin UI for managing:
  - Safety Moments.
  - Site legislation bundles.
  - PPE recommendation rules.
  - Weather mapping (site ↔ weather location).
- Reporting on Safety Advisor usage (acknowledgements, coverage).

---

## 4. Out of Scope

- Full legal database or automatic legal content updates from regulators.
- Real-time severe weather alerting beyond basic current conditions/forecast.
- Offline mode for weather and Safety Advisor.
- Advanced AI-generated safety advice (can be Phase 12+).
- Language localisation for legislation and safety content.

---

## 5. Stakeholders & Roles

- **Workers** – see Safety Advisor when viewing or starting work; acknowledge Safety Moments.
- **Supervisors / Front-line Managers** – see site-specific advice, can monitor acknowledgements for their team.
- **EHS Managers / Admins** – configure Safety Moments, legislation mapping, PPE recommendations and view reports.
- **System Admins** – manage integrations and API keys for the weather provider.

Roles reuse existing RBAC: `worker`, `supervisor`, `manager`, `admin`.

---

## 6. Functional Requirements

Each requirement is tagged **BR-11-xx** and mapped to **C-IDs**.

### 6.1 Safety Moments

**BR-11-01 (C-270)** – The system shall store Safety Moments (short safety messages) with fields: title, body, category, tags, applicable sites, applicable roles, start date, end date, active flag.

**BR-11-02 (C-271)** – Workers shall see **Today’s Safety Moment** on the dashboard, selected based on:
- Current date within start/end date.
- Site (if user has a primary site).
- Role.

**BR-11-03 (C-272)** – Users shall be able to acknowledge a Safety Moment. The system records user, date/time, site, and channel (dashboard vs task).

**BR-11-04 (C-273)** – Admins shall be able to create, edit, archive (soft delete), and schedule Safety Moments.

**BR-11-05 (C-274)** – Admins shall see basic analytics: number of acknowledgements, coverage %, and top unread safety moments.

### 6.2 Site Locations & Weather

**BR-11-06 (C-275)** – Each site shall have a location profile including: country, region/state, city, latitude, longitude, timezone, and weather location identifier (if required by the provider).

**BR-11-07 (C-276)** – For each site the system shall display **current weather** and **short forecast** (e.g., next 12–24 hours) including: temperature, conditions, precipitation chance, wind speed.

**BR-11-08 (C-277)** – Weather data shall be cached for each site to avoid rate limiting and to ensure consistent information within a short window (e.g., 15–30 minutes).

**BR-11-09 (C-278)** – If the weather API is unavailable, the Safety Advisor shall display a clear fallback message and continue to show Safety Moments and legislation.

### 6.3 PPE & Safety Recommendations

**BR-11-10 (C-279)** – Admins shall define PPE recommendations per site and optionally by:
- Weather condition category (hot, cold, wet, windy)
- Task type or permit type (e.g., hot work, work at height)

**BR-11-11 (C-280)** – Safety Advisor shall show PPE recommendations that combine:
- Base PPE for the site.
- Additional PPE triggered by weather or task type.

**BR-11-12 (C-281)** – Safety Advisor shall show clear, concise text (and icons if configured) listing PPE items and their reason (e.g. “High wind – secure loose items / use fall arrest”).

### 6.4 Legislation & Environmental/Medical Acts

**BR-11-13 (C-282)** – Admins shall maintain a list of **legislation references** including: title, jurisdiction, short summary, URL, category (environmental, medical, health & safety).

**BR-11-14 (C-283)** – Admins shall map sites to one or more legislation bundles (e.g., “UK Construction Sites”, “ZA Mining Regulations”).

**BR-11-15 (C-284)** – Safety Advisor shall display 3–5 most relevant legislative references with links when a user views a site or task for that site.

### 6.5 Safety Advisor Surfaces

**BR-11-16 (C-285)** – A **Safety Advisor panel** shall be available on:
   - Incident detail
   - Inspection detail
   - Permit detail
   - Action detail
   - Training assignment detail (where relevant)
   - My Actions “Start Work” view

**BR-11-17 (C-286)** – When a worker opens a task from My Actions, the Safety Advisor panel shall appear at the top of the page, above the task details, highlighting:
   - Today’s Safety Moment
   - Weather
   - PPE
   - Legislation references
   - A quick acknowledgement checkbox/button

**BR-11-18a (C-287a)** – For high-risk work (defined as tasks with High/Extreme risk level in the Risk Register, or permit types flagged as `requires_safety_acknowledgement`), Safety Advisor acknowledgement is **REQUIRED** before:
   - Starting a permit
   - Closing a high-severity incident
   - Any other entity configured as requiring acknowledgement
   - The relevant action button (e.g. Start, Submit, Close) shall be **disabled** until acknowledgement is recorded.

**BR-11-18b (C-287b)** – For non-high-risk work, Safety Advisor acknowledgement is **optional** but encouraged. The action button remains enabled, but a badge and helper text are shown to prompt acknowledgement.

**BR-11-18c (C-287c)** – "High-risk" is defined as:
   - Any task or permit with a risk level of High or Extreme in the Risk Register
   - Any permit type or entity with a configuration flag `requires_safety_acknowledgement = true`

**BR-11-19 (C-288)** – The system shall record when a user views the Safety Advisor for a specific task and whether they acknowledged it.

**BR-11-20 (C-289)** – Supervisors/managers shall be able to view a list report showing tasks where required Safety Advisor acknowledgement has not yet occurred.

### 6.6 Admin & Configuration

**BR-11-20 (C-289)** – Admins shall manage Safety Moments from an **Admin › Safety Moments** screen with list, filters, and edit forms.

**BR-11-21 (C-290)** – Admins shall manage **Site Legislation** mappings from an **Admin › Site Legislation** screen with per-site configuration.

**BR-11-22 (C-291)** – Admins shall manage **PPE Recommendations** from an **Admin › PPE Rules** screen.

**BR-11-23 (C-292)** – Admins shall configure the default weather provider API key and base URL via environment/Secrets; these are not editable via the UI.

### 6.7 Reporting & Analytics

**BR-11-24 (C-293)** – EHS managers shall be able to export Safety Moment acknowledgements to CSV/PDF for a given date range, site, and role.

**BR-11-25 (C-294)** – A dashboard widget shall summarise coverage: % of tasks started with Safety Advisor acknowledged in the last 30 days.

### 6.8 Integration with Other Modules

**BR-11-26 (C-295)** – Safety Advisor shall be linked to the Risk Register to show related site risks (Phase 9) if configured.

**BR-11-27 (C-296)** – Safety Moments may be linked to incidents (e.g. “published as a learning from incident”).

**BR-11-28 (C-297)** – Training courses can be tagged to appear as “Recommended training” in the Safety Advisor for specific sites or tasks.

### 6.9 Security & Privacy

**BR-11-29 (C-298)** – Weather provider integration must not leak identifiable user data; only site/location metadata is sent.

**BR-11-30 (C-299)** – All Safety Advisor interactions (view, acknowledge, configuration changes) shall be logged in the existing security/audit logs.

---

## 7. Non-Functional Requirements

- **NFR-11-01** – Weather responses should load in < 2 seconds in 95% of cases (excluding provider latency).
- **NFR-11-02** – Safety Advisor panel must remain usable even if weather or external services are down.
- **NFR-11-03** – All new tables must support multi-tenant separation via organisation_id.
- **NFR-11-04** – Safety Advisor must be fully responsive and accessible (WCAG AA where practicable).

---

## 8. Assumptions & Risks

- Organisation already has base site data (Phase 1/2).
- A single weather provider will be used initially.
- PPE rules are informational; enforcement is via process, not system hard-blocking.

Risks are detailed further in IMPLEMENTATION_PLAN_PHASE11.md.

---

## 9. Traceability

- BR-11-xx ↔ C-270..C-299 (checklist)
- BR-11-xx ↔ US-SAF-xx (user stories in USER_STORIES.md)
- BR-11-xx ↔ TC-P11-xxx (test cases in test_cases_phase11.csv)


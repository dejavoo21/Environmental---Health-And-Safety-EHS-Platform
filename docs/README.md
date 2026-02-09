# EHS Portal (MVP)

A small but growing **Environment, Health & Safety (EHS) web app** inspired by platforms like WorkEikon / WorkEikon EHS Suite.

The goal is to provide a modular, extensible system that covers:

- **Incident Management**
- **Inspection Management** (template-driven checklists)
- **Dashboard & KPIs**
- **Admin tools** for:
  - Sites
  - Inspection Templates & Checklist Items

Built as a **React + Node + PostgreSQL** stack, with authentication and role-ready architecture.

---

## Features

### 1. Authentication & Users

- Email + password login
- JWT-based session handling
- `/api/auth/login`, `/api/auth/register` (for dev), `/api/auth/me`
- React login page:
  - Stores JWT in `localStorage`
  - Loads current user on app startup
- All core APIs protected with `Authorization: Bearer <token>`

> Note: roles/permissions are not implemented yet, but the structure is ready for it.

---

### 2. Incident Management

Core incident module:

- Record incidents with:
  - Title, description
  - Incident type (e.g. Injury, Near Miss, Property Damage)
  - Site
  - Severity (`low`, `medium`, `high`, `critical`)
  - Occurred date & time
- Each incident is automatically stamped with:
  - `reported_by_id` = logged-in user
- Views:
  - **List view** (table) with type, site, severity, status, occurred date
  - **Detail view** with all fields

API endpoints:

- `GET /api/incidents`
- `GET /api/incidents/:id`
- `POST /api/incidents`

---

### 3. Inspection Management

Template-driven inspections with checklist items:

- **Inspection Templates**
  - Name + description
  - Multiple checklist items:
    - Label (e.g. “Fire exits are clear”)
    - Category (e.g. “Fire Safety”, “Housekeeping”)
- **Inspections**
  - Based on a template + site
  - Performed by current user
  - Date/time of inspection
  - Responses for each checklist item:
    - Result: `ok`, `not_ok`, `n/a`
    - Optional comment
  - `overall_result` auto-calculated:
    - `fail` if any item is `not_ok`
    - `pass` otherwise

API endpoints:

- Templates:
  - `GET /api/inspection-templates`
  - `GET /api/inspection-templates/:id`
  - `POST /api/inspection-templates`
  - `PUT /api/inspection-templates/:id`
  - `POST /api/inspection-templates/:id/items`
  - `PUT /api/inspection-templates/:id/items/:itemId`
  - `DELETE /api/inspection-templates/:id/items/:itemId`
- Inspections:
  - `GET /api/inspections`
  - `GET /api/inspections/:id`
  - `POST /api/inspections`

Frontend:

- **Inspections list** (table)

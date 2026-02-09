# DATA MODEL – Phase 11: Safety Advisor & Site Intelligence

This document describes the data model changes introduced in Phase 11.

All tables include `organisation_id` for multi-tenancy and standard audit columns:

- created_at, created_by
- updated_at, updated_by
- deleted_at (nullable for soft delete where required)

---

## 1. New Tables

### 1.1 site_locations

Stores additional location metadata for each site for weather and legislation mapping.

| Column              | Type                | Notes                                      |
|---------------------|---------------------|--------------------------------------------|
| id                  | uuid (PK)           |                                           |
| organisation_id     | uuid (FK)           | references organisations(id)               |
| site_id             | uuid (FK, unique)   | references sites(id)                       |
| country_code        | text                | ISO 3166-1 alpha-2                         |
| region              | text                | State/Province/Region                      |
| city                | text                |                                           |
| latitude            | numeric(9,6)        | Optional, for weather provider             |
| longitude           | numeric(9,6)        | Optional                                   |
| timezone            | text                | IANA timezone (e.g., `Europe/London`)     |
| weather_location_id | text                | Provider-specific location identifier      |
| created_at          | timestamptz         |                                           |
| created_by          | uuid                |                                           |
| updated_at          | timestamptz         |                                           |
| updated_by          | uuid                |                                           |

Indexes:
- UNIQUE (organisation_id, site_id)
- BTREE (organisation_id, country_code, region)

---

### 1.2 weather_cache

Stores cached weather responses to reduce external calls.

| Column          | Type        | Notes                                   |
|-----------------|-------------|-----------------------------------------|
| id              | uuid (PK)   |                                         |
| organisation_id | uuid (FK)   |                                         |
| site_id         | uuid (FK)   | references sites(id)                    |
| as_of           | timestamptz | When this weather data is valid        |
| data_json       | jsonb       | Provider response (sanitised)          |
| expires_at      | timestamptz | Cache expiry                            |
| created_at      | timestamptz |                                         |

Indexes:
- BTREE (organisation_id, site_id)
- BTREE (organisation_id, site_id, expires_at)

---

### 1.3 safety_moments

| Column          | Type        | Notes                                                  |
|-----------------|-------------|--------------------------------------------------------|
| id              | uuid (PK)   |                                                        |
| organisation_id | uuid (FK)   |                                                        |
| title           | text        |                                                        |
| body            | text        | Markdown/HTML-safe text                                |
| category        | text        | e.g. “Working at height”, “Manual handling”            |
| tags            | text[]      | Optional                                               |
| applicable_sites| uuid[]      | Optional list of site ids (null = all)                |
| applicable_roles| text[]      | Optional list of roles (null = all)                   |
| start_date      | date        |                                                        |
| end_date        | date        |                                                        |
| is_active       | boolean     |                                                        |
| created_at      | timestamptz |                                                        |
| created_by      | uuid        |                                                        |
| updated_at      | timestamptz |                                                        |
| updated_by      | uuid        |                                                        |
| deleted_at      | timestamptz | Soft delete                                            |

Indexes:
- BTREE (organisation_id, is_active, start_date, end_date)

---

### 1.4 safety_moment_acknowledgements

Records which users acknowledged which Safety Moment and where.

| Column          | Type        | Notes                                      |
|-----------------|-------------|--------------------------------------------|
| id              | uuid (PK)   |                                           |
| organisation_id | uuid (FK)   |                                           |
| safety_moment_id| uuid (FK)   | references safety_moments(id)             |
| user_id         | uuid (FK)   | references users(id)                      |
| site_id         | uuid (FK)   | Site context                              |
| channel         | text        | e.g. `dashboard`, `task`                  |
| entity_type     | text        | nullable; e.g. `incident`, `permit`       |
| entity_id       | uuid        | nullable                                  |
| acknowledged_at | timestamptz |                                           |

Indexes:
- UNIQUE (organisation_id, safety_moment_id, user_id, entity_type, entity_id)
- BTREE (organisation_id, site_id, acknowledged_at)

---

### 1.5 site_legislation_refs

Legislative references relevant to a site.

| Column          | Type        | Notes                                    |
|-----------------|-------------|------------------------------------------|
| id              | uuid (PK)   |                                         |
| organisation_id | uuid (FK)   |                                         |
| site_id         | uuid (FK)   | references sites(id)                    |
| title           | text        |                                         |
| jurisdiction    | text        | e.g. `UK`, `ZA`, `EU`                   |
| category        | text        | `environmental`, `medical`, `safety`, … |
| summary         | text        | short description                        |
| reference_url   | text        | link to external legal text              |
| is_primary      | boolean     | highlight in UI                          |
| created_at      | timestamptz |                                         |
| created_by      | uuid        |                                         |
| updated_at      | timestamptz |                                         |
| updated_by      | uuid        |                                         |
| deleted_at      | timestamptz |                                         |

Indexes:
- BTREE (organisation_id, site_id)
- BTREE (organisation_id, jurisdiction, category)

---

### 1.6 ppe_recommendations

Site-/task-/weather-based PPE rules.

| Column             | Type        | Notes                                           |
|--------------------|-------------|-------------------------------------------------|
| id                 | uuid (PK)   |                                                |
| organisation_id    | uuid (FK)   |                                                |
| site_id            | uuid (FK)   | nullable; null = all sites                     |
| task_type          | text        | nullable; e.g. `hot_work`, `work_at_height`    |
| permit_type_id     | uuid        | nullable; link to permits types if needed      |
| weather_category   | text        | nullable; e.g. `hot`, `cold`, `wet`, `windy`   |
| recommendation_text| text        | Human-readable PPE recommendation              |
| priority           | integer     | For ordering (1 = highest)                     |
| is_active          | boolean     |                                                |
| created_at         | timestamptz |                                                |
| created_by         | uuid        |                                                |
| updated_at         | timestamptz |                                                |
| updated_by         | uuid        |                                                |
| deleted_at         | timestamptz |                                                |

Indexes:
- BTREE (organisation_id, site_id, task_type, weather_category, is_active)

---

### 1.7 safety_advisor_events

Optional table for usage analytics.

| Column          | Type        | Notes                                      |
|-----------------|-------------|--------------------------------------------|
| id              | uuid (PK)   |                                           |
| organisation_id | uuid (FK)   |                                           |
| user_id         | uuid (FK)   |                                           |
| site_id         | uuid (FK)   |                                           |
| event_type      | text        | `view`, `acknowledge`, `dismiss`          |
| entity_type     | text        | `incident`, `inspection`, `permit`, etc.  |
| entity_id       | uuid        |                                           |
| safety_moment_id| uuid        | nullable                                  |
| created_at      | timestamptz |                                           |

Indexes:
- BTREE (organisation_id, event_type, created_at)

---

## 2. Enums

Phase 11 can define the following enums at DB or application level:

- **weather_condition_category**: `hot`, `cold`, `wet`, `windy`, `normal`
- **safety_advisor_event_type**: `view`, `acknowledge`, `dismiss`

(Implementation may keep these as simple text with constraints.)

---

## 3. Relationships

- `sites` 1-to-1 `site_locations`
- `sites` 1-to-many `site_legislation_refs`
- `sites` 1-to-many `ppe_recommendations`
- `safety_moments` 1-to-many `safety_moment_acknowledgements`
- `users` 1-to-many `safety_moment_acknowledgements` and `safety_advisor_events`
- `sites` 1-to-many `weather_cache`
- `tasks/entities` (incidents, inspections, permits, actions) → referenced in `safety_advisor_events` and acknowledgements via polymorphic `entity_type` + `entity_id`.

---

## 4. Migration – 010_phase11_safety_advisor.sql

The migration should:

1. Create new tables (above) with `organisation_id` and audit fields.
2. Backfill `site_locations` using any existing site metadata (country, timezone).
3. Optionally seed a default set of PPE recommendations or Safety Moments (demo only).
4. Be idempotent (check `IF NOT EXISTS` before creating objects).

---

## 5. Integration With Earlier Phases

- **Phase 1 Sites** – `site_locations` extends `sites`.
- **Phase 2 Attachments** – can be reused if Safety Moments need attachments (Phase 11 keeps it text-only).
- **Phase 4 Notifications** – Safety Moment acknowledgement reminders can use existing notification + email infra.
- **Phase 5 Analytics** – Safety Advisor events can feed dashboards (not required in Phase 11).
- **Phase 9 Risk Register** – site_legislation_refs can cross-reference risk categories (optional field for future).


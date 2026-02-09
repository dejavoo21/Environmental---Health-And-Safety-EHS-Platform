# Phase 11 API Specification

## Endpoints
- GET /api/safety-moments: List safety moments
- POST /api/safety-moments: Submit a safety moment
- GET /api/safety-advisor: Get safety intelligence for site/task
- GET /api/weather/:siteId: Get weather for site
- GET /api/site-legislation/:siteId: Get legislation refs for site
- GET /api/ppe-recommendations/:siteId/:taskId: Get PPE recommendations

---

### Phase 11: High-Risk Workflows – Mandatory Safety Advisor Acknowledgement

- For any workflow flagged as **high-risk** (e.g., high-risk permits, incidents, or inspections), the API must enforce **mandatory acknowledgement** of the Safety Advisor before allowing the main action (e.g., submit, approve, close, etc.).
- The acknowledgement event must be sent to the backend and **persisted/audited** with user, timestamp, entity, and high-risk flag.
- The API must return an error if a main action is attempted without prior acknowledgement for high-risk workflows.
- The acknowledgement status must be queryable (e.g., via GET /api/safety-advisor or entity endpoint).
- All acknowledgement events must be logged in the AuditService for traceability.
- Enforcement is only for workflows/entities marked as high-risk by backend/config.

**Traceability:**
- All requirements are traceable to C-IDs, BR-IDs, and TC-IDs in the BRD and test cases.

**See also:** [FRONTEND_UX_PHASE11.md], [BRD_EHS_PORTAL_PHASE11.md], [test_cases_phase11.csv]

## Authentication
- All endpoints require valid JWT

## Integration
- NotificationService: Sends alerts for safety moments, weather, compliance
- AuditService: Logs all advisor actions

## Response Examples
- Safety moments: [{ id, site_id, user_id, moment_text, created_at }]
- Safety advisor: { site_id, weather, ppe, legislation, guidance }
- Weather: { site_id, weather_json, updated_at }
- Legislation: [{ id, site_id, legislation_id, ref_text }]
- PPE: { site_id, task_id, ppe_list, updated_at }

---

See DATA_MODEL_PHASE11.md and ARCHITECTURE_PHASE11.md for details.
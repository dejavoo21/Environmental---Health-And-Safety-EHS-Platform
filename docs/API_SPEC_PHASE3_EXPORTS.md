# EHS Portal – API Specification (Phase 4)

## Phase 4: Reporting Enhancements

This document describes the Phase 4 API additions: PDF export support and email report endpoints.

---

## 1. Export Format Parameter

All existing export endpoints now accept an optional `format` query parameter:

| Endpoint | Query Parameter | Values | Default |
|----------|----------------|--------|---------|
| `GET /api/exports/incidents` | `format` | `csv`, `pdf` | `csv` |
| `GET /api/exports/inspections` | `format` | `csv`, `pdf` | `csv` |
| `GET /api/exports/actions` | `format` | `csv`, `pdf` | `csv` |

### Example Requests

```bash
# CSV export (default)
GET /api/exports/incidents?startDate=2024-01-01

# PDF export
GET /api/exports/incidents?startDate=2024-01-01&format=pdf
```

### Response Headers

| Format | Content-Type | Content-Disposition |
|--------|--------------|---------------------|
| `csv` | `text/csv; charset=utf-8` | `attachment; filename="incidents_<org>_<date>.csv"` |
| `pdf` | `application/pdf` | `attachment; filename="incidents_<org>_<date>.pdf"` |

### Error Responses

| Status | Code | Description |
|--------|------|-------------|
| 400 | `INVALID_FORMAT` | Invalid format specified (not `csv` or `pdf`) |

---

## 2. Email Report Endpoints

### 2.1 POST /api/exports/incidents/email

Send incidents report as PDF email attachment.

**Request Body:**

```json
{
  "toEmail": "recipient@example.com",
  "subject": "Optional custom subject",
  "startDate": "2024-01-01",
  "endDate": "2024-12-31",
  "siteId": "site-uuid",
  "status": "open",
  "severity": "high"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `toEmail` | string | Yes | Recipient email address |
| `subject` | string | No | Custom email subject (default: "EHS Report - Incidents - {org}") |
| `startDate` | date | No | Filter: incidents from this date |
| `endDate` | date | No | Filter: incidents until this date |
| `siteId` | UUID | No | Filter: incidents at this site |
| `status` | string | No | Filter: incident status |
| `severity` | string | No | Filter: incident severity |

**Success Response (200):**

```json
{
  "success": true,
  "message": "Report sent successfully to recipient@example.com",
  "data": {
    "recipient": "recipient@example.com",
    "filename": "incidents_acme-corp_2024-01-26.pdf",
    "rowCount": 45
  }
}
```

---

### 2.2 POST /api/exports/inspections/email

Send inspections report as PDF email attachment.

**Request Body:**

```json
{
  "toEmail": "recipient@example.com",
  "subject": "Optional custom subject",
  "startDate": "2024-01-01",
  "endDate": "2024-12-31",
  "siteId": "site-uuid",
  "result": "fail"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `toEmail` | string | Yes | Recipient email address |
| `subject` | string | No | Custom email subject |
| `startDate` | date | No | Filter: inspections from this date |
| `endDate` | date | No | Filter: inspections until this date |
| `siteId` | UUID | No | Filter: inspections at this site |
| `result` | string | No | Filter: inspection result (pass/fail) |

---

### 2.3 POST /api/exports/actions/email

Send actions report as PDF email attachment.

**Request Body:**

```json
{
  "toEmail": "recipient@example.com",
  "subject": "Optional custom subject",
  "startDate": "2024-01-01",
  "endDate": "2024-12-31",
  "status": "overdue",
  "dueBefore": "2024-06-01"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `toEmail` | string | Yes | Recipient email address |
| `subject` | string | No | Custom email subject |
| `startDate` | date | No | Filter: actions created from this date |
| `endDate` | date | No | Filter: actions created until this date |
| `status` | string | No | Filter: action status |
| `dueBefore` | date | No | Filter: actions due before this date |

---

## 3. Error Responses (Email Endpoints)

| Status | Code | Description |
|--------|------|-------------|
| 400 | `VALIDATION_ERROR` | Missing or invalid `toEmail` |
| 400 | `TOO_MANY_ROWS` | Export exceeds 10,000 row limit |
| 403 | `FORBIDDEN` | User not authorized (worker role) |
| 429 | `RATE_LIMITED` | Rate limit exceeded (shared with exports) |
| 503 | `SMTP_NOT_CONFIGURED` | SMTP not configured on server |

---

## 4. Rate Limiting

Email endpoints share the same rate limit bucket as export endpoints:
- **Limit:** 1 export/email per 30 seconds per user
- **Scope:** Per user (based on JWT)
- **Bucket:** Shared between CSV, PDF, and email exports

---

## 5. RBAC

| Role | CSV/PDF Export | Email Export |
|------|----------------|--------------|
| Worker | No | No |
| Manager | Yes | Yes |
| Admin | Yes | Yes |

---

## 6. Environment Variables

Add the following SMTP configuration to enable email exports:

```env
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=user@example.com
SMTP_PASS=password
SMTP_FROM=noreply@ehs-portal.example.com
SMTP_SECURE=false
```

| Variable | Description | Default |
|----------|-------------|---------|
| `SMTP_HOST` | SMTP server hostname | (required for email) |
| `SMTP_PORT` | SMTP server port | 587 |
| `SMTP_USER` | SMTP username | (optional) |
| `SMTP_PASS` | SMTP password | (optional) |
| `SMTP_FROM` | Sender email address | noreply@ehs-portal.local |
| `SMTP_SECURE` | Use TLS | false |

---

## 7. PDF Format

Generated PDFs include:
- Report title (e.g., "Incidents Report")
- Organisation name
- Generation date
- Tabular data with column headers
- Alternating row colors for readability
- Page breaks for large datasets
- Total row count in footer

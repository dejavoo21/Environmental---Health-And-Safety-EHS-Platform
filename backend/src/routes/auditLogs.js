const express = require('express');
const { query } = require('../config/db');
const { AppError } = require('../utils/appError');
const { toIso } = require('../utils/format');
const { requireRole } = require('../middleware/requireRole');

const router = express.Router();

const ALLOWED_ENTITY_TYPES = new Set(['incident', 'inspection', 'action']);
const ALLOWED_EVENT_TYPES = new Set([
  'created',
  'updated',
  'status_changed',
  'severity_changed',
  'attachment_added',
  'attachment_removed',
  'assigned'
]);

const parseDate = (value) => {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date;
};

const mapAuditRow = (row) => ({
  id: row.id,
  eventType: row.event_type,
  entityType: row.entity_type,
  entityId: row.entity_id,
  userId: row.user_id,
  occurredAt: toIso(row.occurred_at),
  oldValue: row.old_value,
  newValue: row.new_value,
  metadata: row.metadata
});

// GET /api/audit-logs - Admin-only system audit log
router.get('/', requireRole(['admin']), async (req, res, next) => {
  const { entityType, entityId, eventType, from, to } = req.query;

  const conditions = [];
  const values = [];

  if (entityType) {
    if (!ALLOWED_ENTITY_TYPES.has(entityType)) {
      return next(new AppError('Invalid entity type', 400, 'VALIDATION_ERROR'));
    }
    values.push(entityType);
    conditions.push(`entity_type = $${values.length}`);
  }

  if (entityId) {
    values.push(entityId);
    conditions.push(`entity_id = $${values.length}`);
  }

  if (eventType) {
    if (!ALLOWED_EVENT_TYPES.has(eventType)) {
      return next(new AppError('Invalid event type', 400, 'VALIDATION_ERROR'));
    }
    values.push(eventType);
    conditions.push(`event_type = $${values.length}`);
  }

  if (from) {
    const fromDate = parseDate(from);
    if (!fromDate) {
      return next(new AppError('Invalid from date', 400, 'VALIDATION_ERROR'));
    }
    values.push(fromDate);
    conditions.push(`occurred_at >= $${values.length}`);
  }

  if (to) {
    const toDate = parseDate(to);
    if (!toDate) {
      return next(new AppError('Invalid to date', 400, 'VALIDATION_ERROR'));
    }
    values.push(toDate);
    conditions.push(`occurred_at <= $${values.length}`);
  }

  const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

  try {
    const result = await query(
      `SELECT id, event_type, entity_type, entity_id, user_id, occurred_at, old_value, new_value, metadata
       FROM audit_log
       ${whereClause}
       ORDER BY occurred_at DESC
       LIMIT 500`,
      values
    );

    const events = result.rows.map(mapAuditRow);
    return res.json({ events });
  } catch (err) {
    return next(err);
  }
});

module.exports = router;

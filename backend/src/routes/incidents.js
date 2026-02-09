const express = require('express');
const { query } = require('../config/db');
const { AppError } = require('../utils/appError');
const { splitName, toIso } = require('../utils/format');
const { recordAudit } = require('../utils/audit');
// Phase 4: Notification triggers
const notificationTriggers = require('../services/notificationTriggers');
// Phase 11: Safety acknowledgement middleware
const { requireSafetyAckForIncidentClose } = require('../middleware/safetyAcknowledgement');

const router = express.Router();

const allowedSeverities = new Set(['low', 'medium', 'high', 'critical']);
const allowedStatuses = new Set(['open', 'under_investigation', 'closed']);

const parseDate = (value) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return null;
  }
  return date;
};

const mapIncidentRow = (row) => {
  const reporter = splitName(row.reporter_name);
  return {
    id: row.id,
    title: row.title,
    incidentType: {
      id: row.type_id,
      name: row.type_name
    },
    site: {
      id: row.site_id,
      name: row.site_name
    },
    severity: row.severity,
    status: row.status,
    occurredAt: toIso(row.occurred_at),
    reportedBy: {
      id: row.reported_by,
      firstName: reporter.firstName,
      lastName: reporter.lastName,
      name: row.reporter_name
    },
    createdAt: toIso(row.created_at)
  };
};

router.get('/', async (req, res, next) => {
  const { status, siteId } = req.query;

  const conditions = [];
  const values = [];

  if (status) {
    if (!allowedStatuses.has(status)) {
      return next(new AppError('Invalid status', 400, 'VALIDATION_ERROR'));
    }
    values.push(status);
    conditions.push(`i.status = $${values.length}`);
  }

  if (siteId) {
    values.push(siteId);
    conditions.push(`i.site_id = $${values.length}`);
  }

  if (req.user.role === 'worker') {
    values.push(req.user.id);
    conditions.push(`i.reported_by = $${values.length}`);
  }

  const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

  try {
    const result = await query(
      `SELECT i.id, i.title, i.severity, i.status, i.occurred_at, i.reported_by, i.created_at,
              it.id AS type_id, it.name AS type_name,
              s.id AS site_id, s.name AS site_name,
              u.name AS reporter_name
       FROM incidents i
       JOIN incident_types it ON it.id = i.type_id
       JOIN sites s ON s.id = i.site_id
       JOIN users u ON u.id = i.reported_by
       ${whereClause}
       ORDER BY i.occurred_at DESC`,
      values
    );

    const incidents = result.rows.map(mapIncidentRow);
    return res.json({ incidents });
  } catch (err) {
    return next(err);
  }
});

router.get('/:id', async (req, res, next) => {
  const { id } = req.params;
  try {
    const result = await query(
      `SELECT i.id, i.title, i.description, i.severity, i.status, i.occurred_at,
              i.reported_by, i.created_at, i.updated_at,
              it.id AS type_id, it.name AS type_name,
              s.id AS site_id, s.name AS site_name,
              u.name AS reporter_name
       FROM incidents i
       JOIN incident_types it ON it.id = i.type_id
       JOIN sites s ON s.id = i.site_id
       JOIN users u ON u.id = i.reported_by
       WHERE i.id = $1`,
      [id]
    );

    if (result.rowCount === 0) {
      return next(new AppError('Incident not found', 404, 'NOT_FOUND'));
    }

    const row = result.rows[0];
    const reporter = splitName(row.reporter_name);

    return res.json({
      id: row.id,
      title: row.title,
      description: row.description,
      incidentType: {
        id: row.type_id,
        name: row.type_name
      },
      site: {
        id: row.site_id,
        name: row.site_name
      },
      severity: row.severity,
      status: row.status,
      occurredAt: toIso(row.occurred_at),
      reportedBy: {
        id: row.reported_by,
        firstName: reporter.firstName,
        lastName: reporter.lastName,
        name: row.reporter_name
      },
      createdAt: toIso(row.created_at),
      updatedAt: toIso(row.updated_at)
    });
  } catch (err) {
    return next(err);
  }
});

router.post('/', async (req, res, next) => {
  const { title, description, incidentTypeId, siteId, severity, occurredAt } = req.body || {};
  if (!title) {
    return next(new AppError('Title is required', 400, 'VALIDATION_ERROR'));
  }
  if (!incidentTypeId) {
    return next(new AppError('Invalid incident type', 400, 'VALIDATION_ERROR'));
  }
  if (!siteId) {
    return next(new AppError('Invalid site', 400, 'VALIDATION_ERROR'));
  }
  if (!severity) {
    return next(new AppError('Severity is required', 400, 'VALIDATION_ERROR'));
  }
  if (!allowedSeverities.has(severity)) {
    return next(new AppError('Invalid severity', 400, 'VALIDATION_ERROR'));
  }
  if (!occurredAt) {
    return next(new AppError('OccurredAt is required', 400, 'VALIDATION_ERROR'));
  }
  const occurredDate = parseDate(occurredAt);
  if (!occurredDate) {
    return next(new AppError('Invalid occurredAt', 400, 'VALIDATION_ERROR'));
  }
  if (occurredDate.getTime() > Date.now()) {
    return next(new AppError('OccurredAt cannot be in the future', 400, 'VALIDATION_ERROR'));
  }

  try {
    const typeCheck = await query('SELECT id, name FROM incident_types WHERE id = $1', [incidentTypeId]);
    if (typeCheck.rowCount === 0) {
      return next(new AppError('Invalid incident type', 400, 'VALIDATION_ERROR'));
    }

    const siteCheck = await query('SELECT id, name FROM sites WHERE id = $1', [siteId]);
    if (siteCheck.rowCount === 0) {
      return next(new AppError('Invalid site', 400, 'VALIDATION_ERROR'));
    }

    const insert = await query(
      `INSERT INTO incidents (title, description, type_id, site_id, severity, occurred_at, reported_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id, title, description, type_id, site_id, severity, status, occurred_at, reported_by, created_at, updated_at`,
      [title, description || null, incidentTypeId, siteId, severity, occurredAt, req.user.id]
    );

    const row = insert.rows[0];

    // Record audit log for incident creation (C40)
    await recordAudit({
      eventType: 'created',
      entityType: 'incident',
      entityId: row.id,
      userId: req.user.id,
      newValue: { title: row.title, status: row.status, severity: row.severity }
    });

    const reporter = splitName(req.user.name);

    const responseData = {
      id: row.id,
      title: row.title,
      description: row.description,
      incidentType: {
        id: typeCheck.rows[0].id,
        name: typeCheck.rows[0].name
      },
      site: {
        id: siteCheck.rows[0].id,
        name: siteCheck.rows[0].name
      },
      severity: row.severity,
      status: row.status,
      occurredAt: toIso(row.occurred_at),
      reportedBy: {
        id: req.user.id,
        firstName: reporter.firstName,
        lastName: reporter.lastName,
        name: req.user.name
      },
      createdAt: toIso(row.created_at),
      updatedAt: toIso(row.updated_at)
    };

    // Phase 4: Trigger notification for high-severity incidents (async)
    if (['high', 'critical'].includes(severity) && req.user.organisationId) {
      setImmediate(() => {
        notificationTriggers.onHighSeverityIncident(
          {
            id: row.id,
            title: row.title,
            severity: row.severity,
            siteName: siteCheck.rows[0].name
          },
          req.user.organisationId,
          { id: req.user.id, name: req.user.name }
        ).catch(err => console.error('[Incidents] High-severity notification error:', err.message));
      });
    }

    return res.status(201).json(responseData);
  } catch (err) {
    return next(err);
  }
});

// GET /api/incidents/:id/actions - List actions linked to an incident
router.get('/:id/actions', async (req, res, next) => {
  const { id } = req.params;

  try {
    // Verify incident exists
    const incidentCheck = await query('SELECT id, reported_by FROM incidents WHERE id = $1', [id]);
    if (incidentCheck.rowCount === 0) {
      return next(new AppError('Incident not found', 404, 'NOT_FOUND'));
    }

    // RBAC: Workers can only see actions for incidents they reported
    if (req.user.role === 'worker' && incidentCheck.rows[0].reported_by !== req.user.id) {
      return next(new AppError('Not allowed to view actions for this incident', 403, 'FORBIDDEN'));
    }

    const result = await query(
      `SELECT a.id, a.title, a.description, a.source_type, a.source_id, a.linked_response_id,
              a.assigned_to, a.created_by, a.due_date, a.status, a.created_at, a.updated_at,
              i.site_id,
              u_assignee.name AS assignee_name,
              u_creator.name AS creator_name
       FROM actions a
       JOIN incidents i ON i.id = a.source_id
       LEFT JOIN users u_assignee ON u_assignee.id = a.assigned_to
       LEFT JOIN users u_creator ON u_creator.id = a.created_by
       WHERE a.source_type = 'incident' AND a.source_id = $1
       ORDER BY a.created_at DESC`,
      [id]
    );

    const actions = result.rows.map(row => {
      const assignee = row.assignee_name ? splitName(row.assignee_name) : null;
      const creator = row.creator_name ? splitName(row.creator_name) : null;
      return {
        id: row.id,
        title: row.title,
        description: row.description,
        sourceType: row.source_type,
        sourceId: row.source_id,
        siteId: row.site_id,
        linkedResponseId: row.linked_response_id,
        assignedTo: assignee ? {
          id: row.assigned_to,
          firstName: assignee.firstName,
          lastName: assignee.lastName
        } : null,
        createdBy: creator ? {
          id: row.created_by,
          firstName: creator.firstName,
          lastName: creator.lastName
        } : null,
        dueDate: row.due_date ? row.due_date.toISOString().split('T')[0] : null,
        status: row.status,
        createdAt: toIso(row.created_at),
        updatedAt: toIso(row.updated_at)
      };
    });

    return res.json({ actions });
  } catch (err) {
    return next(err);
  }
});

// GET /api/incidents/:id/audit-log - Get audit history for an incident
router.get('/:id/audit-log', async (req, res, next) => {
  const { id } = req.params;

  try {
    // Verify incident exists
    const incidentCheck = await query('SELECT id, reported_by FROM incidents WHERE id = $1', [id]);
    if (incidentCheck.rowCount === 0) {
      return next(new AppError('Incident not found', 404, 'NOT_FOUND'));
    }

    // RBAC: Workers can only see audit log for incidents they reported
    if (req.user.role === 'worker' && incidentCheck.rows[0].reported_by !== req.user.id) {
      return next(new AppError('Not allowed to view audit log for this incident', 403, 'FORBIDDEN'));
    }

    const result = await query(
      `SELECT id, event_type, entity_type, entity_id, user_id, occurred_at, old_value, new_value, metadata
       FROM audit_log
       WHERE entity_type = 'incident' AND entity_id = $1
       ORDER BY occurred_at DESC`,
      [id]
    );

    const events = result.rows.map(row => ({
      id: row.id,
      eventType: row.event_type,
      entityType: row.entity_type,
      entityId: row.entity_id,
      userId: row.user_id,
      occurredAt: toIso(row.occurred_at),
      oldValue: row.old_value,
      newValue: row.new_value,
      metadata: row.metadata
    }));

    return res.json({ events });
  } catch (err) {
    return next(err);
  }
});

// Phase 11: Add safety acknowledgement check for closing high-severity incidents (BR-11-18a)
router.put('/:id', requireSafetyAckForIncidentClose, async (req, res, next) => {
  const { id } = req.params;
  const { title, description, status, severity } = req.body || {};

  try {
    const existing = await query('SELECT id, reported_by, status, severity FROM incidents WHERE id = $1', [id]);
    if (existing.rowCount === 0) {
      return next(new AppError('Incident not found', 404, 'NOT_FOUND'));
    }

    const oldIncident = existing.rows[0];

    if (status && req.user.role === 'worker') {
      return next(new AppError('Only managers can update incident status', 403, 'FORBIDDEN'));
    }
    if (status && !allowedStatuses.has(status)) {
      return next(new AppError('Invalid status', 400, 'VALIDATION_ERROR'));
    }
    if (severity && !allowedSeverities.has(severity)) {
      return next(new AppError('Invalid severity', 400, 'VALIDATION_ERROR'));
    }

    if ((title || description) && oldIncident.reported_by !== req.user.id) {
      return next(new AppError('Only reporter can update incident details', 403, 'FORBIDDEN'));
    }

    const update = await query(
      `UPDATE incidents
       SET title = COALESCE($1, title),
           description = COALESCE($2, description),
           status = COALESCE($3, status),
           severity = COALESCE($4, severity),
           updated_at = NOW()
       WHERE id = $5
       RETURNING id, title, status, severity, updated_at`,
      [title || null, description || null, status || null, severity || null, id]
    );

    const row = update.rows[0];

    // Record audit log for status change (C41)
    if (status && oldIncident.status !== status) {
      await recordAudit({
        eventType: 'status_changed',
        entityType: 'incident',
        entityId: id,
        userId: req.user.id,
        oldValue: { status: oldIncident.status },
        newValue: { status: status }
      });
    }

    // Record audit log for severity change (C41)
    if (severity && oldIncident.severity !== severity) {
      await recordAudit({
        eventType: 'severity_changed',
        entityType: 'incident',
        entityId: id,
        userId: req.user.id,
        oldValue: { severity: oldIncident.severity },
        newValue: { severity: severity }
      });
    }

    return res.json({
      id: row.id,
      title: row.title,
      status: row.status,
      updatedAt: toIso(row.updated_at)
    });
  } catch (err) {
    return next(err);
  }
});

module.exports = router;

const express = require('express');
const { query, withTransaction } = require('../config/db');
const { AppError } = require('../utils/appError');
const { requireManager } = require('../middleware/requireRole');
const { splitName, toIso } = require('../utils/format');
const { recordAudit } = require('../utils/audit');

const router = express.Router();

const allowedResponseResults = new Set(['ok', 'not_ok', 'na']);

router.get('/', async (req, res, next) => {
  const { siteId, templateId, result } = req.query;
  const conditions = [];
  const values = [];

  if (siteId) {
    values.push(siteId);
    conditions.push(`ins.site_id = $${values.length}`);
  }

  if (templateId) {
    values.push(templateId);
    conditions.push(`ins.template_id = $${values.length}`);
  }

  if (result) {
    values.push(result);
    conditions.push(`ins.overall_result = $${values.length}`);
  }

  const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

  try {
    const resultSet = await query(
      `SELECT ins.id, ins.performed_at, ins.overall_result, ins.created_at,
              t.id AS template_id, t.name AS template_name,
              s.id AS site_id, s.name AS site_name,
              u.id AS performer_id, u.name AS performer_name
       FROM inspections ins
       JOIN inspection_templates t ON t.id = ins.template_id
       JOIN sites s ON s.id = ins.site_id
       JOIN users u ON u.id = ins.performed_by
       ${whereClause}
       ORDER BY ins.performed_at DESC`,
      values
    );

    const inspections = resultSet.rows.map((row) => {
      const performer = splitName(row.performer_name);
      return {
        id: row.id,
        template: { id: row.template_id, name: row.template_name },
        site: { id: row.site_id, name: row.site_name },
        performedBy: {
          id: row.performer_id,
          firstName: performer.firstName,
          lastName: performer.lastName,
          name: row.performer_name
        },
        performedAt: toIso(row.performed_at),
        overallResult: row.overall_result,
        createdAt: toIso(row.created_at)
      };
    });

    return res.json({ inspections });
  } catch (err) {
    return next(err);
  }
});

router.get('/:id', async (req, res, next) => {
  try {
    const inspectionRes = await query(
      `SELECT ins.id, ins.performed_at, ins.overall_result, ins.notes, ins.created_at,
              t.id AS template_id, t.name AS template_name,
              s.id AS site_id, s.name AS site_name,
              u.id AS performer_id, u.name AS performer_name
       FROM inspections ins
       JOIN inspection_templates t ON t.id = ins.template_id
       JOIN sites s ON s.id = ins.site_id
       JOIN users u ON u.id = ins.performed_by
       WHERE ins.id = $1`,
      [req.params.id]
    );

    if (inspectionRes.rowCount === 0) {
      return next(new AppError('Inspection not found', 404, 'NOT_FOUND'));
    }

    const inspection = inspectionRes.rows[0];
    const performer = splitName(inspection.performer_name);

    const responsesRes = await query(
      `SELECT r.id, r.result, r.comment,
              i.id AS item_id, i.label, i.category, i.sort_order
       FROM inspection_responses r
       JOIN inspection_template_items i ON i.id = r.item_id
       WHERE r.inspection_id = $1
       ORDER BY i.sort_order, i.label`,
      [inspection.id]
    );

    return res.json({
      id: inspection.id,
      template: { id: inspection.template_id, name: inspection.template_name },
      site: { id: inspection.site_id, name: inspection.site_name },
      performedBy: {
        id: inspection.performer_id,
        firstName: performer.firstName,
        lastName: performer.lastName,
        name: inspection.performer_name
      },
      performedAt: toIso(inspection.performed_at),
      overallResult: inspection.overall_result,
      notes: inspection.notes,
      responses: responsesRes.rows.map((row) => ({
        id: row.id,
        templateItem: {
          id: row.item_id,
          label: row.label,
          category: row.category
        },
        result: row.result,
        comment: row.comment
      })),
      createdAt: toIso(inspection.created_at)
    });
  } catch (err) {
    return next(err);
  }
});

// GET /api/inspections/:id/actions - List actions linked to an inspection
router.get('/:id/actions', async (req, res, next) => {
  const { id } = req.params;

  try {
    // Verify inspection exists
    const inspectionCheck = await query('SELECT id, performed_by FROM inspections WHERE id = $1', [id]);
    if (inspectionCheck.rowCount === 0) {
      return next(new AppError('Inspection not found', 404, 'NOT_FOUND'));
    }

    const result = await query(
      `SELECT a.id, a.title, a.description, a.source_type, a.source_id, a.linked_response_id,
              a.assigned_to, a.created_by, a.due_date, a.status, a.created_at, a.updated_at,
              ins.site_id,
              u_assignee.name AS assignee_name,
              u_creator.name AS creator_name
       FROM actions a
       JOIN inspections ins ON ins.id = a.source_id
       LEFT JOIN users u_assignee ON u_assignee.id = a.assigned_to
       LEFT JOIN users u_creator ON u_creator.id = a.created_by
       WHERE a.source_type = 'inspection' AND a.source_id = $1
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

// GET /api/inspections/:id/audit-log - Get audit history for an inspection
router.get('/:id/audit-log', async (req, res, next) => {
  const { id } = req.params;

  try {
    // Verify inspection exists
    const inspectionCheck = await query('SELECT id FROM inspections WHERE id = $1', [id]);
    if (inspectionCheck.rowCount === 0) {
      return next(new AppError('Inspection not found', 404, 'NOT_FOUND'));
    }

    const result = await query(
      `SELECT id, event_type, entity_type, entity_id, user_id, occurred_at, old_value, new_value, metadata
       FROM audit_log
       WHERE entity_type = 'inspection' AND entity_id = $1
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

router.post('/', requireManager, async (req, res, next) => {
  const { templateId, siteId, performedAt, notes, responses } = req.body || {};
  if (!templateId) {
    return next(new AppError('Template not found', 400, 'VALIDATION_ERROR'));
  }
  if (!siteId) {
    return next(new AppError('Site not found', 400, 'VALIDATION_ERROR'));
  }
  if (!performedAt) {
    return next(new AppError('PerformedAt is required', 400, 'VALIDATION_ERROR'));
  }
  if (!Array.isArray(responses) || responses.length == 0) {
    return next(new AppError('Missing response for template item', 400, 'VALIDATION_ERROR'));
  }

  try {
    const templateItems = await query(
      'SELECT id FROM inspection_template_items WHERE template_id = $1',
      [templateId]
    );
    if (templateItems.rowCount == 0) {
      return next(new AppError('Template not found', 400, 'VALIDATION_ERROR'));
    }

    const requiredIds = new Set(templateItems.rows.map((row) => row.id));
    const providedIds = new Set(responses.map((resp) => resp.templateItemId));

    if (providedIds.size !== responses.length) {
      return next(new AppError('Missing response for template item', 400, 'VALIDATION_ERROR'));
    }

    for (const id of requiredIds) {
      if (!providedIds.has(id)) {
        return next(new AppError('Missing response for template item', 400, 'VALIDATION_ERROR'));
      }
    }

    for (const response of responses) {
      if (!requiredIds.has(response.templateItemId)) {
        return next(new AppError('Missing response for template item', 400, 'VALIDATION_ERROR'));
      }
      if (!allowedResponseResults.has(response.result)) {
        return next(new AppError('Invalid response result', 400, 'VALIDATION_ERROR'));
      }
    }

    const overallResult = responses.some((resp) => resp.result == 'not_ok') ? 'fail' : 'pass';

    const inspection = await withTransaction(async (client) => {
      const insertInspection = await client.query(
        `INSERT INTO inspections (template_id, site_id, performed_by, performed_at, overall_result, notes)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING id, performed_at, overall_result, notes, created_at`,
        [templateId, siteId, req.user.id, performedAt, overallResult, notes || null]
      );

      const inspectionId = insertInspection.rows[0].id;

      for (const response of responses) {
        await client.query(
          `INSERT INTO inspection_responses (inspection_id, item_id, result, comment)
           VALUES ($1, $2, $3, $4)`,
          [inspectionId, response.templateItemId, response.result, response.comment || null]
        );
      }

      // Record audit log for inspection creation (C42)
      await recordAudit({
        eventType: 'created',
        entityType: 'inspection',
        entityId: inspectionId,
        userId: req.user.id,
        newValue: { overallResult, templateId, siteId }
      }, client);

      return insertInspection.rows[0];
    });

    const templateRes = await query('SELECT id, name FROM inspection_templates WHERE id = $1', [templateId]);
    const siteRes = await query('SELECT id, name FROM sites WHERE id = $1', [siteId]);
    const performer = splitName(req.user.name);

    return res.status(201).json({
      id: inspection.id,
      template: { id: templateRes.rows[0].id, name: templateRes.rows[0].name },
      site: { id: siteRes.rows[0].id, name: siteRes.rows[0].name },
      performedBy: {
        id: req.user.id,
        firstName: performer.firstName,
        lastName: performer.lastName,
        name: req.user.name
      },
      performedAt: toIso(inspection.performed_at),
      overallResult: inspection.overall_result,
      notes: inspection.notes,
      responses: responses,
      createdAt: toIso(inspection.created_at)
    });
  } catch (err) {
    return next(err);
  }
});

module.exports = router;

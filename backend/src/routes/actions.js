const express = require('express');
const { query, withTransaction } = require('../config/db');
const { AppError } = require('../utils/appError');
const { splitName, toIso } = require('../utils/format');
const { requireManager } = require('../middleware/requireRole');
const { recordAudit } = require('../utils/audit');
// Phase 4: Notification triggers
const notificationTriggers = require('../services/notificationTriggers');

const router = express.Router();

const allowedStatuses = new Set(['open', 'in_progress', 'done', 'overdue']);
const allowedSourceTypes = new Set(['incident', 'inspection']);

const parseDate = (value) => {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date;
};

const mapActionRow = (row) => {
  const assignee = row.assignee_name ? splitName(row.assignee_name) : null;
  const creator = row.creator_name ? splitName(row.creator_name) : null;
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    sourceType: row.source_type,
    sourceId: row.source_id,
    siteId: row.site_id || null,
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
};

// GET /api/actions - List actions with filters
router.get('/', async (req, res, next) => {
  const { scope = 'my', status, siteId, dueDateFrom, dueDateTo } = req.query;
  const conditions = [];
  const values = [];

  // Scope handling - workers can only see their own actions
  if (scope === 'all') {
    if (req.user.role === 'worker') {
      return next(new AppError('Managers and admins only can view all actions', 403, 'FORBIDDEN'));
    }
  } else {
    // scope=my (default)
    values.push(req.user.id);
    conditions.push(`a.assigned_to = $${values.length}`);
  }

  if (status) {
    if (!allowedStatuses.has(status)) {
      return next(new AppError('Invalid status', 400, 'VALIDATION_ERROR'));
    }
    values.push(status);
    conditions.push(`a.status = $${values.length}`);
  }

  if (dueDateFrom) {
    const fromDate = parseDate(dueDateFrom);
    if (!fromDate) {
      return next(new AppError('Invalid dueDateFrom', 400, 'VALIDATION_ERROR'));
    }
    values.push(fromDate);
    conditions.push(`a.due_date >= $${values.length}`);
  }

  if (dueDateTo) {
    const toDate = parseDate(dueDateTo);
    if (!toDate) {
      return next(new AppError('Invalid dueDateTo', 400, 'VALIDATION_ERROR'));
    }
    values.push(toDate);
    conditions.push(`a.due_date <= $${values.length}`);
  }

  // Site filter requires joining to source entity
  if (siteId) {
    values.push(siteId);
    conditions.push(`(
      (a.source_type = 'incident' AND i.site_id = $${values.length}) OR
      (a.source_type = 'inspection' AND insp.site_id = $${values.length})
    )`);
  }

  const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

  try {
    const result = await query(
      `SELECT a.id, a.title, a.description, a.source_type, a.source_id, a.linked_response_id,
              a.assigned_to, a.created_by, a.due_date, a.status, a.created_at, a.updated_at,
              u_assignee.name AS assignee_name,
              u_creator.name AS creator_name,
              COALESCE(i.site_id, insp.site_id) AS site_id
       FROM actions a
       LEFT JOIN users u_assignee ON u_assignee.id = a.assigned_to
       LEFT JOIN users u_creator ON u_creator.id = a.created_by
       LEFT JOIN incidents i ON a.source_type = 'incident' AND a.source_id = i.id
       LEFT JOIN inspections insp ON a.source_type = 'inspection' AND a.source_id = insp.id
       ${whereClause}
       ORDER BY a.created_at DESC`,
      values
    );

    const actions = result.rows.map(mapActionRow);
    return res.json({ actions });
  } catch (err) {
    return next(err);
  }
});

// GET /api/actions/:id - Get action details
router.get('/:id', async (req, res, next) => {
  const { id } = req.params;

  try {
    const result = await query(
      `SELECT a.id, a.title, a.description, a.source_type, a.source_id, a.linked_response_id,
              a.assigned_to, a.created_by, a.due_date, a.status, a.created_at, a.updated_at,
              u_assignee.name AS assignee_name,
              u_creator.name AS creator_name,
              COALESCE(i.site_id, insp.site_id) AS site_id
       FROM actions a
       LEFT JOIN users u_assignee ON u_assignee.id = a.assigned_to
       LEFT JOIN users u_creator ON u_creator.id = a.created_by
       LEFT JOIN incidents i ON a.source_type = 'incident' AND a.source_id = i.id
       LEFT JOIN inspections insp ON a.source_type = 'inspection' AND a.source_id = insp.id
       WHERE a.id = $1`,
      [id]
    );

    if (result.rowCount === 0) {
      return next(new AppError('Action not found', 404, 'NOT_FOUND'));
    }

    const row = result.rows[0];

    // RBAC: Workers can only view actions assigned to them
    if (req.user.role === 'worker' && row.assigned_to !== req.user.id) {
      return next(new AppError('Not allowed to view this action', 403, 'FORBIDDEN'));
    }

    return res.json(mapActionRow(row));
  } catch (err) {
    return next(err);
  }
});

// POST /api/actions - Create a new action (manager/admin only)
router.post('/', requireManager, async (req, res, next) => {
  const { title, description, sourceType, sourceId, linkedResponseId, assignedToId, dueDate } = req.body || {};

  // Validation
  if (!title || title.trim().length === 0) {
    return next(new AppError('Title is required', 400, 'VALIDATION_ERROR'));
  }
  if (title.length > 255) {
    return next(new AppError('Title must be at most 255 characters', 400, 'VALIDATION_ERROR'));
  }
  if (description && description.length > 5000) {
    return next(new AppError('Description must be at most 5000 characters', 400, 'VALIDATION_ERROR'));
  }
  if (!sourceType || !allowedSourceTypes.has(sourceType)) {
    return next(new AppError('Invalid source type', 400, 'VALIDATION_ERROR'));
  }
  if (!sourceId) {
    return next(new AppError('Source ID is required', 400, 'VALIDATION_ERROR'));
  }
  if (!assignedToId) {
    return next(new AppError('Assigned user is required', 400, 'VALIDATION_ERROR'));
  }

  // Validate due date
  let parsedDueDate = null;
  if (dueDate) {
    parsedDueDate = parseDate(dueDate);
    if (!parsedDueDate) {
      return next(new AppError('Invalid due date', 400, 'VALIDATION_ERROR'));
    }
    // Due date cannot be in the past
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (parsedDueDate < today) {
      return next(new AppError('Due date cannot be in the past', 400, 'VALIDATION_ERROR'));
    }
  }

  try {
    // Verify source exists
    if (sourceType === 'incident') {
      const incidentCheck = await query('SELECT id FROM incidents WHERE id = $1', [sourceId]);
      if (incidentCheck.rowCount === 0) {
        return next(new AppError('Source incident not found', 400, 'INVALID_SOURCE'));
      }
    } else {
      const inspectionCheck = await query('SELECT id FROM inspections WHERE id = $1', [sourceId]);
      if (inspectionCheck.rowCount === 0) {
        return next(new AppError('Source inspection not found', 400, 'INVALID_SOURCE'));
      }
    }

    // Verify linkedResponseId if provided (only valid for inspection source)
    if (linkedResponseId) {
      if (sourceType !== 'inspection') {
        return next(new AppError('Linked response ID is only valid for inspection actions', 400, 'VALIDATION_ERROR'));
      }
      const responseCheck = await query(
        'SELECT id FROM inspection_responses WHERE id = $1 AND inspection_id = $2',
        [linkedResponseId, sourceId]
      );
      if (responseCheck.rowCount === 0) {
        return next(new AppError('Linked response not found or does not belong to this inspection', 400, 'VALIDATION_ERROR'));
      }
    }

    // Verify assignee exists and get their details for notification
    const userCheck = await query('SELECT id, name, email, organisation_id FROM users WHERE id = $1', [assignedToId]);
    if (userCheck.rowCount === 0) {
      return next(new AppError('Assigned user not found', 400, 'VALIDATION_ERROR'));
    }

    // Create action with audit log in transaction
    const action = await withTransaction(async (client) => {
      const insert = await client.query(
        `INSERT INTO actions (title, description, source_type, source_id, linked_response_id, assigned_to, created_by, due_date)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         RETURNING id, title, description, source_type, source_id, linked_response_id, assigned_to, created_by, due_date, status, created_at, updated_at`,
        [title.trim(), description || null, sourceType, sourceId, linkedResponseId || null, assignedToId, req.user.id, parsedDueDate]
      );

      const row = insert.rows[0];

      // Record audit log
      await recordAudit({
        eventType: 'created',
        entityType: 'action',
        entityId: row.id,
        userId: req.user.id,
        newValue: { title: row.title, status: row.status, assignedTo: assignedToId }
      }, client);

      return row;
    });

    const assignee = splitName(userCheck.rows[0].name);
    const creator = splitName(req.user.name);

    // Get site ID from source
    let siteId = null;
    if (sourceType === 'incident') {
      const siteResult = await query('SELECT site_id FROM incidents WHERE id = $1', [sourceId]);
      siteId = siteResult.rows[0]?.site_id;
    } else {
      const siteResult = await query('SELECT site_id FROM inspections WHERE id = $1', [sourceId]);
      siteId = siteResult.rows[0]?.site_id;
    }

    const responseData = {
      id: action.id,
      title: action.title,
      description: action.description,
      sourceType: action.source_type,
      sourceId: action.source_id,
      siteId,
      linkedResponseId: action.linked_response_id,
      assignedTo: {
        id: assignedToId,
        firstName: assignee.firstName,
        lastName: assignee.lastName
      },
      createdBy: {
        id: req.user.id,
        firstName: creator.firstName,
        lastName: creator.lastName
      },
      dueDate: action.due_date ? action.due_date.toISOString().split('T')[0] : null,
      status: action.status,
      createdAt: toIso(action.created_at),
      updatedAt: toIso(action.updated_at)
    };

    // Phase 4: Trigger notification for action assignment (async, don't block response)
    const assigneeUser = userCheck.rows[0];
    setImmediate(() => {
      notificationTriggers.onActionAssigned(
        {
          id: action.id,
          title: action.title,
          dueDate: responseData.dueDate,
          sourceType: action.source_type,
          sourceId: action.source_id
        },
        {
          id: assigneeUser.id,
          name: assigneeUser.name,
          email: assigneeUser.email,
          organisationId: assigneeUser.organisation_id
        },
        { id: req.user.id, name: req.user.name }
      ).catch(err => console.error('[Actions] Notification trigger error:', err.message));
    });

    return res.status(201).json(responseData);
  } catch (err) {
    return next(err);
  }
});

// PUT /api/actions/:id - Update an action
router.put('/:id', async (req, res, next) => {
  const { id } = req.params;
  const { status, title, description, assignedToId, dueDate } = req.body || {};

  try {
    // Get existing action with creator details
    const existing = await query(
      `SELECT a.id, a.title, a.description, a.assigned_to, a.status, a.due_date, a.source_type, a.source_id, a.created_by, a.organisation_id,
              u.name as creator_name, u.email as creator_email
       FROM actions a
       LEFT JOIN users u ON u.id = a.created_by
       WHERE a.id = $1`,
      [id]
    );

    if (existing.rowCount === 0) {
      return next(new AppError('Action not found', 404, 'NOT_FOUND'));
    }

    const action = existing.rows[0];

    // RBAC: Workers can only update status of actions assigned to them
    if (req.user.role === 'worker') {
      if (action.assigned_to !== req.user.id) {
        return next(new AppError('Not permitted to update this action', 403, 'FORBIDDEN'));
      }
      // Workers can only change status
      if (title !== undefined || description !== undefined || assignedToId !== undefined || dueDate !== undefined) {
        return next(new AppError('Workers can only update action status', 403, 'FORBIDDEN'));
      }
    }

    // Build update
    const updates = [];
    const values = [];
    const oldValues = {};
    const newValues = {};
    let paramIndex = 1;

    if (status !== undefined) {
      if (!allowedStatuses.has(status)) {
        return next(new AppError('Invalid status', 400, 'VALIDATION_ERROR'));
      }
      if (action.status !== status) {
        oldValues.status = action.status;
        newValues.status = status;
      }
      values.push(status);
      updates.push(`status = $${paramIndex++}`);

      // Set completed_at when status becomes done
      if (status === 'done') {
        updates.push(`completed_at = NOW()`);
      } else if (action.status === 'done' && status !== 'done') {
        updates.push(`completed_at = NULL`);
      }
    }

    if (title !== undefined) {
      if (!title || title.trim().length === 0) {
        return next(new AppError('Title is required', 400, 'VALIDATION_ERROR'));
      }
      if (title.length > 255) {
        return next(new AppError('Title must be at most 255 characters', 400, 'VALIDATION_ERROR'));
      }
      values.push(title.trim());
      updates.push(`title = $${paramIndex++}`);
    }

    if (description !== undefined) {
      if (description && description.length > 5000) {
        return next(new AppError('Description must be at most 5000 characters', 400, 'VALIDATION_ERROR'));
      }
      values.push(description || null);
      updates.push(`description = $${paramIndex++}`);
    }

    if (assignedToId !== undefined) {
      // Verify new assignee exists
      const userCheck = await query('SELECT id FROM users WHERE id = $1', [assignedToId]);
      if (userCheck.rowCount === 0) {
        return next(new AppError('Assigned user not found', 400, 'VALIDATION_ERROR'));
      }
      if (action.assigned_to !== assignedToId) {
        oldValues.assignedTo = action.assigned_to;
        newValues.assignedTo = assignedToId;
      }
      values.push(assignedToId);
      updates.push(`assigned_to = $${paramIndex++}`);
    }

    if (dueDate !== undefined) {
      let parsedDueDate = null;
      if (dueDate) {
        parsedDueDate = parseDate(dueDate);
        if (!parsedDueDate) {
          return next(new AppError('Invalid due date', 400, 'VALIDATION_ERROR'));
        }
      }
      values.push(parsedDueDate);
      updates.push(`due_date = $${paramIndex++}`);
    }

    if (updates.length === 0) {
      return next(new AppError('No updates provided', 400, 'VALIDATION_ERROR'));
    }

    // Execute update with audit log
    values.push(id);
    const result = await withTransaction(async (client) => {
      const updateResult = await client.query(
        `UPDATE actions SET ${updates.join(', ')}, updated_at = NOW()
         WHERE id = $${paramIndex}
         RETURNING id, status, updated_at`,
        values
      );

      // Record audit if status changed
      if (Object.keys(oldValues).length > 0) {
        const eventType = oldValues.status !== undefined ? 'status_changed' : 'updated';
        await recordAudit({
          eventType,
          entityType: 'action',
          entityId: id,
          userId: req.user.id,
          oldValue: oldValues,
          newValue: newValues
        }, client);
      }

      return updateResult.rows[0];
    });

    // Phase 4: Trigger notification on status change (async)
    if (oldValues.status !== undefined && newValues.status === 'done') {
      setImmediate(() => {
        notificationTriggers.onActionStatusChanged(
          { id: action.id, title: action.title },
          oldValues.status,
          newValues.status,
          {
            id: action.created_by,
            name: action.creator_name,
            email: action.creator_email,
            organisationId: action.organisation_id
          },
          { id: req.user.id, name: req.user.name }
        ).catch(err => console.error('[Actions] Status notification error:', err.message));
      });
    }

    // Phase 4: Trigger notification when action is reassigned
    if (oldValues.assignedTo !== undefined && newValues.assignedTo) {
      setImmediate(async () => {
        try {
          const newAssignee = await query(
            'SELECT id, name, email, organisation_id FROM users WHERE id = $1',
            [newValues.assignedTo]
          );
          if (newAssignee.rowCount > 0) {
            const assignee = newAssignee.rows[0];
            await notificationTriggers.onActionAssigned(
              { id: action.id, title: action.title, dueDate: action.due_date?.toISOString()?.split('T')[0] },
              { id: assignee.id, name: assignee.name, email: assignee.email, organisationId: assignee.organisation_id },
              { id: req.user.id, name: req.user.name }
            );
          }
        } catch (err) {
          console.error('[Actions] Reassignment notification error:', err.message);
        }
      });
    }

    return res.json({
      id: result.id,
      status: result.status,
      updatedAt: toIso(result.updated_at)
    });
  } catch (err) {
    return next(err);
  }
});

// GET /api/actions/:id/audit-log - Get action audit history
router.get('/:id/audit-log', async (req, res, next) => {
  const { id } = req.params;

  try {
    // Verify action exists and user has access
    const actionCheck = await query('SELECT id, assigned_to FROM actions WHERE id = $1', [id]);
    if (actionCheck.rowCount === 0) {
      return next(new AppError('Action not found', 404, 'NOT_FOUND'));
    }

    // RBAC: Workers can only view audit log for actions assigned to them
    if (req.user.role === 'worker' && actionCheck.rows[0].assigned_to !== req.user.id) {
      return next(new AppError('Not allowed to view this action', 403, 'FORBIDDEN'));
    }

    const result = await query(
      `SELECT id, event_type, entity_type, entity_id, user_id, occurred_at, old_value, new_value, metadata
       FROM audit_log
       WHERE entity_type = 'action' AND entity_id = $1
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

module.exports = router;

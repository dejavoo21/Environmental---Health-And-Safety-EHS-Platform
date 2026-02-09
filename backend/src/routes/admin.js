/**
 * Admin Routes - Phase 4
 * Handles job management, email logs, and organisation settings for notifications
 */

const express = require('express');
const { query } = require('../config/db');
const { AppError } = require('../utils/appError');
const { requireAdmin } = require('../middleware/requireRole');
const emailService = require('../services/emailService');

const router = express.Router();

// All admin routes require admin role
router.use(requireAdmin);

/**
 * GET /api/admin/jobs/runs
 * View scheduled job execution history
 */
router.get('/jobs/runs', async (req, res, next) => {
  try {
    const { jobName, status, limit = '20' } = req.query;
    const conditions = ['organisation_id = $1 OR organisation_id IS NULL'];
    const values = [req.user.organisationId];
    let paramIndex = 2;

    if (jobName) {
      conditions.push(`job_name = $${paramIndex++}`);
      values.push(jobName);
    }

    if (status) {
      conditions.push(`status = $${paramIndex++}`);
      values.push(status);
    }

    const effectiveLimit = Math.min(parseInt(limit, 10) || 20, 100);
    values.push(effectiveLimit);

    const result = await query(
      `SELECT id, job_name, organisation_id, status, started_at, completed_at,
              items_processed, items_succeeded, items_failed, error_message, metadata
       FROM scheduled_job_runs
       WHERE ${conditions.join(' AND ')}
       ORDER BY started_at DESC
       LIMIT $${paramIndex}`,
      values
    );

    const runs = result.rows.map(row => ({
      id: row.id,
      jobName: row.job_name,
      organisationId: row.organisation_id,
      status: row.status,
      startedAt: row.started_at?.toISOString() || null,
      completedAt: row.completed_at?.toISOString() || null,
      itemsProcessed: row.items_processed,
      itemsSucceeded: row.items_succeeded,
      itemsFailed: row.items_failed,
      errorMessage: row.error_message,
      metadata: row.metadata
    }));

    return res.json({
      success: true,
      data: { runs }
    });
  } catch (err) {
    return next(err);
  }
});

/**
 * POST /api/admin/jobs/digest/trigger
 * Manually trigger a digest job
 */
router.post('/jobs/digest/trigger', async (req, res, next) => {
  try {
    const { type, userId } = req.body || {};

    if (!type || !['daily', 'weekly'].includes(type)) {
      return next(new AppError('type must be daily or weekly', 400, 'VALIDATION_ERROR'));
    }

    // Create job run record
    const jobResult = await query(
      `INSERT INTO scheduled_job_runs (job_name, organisation_id, status, metadata)
       VALUES ($1, $2, 'running', $3)
       RETURNING id`,
      [`${type}_digest_manual`, req.user.organisationId, { triggeredBy: req.user.id, targetUserId: userId || null }]
    );

    const jobRunId = jobResult.rows[0].id;

    // Import and run the digest job asynchronously
    // We'll return immediately and let the job run in the background
    setImmediate(async () => {
      try {
        const digestJob = require('../jobs/digestJob');
        await digestJob.runDigest(type, req.user.organisationId, userId || null);

        await query(
          `UPDATE scheduled_job_runs
           SET status = 'completed', completed_at = NOW()
           WHERE id = $1`,
          [jobRunId]
        );
      } catch (error) {
        await query(
          `UPDATE scheduled_job_runs
           SET status = 'failed', completed_at = NOW(), error_message = $1
           WHERE id = $2`,
          [error.message, jobRunId]
        );
      }
    });

    return res.json({
      success: true,
      data: {
        jobRunId,
        status: 'running',
        message: 'Digest job triggered'
      }
    });
  } catch (err) {
    return next(err);
  }
});

/**
 * PUT /api/admin/organisation/escalation
 * Update organisation escalation settings
 */
router.put('/organisation/escalation', async (req, res, next) => {
  try {
    const { enabled, daysOverdue, notifyManagers, customEmail } = req.body || {};

    // Validation
    if (enabled !== undefined && typeof enabled !== 'boolean') {
      return next(new AppError('enabled must be a boolean', 400, 'VALIDATION_ERROR'));
    }

    if (daysOverdue !== undefined) {
      const days = parseInt(daysOverdue, 10);
      if (isNaN(days) || days < 1 || days > 30) {
        return next(new AppError('daysOverdue must be between 1 and 30', 400, 'VALIDATION_ERROR'));
      }
    }

    if (notifyManagers !== undefined && typeof notifyManagers !== 'boolean') {
      return next(new AppError('notifyManagers must be a boolean', 400, 'VALIDATION_ERROR'));
    }

    if (customEmail !== undefined && customEmail !== null) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(customEmail)) {
        return next(new AppError('customEmail must be a valid email address', 400, 'VALIDATION_ERROR'));
      }
    }

    // Get current settings
    const orgResult = await query(
      'SELECT settings FROM organisations WHERE id = $1',
      [req.user.organisationId]
    );

    if (orgResult.rowCount === 0) {
      return next(new AppError('Organisation not found', 404, 'NOT_FOUND'));
    }

    const currentSettings = orgResult.rows[0].settings || {};
    const currentEscalation = currentSettings.escalation || {
      enabled: true,
      daysOverdue: 3,
      notifyManagers: true,
      customEmail: null
    };

    // Merge updates
    const newEscalation = {
      enabled: enabled !== undefined ? enabled : currentEscalation.enabled,
      daysOverdue: daysOverdue !== undefined ? parseInt(daysOverdue, 10) : currentEscalation.daysOverdue,
      notifyManagers: notifyManagers !== undefined ? notifyManagers : currentEscalation.notifyManagers,
      customEmail: customEmail !== undefined ? customEmail : currentEscalation.customEmail
    };

    const newSettings = {
      ...currentSettings,
      escalation: newEscalation
    };

    // Update settings
    await query(
      'UPDATE organisations SET settings = $1, updated_at = NOW() WHERE id = $2',
      [newSettings, req.user.organisationId]
    );

    return res.json({
      success: true,
      data: {
        escalation: newEscalation
      }
    });
  } catch (err) {
    return next(err);
  }
});

/**
 * GET /api/admin/organisation/escalation
 * Get organisation escalation settings
 */
router.get('/organisation/escalation', async (req, res, next) => {
  try {
    const result = await query(
      'SELECT settings FROM organisations WHERE id = $1',
      [req.user.organisationId]
    );

    if (result.rowCount === 0) {
      return next(new AppError('Organisation not found', 404, 'NOT_FOUND'));
    }

    const settings = result.rows[0].settings || {};
    const escalation = settings.escalation || {
      enabled: true,
      daysOverdue: 3,
      notifyManagers: true,
      customEmail: null
    };

    return res.json({
      success: true,
      data: { escalation }
    });
  } catch (err) {
    return next(err);
  }
});

/**
 * GET /api/admin/email-logs
 * View email send history
 */
router.get('/email-logs', async (req, res, next) => {
  try {
    const { status, type, limit = '50' } = req.query;

    const logs = await emailService.getEmailLogs(
      req.user.organisationId,
      {
        status: status || undefined,
        emailType: type || undefined,
        limit: parseInt(limit, 10) || 50
      }
    );

    return res.json({
      success: true,
      data: { logs }
    });
  } catch (err) {
    return next(err);
  }
});

module.exports = router;

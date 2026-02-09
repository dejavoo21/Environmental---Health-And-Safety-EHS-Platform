/**
 * Escalation Job - Phase 4
 * Checks for overdue actions and sends escalation notifications
 */

const { query, withTransaction } = require('../config/db');
const notificationService = require('../services/notificationService');
const emailService = require('../services/emailService');
const { recordAudit } = require('../utils/audit');
const env = require('../config/env');

/**
 * Get overdue actions that need escalation for an organisation
 * @param {string} organisationId - Organisation ID
 * @param {number} daysOverdue - Threshold days overdue
 * @returns {Promise<Object[]>} - Overdue actions
 */
const getOverdueActionsForEscalation = async (organisationId, daysOverdue) => {
  const result = await query(
    `SELECT a.id, a.title, a.due_date, a.assigned_to, a.created_by,
            a.source_type, a.source_id,
            u_assignee.name as assignee_name, u_assignee.email as assignee_email,
            u_creator.name as creator_name, u_creator.email as creator_email,
            CURRENT_DATE - a.due_date as days_overdue
     FROM actions a
     LEFT JOIN users u_assignee ON u_assignee.id = a.assigned_to
     LEFT JOIN users u_creator ON u_creator.id = a.created_by
     WHERE a.organisation_id = $1
       AND a.status NOT IN ('done')
       AND a.due_date IS NOT NULL
       AND CURRENT_DATE - a.due_date >= $2
       AND a.escalated_at IS NULL
     ORDER BY a.due_date ASC`,
    [organisationId, daysOverdue]
  );

  return result.rows.map(row => ({
    id: row.id,
    title: row.title,
    dueDate: row.due_date?.toISOString()?.split('T')[0],
    assignedTo: row.assigned_to,
    assigneeName: row.assignee_name,
    assigneeEmail: row.assignee_email,
    createdBy: row.created_by,
    creatorName: row.creator_name,
    creatorEmail: row.creator_email,
    sourceType: row.source_type,
    sourceId: row.source_id,
    daysOverdue: row.days_overdue
  }));
};

/**
 * Get managers/admins for an organisation
 * @param {string} organisationId - Organisation ID
 * @returns {Promise<Object[]>} - Managers and admins
 */
const getOrgManagers = async (organisationId) => {
  const result = await query(
    `SELECT id, name, email, role
     FROM users
     WHERE organisation_id = $1
       AND role IN ('admin', 'manager')
       AND is_active = TRUE`,
    [organisationId]
  );

  return result.rows.map(row => ({
    userId: row.id,
    name: row.name,
    email: row.email,
    role: row.role
  }));
};

/**
 * Process escalation for a single action
 * @param {Object} action - Action to escalate
 * @param {string} organisationId - Organisation ID
 * @param {Object} orgSettings - Organisation escalation settings
 * @returns {Promise<Object>} - Escalation result
 */
const escalateAction = async (action, organisationId, orgSettings) => {
  const result = {
    actionId: action.id,
    notificationsCreated: 0,
    emailsSent: 0,
    emailsFailed: 0
  };

  // Collect recipients
  const recipients = [];

  // Add assignee
  if (action.assigneeEmail) {
    recipients.push({
      userId: action.assignedTo,
      email: action.assigneeEmail,
      name: action.assigneeName
    });
  }

  // Add managers if enabled
  if (orgSettings.notifyManagers) {
    const managers = await getOrgManagers(organisationId);
    for (const manager of managers) {
      if (!recipients.find(r => r.email === manager.email)) {
        recipients.push(manager);
      }
    }
  }

  // Add custom email if configured
  if (orgSettings.customEmail) {
    if (!recipients.find(r => r.email === orgSettings.customEmail)) {
      recipients.push({
        userId: null,
        email: orgSettings.customEmail,
        name: 'Escalation Contact'
      });
    }
  }

  // Create notifications for internal users
  for (const recipient of recipients) {
    if (recipient.userId) {
      try {
        await notificationService.createNotification({
          userId: recipient.userId,
          organisationId,
          type: 'action_escalated',
          priority: 'high',
          title: 'Action Escalated: Overdue',
          message: `Action "${action.title}" is ${action.daysOverdue} days overdue and requires immediate attention.`,
          relatedType: 'action',
          relatedId: action.id,
          metadata: {
            actionTitle: action.title,
            dueDate: action.dueDate,
            daysOverdue: action.daysOverdue,
            assigneeName: action.assigneeName
          }
        });
        result.notificationsCreated++;
      } catch (error) {
        console.error(`Failed to create escalation notification for ${recipient.userId}:`, error.message);
      }
    }
  }

  // Send escalation emails
  const emailResults = await emailService.sendEscalationEmail(action, recipients, organisationId);
  for (const emailResult of emailResults) {
    if (emailResult.success) {
      result.emailsSent++;
    } else {
      result.emailsFailed++;
    }
  }

  // Mark action as escalated
  await query(
    'UPDATE actions SET escalated_at = NOW() WHERE id = $1',
    [action.id]
  );

  // Record audit log
  await recordAudit({
    eventType: 'status_changed',
    entityType: 'action',
    entityId: action.id,
    userId: null, // System action
    oldValue: { escalated: false },
    newValue: { escalated: true, escalatedAt: new Date().toISOString() },
    metadata: { trigger: 'escalation_job', daysOverdue: action.daysOverdue }
  });

  return result;
};

/**
 * Run the escalation job
 * @returns {Promise<Object>} - Job results
 */
const runEscalation = async () => {
  console.log('[EscalationJob] Starting escalation check...');

  // Create job run record
  const jobResult = await query(
    `INSERT INTO scheduled_job_runs (job_name, status)
     VALUES ('escalation_check', 'running')
     RETURNING id`
  );
  const jobRunId = jobResult.rows[0].id;

  const results = {
    organisationsProcessed: 0,
    actionsEscalated: 0,
    notificationsCreated: 0,
    emailsSent: 0,
    emailsFailed: 0,
    errors: []
  };

  try {
    // Get all active organisations with their settings
    const orgsResult = await query(
      `SELECT id, settings FROM organisations WHERE is_active = TRUE`
    );

    for (const org of orgsResult.rows) {
      results.organisationsProcessed++;

      const orgSettings = org.settings?.escalation || {
        enabled: true,
        daysOverdue: env.escalationDefaultDays,
        notifyManagers: true,
        customEmail: null
      };

      // Skip if escalation is disabled for this org
      if (!orgSettings.enabled) {
        continue;
      }

      try {
        // Get overdue actions
        const overdueActions = await getOverdueActionsForEscalation(
          org.id,
          orgSettings.daysOverdue
        );

        // Process each action
        for (const action of overdueActions) {
          try {
            const actionResult = await escalateAction(action, org.id, orgSettings);
            results.actionsEscalated++;
            results.notificationsCreated += actionResult.notificationsCreated;
            results.emailsSent += actionResult.emailsSent;
            results.emailsFailed += actionResult.emailsFailed;
          } catch (error) {
            results.errors.push(`Action ${action.id}: ${error.message}`);
          }
        }
      } catch (error) {
        results.errors.push(`Org ${org.id}: ${error.message}`);
      }
    }

    // Update job run
    await query(
      `UPDATE scheduled_job_runs
       SET status = 'completed', completed_at = NOW(),
           items_processed = $1, items_succeeded = $2, items_failed = $3,
           metadata = $4
       WHERE id = $5`,
      [
        results.actionsEscalated,
        results.actionsEscalated - results.errors.length,
        results.errors.length,
        {
          organisationsProcessed: results.organisationsProcessed,
          notificationsCreated: results.notificationsCreated,
          emailsSent: results.emailsSent,
          emailsFailed: results.emailsFailed,
          errors: results.errors.slice(0, 10) // Limit error messages
        },
        jobRunId
      ]
    );

    console.log('[EscalationJob] Escalation check completed:', results);
    return results;
  } catch (error) {
    await query(
      `UPDATE scheduled_job_runs
       SET status = 'failed', completed_at = NOW(), error_message = $1
       WHERE id = $2`,
      [error.message, jobRunId]
    );
    console.error('[EscalationJob] Escalation check failed:', error.message);
    throw error;
  }
};

module.exports = {
  runEscalation,
  getOverdueActionsForEscalation,
  escalateAction
};

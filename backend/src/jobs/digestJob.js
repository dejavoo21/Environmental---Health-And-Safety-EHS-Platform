/**
 * Digest Job - Phase 4
 * Generates and sends daily/weekly digest emails
 */

const { query } = require('../config/db');
const preferencesService = require('../services/preferencesService');
const emailService = require('../services/emailService');

/**
 * Get digest data for a user
 * @param {string} userId - User ID
 * @param {string} organisationId - Organisation ID
 * @param {string} digestType - 'daily' or 'weekly'
 * @returns {Promise<Object>} - Digest data
 */
const getDigestData = async (userId, organisationId, digestType) => {
  const daysBack = digestType === 'daily' ? 1 : 7;
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - daysBack);

  // Get new incidents
  const incidentsResult = await query(
    `SELECT i.id, i.title, i.severity, i.occurred_at, s.name as site_name
     FROM incidents i
     JOIN sites s ON s.id = i.site_id
     WHERE i.organisation_id = $1
       AND i.created_at >= $2
     ORDER BY i.occurred_at DESC
     LIMIT 20`,
    [organisationId, cutoffDate]
  );

  const newIncidents = incidentsResult.rows.map(row => ({
    id: row.id,
    title: row.title,
    severity: row.severity,
    siteName: row.site_name,
    occurredAt: row.occurred_at?.toISOString()
  }));

  // Get actions due soon (next 7 days)
  const dueSoonDate = new Date();
  dueSoonDate.setDate(dueSoonDate.getDate() + 7);

  const actionsDueResult = await query(
    `SELECT a.id, a.title, a.due_date, u.name as assignee_name
     FROM actions a
     LEFT JOIN users u ON u.id = a.assigned_to
     WHERE a.organisation_id = $1
       AND a.status NOT IN ('done', 'overdue')
       AND a.due_date IS NOT NULL
       AND a.due_date <= $2
       AND a.due_date >= CURRENT_DATE
     ORDER BY a.due_date ASC
     LIMIT 20`,
    [organisationId, dueSoonDate]
  );

  const actionsDueSoon = actionsDueResult.rows.map(row => ({
    id: row.id,
    title: row.title,
    dueDate: row.due_date?.toISOString()?.split('T')[0],
    assigneeName: row.assignee_name
  }));

  // Get overdue actions
  const overdueResult = await query(
    `SELECT a.id, a.title, a.due_date, u.name as assignee_name,
            CURRENT_DATE - a.due_date as days_overdue
     FROM actions a
     LEFT JOIN users u ON u.id = a.assigned_to
     WHERE a.organisation_id = $1
       AND a.status NOT IN ('done')
       AND a.due_date IS NOT NULL
       AND a.due_date < CURRENT_DATE
     ORDER BY a.due_date ASC
     LIMIT 20`,
    [organisationId]
  );

  const overdueActions = overdueResult.rows.map(row => ({
    id: row.id,
    title: row.title,
    dueDate: row.due_date?.toISOString()?.split('T')[0],
    assigneeName: row.assignee_name,
    daysOverdue: row.days_overdue
  }));

  return {
    newIncidents,
    actionsDueSoon,
    overdueActions,
    isEmpty: newIncidents.length === 0 && actionsDueSoon.length === 0 && overdueActions.length === 0
  };
};

/**
 * Run the digest job for a specific type
 * @param {string} digestType - 'daily' or 'weekly'
 * @param {string} [organisationId] - Optional org ID to limit scope
 * @param {string} [targetUserId] - Optional specific user to send to
 * @returns {Promise<Object>} - Job results
 */
const runDigest = async (digestType, organisationId = null, targetUserId = null) => {
  const results = {
    processed: 0,
    succeeded: 0,
    failed: 0,
    skipped: 0
  };

  // Get users with this digest preference
  let users = await preferencesService.getUsersByDigestFrequency(digestType, organisationId);

  // Filter to specific user if provided
  if (targetUserId) {
    users = users.filter(u => u.userId === targetUserId);
  }

  for (const user of users) {
    results.processed++;

    try {
      // Get digest data
      const digestData = await getDigestData(user.userId, user.organisationId, digestType);

      // Skip if no content
      if (digestData.isEmpty) {
        results.skipped++;
        continue;
      }

      // Send digest email
      const emailResult = await emailService.sendDigestEmail(
        {
          id: user.userId,
          email: user.email,
          name: user.name,
          organisationId: user.organisationId
        },
        digestData,
        digestType
      );

      if (emailResult.success) {
        results.succeeded++;
      } else {
        results.failed++;
      }
    } catch (error) {
      results.failed++;
      console.error(`Digest error for user ${user.userId}:`, error.message);
    }
  }

  return results;
};

/**
 * Run daily digest job
 * @returns {Promise<Object>} - Job results
 */
const runDailyDigest = async () => {
  console.log('[DigestJob] Starting daily digest...');
  const startedAt = new Date();

  // Create job run record
  const jobResult = await query(
    `INSERT INTO scheduled_job_runs (job_name, status)
     VALUES ('daily_digest', 'running')
     RETURNING id`
  );
  const jobRunId = jobResult.rows[0].id;

  try {
    const results = await runDigest('daily');

    // Update job run
    await query(
      `UPDATE scheduled_job_runs
       SET status = 'completed', completed_at = NOW(),
           items_processed = $1, items_succeeded = $2, items_failed = $3,
           metadata = $4
       WHERE id = $5`,
      [results.processed, results.succeeded, results.failed,
       { skipped: results.skipped }, jobRunId]
    );

    console.log(`[DigestJob] Daily digest completed:`, results);
    return results;
  } catch (error) {
    await query(
      `UPDATE scheduled_job_runs
       SET status = 'failed', completed_at = NOW(), error_message = $1
       WHERE id = $2`,
      [error.message, jobRunId]
    );
    console.error('[DigestJob] Daily digest failed:', error.message);
    throw error;
  }
};

/**
 * Run weekly digest job
 * @returns {Promise<Object>} - Job results
 */
const runWeeklyDigest = async () => {
  console.log('[DigestJob] Starting weekly digest...');

  // Create job run record
  const jobResult = await query(
    `INSERT INTO scheduled_job_runs (job_name, status)
     VALUES ('weekly_digest', 'running')
     RETURNING id`
  );
  const jobRunId = jobResult.rows[0].id;

  try {
    const results = await runDigest('weekly');

    // Update job run
    await query(
      `UPDATE scheduled_job_runs
       SET status = 'completed', completed_at = NOW(),
           items_processed = $1, items_succeeded = $2, items_failed = $3,
           metadata = $4
       WHERE id = $5`,
      [results.processed, results.succeeded, results.failed,
       { skipped: results.skipped }, jobRunId]
    );

    console.log(`[DigestJob] Weekly digest completed:`, results);
    return results;
  } catch (error) {
    await query(
      `UPDATE scheduled_job_runs
       SET status = 'failed', completed_at = NOW(), error_message = $1
       WHERE id = $2`,
      [error.message, jobRunId]
    );
    console.error('[DigestJob] Weekly digest failed:', error.message);
    throw error;
  }
};

module.exports = {
  runDigest,
  runDailyDigest,
  runWeeklyDigest,
  getDigestData
};

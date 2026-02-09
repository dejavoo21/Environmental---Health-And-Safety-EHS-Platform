/**
 * Cleanup Job - Phase 4
 * Deletes expired notifications, old email logs, and old job runs
 */

const { query } = require('../config/db');

/**
 * Run the cleanup job
 * @returns {Promise<Object>} - Cleanup results
 */
const runCleanup = async () => {
  console.log('[CleanupJob] Starting cleanup...');

  // Create job run record
  const jobResult = await query(
    `INSERT INTO scheduled_job_runs (job_name, status)
     VALUES ('cleanup', 'running')
     RETURNING id`
  );
  const jobRunId = jobResult.rows[0].id;

  const results = {
    notificationsDeleted: 0,
    emailLogsDeleted: 0,
    jobRunsDeleted: 0
  };

  try {
    // Delete expired notifications
    const notifResult = await query(
      `DELETE FROM notifications
       WHERE expires_at IS NOT NULL AND expires_at < NOW()`
    );
    results.notificationsDeleted = notifResult.rowCount;

    // Delete old email logs (older than 365 days)
    const emailResult = await query(
      `DELETE FROM email_logs
       WHERE created_at < NOW() - INTERVAL '365 days'`
    );
    results.emailLogsDeleted = emailResult.rowCount;

    // Delete old job runs (older than 30 days)
    const jobsResult = await query(
      `DELETE FROM scheduled_job_runs
       WHERE started_at < NOW() - INTERVAL '30 days'
         AND id != $1`,
      [jobRunId]
    );
    results.jobRunsDeleted = jobsResult.rowCount;

    // Update job run
    await query(
      `UPDATE scheduled_job_runs
       SET status = 'completed', completed_at = NOW(),
           items_processed = $1, items_succeeded = $1,
           metadata = $2
       WHERE id = $3`,
      [
        results.notificationsDeleted + results.emailLogsDeleted + results.jobRunsDeleted,
        results,
        jobRunId
      ]
    );

    console.log('[CleanupJob] Cleanup completed:', results);
    return results;
  } catch (error) {
    await query(
      `UPDATE scheduled_job_runs
       SET status = 'failed', completed_at = NOW(), error_message = $1
       WHERE id = $2`,
      [error.message, jobRunId]
    );
    console.error('[CleanupJob] Cleanup failed:', error.message);
    throw error;
  }
};

module.exports = {
  runCleanup
};

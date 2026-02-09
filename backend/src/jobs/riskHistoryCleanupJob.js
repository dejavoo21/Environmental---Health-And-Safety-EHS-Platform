/**
 * Risk History Cleanup Job - Phase 5
 * Runs monthly to clean up old risk score history
 */

const db = require('../config/db');
const { cleanupOldHistory } = require('../services/riskScoreService');
const env = require('../config/env');

/**
 * Run the risk history cleanup job
 * @returns {Promise<Object>} - Job result
 */
const runRiskHistoryCleanup = async () => {
  const startTime = Date.now();
  let jobRunId = null;

  try {
    const retentionDays = env.riskHistoryRetentionDays || 365;
    console.log(`[RiskHistoryCleanupJob] Starting cleanup (retention: ${retentionDays} days)...`);

    // Record job start
    const jobStart = await db.query(
      `INSERT INTO scheduled_job_runs (job_name, status, started_at)
       VALUES ('risk_history_cleanup', 'running', NOW())
       RETURNING id`
    );
    jobRunId = jobStart.rows[0].id;

    // Run cleanup
    const deletedCount = await cleanupOldHistory(retentionDays);

    const duration = Date.now() - startTime;

    // Update job as completed
    await db.query(
      `UPDATE scheduled_job_runs
       SET status = 'completed',
           completed_at = NOW(),
           items_processed = $2,
           items_succeeded = $2,
           items_failed = 0,
           metadata = $3
       WHERE id = $1`,
      [
        jobRunId,
        deletedCount,
        JSON.stringify({ duration, retentionDays })
      ]
    );

    console.log(`[RiskHistoryCleanupJob] Completed in ${duration}ms - ${deletedCount} records deleted`);

    return { deletedCount };
  } catch (error) {
    console.error('[RiskHistoryCleanupJob] Failed:', error.message);

    // Update job as failed
    if (jobRunId) {
      await db.query(
        `UPDATE scheduled_job_runs
         SET status = 'failed',
             completed_at = NOW(),
             error_message = $2
         WHERE id = $1`,
        [jobRunId, error.message]
      ).catch(e => console.error('[RiskHistoryCleanupJob] Failed to update job status:', e.message));
    }

    throw error;
  }
};

module.exports = {
  runRiskHistoryCleanup
};

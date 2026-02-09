/**
 * Risk Score Job - Phase 5
 * Runs daily calculation of site risk scores
 */

const db = require('../config/db');
const { calculateAllSiteScores } = require('../services/riskScoreService');

/**
 * Run the risk score calculation job
 * @returns {Promise<Object>} - Job result
 */
const runRiskCalculation = async () => {
  const startTime = Date.now();
  let jobRunId = null;

  try {
    console.log('[RiskScoreJob] Starting daily risk score calculation...');

    // Record job start
    const jobStart = await db.query(
      `INSERT INTO scheduled_job_runs (job_name, status, started_at)
       VALUES ('risk_score_calculation', 'running', NOW())
       RETURNING id`
    );
    jobRunId = jobStart.rows[0].id;

    // Run calculation
    const result = await calculateAllSiteScores();

    const duration = Date.now() - startTime;

    // Update job as completed
    await db.query(
      `UPDATE scheduled_job_runs
       SET status = 'completed',
           completed_at = NOW(),
           items_processed = $2,
           items_succeeded = $3,
           items_failed = $4,
           metadata = $5
       WHERE id = $1`,
      [
        jobRunId,
        result.totalSitesProcessed,
        result.totalSitesProcessed - result.errors.length,
        result.errors.length,
        JSON.stringify({ duration, organisationsProcessed: result.organisationsProcessed, errors: result.errors })
      ]
    );

    console.log(`[RiskScoreJob] Completed in ${duration}ms - ${result.organisationsProcessed} orgs, ${result.totalSitesProcessed} sites`);

    if (result.errors.length > 0) {
      console.warn(`[RiskScoreJob] ${result.errors.length} errors occurred`);
    }

    return result;
  } catch (error) {
    console.error('[RiskScoreJob] Failed:', error.message);

    // Update job as failed
    if (jobRunId) {
      await db.query(
        `UPDATE scheduled_job_runs
         SET status = 'failed',
             completed_at = NOW(),
             error_message = $2
         WHERE id = $1`,
        [jobRunId, error.message]
      ).catch(e => console.error('[RiskScoreJob] Failed to update job status:', e.message));
    }

    throw error;
  }
};

module.exports = {
  runRiskCalculation
};

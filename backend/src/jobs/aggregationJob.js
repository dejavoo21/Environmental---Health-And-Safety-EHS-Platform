/**
 * Aggregation Job - Phase 5
 * Runs daily aggregation of analytics data
 */

const db = require('../config/db');
const { runDailyAggregation } = require('../services/aggregationService');

/**
 * Run the aggregation job
 * @returns {Promise<Object>} - Job result
 */
const runAggregation = async () => {
  const startTime = Date.now();
  let jobRunId = null;

  try {
    console.log('[AggregationJob] Starting daily analytics aggregation...');

    // Record job start
    const jobStart = await db.query(
      `INSERT INTO scheduled_job_runs (job_name, status, started_at)
       VALUES ('analytics_aggregation', 'running', NOW())
       RETURNING id`
    );
    jobRunId = jobStart.rows[0].id;

    // Run aggregation
    const result = await runDailyAggregation();

    const duration = Date.now() - startTime;

    // Update job as completed
    await db.query(
      `UPDATE scheduled_job_runs
       SET status = 'completed',
           completed_at = NOW(),
           items_processed = $2,
           items_succeeded = $2,
           items_failed = $3,
           metadata = $4
       WHERE id = $1`,
      [
        jobRunId,
        result.organisationsProcessed,
        result.errors.length,
        JSON.stringify({ duration, errors: result.errors })
      ]
    );

    console.log(`[AggregationJob] Completed in ${duration}ms - ${result.organisationsProcessed} orgs processed`);

    if (result.errors.length > 0) {
      console.warn(`[AggregationJob] ${result.errors.length} errors occurred`);
    }

    return result;
  } catch (error) {
    console.error('[AggregationJob] Failed:', error.message);

    // Update job as failed
    if (jobRunId) {
      await db.query(
        `UPDATE scheduled_job_runs
         SET status = 'failed',
             completed_at = NOW(),
             error_message = $2
         WHERE id = $1`,
        [jobRunId, error.message]
      ).catch(e => console.error('[AggregationJob] Failed to update job status:', e.message));
    }

    throw error;
  }
};

module.exports = {
  runAggregation
};

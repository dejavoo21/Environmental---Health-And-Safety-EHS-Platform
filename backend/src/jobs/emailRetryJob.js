/**
 * Email Retry Job - Phase 4
 * Retries failed email sends
 */

const { query } = require('../config/db');
const emailService = require('../services/emailService');
const env = require('../config/env');

/**
 * Run the email retry job
 * @returns {Promise<Object>} - Retry results
 */
const runEmailRetry = async () => {
  console.log('[EmailRetryJob] Starting email retry...');

  // Create job run record
  const jobResult = await query(
    `INSERT INTO scheduled_job_runs (job_name, status)
     VALUES ('email_retry', 'running')
     RETURNING id`
  );
  const jobRunId = jobResult.rows[0].id;

  try {
    const results = await emailService.retryFailedEmails(env.emailMaxRetryAttempts);

    // Update job run
    await query(
      `UPDATE scheduled_job_runs
       SET status = 'completed', completed_at = NOW(),
           items_processed = $1, items_succeeded = $2, items_failed = $3
       WHERE id = $4`,
      [
        results.succeeded + results.failed + results.skipped,
        results.succeeded,
        results.failed,
        jobRunId
      ]
    );

    console.log('[EmailRetryJob] Email retry completed:', results);
    return results;
  } catch (error) {
    await query(
      `UPDATE scheduled_job_runs
       SET status = 'failed', completed_at = NOW(), error_message = $1
       WHERE id = $2`,
      [error.message, jobRunId]
    );
    console.error('[EmailRetryJob] Email retry failed:', error.message);
    throw error;
  }
};

module.exports = {
  runEmailRetry
};

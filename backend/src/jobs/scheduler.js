/**
 * Job Scheduler - Phase 4, 5, 8 & 10
 * Initializes and manages scheduled jobs using node-cron
 */

const cron = require('node-cron');
const env = require('../config/env');
const { runDailyDigest, runWeeklyDigest } = require('./digestJob');
const { runEscalation } = require('./escalationJob');
const { runEmailRetry } = require('./emailRetryJob');
const { runCleanup } = require('./cleanupJob');
// Phase 5 jobs
const { runAggregation } = require('./aggregationJob');
const { runRiskCalculation } = require('./riskScoreJob');
const { runRiskHistoryCleanup } = require('./riskHistoryCleanupJob');
// Phase 8 jobs
const { runTrainingExpiryCheck } = require('./trainingExpiryJob');
const { runTrainingReminders } = require('./trainingReminderJob');
const { runTrainingAutoAssignment } = require('./trainingAutoAssignmentJob');
const { runTrainingAnalyticsAggregation } = require('./trainingAnalyticsJob');
// Phase 10 jobs
const webhookJobs = require('./webhookJobs');

let scheduledJobs = [];

/**
 * Initialize all scheduled jobs
 */
const initializeScheduler = () => {
  if (!env.jobsEnabled) {
    console.log('[Scheduler] Jobs are disabled via JOBS_ENABLED=false');
    return;
  }

  console.log('[Scheduler] Initializing scheduled jobs...');

  // Daily digest: default 07:00 UTC
  const dailyDigestJob = cron.schedule(env.cronDailyDigest, async () => {
    try {
      await runDailyDigest();
    } catch (error) {
      console.error('[Scheduler] Daily digest job error:', error.message);
    }
  }, { scheduled: true, timezone: 'UTC' });
  scheduledJobs.push({ name: 'daily_digest', job: dailyDigestJob, schedule: env.cronDailyDigest });
  console.log(`[Scheduler] Daily digest scheduled: ${env.cronDailyDigest}`);

  // Weekly digest: default Monday 07:00 UTC
  const weeklyDigestJob = cron.schedule(env.cronWeeklyDigest, async () => {
    try {
      await runWeeklyDigest();
    } catch (error) {
      console.error('[Scheduler] Weekly digest job error:', error.message);
    }
  }, { scheduled: true, timezone: 'UTC' });
  scheduledJobs.push({ name: 'weekly_digest', job: weeklyDigestJob, schedule: env.cronWeeklyDigest });
  console.log(`[Scheduler] Weekly digest scheduled: ${env.cronWeeklyDigest}`);

  // Escalation check: default 08:00 UTC
  const escalationJob = cron.schedule(env.cronEscalation, async () => {
    try {
      await runEscalation();
    } catch (error) {
      console.error('[Scheduler] Escalation job error:', error.message);
    }
  }, { scheduled: true, timezone: 'UTC' });
  scheduledJobs.push({ name: 'escalation', job: escalationJob, schedule: env.cronEscalation });
  console.log(`[Scheduler] Escalation check scheduled: ${env.cronEscalation}`);

  // Email retry: default every 15 minutes
  const emailRetryJob = cron.schedule(env.cronEmailRetry, async () => {
    try {
      await runEmailRetry();
    } catch (error) {
      console.error('[Scheduler] Email retry job error:', error.message);
    }
  }, { scheduled: true, timezone: 'UTC' });
  scheduledJobs.push({ name: 'email_retry', job: emailRetryJob, schedule: env.cronEmailRetry });
  console.log(`[Scheduler] Email retry scheduled: ${env.cronEmailRetry}`);

  // Cleanup: default 02:00 UTC
  const cleanupJob = cron.schedule(env.cronCleanup, async () => {
    try {
      await runCleanup();
    } catch (error) {
      console.error('[Scheduler] Cleanup job error:', error.message);
    }
  }, { scheduled: true, timezone: 'UTC' });
  scheduledJobs.push({ name: 'cleanup', job: cleanupJob, schedule: env.cronCleanup });
  console.log(`[Scheduler] Cleanup scheduled: ${env.cronCleanup}`);

  // ==========================================================================
  // Phase 5 Jobs
  // ==========================================================================

  if (env.phase5JobsEnabled) {
    // Analytics aggregation: default 02:00 UTC
    const aggregationJob = cron.schedule(env.cronAnalyticsAggregation, async () => {
      try {
        await runAggregation();
      } catch (error) {
        console.error('[Scheduler] Analytics aggregation job error:', error.message);
      }
    }, { scheduled: true, timezone: 'UTC' });
    scheduledJobs.push({ name: 'analytics_aggregation', job: aggregationJob, schedule: env.cronAnalyticsAggregation });
    console.log(`[Scheduler] Analytics aggregation scheduled: ${env.cronAnalyticsAggregation}`);

    // Risk score calculation: default 03:00 UTC
    const riskScoreJob = cron.schedule(env.cronRiskScoreCalculation, async () => {
      try {
        await runRiskCalculation();
      } catch (error) {
        console.error('[Scheduler] Risk score calculation job error:', error.message);
      }
    }, { scheduled: true, timezone: 'UTC' });
    scheduledJobs.push({ name: 'risk_score_calculation', job: riskScoreJob, schedule: env.cronRiskScoreCalculation });
    console.log(`[Scheduler] Risk score calculation scheduled: ${env.cronRiskScoreCalculation}`);

    // Risk history cleanup: default 1st of month at 04:00 UTC
    const riskHistoryCleanupJob = cron.schedule(env.cronRiskHistoryCleanup, async () => {
      try {
        await runRiskHistoryCleanup();
      } catch (error) {
        console.error('[Scheduler] Risk history cleanup job error:', error.message);
      }
    }, { scheduled: true, timezone: 'UTC' });
    scheduledJobs.push({ name: 'risk_history_cleanup', job: riskHistoryCleanupJob, schedule: env.cronRiskHistoryCleanup });
    console.log(`[Scheduler] Risk history cleanup scheduled: ${env.cronRiskHistoryCleanup}`);
  } else {
    console.log('[Scheduler] Phase 5 jobs are disabled via PHASE5_JOBS_ENABLED=false');
  }

  // ==========================================================================
  // Phase 8 Jobs - Training & Competence
  // ==========================================================================

  if (env.phase8JobsEnabled !== false) {
    // Training expiry check: default 01:00 UTC
    const trainingExpiryJob = cron.schedule(env.cronTrainingExpiry || '0 1 * * *', async () => {
      try {
        await runTrainingExpiryCheck();
      } catch (error) {
        console.error('[Scheduler] Training expiry check job error:', error.message);
      }
    }, { scheduled: true, timezone: 'UTC' });
    scheduledJobs.push({ name: 'training_expiry_check', job: trainingExpiryJob, schedule: env.cronTrainingExpiry || '0 1 * * *' });
    console.log(`[Scheduler] Training expiry check scheduled: ${env.cronTrainingExpiry || '0 1 * * *'}`);

    // Training reminders: default 06:00 UTC
    const trainingReminderJob = cron.schedule(env.cronTrainingReminder || '0 6 * * *', async () => {
      try {
        await runTrainingReminders();
      } catch (error) {
        console.error('[Scheduler] Training reminder job error:', error.message);
      }
    }, { scheduled: true, timezone: 'UTC' });
    scheduledJobs.push({ name: 'training_reminders', job: trainingReminderJob, schedule: env.cronTrainingReminder || '0 6 * * *' });
    console.log(`[Scheduler] Training reminders scheduled: ${env.cronTrainingReminder || '0 6 * * *'}`);

    // Training auto-assignment: default 02:00 UTC
    const trainingAutoAssignmentJob = cron.schedule(env.cronTrainingAutoAssignment || '0 2 * * *', async () => {
      try {
        await runTrainingAutoAssignment();
      } catch (error) {
        console.error('[Scheduler] Training auto-assignment job error:', error.message);
      }
    }, { scheduled: true, timezone: 'UTC' });
    scheduledJobs.push({ name: 'training_auto_assignment', job: trainingAutoAssignmentJob, schedule: env.cronTrainingAutoAssignment || '0 2 * * *' });
    console.log(`[Scheduler] Training auto-assignment scheduled: ${env.cronTrainingAutoAssignment || '0 2 * * *'}`);

    // Training analytics aggregation: default 03:00 UTC
    const trainingAnalyticsJob = cron.schedule(env.cronTrainingAnalytics || '0 3 * * *', async () => {
      try {
        await runTrainingAnalyticsAggregation();
      } catch (error) {
        console.error('[Scheduler] Training analytics aggregation job error:', error.message);
      }
    }, { scheduled: true, timezone: 'UTC' });
    scheduledJobs.push({ name: 'training_analytics_aggregation', job: trainingAnalyticsJob, schedule: env.cronTrainingAnalytics || '0 3 * * *' });
    console.log(`[Scheduler] Training analytics aggregation scheduled: ${env.cronTrainingAnalytics || '0 3 * * *'}`);
  } else {
    console.log('[Scheduler] Phase 8 jobs are disabled via PHASE8_JOBS_ENABLED=false');
  }

  // ==========================================================================
  // Phase 10 Jobs - Webhook Delivery
  // ==========================================================================

  if (env.phase10JobsEnabled !== false) {
    webhookJobs.startAll();
    console.log('[Scheduler] Phase 10 webhook jobs initialized');
  } else {
    console.log('[Scheduler] Phase 10 jobs are disabled via PHASE10_JOBS_ENABLED=false');
  }

  console.log(`[Scheduler] ${scheduledJobs.length} jobs initialized`);
};

/**
 * Stop all scheduled jobs
 */
const stopScheduler = () => {
  console.log('[Scheduler] Stopping scheduled jobs...');
  for (const { name, job } of scheduledJobs) {
    job.stop();
    console.log(`[Scheduler] Stopped: ${name}`);
  }
  scheduledJobs = [];
  
  // Stop Phase 10 webhook jobs
  webhookJobs.stopAll();
};

/**
 * Get status of all scheduled jobs
 * @returns {Object[]} - Job statuses
 */
const getJobStatuses = () => {
  return scheduledJobs.map(({ name, schedule }) => ({
    name,
    schedule,
    enabled: env.jobsEnabled
  }));
};

module.exports = {
  initializeScheduler,
  stopScheduler,
  getJobStatuses
};

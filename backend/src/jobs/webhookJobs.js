/**
 * Webhook Delivery Jobs - Phase 10
 * Scheduled jobs for processing webhook deliveries and retries
 */

const cron = require('node-cron');
const webhookDispatcher = require('../services/webhookDispatcher');
const integrationEventService = require('../services/integrationEventService');
const env = require('../config/env');

let deliveryJob = null;
let retryJob = null;
let cleanupJob = null;

/**
 * Start webhook delivery job
 * Processes pending webhook events
 */
const startDeliveryJob = () => {
  if (deliveryJob) return;
  
  console.log(`[Webhook Jobs] Starting delivery job with schedule: ${env.cronWebhookDelivery}`);
  
  deliveryJob = cron.schedule(env.cronWebhookDelivery, async () => {
    try {
      const results = await webhookDispatcher.processPendingEvents(50);
      
      if (results.processed > 0) {
        console.log(`[Webhook Jobs] Delivery: ${results.delivered} delivered, ${results.failed} failed, ${results.retrying} retrying`);
      }
    } catch (error) {
      console.error('[Webhook Jobs] Delivery job error:', error);
    }
  });
};

/**
 * Start webhook retry job
 * Processes failed webhook events that are due for retry
 */
const startRetryJob = () => {
  if (retryJob) return;
  
  console.log(`[Webhook Jobs] Starting retry job with schedule: ${env.cronWebhookRetry}`);
  
  retryJob = cron.schedule(env.cronWebhookRetry, async () => {
    try {
      const results = await webhookDispatcher.processRetryEvents(25);
      
      if (results.processed > 0) {
        console.log(`[Webhook Jobs] Retry: ${results.delivered} delivered, ${results.failed} failed, ${results.retrying} retrying`);
      }
    } catch (error) {
      console.error('[Webhook Jobs] Retry job error:', error);
    }
  });
};

/**
 * Start integration event cleanup job
 * Removes old integration events based on retention policy
 */
const startCleanupJob = () => {
  if (cleanupJob) return;
  
  console.log(`[Webhook Jobs] Starting cleanup job with schedule: ${env.cronIntegrationEventCleanup}`);
  
  cleanupJob = cron.schedule(env.cronIntegrationEventCleanup, async () => {
    try {
      const results = await integrationEventService.deleteOldEvents(env.integrationEventRetentionDays);
      
      if (results.deleted > 0) {
        console.log(`[Webhook Jobs] Cleanup: Deleted ${results.deleted} old integration events`);
      }
    } catch (error) {
      console.error('[Webhook Jobs] Cleanup job error:', error);
    }
  });
};

/**
 * Start all webhook jobs
 */
const startAll = () => {
  if (!env.jobsEnabled) {
    console.log('[Webhook Jobs] Jobs disabled by configuration');
    return;
  }
  
  startDeliveryJob();
  startRetryJob();
  startCleanupJob();
  
  console.log('[Webhook Jobs] All jobs started');
};

/**
 * Stop all webhook jobs
 */
const stopAll = () => {
  if (deliveryJob) {
    deliveryJob.stop();
    deliveryJob = null;
  }
  
  if (retryJob) {
    retryJob.stop();
    retryJob = null;
  }
  
  if (cleanupJob) {
    cleanupJob.stop();
    cleanupJob = null;
  }
  
  console.log('[Webhook Jobs] All jobs stopped');
};

/**
 * Get job statuses
 */
const getStatus = () => {
  return {
    delivery: {
      running: deliveryJob !== null,
      schedule: env.cronWebhookDelivery
    },
    retry: {
      running: retryJob !== null,
      schedule: env.cronWebhookRetry
    },
    cleanup: {
      running: cleanupJob !== null,
      schedule: env.cronIntegrationEventCleanup,
      retention_days: env.integrationEventRetentionDays
    }
  };
};

module.exports = {
  startAll,
  stopAll,
  startDeliveryJob,
  startRetryJob,
  startCleanupJob,
  getStatus
};

/**
 * Webhook Dispatcher - Phase 10
 * Handles async delivery of webhooks with retry logic
 */

const { decryptSecret, generateWebhookSignature } = require('../utils/encryption');
const webhookService = require('./webhookService');
const { query } = require('../config/db');

// =====================================================
// DELIVERY ENGINE
// =====================================================

/**
 * Deliver a single webhook event
 */
const deliverEvent = async (event) => {
  const startTime = Date.now();
  
  try {
    // Decrypt secrets
    const secret = decryptSecret(event.secret_encrypted);
    let customHeaders = {};
    if (event.headers_encrypted) {
      customHeaders = JSON.parse(decryptSecret(event.headers_encrypted));
    }
    
    // Build payload
    const payload = typeof event.payload === 'string' 
      ? event.payload 
      : JSON.stringify(event.payload);
    
    const timestamp = Math.floor(Date.now() / 1000);
    
    // Generate signature
    const signature = generateWebhookSignature(payload, secret, timestamp);
    
    // Build headers
    const headers = {
      'Content-Type': 'application/json',
      'User-Agent': 'EHS-Webhook/1.0',
      'X-EHS-Event': event.event_type,
      'X-EHS-Delivery': event.id,
      'X-EHS-Signature': signature,
      'X-EHS-Timestamp': timestamp.toString(),
      ...customHeaders
    };
    
    // Make request
    const response = await fetch(event.target_url, {
      method: 'POST',
      headers,
      body: payload,
      signal: AbortSignal.timeout(30000) // 30 second timeout
    });
    
    const responseTime = Date.now() - startTime;
    let responseBody = null;
    
    try {
      responseBody = await response.text();
      if (responseBody.length > 1024) {
        responseBody = responseBody.substring(0, 1024) + '... (truncated)';
      }
    } catch {
      // Ignore response body errors
    }
    
    if (response.ok) {
      // Success
      await webhookService.updateEventStatus(event.id, 'delivered', {
        response_status_code: response.status,
        response_time_ms: responseTime,
        response_body: responseBody
      });
      
      // Reset consecutive failures on webhook
      await query(
        `UPDATE webhooks SET 
           consecutive_failures = 0,
           last_triggered_at = NOW(),
           last_success_at = NOW()
         WHERE id = $1`,
        [event.webhook_id]
      );
      
      return { success: true, status: response.status };
    } else {
      // HTTP error
      return await handleFailure(event, {
        response_status_code: response.status,
        response_time_ms: responseTime,
        error_message: `HTTP ${response.status}: ${response.statusText}`,
        response_body: responseBody
      });
    }
  } catch (error) {
    const responseTime = Date.now() - startTime;
    
    return await handleFailure(event, {
      response_time_ms: responseTime,
      error_message: error.message || 'Connection failed'
    });
  }
};

/**
 * Handle delivery failure with retry logic
 */
const handleFailure = async (event, responseData) => {
  const retryPolicy = typeof event.retry_policy === 'string' 
    ? JSON.parse(event.retry_policy)
    : event.retry_policy || { max_retries: 5, initial_delay_seconds: 60, max_delay_seconds: 3600, backoff_multiplier: 2 };
  
  const attemptCount = (event.attempt_count || 0) + 1;
  
  if (attemptCount >= retryPolicy.max_retries) {
    // Max retries reached - mark as permanently failed
    await webhookService.updateEventStatus(event.id, 'failed', {
      ...responseData,
      next_retry_at: null
    });
    
    // Increment consecutive failures on webhook
    await query(
      `UPDATE webhooks SET 
         consecutive_failures = consecutive_failures + 1,
         last_triggered_at = NOW(),
         last_failure_at = NOW()
       WHERE id = $1`,
      [event.webhook_id]
    );
    
    // Auto-disable webhook after 10 consecutive failures
    await checkAutoDisable(event.webhook_id);
    
    return { success: false, status: 'failed', message: 'Max retries exceeded' };
  }
  
  // Calculate next retry with exponential backoff
  const delay = Math.min(
    retryPolicy.initial_delay_seconds * Math.pow(retryPolicy.backoff_multiplier, attemptCount - 1),
    retryPolicy.max_delay_seconds
  );
  
  const nextRetryAt = new Date(Date.now() + delay * 1000);
  
  await webhookService.updateEventStatus(event.id, 'retrying', {
    ...responseData,
    next_retry_at: nextRetryAt
  });
  
  // Increment consecutive failures
  await query(
    `UPDATE webhooks SET 
       consecutive_failures = consecutive_failures + 1,
       last_triggered_at = NOW(),
       last_failure_at = NOW()
     WHERE id = $1`,
    [event.webhook_id]
  );
  
  return { success: false, status: 'retrying', next_retry_at: nextRetryAt };
};

/**
 * Auto-disable webhook after too many consecutive failures
 */
const checkAutoDisable = async (webhookId) => {
  const result = await query(
    `SELECT consecutive_failures FROM webhooks WHERE id = $1`,
    [webhookId]
  );
  
  if (result.rows[0]?.consecutive_failures >= 10) {
    await query(
      `UPDATE webhooks SET is_active = false, updated_at = NOW() WHERE id = $1`,
      [webhookId]
    );
    
    console.log(`Webhook ${webhookId} auto-disabled after 10 consecutive failures`);
  }
};

// =====================================================
// BATCH PROCESSING
// =====================================================

/**
 * Process pending webhook events (called by job scheduler)
 */
const processPendingEvents = async (batchSize = 50) => {
  const events = await webhookService.getPendingEvents(batchSize);
  
  const results = {
    processed: 0,
    delivered: 0,
    failed: 0,
    retrying: 0
  };
  
  for (const event of events) {
    const result = await deliverEvent(event);
    results.processed++;
    
    if (result.success) {
      results.delivered++;
    } else if (result.status === 'retrying') {
      results.retrying++;
    } else {
      results.failed++;
    }
  }
  
  return results;
};

/**
 * Process events due for retry
 */
const processRetryEvents = async (batchSize = 50) => {
  const events = await webhookService.getFailedEventsForRetry(batchSize);
  
  const results = {
    processed: 0,
    delivered: 0,
    failed: 0,
    retrying: 0
  };
  
  for (const event of events) {
    const result = await deliverEvent(event);
    results.processed++;
    
    if (result.success) {
      results.delivered++;
    } else if (result.status === 'retrying') {
      results.retrying++;
    } else {
      results.failed++;
    }
  }
  
  return results;
};

// =====================================================
// EVENT EMISSION
// =====================================================

/**
 * Emit an event to all matching webhooks
 * Called from entity services when changes occur
 */
const emitEvent = async (organisationId, eventType, entityData, actor = null) => {
  // Find matching webhooks
  const webhooks = await webhookService.findMatchingWebhooks(organisationId, eventType);
  
  if (webhooks.length === 0) {
    return { queued: 0 };
  }
  
  // Build event payload
  const payload = {
    event: eventType,
    timestamp: new Date().toISOString(),
    data: entityData,
    actor: actor ? {
      id: actor.id,
      email: actor.email,
      name: actor.name
    } : null
  };
  
  // Create event records for each webhook
  const eventIds = [];
  for (const webhook of webhooks) {
    const event = await webhookService.createEvent(webhook.id, eventType, payload);
    eventIds.push(event.id);
  }
  
  // Also record in integration_events for audit
  await recordIntegrationEvent(organisationId, eventType, entityData, eventIds.length, actor);
  
  return { queued: eventIds.length, event_ids: eventIds };
};

/**
 * Record event in integration_events table
 */
const recordIntegrationEvent = async (organisationId, eventType, entityData, webhookCount, actor) => {
  await query(
    `INSERT INTO integration_events (
       organisation_id, event_type, entity_type, entity_id, payload, triggered_by
     ) VALUES ($1, $2, $3, $4, $5, $6)`,
    [
      organisationId,
      eventType,
      eventType.split('.')[0], // e.g., 'incident' from 'incident.created'
      entityData.id,
      JSON.stringify({ ...entityData, webhooks_queued: webhookCount }),
      actor?.id
    ]
  );
};

// =====================================================
// TEAMS WEBHOOK FORMATTER
// =====================================================

/**
 * Format payload for Microsoft Teams Adaptive Card
 */
const formatTeamsPayload = (eventType, data) => {
  const colors = {
    'incident.created': 'attention', // red
    'incident.updated': 'default',
    'incident.closed': 'good', // green
    'action.completed': 'good',
    'action.overdue': 'warning', // yellow
    'risk.created': 'attention',
    'risk.mitigated': 'good',
    'training.overdue': 'warning',
    'training.completed': 'good'
  };
  
  const eventTitles = {
    'incident.created': '🚨 New Incident Reported',
    'incident.updated': '📝 Incident Updated',
    'incident.closed': '✅ Incident Closed',
    'action.created': '📋 New Action Assigned',
    'action.completed': '✅ Action Completed',
    'action.overdue': '⚠️ Action Overdue',
    'risk.created': '⚠️ New Risk Identified',
    'risk.updated': '📝 Risk Updated',
    'risk.mitigated': '✅ Risk Mitigated',
    'training.assigned': '📚 Training Assigned',
    'training.completed': '✅ Training Completed',
    'training.overdue': '⚠️ Training Overdue'
  };
  
  return {
    type: 'message',
    attachments: [{
      contentType: 'application/vnd.microsoft.card.adaptive',
      content: {
        '$schema': 'http://adaptivecards.io/schemas/adaptive-card.json',
        type: 'AdaptiveCard',
        version: '1.4',
        body: [
          {
            type: 'TextBlock',
            text: eventTitles[eventType] || eventType,
            weight: 'bolder',
            size: 'large',
            color: colors[eventType] || 'default'
          },
          {
            type: 'FactSet',
            facts: buildFacts(eventType, data)
          }
        ],
        actions: data.url ? [{
          type: 'Action.OpenUrl',
          title: 'View in EHS Portal',
          url: data.url
        }] : []
      }
    }]
  };
};

/**
 * Build facts for Teams card based on event type
 */
const buildFacts = (eventType, data) => {
  const facts = [];
  
  const entityType = eventType.split('.')[0];
  
  switch (entityType) {
    case 'incident':
      if (data.title) facts.push({ title: 'Title', value: data.title });
      if (data.severity) facts.push({ title: 'Severity', value: data.severity });
      if (data.status) facts.push({ title: 'Status', value: data.status });
      if (data.location) facts.push({ title: 'Location', value: data.location });
      if (data.reported_by) facts.push({ title: 'Reported By', value: data.reported_by });
      break;
      
    case 'action':
      if (data.title) facts.push({ title: 'Action', value: data.title });
      if (data.assigned_to) facts.push({ title: 'Assigned To', value: data.assigned_to });
      if (data.due_date) facts.push({ title: 'Due Date', value: new Date(data.due_date).toLocaleDateString() });
      if (data.priority) facts.push({ title: 'Priority', value: data.priority });
      break;
      
    case 'risk':
      if (data.title) facts.push({ title: 'Risk', value: data.title });
      if (data.risk_level) facts.push({ title: 'Risk Level', value: data.risk_level });
      if (data.likelihood) facts.push({ title: 'Likelihood', value: data.likelihood });
      if (data.consequence) facts.push({ title: 'Consequence', value: data.consequence });
      break;
      
    case 'training':
      if (data.course_name) facts.push({ title: 'Course', value: data.course_name });
      if (data.user_name) facts.push({ title: 'Assignee', value: data.user_name });
      if (data.due_date) facts.push({ title: 'Due Date', value: new Date(data.due_date).toLocaleDateString() });
      break;
  }
  
  return facts;
};

/**
 * Test webhook delivery (send test payload)
 */
const sendTestEvent = async (webhookId, organisationId) => {
  const webhook = await webhookService.getWebhookWithSecrets(webhookId);
  
  if (!webhook || webhook.organisation_id !== organisationId) {
    throw new Error('Webhook not found');
  }
  
  const testPayload = {
    event: 'test',
    timestamp: new Date().toISOString(),
    data: {
      message: 'This is a test webhook from EHS Platform',
      webhook_id: webhookId,
      organisation_id: organisationId
    }
  };
  
  const testEvent = {
    id: `test-${Date.now()}`,
    webhook_id: webhookId,
    event_type: 'test',
    payload: testPayload,
    target_url: webhook.target_url,
    secret_encrypted: webhook.secret_encrypted,
    headers_encrypted: webhook.headers_encrypted,
    retry_policy: webhook.retry_policy,
    attempt_count: 0
  };
  
  // Deliver directly (don't persist test events)
  const startTime = Date.now();
  
  try {
    const secret = decryptSecret(webhook.secret_encrypted);
    let customHeaders = {};
    if (webhook.headers_encrypted) {
      customHeaders = JSON.parse(decryptSecret(webhook.headers_encrypted));
    }
    
    const payload = JSON.stringify(testPayload);
    const timestamp = Math.floor(Date.now() / 1000);
    const signature = generateWebhookSignature(payload, secret, timestamp);
    
    const response = await fetch(webhook.target_url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'EHS-Webhook/1.0',
        'X-EHS-Event': 'test',
        'X-EHS-Delivery': testEvent.id,
        'X-EHS-Signature': signature,
        'X-EHS-Timestamp': timestamp.toString(),
        ...customHeaders
      },
      body: payload,
      signal: AbortSignal.timeout(10000)
    });
    
    return {
      success: response.ok,
      status_code: response.status,
      response_time_ms: Date.now() - startTime,
      message: response.ok ? 'Test webhook delivered successfully' : `HTTP ${response.status}: ${response.statusText}`
    };
  } catch (error) {
    return {
      success: false,
      response_time_ms: Date.now() - startTime,
      error: error.message
    };
  }
};

module.exports = {
  deliverEvent,
  processPendingEvents,
  processRetryEvents,
  emitEvent,
  formatTeamsPayload,
  sendTestEvent
};

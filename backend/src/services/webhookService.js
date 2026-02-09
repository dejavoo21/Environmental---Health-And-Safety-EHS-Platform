/**
 * Webhook Service - Phase 10
 * Handles webhook registration, event filtering, and delivery management
 */

const { query, withTransaction } = require('../config/db');
const { AppError } = require('../utils/appError');
const { recordAudit } = require('../utils/audit');
const { encryptSecret, decryptSecret, generateWebhookSecret, generateWebhookSignature } = require('../utils/encryption');
const env = require('../config/env');

// =====================================================
// WEBHOOK MANAGEMENT
// =====================================================

/**
 * List webhooks for an organisation
 */
const listWebhooks = async (organisationId, { page = 1, limit = 20, enabled } = {}) => {
  const offset = (page - 1) * limit;
  
  let whereClause = 'WHERE organisation_id = $1 AND deleted_at IS NULL';
  const params = [organisationId];
  
  if (enabled !== undefined) {
    params.push(enabled);
    whereClause += ` AND enabled = $${params.length}`;
  }
  
  const countResult = await query(
    `SELECT COUNT(*) FROM webhooks ${whereClause}`,
    params
  );
  
  const result = await query(
    `SELECT id, organisation_id, name, target_url, event_types, enabled,
            consecutive_failures, disabled_reason,
            last_triggered_at, last_success_at,
            created_at, updated_at, created_by
     FROM webhooks
     ${whereClause}
     ORDER BY created_at DESC
     LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
    [...params, limit, offset]
  );
  
  return {
    success: true,
    data: result.rows.map(wh => ({
      ...wh,
      status: wh.enabled ? 'active' : (wh.disabled_reason ? 'suspended' : 'disabled')
    })),
    pagination: {
      page,
      limit,
      total: parseInt(countResult.rows[0].count),
      totalPages: Math.ceil(countResult.rows[0].count / limit)
    }
  };
};

/**
 * Get webhook by ID
 */
const getWebhookById = async (webhookId, organisationId) => {
  const result = await query(
    `SELECT id, organisation_id, name, target_url, event_types, enabled,
            consecutive_failures, disabled_reason,
            last_triggered_at, last_success_at,
            created_at, updated_at, created_by
     FROM webhooks
     WHERE id = $1 AND organisation_id = $2 AND deleted_at IS NULL`,
    [webhookId, organisationId]
  );
  
  if (result.rowCount === 0) {
    throw new AppError('Webhook not found', 404, 'NOT_FOUND');
  }
  
  const webhook = result.rows[0];
  return {
    ...webhook,
    status: webhook.enabled ? 'active' : (webhook.disabled_reason ? 'suspended' : 'disabled')
  };
};

/**
 * Get webhook with secrets (internal use only)
 */
const getWebhookWithSecrets = async (webhookId) => {
  const result = await query(
    `SELECT * FROM webhooks WHERE id = $1 AND deleted_at IS NULL`,
    [webhookId]
  );
  
  return result.rows[0] || null;
};

/**
 * Create a new webhook
 */
const createWebhook = async (organisationId, data, userId) => {
  // Validate event types - match enum from migration
  const validEvents = [
    'incident.created', 'incident.updated', 'incident.severity_changed', 'incident.closed',
    'action.created', 'action.assigned', 'action.overdue', 'action.completed',
    'risk.created', 'risk.level_changed', 'risk.review_due',
    'training.assigned', 'training.overdue', 'training.completed',
    'user.created', 'user.updated', 'user.deactivated'
  ];
  
  const eventTypes = data.event_types || ['incident.created'];
  const invalidEvents = eventTypes.filter(e => !validEvents.includes(e));
  if (invalidEvents.length > 0) {
    throw new AppError(`Invalid event types: ${invalidEvents.join(', ')}`, 400, 'VALIDATION_ERROR');
  }
  
  // Validate URL
  if (!data.target_url || !data.target_url.startsWith('https://')) {
    throw new AppError('Webhook target URL must use HTTPS', 400, 'VALIDATION_ERROR');
  }
  
  // Generate signing secret
  const secret = generateWebhookSecret();
  
  // Prepare custom headers if provided
  let customHeaders = null;
  if (data.custom_headers && Object.keys(data.custom_headers).length > 0) {
    customHeaders = data.custom_headers;
  }
  
  const result = await query(
    `INSERT INTO webhooks (
       organisation_id, name, description, target_url, event_types, enabled,
       secret, custom_headers, created_by
     ) VALUES ($1, $2, $3, $4, $5::integration_event_type[], $6, $7, $8, $9)
     RETURNING id, name, target_url, event_types, enabled, created_at`,
    [
      organisationId,
      data.name,
      data.description || null,
      data.target_url,
      eventTypes,
      data.enabled !== false,
      secret,
      customHeaders ? JSON.stringify(customHeaders) : null,
      userId
    ]
  );
  
  await recordAudit({
    userId,
    action: 'webhook.created',
    entityType: 'webhook',
    entityId: result.rows[0].id,
    organisationId,
    changes: { name: data.name, event_types: eventTypes }
  });
  
  // Return with signing secret (only shown once)
  return {
    success: true,
    webhook: {
      ...result.rows[0],
      status: 'active'
    },
    signing_secret: secret,
    message: 'Webhook created. Store the signing secret securely - it will not be shown again.'
  };
};

/**
 * Update webhook settings
 */
const updateWebhook = async (webhookId, organisationId, data, userId) => {
  const existing = await getWebhookById(webhookId, organisationId);
  
  // Validate event types if provided
  if (data.event_types) {
    const validEvents = [
      'incident.created', 'incident.updated', 'incident.severity_changed', 'incident.closed',
      'action.created', 'action.assigned', 'action.overdue', 'action.completed',
      'risk.created', 'risk.level_changed', 'risk.review_due',
      'training.assigned', 'training.overdue', 'training.completed',
      'user.created', 'user.updated', 'user.deactivated'
    ];
    
    const invalidEvents = data.event_types.filter(e => !validEvents.includes(e));
    if (invalidEvents.length > 0) {
      throw new AppError(`Invalid event types: ${invalidEvents.join(', ')}`, 400, 'VALIDATION_ERROR');
    }
  }
  
  // Validate URL if provided
  if (data.target_url && !data.target_url.startsWith('https://')) {
    throw new AppError('Webhook target URL must use HTTPS', 400, 'VALIDATION_ERROR');
  }
  
  const result = await query(
    `UPDATE webhooks SET
       name = COALESCE($1, name),
       target_url = COALESCE($2, target_url),
       event_types = COALESCE($3::integration_event_type[], event_types),
       enabled = COALESCE($4, enabled),
       custom_headers = COALESCE($5, custom_headers),
       updated_at = NOW()
     WHERE id = $6 AND organisation_id = $7 AND deleted_at IS NULL
     RETURNING id, name, target_url, event_types, enabled, updated_at`,
    [
      data.name,
      data.target_url,
      data.event_types,
      data.enabled,
      data.custom_headers ? JSON.stringify(data.custom_headers) : null,
      webhookId,
      organisationId
    ]
  );
  
  await recordAudit({
    userId,
    action: 'webhook.updated',
    entityType: 'webhook',
    entityId: webhookId,
    organisationId,
    changes: Object.keys(data)
  });
  
  return {
    ...result.rows[0],
    status: result.rows[0].enabled ? 'active' : 'disabled'
  };
};

/**
 * Regenerate webhook signing secret
 */
const regenerateSecret = async (webhookId, organisationId, userId) => {
  await getWebhookById(webhookId, organisationId); // Verify exists
  
  const newSecret = generateWebhookSecret();
  
  await query(
    `UPDATE webhooks SET secret = $1, updated_at = NOW()
     WHERE id = $2 AND organisation_id = $3 AND deleted_at IS NULL`,
    [newSecret, webhookId, organisationId]
  );
  
  await recordAudit({
    userId,
    action: 'webhook.secret_regenerated',
    entityType: 'webhook',
    entityId: webhookId,
    organisationId
  });
  
  return {
    success: true,
    signing_secret: newSecret,
    message: 'Store the signing secret securely. It will not be shown again.'
  };
};

/**
 * Delete webhook (soft delete)
 */
const deleteWebhook = async (webhookId, organisationId, userId) => {
  await getWebhookById(webhookId, organisationId); // Verify exists
  
  await query(
    `UPDATE webhooks SET deleted_at = NOW() WHERE id = $1 AND organisation_id = $2`,
    [webhookId, organisationId]
  );
  
  await recordAudit({
    userId,
    action: 'webhook.deleted',
    entityType: 'webhook',
    entityId: webhookId,
    organisationId
  });
  
  return { success: true, deleted: true };
};

/**
 * Toggle webhook active status
 */
const toggleActive = async (webhookId, organisationId, isActive, userId) => {
  await getWebhookById(webhookId, organisationId); // Verify exists
  
  await query(
    `UPDATE webhooks SET enabled = $1, updated_at = NOW()
     WHERE id = $2 AND organisation_id = $3 AND deleted_at IS NULL`,
    [isActive, webhookId, organisationId]
  );
  
  await recordAudit({
    userId,
    action: isActive ? 'webhook.enabled' : 'webhook.disabled',
    entityType: 'webhook',
    entityId: webhookId,
    organisationId
  });
  
  return { success: true, enabled: isActive, status: isActive ? 'active' : 'disabled' };
};

// =====================================================
// WEBHOOK EVENTS
// =====================================================

/**
 * Get webhook event deliveries
 */
const getEventDeliveries = async (webhookId, organisationId, { page = 1, limit = 20, status } = {}) => {
  // Verify webhook belongs to org
  await getWebhookById(webhookId, organisationId);
  
  const offset = (page - 1) * limit;
  
  let whereClause = 'WHERE webhook_id = $1';
  const params = [webhookId];
  
  if (status) {
    params.push(status);
    whereClause += ` AND status = $${params.length}`;
  }
  
  const countResult = await query(
    `SELECT COUNT(*) FROM webhook_events ${whereClause}`,
    params
  );
  
  const result = await query(
    `SELECT id, webhook_id, event_type, status, 
            attempt_count, next_retry_at, 
            response_status_code, response_time_ms, error_message,
            created_at, delivered_at
     FROM webhook_events
     ${whereClause}
     ORDER BY created_at DESC
     LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
    [...params, limit, offset]
  );
  
  return {
    events: result.rows,
    pagination: {
      page,
      limit,
      total: parseInt(countResult.rows[0].count),
      totalPages: Math.ceil(countResult.rows[0].count / limit)
    }
  };
};

/**
 * Get single event delivery details
 */
const getEventById = async (eventId, organisationId) => {
  const result = await query(
    `SELECT e.*, w.organisation_id
     FROM webhook_events e
     JOIN webhooks w ON w.id = e.webhook_id
     WHERE e.id = $1 AND w.organisation_id = $2`,
    [eventId, organisationId]
  );
  
  if (result.rowCount === 0) {
    throw new AppError('Webhook event not found', 404, 'NOT_FOUND');
  }
  
  return result.rows[0];
};

/**
 * Retry a failed event delivery
 */
const retryEvent = async (eventId, organisationId, userId) => {
  const event = await getEventById(eventId, organisationId);
  
  if (event.status === 'delivered') {
    throw new AppError('Cannot retry a successfully delivered event', 400, 'ALREADY_DELIVERED');
  }
  
  // Reset for retry
  await query(
    `UPDATE webhook_events SET 
       status = 'pending',
       next_retry_at = NOW(),
       updated_at = NOW()
     WHERE id = $1`,
    [eventId]
  );
  
  await recordAudit({
    userId,
    action: 'webhook_event.retry_requested',
    entityType: 'webhook_event',
    entityId: eventId,
    organisationId
  });
  
  return { status: 'pending', message: 'Event queued for retry' };
};

/**
 * Create a webhook event (called when entity changes)
 */
const createEvent = async (webhookId, eventType, payload, sourceEvent) => {
  const result = await query(
    `INSERT INTO webhook_events (webhook_id, event_type, payload, source_event_id, status)
     VALUES ($1, $2, $3, $4, 'pending')
     RETURNING id`,
    [webhookId, eventType, JSON.stringify(payload), sourceEvent?.id]
  );
  
  return result.rows[0];
};

/**
 * Update event delivery status
 */
const updateEventStatus = async (eventId, status, responseData = {}) => {
  const updates = {
    status,
    attempt_count: 'attempt_count + 1',
    ...responseData
  };
  
  if (status === 'delivered') {
    updates.delivered_at = 'NOW()';
  }
  
  await query(
    `UPDATE webhook_events SET
       status = $1,
       attempt_count = attempt_count + 1,
       response_status_code = $2,
       response_time_ms = $3,
       error_message = $4,
       response_body = $5,
       delivered_at = CASE WHEN $1 = 'delivered' THEN NOW() ELSE delivered_at END,
       next_retry_at = $6,
       updated_at = NOW()
     WHERE id = $7`,
    [
      status,
      responseData.response_status_code,
      responseData.response_time_ms,
      responseData.error_message,
      responseData.response_body,
      responseData.next_retry_at,
      eventId
    ]
  );
};

// =====================================================
// WEBHOOK MATCHING
// =====================================================

/**
 * Find webhooks that match an event type for an organisation
 */
const findMatchingWebhooks = async (organisationId, eventType) => {
  const result = await query(
    `SELECT id, target_url, secret, custom_headers, content_type
     FROM webhooks
     WHERE organisation_id = $1
       AND enabled = true
       AND deleted_at IS NULL
       AND (event_types @> ARRAY[$2]::integration_event_type[] OR '*' = ANY(event_types::text[]))`,
    [organisationId, eventType]
  );
  
  return result.rows;
};

/**
 * Get pending events for delivery (for job processor)
 */
const getPendingEvents = async (limit = 100) => {
  const result = await query(
    `SELECT e.id, e.webhook_id, e.event_type, e.payload, e.attempt_count,
            e.max_attempts,
            w.target_url, w.secret, w.custom_headers, w.content_type,
            w.organisation_id
     FROM webhook_events e
     JOIN webhooks w ON w.id = e.webhook_id
     WHERE e.status = 'pending'
       AND (e.next_retry_at IS NULL OR e.next_retry_at <= NOW())
       AND w.enabled = true
       AND w.deleted_at IS NULL
     ORDER BY e.created_at
     LIMIT $1
     FOR UPDATE SKIP LOCKED`,
    [limit]
  );
  
  return result.rows;
};

/**
 * Get failed events for retry (for job processor)
 */
const getFailedEventsForRetry = async (limit = 100) => {
  const result = await query(
    `SELECT e.id, e.webhook_id, e.event_type, e.payload, e.attempt_count,
            e.max_attempts,
            w.target_url, w.secret, w.custom_headers, w.content_type,
            w.organisation_id
     FROM webhook_events e
     JOIN webhooks w ON w.id = e.webhook_id
     WHERE e.status = 'failed'
       AND e.next_retry_at IS NOT NULL
       AND e.next_retry_at <= NOW()
       AND w.enabled = true
       AND w.deleted_at IS NULL
     ORDER BY e.next_retry_at
     LIMIT $1
     FOR UPDATE SKIP LOCKED`,
    [limit]
  );
  
  return result.rows;
};

/**
 * Get webhook statistics
 */
const getWebhookStats = async (webhookId, organisationId, days = 30) => {
  await getWebhookById(webhookId, organisationId); // Verify exists
  
  const result = await query(
    `SELECT 
       COUNT(*) as total_events,
       COUNT(*) FILTER (WHERE status = 'delivered') as delivered,
       COUNT(*) FILTER (WHERE status = 'failed') as failed,
       COUNT(*) FILTER (WHERE status = 'pending') as pending,
       AVG(response_time_ms) FILTER (WHERE status = 'delivered') as avg_response_time_ms
     FROM webhook_events
     WHERE webhook_id = $1 AND created_at > NOW() - INTERVAL '${days} days'`,
    [webhookId]
  );
  
  return result.rows[0];
};

module.exports = {
  listWebhooks,
  getWebhookById,
  getWebhookWithSecrets,
  createWebhook,
  updateWebhook,
  regenerateSecret,
  deleteWebhook,
  toggleActive,
  getEventDeliveries,
  getEventById,
  retryEvent,
  createEvent,
  updateEventStatus,
  findMatchingWebhooks,
  getPendingEvents,
  getFailedEventsForRetry,
  getWebhookStats
};

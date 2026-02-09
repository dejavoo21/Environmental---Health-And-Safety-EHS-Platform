/**
 * Integration Events Service - Phase 10
 * Handles recording and querying of integration events
 */

const { query } = require('../config/db');
const { AppError } = require('../utils/appError');

// =====================================================
// EVENT RECORDING
// =====================================================

/**
 * Record an integration event
 */
const recordEvent = async (organisationId, eventType, entityType, entityId, payload, userId = null, eventSource = 'system') => {
  const result = await query(
    `INSERT INTO integration_events (
       organisation_id, event_type, entity_type, entity_id, payload, user_id, event_source
     ) VALUES ($1, $2::integration_event_type, $3, $4, $5, $6, $7)
     RETURNING id, event_type, entity_type, entity_id, created_at`,
    [
      organisationId,
      eventType,
      entityType,
      entityId,
      typeof payload === 'string' ? payload : JSON.stringify(payload),
      userId,
      eventSource
    ]
  );
  
  return result.rows[0];
};

// =====================================================
// EVENT QUERYING
// =====================================================

/**
 * List integration events for an organisation
 */
const listEvents = async (organisationId, {
  page = 1,
  limit = 50,
  event_type,
  event_source,
  entity_type,
  entity_id,
  start_date,
  end_date
} = {}) => {
  const offset = (page - 1) * limit;
  
  let whereClause = 'WHERE ie.organisation_id = $1';
  const params = [organisationId];
  
  if (event_type) {
    params.push(event_type);
    whereClause += ` AND ie.event_type = $${params.length}::integration_event_type`;
  }
  
  if (event_source) {
    params.push(event_source);
    whereClause += ` AND ie.event_source = $${params.length}`;
  }
  
  if (entity_type) {
    params.push(entity_type);
    whereClause += ` AND ie.entity_type = $${params.length}`;
  }
  
  if (entity_id) {
    params.push(entity_id);
    whereClause += ` AND ie.entity_id = $${params.length}`;
  }
  
  if (start_date) {
    params.push(start_date);
    whereClause += ` AND ie.created_at >= $${params.length}`;
  }
  
  if (end_date) {
    params.push(end_date);
    whereClause += ` AND ie.created_at <= $${params.length}`;
  }
  
  const countResult = await query(
    `SELECT COUNT(*) FROM integration_events ie ${whereClause}`,
    params
  );
  
  const result = await query(
    `SELECT ie.id, ie.organisation_id, ie.event_type, ie.event_source,
            ie.entity_type, ie.entity_id, ie.payload, ie.user_id,
            ie.correlation_id, ie.created_at, ie.processed_at,
            u.email as user_email, u.name as user_name
     FROM integration_events ie
     LEFT JOIN users u ON u.id = ie.user_id
     ${whereClause}
     ORDER BY ie.created_at DESC
     LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
    [...params, limit, offset]
  );
  
  // Format for frontend
  const events = result.rows.map(row => ({
    ...row,
    triggered_by: row.user_id,
    user: row.user_email ? {
      id: row.user_id,
      email: row.user_email,
      name: row.user_name || row.user_email
    } : null
  }));
  
  return {
    success: true,
    data: events,
    pagination: {
      page,
      limit,
      total: parseInt(countResult.rows[0].count),
      totalPages: Math.ceil(countResult.rows[0].count / limit)
    }
  };
};

/**
 * Get single event by ID
 */
const getEventById = async (eventId, organisationId) => {
  const result = await query(
    `SELECT ie.id, ie.organisation_id, ie.event_type, ie.event_source,
            ie.entity_type, ie.entity_id, ie.payload, ie.user_id,
            ie.correlation_id, ie.created_at, ie.processed_at,
            u.email as user_email, u.name as user_name
     FROM integration_events ie
     LEFT JOIN users u ON u.id = ie.user_id
     WHERE ie.id = $1 AND ie.organisation_id = $2`,
    [eventId, organisationId]
  );
  
  if (result.rowCount === 0) {
    throw new AppError('Integration event not found', 404, 'NOT_FOUND');
  }
  
  const row = result.rows[0];
  return {
    ...row,
    triggered_by: row.user_id,
    user: row.user_email ? {
      id: row.user_id,
      email: row.user_email,
      name: row.user_name || row.user_email
    } : null
  };
};

/**
 * Get events for a specific entity
 */
const getEventsForEntity = async (organisationId, entityType, entityId, { limit = 100 } = {}) => {
  const result = await query(
    `SELECT ie.id, ie.event_type, ie.event_source, ie.payload, ie.user_id, ie.created_at,
            u.email as user_email
     FROM integration_events ie
     LEFT JOIN users u ON u.id = ie.user_id
     WHERE ie.organisation_id = $1 AND ie.entity_type = $2 AND ie.entity_id = $3
     ORDER BY ie.created_at DESC
     LIMIT $4`,
    [organisationId, entityType, entityId, limit]
  );
  
  return result.rows.map(row => ({
    ...row,
    triggered_by: row.user_id
  }));
};

// =====================================================
// STATISTICS
// =====================================================

/**
 * Get event statistics for an organisation
 */
const getEventStats = async (organisationId, days = 30) => {
  const result = await query(
    `SELECT 
       COUNT(*) as total_events,
       COUNT(DISTINCT entity_type) as entity_types,
       COUNT(DISTINCT DATE(created_at)) as active_days
     FROM integration_events
     WHERE organisation_id = $1 AND created_at > NOW() - INTERVAL '${days} days'`,
    [organisationId]
  );
  
  const byType = await query(
    `SELECT event_type, COUNT(*) as count
     FROM integration_events
     WHERE organisation_id = $1 AND created_at > NOW() - INTERVAL '${days} days'
     GROUP BY event_type
     ORDER BY count DESC
     LIMIT 10`,
    [organisationId]
  );
  
  const byDay = await query(
    `SELECT DATE(created_at) as date, COUNT(*) as count
     FROM integration_events
     WHERE organisation_id = $1 AND created_at > NOW() - INTERVAL '${days} days'
     GROUP BY DATE(created_at)
     ORDER BY date DESC`,
    [organisationId]
  );
  
  return {
    summary: result.rows[0],
    by_event_type: byType.rows,
    by_day: byDay.rows
  };
};

/**
 * Get recent events summary (for dashboard)
 */
const getRecentEventsSummary = async (organisationId, hours = 24) => {
  const result = await query(
    `SELECT 
       event_type,
       COUNT(*) as count,
       MAX(created_at) as latest
     FROM integration_events
     WHERE organisation_id = $1 AND created_at > NOW() - INTERVAL '${hours} hours'
     GROUP BY event_type
     ORDER BY count DESC`,
    [organisationId]
  );
  
  return result.rows;
};

// =====================================================
// CLEANUP
// =====================================================

/**
 * Delete old events (retention policy)
 * Called by scheduled job
 */
const deleteOldEvents = async (retentionDays = 90) => {
  const result = await query(
    `DELETE FROM integration_events
     WHERE created_at < NOW() - INTERVAL '${retentionDays} days'
     RETURNING id`,
    []
  );
  
  return { deleted: result.rowCount };
};

module.exports = {
  recordEvent,
  listEvents,
  getEventById,
  getEventsForEntity,
  getEventStats,
  getRecentEventsSummary,
  deleteOldEvents
};

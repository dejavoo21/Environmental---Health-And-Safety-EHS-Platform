/**
 * SafetyAdvisorService - Phase 11
 *
 * Provides comprehensive safety intelligence combining weather, PPE, legislation, and safety moments.
 * BR-11-16 to BR-11-20 (C-285 to C-289)
 */

const { query } = require('../config/db');
const { getWeatherForSite } = require('./weatherService');
const { getPPERecommendations, categorizeWeather } = require('./ppeRecommendationService');
const { getTodaysSafetyMoment, getTodaysSafetyMoments, acknowledgeSafetyMoment } = require('./safetyMomentService');
const { getLegislationRefsForSite } = require('./legislationService');
const { recordAudit } = require('../utils/audit');

/**
 * Get complete safety summary for a site
 * BR-11-16 (C-285)
 *
 * @param {number} siteId - Site ID
 * @param {number} orgId - Organisation ID
 * @param {number} userId - User ID
 * @param {string} userRole - User's role
 * @returns {Object} Complete safety summary
 */
const getSafetySummaryForSite = async (siteId, orgId, userId, userRole) => {
  // Get site info with location details
  let siteResult;
  try {
    siteResult = await query(`
      SELECT s.id, s.name, s.city, s.country_code, s.latitude, s.longitude
      FROM sites s
      WHERE s.id = $1
    `, [siteId]);
  } catch (err) {
    console.warn('Error fetching site details:', err.code, err.message);
    // Fallback to basic info
    siteResult = await query('SELECT id, name FROM sites WHERE id = $1', [siteId]);
  }

  if (siteResult.rowCount === 0) {
    return null;
  }

  const site = siteResult.rows[0];
  const siteLocation = [site.city, site.country_code].filter(Boolean).join(', ') || null;

  // Fetch all data in parallel with graceful fallbacks
  let weather = { status: 'unavailable' };
  let safetyMoments = [];
  let legislation = [];
  let ppeAdvice = { summary: 'PPE recommendations not available', items: [] };

  try {
    const results = await Promise.allSettled([
      getWeatherForSite(siteId, orgId).catch(err => {
        console.warn('[SafetyAdvisor] Weather fetch failed:', err.code, err.message);
        return { status: 'unavailable', tempC: null };
      }),
      getTodaysSafetyMoments(orgId, userId, userRole, siteId).catch(err => {
        if (err.code === '42P01') console.warn('[SafetyAdvisor] Safety moments tables not found');
        else console.warn('[SafetyAdvisor] Safety moment fetch failed:', err.code, err.message);
        return [];
      }),
      getLegislationRefsForSite(siteId).catch(err => {
        if (err.code === '42P01') console.warn('[SafetyAdvisor] Legislation tables not found');
        else console.warn('[SafetyAdvisor] Legislation fetch failed:', err.code, err.message);
        return [];
      })
    ]);

    if (results[0].status === 'fulfilled') {
      weather = results[0].value || weather;
    } else if (results[0].status === 'rejected') {
      console.warn('[SafetyAdvisor] Weather promise rejected:', results[0].reason);
    }
    
    if (results[1].status === 'fulfilled') {
      safetyMoments = results[1].value || [];
    } else if (results[1].status === 'rejected') {
      console.warn('[SafetyAdvisor] Safety moments promise rejected:', results[1].reason);
    }
    
    if (results[2].status === 'fulfilled') {
      legislation = results[2].value || [];
    } else if (results[2].status === 'rejected') {
      console.warn('[SafetyAdvisor] Legislation promise rejected:', results[2].reason);
      legislation = [];
    }
  } catch (err) {
    console.warn('[SafetyAdvisor] Error fetching safety data:', err.message);
  }

  // Get PPE recommendations based on weather
  try {
    ppeAdvice = await getPPERecommendations(orgId, siteId, {
      weatherData: weather.status === 'ok' || weather.status === 'stale' ? weather : null
    });
  } catch (err) {
    if (err.code === '42P01') console.warn('PPE tables not found');
  }

  // Check if user has an existing acknowledgement for today
  let lastAcknowledgedAt = null;
  try {
    const ackCheck = await query(`
      SELECT acknowledged_at FROM safety_acknowledgements
      WHERE organisation_id = $1 AND user_id = $2 AND site_id = $3
        AND acknowledged_at::date = CURRENT_DATE
      ORDER BY acknowledged_at DESC
      LIMIT 1
    `, [orgId, userId, siteId]);
    lastAcknowledgedAt = ackCheck.rowCount > 0 ? ackCheck.rows[0].acknowledged_at : null;
  } catch (err) {
    if (err.code === '42P01') console.warn('safety_acknowledgements table not found');
  }

  // Record view event (non-critical, ignore errors)
  try {
    await recordSafetyAdvisorEvent(orgId, userId, siteId, 'view', null, null);
  } catch (err) {
    console.warn('Failed to record safety advisor view event:', err.message);
  }

  return {
    siteName: site.name,
    siteLocation,
    weather: {
      status: weather.status,
      tempC: weather.tempC || null,
      condition: weather.condition || null,
      feelsLikeC: weather.feelsLikeC || null,
      windKph: weather.windKph || null,
      icon: weather.icon || null,
      updatedAt: weather.updatedAt || null,
      summaryText: weather.summaryText || null,
      warning: weather.warning || null
    },
    safetyMoments: safetyMoments && safetyMoments.length > 0 ? safetyMoments.map(m => ({
      id: m.id,
      title: m.title,
      body: m.body,
      category: m.category,
      acknowledged: m.acknowledged
    })) : [],
    ppeAdvice: {
      summary: ppeAdvice.summary || 'No PPE recommendations available',
      items: ppeAdvice.items || []
    },
    legislation: (legislation || []).slice(0, 5).map(leg => ({
      title: leg.title,
      refCode: leg.jurisdiction,
      category: leg.category,
      linkUrl: leg.reference_url
    })),
    lastAcknowledgedAt
  };
};

/**
 * Get safety summary for a specific task/entity
 * BR-11-17 (C-286)
 *
 * @param {string} entityType - Type of entity (incident, inspection, permit, action, training)
 * @param {number} entityId - Entity ID
 * @param {number} orgId - Organisation ID
 * @param {number} userId - User ID
 * @param {string} userRole - User's role
 * @returns {Object} Safety summary with task context
 */
const getSafetySummaryForTask = async (entityType, entityId, orgId, userId, userRole) => {
  // Get entity details to find associated site
  let siteId = null;
  let entityInfo = null;
  let isHighRisk = false;

  switch (entityType) {
    case 'incident': {
      const result = await query(`
        SELECT i.id, i.title, i.site_id, i.severity, it.requires_safety_acknowledgement
        FROM incidents i
        LEFT JOIN incident_types it ON it.id = i.type_id
        WHERE i.id = $1
      `, [entityId]);
      if (result.rowCount > 0) {
        const row = result.rows[0];
        siteId = row.site_id;
        entityInfo = { title: row.title, severity: row.severity };
        // High-risk if severity is high/critical or incident type requires it
        isHighRisk = ['high', 'critical'].includes(row.severity) || row.requires_safety_acknowledgement;
      }
      break;
    }
    case 'inspection': {
      const result = await query(`
        SELECT id, site_id, overall_result FROM inspections WHERE id = $1
      `, [entityId]);
      if (result.rowCount > 0) {
        siteId = result.rows[0].site_id;
        entityInfo = { overallResult: result.rows[0].overall_result };
      }
      break;
    }
    case 'action': {
      const result = await query(`
        SELECT a.id, a.title, i.site_id
        FROM actions a
        LEFT JOIN incidents i ON i.id = a.source_id AND a.source_type = 'incident'
        LEFT JOIN inspections ins ON ins.id = a.source_id AND a.source_type = 'inspection'
        WHERE a.id = $1
      `, [entityId]);
      if (result.rowCount > 0) {
        siteId = result.rows[0].site_id;
        entityInfo = { title: result.rows[0].title };
      }
      break;
    }
    case 'training': {
      const result = await query(`
        SELECT ta.id, tc.name as course_name, ta.site_id
        FROM training_assignments ta
        LEFT JOIN training_courses tc ON tc.id = ta.course_id
        WHERE ta.id = $1
      `, [entityId]);
      if (result.rowCount > 0) {
        siteId = result.rows[0].site_id;
        entityInfo = { courseName: result.rows[0].course_name };
      }
      break;
    }
    default:
      // Unknown entity type, try generic lookup
      break;
  }

  if (!siteId) {
    return {
      error: 'Entity not found or has no associated site',
      entityType,
      entityId
    };
  }

  // Get base site summary
  const baseSummary = await getSafetySummaryForSite(siteId, orgId, userId, userRole);

  if (!baseSummary) {
    return {
      error: 'Site not found',
      entityType,
      entityId
    };
  }

  // Check for task-specific acknowledgement
  const taskAckCheck = await query(`
    SELECT acknowledged_at, is_high_risk FROM safety_acknowledgements
    WHERE organisation_id = $1 AND user_id = $2
      AND entity_type = $3 AND entity_id = $4
    ORDER BY acknowledged_at DESC
    LIMIT 1
  `, [orgId, userId, entityType, entityId]);

  const taskAcknowledged = taskAckCheck.rowCount > 0;
  const taskAcknowledgedAt = taskAcknowledged ? taskAckCheck.rows[0].acknowledged_at : null;

  // Record view event for task
  await recordSafetyAdvisorEvent(orgId, userId, siteId, 'view', entityType, entityId);

  return {
    ...baseSummary,
    entityType,
    entityId,
    entityInfo,
    isHighRisk,
    requiresAcknowledgement: isHighRisk,
    taskAcknowledged,
    taskAcknowledgedAt
  };
};

/**
 * Record a safety acknowledgement for a task
 * BR-11-18 (C-287), BR-11-19 (C-288)
 *
 * @param {number} orgId - Organisation ID
 * @param {number} userId - User ID
 * @param {string} entityType - Entity type
 * @param {number} entityId - Entity ID
 * @param {Object} options - Additional options
 * @returns {Object} Acknowledgement result
 */
const recordSafetyAcknowledgement = async (orgId, userId, entityType, entityId, options = {}) => {
  const { siteId = null, isHighRisk = false, safetySummarySnapshot = null } = options;

  // Upsert acknowledgement
  const result = await query(`
    INSERT INTO safety_acknowledgements (
      organisation_id, user_id, site_id, entity_type, entity_id,
      is_high_risk, acknowledged_at, safety_summary_snapshot
    )
    VALUES ($1, $2, $3, $4, $5, $6, NOW(), $7)
    ON CONFLICT (organisation_id, user_id, entity_type, entity_id) DO UPDATE
    SET acknowledged_at = NOW(), is_high_risk = $6, safety_summary_snapshot = COALESCE($7, safety_acknowledgements.safety_summary_snapshot)
    RETURNING *
  `, [orgId, userId, siteId, entityType, entityId, isHighRisk, safetySummarySnapshot ? JSON.stringify(safetySummarySnapshot) : null]);

  const row = result.rows[0];

  // Record in safety advisor events
  await recordSafetyAdvisorEvent(orgId, userId, siteId, 'acknowledge', entityType, entityId);

  // Record audit log
  await recordAudit({
    eventType: 'safety_acknowledged',
    entityType: entityType,
    entityId: entityId,
    userId: userId,
    metadata: { isHighRisk, siteId }
  });

  return {
    id: row.id,
    userId: row.user_id,
    entityType: row.entity_type,
    entityId: row.entity_id,
    isHighRisk: row.is_high_risk,
    acknowledgedAt: row.acknowledged_at
  };
};

/**
 * Check if a task has required safety acknowledgement
 * BR-11-18a, BR-11-18b (C-287a, C-287b)
 *
 * @param {number} orgId - Organisation ID
 * @param {number} userId - User ID
 * @param {string} entityType - Entity type
 * @param {number} entityId - Entity ID
 * @returns {Object} Acknowledgement status
 */
const checkSafetyAcknowledgement = async (orgId, userId, entityType, entityId) => {
  // Check if entity requires acknowledgement
  let isHighRisk = false;

  switch (entityType) {
    case 'incident': {
      const result = await query(`
        SELECT i.severity, it.requires_safety_acknowledgement
        FROM incidents i
        LEFT JOIN incident_types it ON it.id = i.type_id
        WHERE i.id = $1
      `, [entityId]);
      if (result.rowCount > 0) {
        const row = result.rows[0];
        isHighRisk = ['high', 'critical'].includes(row.severity) || row.requires_safety_acknowledgement;
      }
      break;
    }
    // Add other entity types as needed
    default:
      break;
  }

  // Check for existing acknowledgement
  const ackResult = await query(`
    SELECT id, acknowledged_at FROM safety_acknowledgements
    WHERE organisation_id = $1 AND user_id = $2
      AND entity_type = $3 AND entity_id = $4
    ORDER BY acknowledged_at DESC
    LIMIT 1
  `, [orgId, userId, entityType, entityId]);

  const acknowledged = ackResult.rowCount > 0;

  return {
    entityType,
    entityId,
    isHighRisk,
    requiresAcknowledgement: isHighRisk,
    acknowledged,
    acknowledgedAt: acknowledged ? ackResult.rows[0].acknowledged_at : null,
    canProceed: !isHighRisk || acknowledged
  };
};

/**
 * Get user's safety overview (My Safety)
 *
 * @param {number} orgId - Organisation ID
 * @param {number} userId - User ID
 * @param {string} userRole - User's role
 * @param {number} primarySiteId - User's primary site ID (optional)
 * @returns {Object} User's safety overview
 */
const getUserSafetyOverview = async (orgId, userId, userRole, primarySiteId = null) => {
  // Get today's safety moment
  const safetyMoment = await getTodaysSafetyMoment(orgId, userId, userRole, primarySiteId);

  // Get recent acknowledgements
  const recentAcks = await query(`
    SELECT sa.entity_type, sa.entity_id, sa.acknowledged_at, sa.is_high_risk
    FROM safety_acknowledgements sa
    WHERE sa.organisation_id = $1 AND sa.user_id = $2
    ORDER BY sa.acknowledged_at DESC
    LIMIT 10
  `, [orgId, userId]);

  // Get pending high-risk tasks without acknowledgement
  const pendingHighRisk = await query(`
    SELECT 'incident' as entity_type, i.id as entity_id, i.title, i.site_id
    FROM incidents i
    LEFT JOIN incident_types it ON it.id = i.type_id
    LEFT JOIN safety_acknowledgements sa ON sa.entity_type = 'incident' AND sa.entity_id = i.id AND sa.user_id = $2
    WHERE i.organisation_id = $1
      AND i.reported_by = $2
      AND i.status != 'closed'
      AND (i.severity IN ('high', 'critical') OR it.requires_safety_acknowledgement = TRUE)
      AND sa.id IS NULL
    ORDER BY i.created_at DESC
    LIMIT 5
  `, [orgId, userId]);

  // Get weather for primary site if set
  let primarySiteWeather = null;
  if (primarySiteId) {
    primarySiteWeather = await getWeatherForSite(primarySiteId, orgId);
  }

  return {
    safetyMoment,
    recentAcknowledgements: recentAcks.rows.map(row => ({
      entityType: row.entity_type,
      entityId: row.entity_id,
      acknowledgedAt: row.acknowledged_at,
      isHighRisk: row.is_high_risk
    })),
    pendingHighRiskTasks: pendingHighRisk.rows.map(row => ({
      entityType: row.entity_type,
      entityId: row.entity_id,
      title: row.title,
      siteId: row.site_id
    })),
    primarySiteWeather: primarySiteWeather ? {
      status: primarySiteWeather.status,
      tempC: primarySiteWeather.tempC,
      condition: primarySiteWeather.condition,
      summaryText: primarySiteWeather.summaryText
    } : null
  };
};

/**
 * Get tasks missing required safety acknowledgement
 * BR-11-20 (C-289)
 *
 * @param {number} orgId - Organisation ID
 * @param {Object} options - Filter options
 * @returns {Object} List of tasks missing acknowledgement
 */
const getMissingAcknowledgements = async (orgId, options = {}) => {
  const { siteId = null, userId = null, limit = 50 } = options;

  const conditions = [];
  const values = [orgId];
  let paramIndex = 2;

  if (siteId) {
    values.push(siteId);
    conditions.push(`i.site_id = $${paramIndex++}`);
  }

  if (userId) {
    values.push(userId);
    conditions.push(`i.reported_by = $${paramIndex++}`);
  }

  const whereClause = conditions.length ? `AND ${conditions.join(' AND ')}` : '';

  // Get high-risk incidents without acknowledgements
  const incidents = await query(`
    SELECT
      i.id,
      i.title,
      i.severity,
      i.site_id,
      s.name as site_name,
      i.reported_by,
      u.name as reported_by_name,
      i.created_at
    FROM incidents i
    JOIN sites s ON s.id = i.site_id
    JOIN users u ON u.id = i.reported_by
    LEFT JOIN incident_types it ON it.id = i.type_id
    WHERE i.status != 'closed'
      AND (i.severity IN ('high', 'critical') OR it.requires_safety_acknowledgement = TRUE)
      AND NOT EXISTS (
        SELECT 1 FROM safety_acknowledgements sa
        WHERE sa.entity_type = 'incident' AND sa.entity_id = i.id
      )
      ${whereClause}
    ORDER BY i.created_at DESC
    LIMIT $${paramIndex}
  `, [...values, limit]);

  return {
    incidents: incidents.rows.map(row => ({
      id: row.id,
      title: row.title,
      severity: row.severity,
      siteId: row.site_id,
      siteName: row.site_name,
      reportedBy: {
        id: row.reported_by,
        name: row.reported_by_name
      },
      createdAt: row.created_at
    })),
    total: incidents.rowCount
  };
};

/**
 * Record a safety advisor event for analytics
 *
 * @param {number} orgId - Organisation ID
 * @param {number} userId - User ID
 * @param {number} siteId - Site ID
 * @param {string} eventType - Event type (view, acknowledge, dismiss)
 * @param {string} entityType - Entity type (optional)
 * @param {number} entityId - Entity ID (optional)
 */
const recordSafetyAdvisorEvent = async (orgId, userId, siteId, eventType, entityType = null, entityId = null) => {
  try {
    await query(`
      INSERT INTO safety_advisor_events (organisation_id, user_id, site_id, event_type, entity_type, entity_id, created_at)
      VALUES ($1, $2, $3, $4, $5, $6, NOW())
    `, [orgId, userId, siteId, eventType, entityType, entityId]);
  } catch (error) {
    // Non-critical, log and continue
    console.error('[SafetyAdvisorService] Failed to record event:', error.message);
  }
};

/**
 * Get Safety Advisor analytics
 * BR-11-24, BR-11-25 (C-293, C-294)
 *
 * @param {number} orgId - Organisation ID
 * @param {Object} options - Filter options
 * @returns {Object} Analytics data
 */
const getSafetyAdvisorAnalytics = async (orgId, options = {}) => {
  const { startDate, endDate, siteId } = options;

  const conditions = ['organisation_id = $1'];
  const values = [orgId];
  let paramIndex = 2;

  if (startDate) {
    values.push(startDate);
    conditions.push(`created_at >= $${paramIndex++}::date`);
  }

  if (endDate) {
    values.push(endDate);
    conditions.push(`created_at <= $${paramIndex++}::date`);
  }

  if (siteId) {
    values.push(siteId);
    conditions.push(`site_id = $${paramIndex++}`);
  }

  const whereClause = conditions.join(' AND ');

  // Total events by type
  const eventsByType = await query(`
    SELECT event_type, COUNT(*) as count
    FROM safety_advisor_events
    WHERE ${whereClause}
    GROUP BY event_type
  `, values);

  // Unique users
  const uniqueUsers = await query(`
    SELECT COUNT(DISTINCT user_id) as count
    FROM safety_advisor_events
    WHERE ${whereClause}
  `, values);

  // Acknowledgement rate (acknowledged / viewed)
  const views = eventsByType.rows.find(r => r.event_type === 'view')?.count || 0;
  const acknowledges = eventsByType.rows.find(r => r.event_type === 'acknowledge')?.count || 0;

  // Coverage in last 30 days (for dashboard widget)
  const coverageResult = await query(`
    SELECT
      (SELECT COUNT(DISTINCT sa.entity_type || '-' || sa.entity_id)
       FROM safety_acknowledgements sa
       WHERE sa.organisation_id = $1 AND sa.acknowledged_at >= NOW() - INTERVAL '30 days') as acknowledged_count,
      (SELECT COUNT(*)
       FROM incidents i
       LEFT JOIN incident_types it ON it.id = i.type_id
       WHERE i.status != 'closed'
         AND (i.severity IN ('high', 'critical') OR it.requires_safety_acknowledgement = TRUE)
         AND i.created_at >= NOW() - INTERVAL '30 days') as high_risk_count
  `, [orgId]);

  const coverageRow = coverageResult.rows[0];
  const acknowledgedCount = parseInt(coverageRow.acknowledged_count);
  const highRiskCount = parseInt(coverageRow.high_risk_count);

  return {
    eventsByType: eventsByType.rows.reduce((acc, row) => {
      acc[row.event_type] = parseInt(row.count);
      return acc;
    }, {}),
    uniqueUsers: parseInt(uniqueUsers.rows[0].count),
    acknowledgementRate: views > 0 ? Math.round((acknowledges / views) * 100) : 0,
    coverage30Days: {
      acknowledged: acknowledgedCount,
      total: highRiskCount,
      percentage: highRiskCount > 0 ? Math.round((acknowledgedCount / highRiskCount) * 100) : 100
    }
  };
};

module.exports = {
  getSafetySummaryForSite,
  getSafetySummaryForTask,
  recordSafetyAcknowledgement,
  checkSafetyAcknowledgement,
  getUserSafetyOverview,
  getMissingAcknowledgements,
  recordSafetyAdvisorEvent,
  getSafetyAdvisorAnalytics
};

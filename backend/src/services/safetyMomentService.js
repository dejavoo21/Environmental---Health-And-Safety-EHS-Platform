/**
 * SafetyMomentService - Phase 11
 *
 * Handles Safety Moments: create, list, acknowledge, and analytics.
 * BR-11-01 to BR-11-05 (C-270 to C-274)
 */

const { query } = require('../config/db');
const { recordAudit } = require('../utils/audit');

/**
 * Get today's applicable Safety Moment for a user
 * BR-11-02 (C-271)
 *
 * @param {number} orgId - Organisation ID
 * @param {number} userId - User ID
 * @param {string} userRole - User's role
 * @param {number} siteId - Optional primary site ID
 * @returns {Object|null} Today's safety moment or null
 */
const getTodaysSafetyMoment = async (orgId, userId, userRole, siteId = null) => {
  const today = new Date().toISOString().split('T')[0];

  const result = await query(`
    SELECT
      sm.id,
      sm.title,
      sm.body,
      sm.category,
      sm.tags,
      sm.start_date,
      sm.end_date,
      EXISTS(
        SELECT 1 FROM safety_moment_acknowledgements sma
        WHERE sma.safety_moment_id = sm.id
          AND sma.user_id = $2
          AND sma.acknowledged_at::date = $4::date
      ) as acknowledged
    FROM safety_moments sm
    WHERE sm.organisation_id = $1
      AND sm.is_active = TRUE
      AND sm.deleted_at IS NULL
      AND sm.start_date <= $4::date
      AND (sm.end_date IS NULL OR sm.end_date >= $4::date)
      AND (
        sm.applicable_sites IS NULL
        OR cardinality(sm.applicable_sites) = 0
        OR $3::uuid = ANY(sm.applicable_sites)
      )
      AND (
        sm.applicable_roles IS NULL
        OR cardinality(sm.applicable_roles) = 0
        OR $5 = ANY(sm.applicable_roles)
      )
    ORDER BY sm.start_date DESC, sm.created_at DESC
    LIMIT 1
  `, [orgId, userId, siteId, today, userRole]);

  if (result.rowCount === 0) {
    return null;
  }

  const row = result.rows[0];
  return {
    id: row.id,
    title: row.title,
    body: row.body,
    category: row.category,
    tags: row.tags || [],
    acknowledged: row.acknowledged
  };
};

/**
 * Get Safety Moments list with pagination and filters
 * BR-11-04 (C-273)
 *
 * @param {number} orgId - Organisation ID
 * @param {Object} options - Query options
 * @returns {Object} Paginated list of safety moments
 */
const getSafetyMoments = async (orgId, options = {}) => {
  const {
    page = 1,
    limit = 20,
    category = null,
    isActive = null,
    siteId = null,
    includeArchived = false
  } = options;

  const offset = (page - 1) * limit;
  const conditions = ['sm.organisation_id = $1'];
  const values = [orgId];
  let paramIndex = 2;

  if (!includeArchived) {
    conditions.push('sm.deleted_at IS NULL');
  }

  if (isActive !== null) {
    values.push(isActive);
    conditions.push(`sm.is_active = $${paramIndex++}`);
  }

  if (category) {
    values.push(category);
    conditions.push(`sm.category = $${paramIndex++}`);
  }

  if (siteId) {
    values.push(siteId);
    conditions.push(`($${paramIndex++}::uuid = ANY(sm.applicable_sites) OR sm.applicable_sites IS NULL OR cardinality(sm.applicable_sites) = 0)`);
  }

  const whereClause = conditions.join(' AND ');

  // Get total count
  const countResult = await query(
    `SELECT COUNT(*) as total FROM safety_moments sm WHERE ${whereClause}`,
    values
  );
  const total = parseInt(countResult.rows[0].total);

  // Get paginated results
  values.push(limit, offset);
  const result = await query(`
    SELECT
      sm.id,
      sm.title,
      sm.body,
      sm.category,
      sm.tags,
      sm.applicable_sites,
      sm.applicable_roles,
      sm.start_date,
      sm.end_date,
      sm.is_active,
      sm.created_at,
      sm.updated_at,
      u.name as created_by_name,
      (SELECT COUNT(*) FROM safety_moment_acknowledgements sma WHERE sma.safety_moment_id = sm.id) as acknowledgement_count
    FROM safety_moments sm
    LEFT JOIN users u ON u.id = sm.created_by
    WHERE ${whereClause}
    ORDER BY sm.start_date DESC, sm.created_at DESC
    LIMIT $${paramIndex++} OFFSET $${paramIndex++}
  `, values);

  return {
    data: result.rows.map(row => ({
      id: row.id,
      title: row.title,
      body: row.body,
      category: row.category,
      tags: row.tags || [],
      applicableSites: row.applicable_sites || [],
      applicableRoles: row.applicable_roles || [],
      startDate: row.start_date,
      endDate: row.end_date,
      isActive: row.is_active,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      createdByName: row.created_by_name,
      acknowledgementCount: parseInt(row.acknowledgement_count)
    })),
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit)
    }
  };
};

/**
 * Create a new Safety Moment
 * BR-11-04 (C-273)
 *
 * @param {number} orgId - Organisation ID
 * @param {Object} data - Safety moment data
 * @param {number} userId - User creating the moment
 * @returns {Object} Created safety moment
 */
const createSafetyMoment = async (orgId, data, userId) => {
  const {
    title,
    body,
    category,
    tags = [],
    applicableSites = [],
    applicableRoles = [],
    startDate,
    endDate,
    isActive = true
  } = data;

  const result = await query(`
    INSERT INTO safety_moments (
      organisation_id, title, body, category, tags,
      applicable_sites, applicable_roles,
      start_date, end_date, is_active,
      created_by, created_at
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW())
    RETURNING *
  `, [
    orgId, title, body, category, tags,
    applicableSites.length ? applicableSites : null,
    applicableRoles.length ? applicableRoles : null,
    startDate, endDate || null, isActive, userId
  ]);

  const row = result.rows[0];

  await recordAudit({
    eventType: 'created',
    entityType: 'safety_moment',
    entityId: row.id,
    userId,
    newValue: { title, category, startDate, endDate, isActive }
  });

  return {
    id: row.id,
    title: row.title,
    body: row.body,
    category: row.category,
    tags: row.tags || [],
    applicableSites: row.applicable_sites || [],
    applicableRoles: row.applicable_roles || [],
    startDate: row.start_date,
    endDate: row.end_date,
    isActive: row.is_active,
    createdAt: row.created_at
  };
};

/**
 * Update a Safety Moment
 * BR-11-04 (C-273)
 *
 * @param {number} orgId - Organisation ID
 * @param {number} momentId - Safety moment ID
 * @param {Object} data - Update data
 * @param {number} userId - User updating the moment
 * @returns {Object} Updated safety moment
 */
const updateSafetyMoment = async (orgId, momentId, data, userId) => {
  const {
    title,
    body,
    category,
    tags,
    applicableSites,
    applicableRoles,
    startDate,
    endDate,
    isActive
  } = data;

  // Check moment exists and belongs to org
  const existing = await query(
    'SELECT * FROM safety_moments WHERE id = $1 AND organisation_id = $2 AND deleted_at IS NULL',
    [momentId, orgId]
  );

  if (existing.rowCount === 0) {
    return null;
  }

  const oldValues = existing.rows[0];

  const result = await query(`
    UPDATE safety_moments
    SET
      title = COALESCE($3, title),
      body = COALESCE($4, body),
      category = COALESCE($5, category),
      tags = COALESCE($6, tags),
      applicable_sites = COALESCE($7, applicable_sites),
      applicable_roles = COALESCE($8, applicable_roles),
      start_date = COALESCE($9, start_date),
      end_date = COALESCE($10, end_date),
      is_active = COALESCE($11, is_active),
      updated_by = $12,
      updated_at = NOW()
    WHERE id = $1 AND organisation_id = $2
    RETURNING *
  `, [
    momentId, orgId,
    title, body, category, tags,
    applicableSites !== undefined ? (applicableSites.length ? applicableSites : null) : undefined,
    applicableRoles !== undefined ? (applicableRoles.length ? applicableRoles : null) : undefined,
    startDate, endDate, isActive, userId
  ]);

  const row = result.rows[0];

  await recordAudit({
    eventType: 'updated',
    entityType: 'safety_moment',
    entityId: row.id,
    userId,
    oldValue: { title: oldValues.title, isActive: oldValues.is_active },
    newValue: { title: row.title, isActive: row.is_active }
  });

  return {
    id: row.id,
    title: row.title,
    body: row.body,
    category: row.category,
    tags: row.tags || [],
    applicableSites: row.applicable_sites || [],
    applicableRoles: row.applicable_roles || [],
    startDate: row.start_date,
    endDate: row.end_date,
    isActive: row.is_active,
    updatedAt: row.updated_at
  };
};

/**
 * Archive (soft delete) a Safety Moment
 * BR-11-04 (C-273)
 *
 * @param {number} orgId - Organisation ID
 * @param {number} momentId - Safety moment ID
 * @param {number} userId - User archiving the moment
 * @returns {boolean} Success status
 */
const archiveSafetyMoment = async (orgId, momentId, userId) => {
  const result = await query(`
    UPDATE safety_moments
    SET deleted_at = NOW(), updated_by = $3
    WHERE id = $1 AND organisation_id = $2 AND deleted_at IS NULL
    RETURNING id
  `, [momentId, orgId, userId]);

  if (result.rowCount === 0) {
    return false;
  }

  await recordAudit({
    eventType: 'archived',
    entityType: 'safety_moment',
    entityId: momentId,
    userId,
    newValue: { archived: true }
  });

  return true;
};

/**
 * Record a Safety Moment acknowledgement
 * BR-11-03 (C-272)
 *
 * @param {number} orgId - Organisation ID
 * @param {number} momentId - Safety moment ID
 * @param {number} userId - User acknowledging
 * @param {Object} context - Context of acknowledgement
 * @returns {Object} Acknowledgement record
 */
const acknowledgeSafetyMoment = async (orgId, momentId, userId, context = {}) => {
  const { siteId = null, channel = 'dashboard', entityType = null, entityId = null } = context;

  // Verify moment exists
  const momentCheck = await query(
    'SELECT id, title FROM safety_moments WHERE id = $1 AND organisation_id = $2 AND deleted_at IS NULL',
    [momentId, orgId]
  );

  if (momentCheck.rowCount === 0) {
    return null;
  }

  // Upsert acknowledgement (on conflict do nothing for duplicate)
  const result = await query(`
    INSERT INTO safety_moment_acknowledgements (
      organisation_id, safety_moment_id, user_id, site_id, channel, entity_type, entity_id, acknowledged_at
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
    ON CONFLICT ON CONSTRAINT safety_moment_acknowledgements_pkey DO NOTHING
    RETURNING *
  `, [orgId, momentId, userId, siteId, channel, entityType, entityId]);

  // If already existed, fetch it
  if (result.rowCount === 0) {
    const existing = await query(`
      SELECT * FROM safety_moment_acknowledgements
      WHERE organisation_id = $1 AND safety_moment_id = $2 AND user_id = $3
        AND COALESCE(entity_type, '') = COALESCE($4, '')
        AND COALESCE(entity_id, 0) = COALESCE($5, 0)
    `, [orgId, momentId, userId, entityType, entityId]);

    if (existing.rowCount > 0) {
      return {
        id: existing.rows[0].id,
        safetyMomentId: momentId,
        userId,
        siteId: existing.rows[0].site_id,
        channel: existing.rows[0].channel,
        entityType: existing.rows[0].entity_type,
        entityId: existing.rows[0].entity_id,
        acknowledgedAt: existing.rows[0].acknowledged_at,
        alreadyAcknowledged: true
      };
    }
    return null;
  }

  const row = result.rows[0];

  await recordAudit({
    eventType: 'acknowledged',
    entityType: 'safety_moment',
    entityId: momentId,
    userId,
    metadata: { channel, entityType, entityId }
  });

  return {
    id: row.id,
    safetyMomentId: momentId,
    userId,
    siteId: row.site_id,
    channel: row.channel,
    entityType: row.entity_type,
    entityId: row.entity_id,
    acknowledgedAt: row.acknowledged_at,
    alreadyAcknowledged: false
  };
};

/**
 * Get Safety Moment analytics
 * BR-11-05 (C-274)
 *
 * @param {number} orgId - Organisation ID
 * @param {Object} options - Filter options
 * @returns {Object} Analytics data
 */
const getSafetyMomentAnalytics = async (orgId, options = {}) => {
  const { startDate, endDate, siteId } = options;

  const conditions = ['sma.organisation_id = $1'];
  const values = [orgId];
  let paramIndex = 2;

  if (startDate) {
    values.push(startDate);
    conditions.push(`sma.acknowledged_at >= $${paramIndex++}::date`);
  }

  if (endDate) {
    values.push(endDate);
    conditions.push(`sma.acknowledged_at <= $${paramIndex++}::date`);
  }

  if (siteId) {
    values.push(siteId);
    conditions.push(`sma.site_id = $${paramIndex++}`);
  }

  const whereClause = conditions.join(' AND ');

  // Total acknowledgements
  const totalAcks = await query(`
    SELECT COUNT(*) as count FROM safety_moment_acknowledgements sma
    WHERE ${whereClause}
  `, values);

  // Acknowledgements by channel
  const byChannel = await query(`
    SELECT channel, COUNT(*) as count
    FROM safety_moment_acknowledgements sma
    WHERE ${whereClause}
    GROUP BY channel
  `, values);

  // Coverage: unique users who acknowledged vs total users
  const coverage = await query(`
    SELECT
      (SELECT COUNT(DISTINCT user_id) FROM safety_moment_acknowledgements sma WHERE ${whereClause}) as acknowledged_users,
      (SELECT COUNT(*) FROM users u WHERE u.organisation_id = $1 AND u.deleted_at IS NULL) as total_users
  `, values);

  // Top unread safety moments
  const topUnread = await query(`
    SELECT
      sm.id,
      sm.title,
      sm.category,
      (SELECT COUNT(*) FROM users u WHERE u.organisation_id = $1 AND u.deleted_at IS NULL) -
      (SELECT COUNT(DISTINCT user_id) FROM safety_moment_acknowledgements sma WHERE sma.safety_moment_id = sm.id) as unread_count
    FROM safety_moments sm
    WHERE sm.organisation_id = $1 AND sm.is_active = TRUE AND sm.deleted_at IS NULL
    ORDER BY unread_count DESC
    LIMIT 5
  `, [orgId]);

  const coverageRow = coverage.rows[0];
  const acknowledgedUsers = parseInt(coverageRow.acknowledged_users);
  const totalUsers = parseInt(coverageRow.total_users);

  return {
    totalAcknowledgements: parseInt(totalAcks.rows[0].count),
    byChannel: byChannel.rows.reduce((acc, row) => {
      acc[row.channel] = parseInt(row.count);
      return acc;
    }, {}),
    coverage: {
      acknowledgedUsers,
      totalUsers,
      percentage: totalUsers > 0 ? Math.round((acknowledgedUsers / totalUsers) * 100) : 0
    },
    topUnread: topUnread.rows.map(row => ({
      id: row.id,
      title: row.title,
      category: row.category,
      unreadCount: parseInt(row.unread_count)
    }))
  };
};

module.exports = {
  getTodaysSafetyMoment,
  getSafetyMoments,
  createSafetyMoment,
  updateSafetyMoment,
  archiveSafetyMoment,
  acknowledgeSafetyMoment,
  getSafetyMomentAnalytics
};

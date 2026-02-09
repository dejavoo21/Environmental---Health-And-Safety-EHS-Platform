/**
 * PPERecommendationService - Phase 11
 *
 * Handles PPE recommendation rules and resolution.
 * BR-11-10 to BR-11-12 (C-279 to C-281)
 */

const { query } = require('../config/db');
const { recordAudit } = require('../utils/audit');

/**
 * Weather condition categories based on weather data
 */
const categorizeWeather = (weatherData) => {
  if (!weatherData) return 'normal';

  const temp = weatherData.tempC || weatherData.main?.temp;
  const windSpeed = weatherData.windKph || weatherData.wind?.speed;
  const precipitation = weatherData.precipMm || weatherData.rain?.['1h'] || 0;
  const humidity = weatherData.humidity || weatherData.main?.humidity;

  // Prioritize conditions
  if (temp !== undefined) {
    if (temp >= 35) return 'hot';
    if (temp <= 5) return 'cold';
  }

  if (windSpeed !== undefined && windSpeed >= 40) return 'windy';

  if (precipitation > 0 || (humidity !== undefined && humidity >= 90)) return 'wet';

  return 'normal';
};

/**
 * Get PPE recommendations for a site/task/weather combination
 * BR-11-10, BR-11-11, BR-11-12 (C-279, C-280, C-281)
 *
 * @param {number} orgId - Organisation ID
 * @param {number} siteId - Site ID
 * @param {Object} options - Additional options
 * @returns {Object} PPE recommendations
 */
const getPPERecommendations = async (orgId, siteId, options = {}) => {
  const { taskType = null, permitTypeId = null, weatherData = null } = options;

  const weatherCategory = categorizeWeather(weatherData);

  // Build query to get all applicable recommendations
  // Priority: specific (site + task + weather) > site + task > site + weather > site only > global
  const result = await query(`
    SELECT
      id,
      site_id,
      task_type,
      permit_type_id,
      weather_category,
      recommendation_text,
      ppe_list,
      priority
    FROM ppe_recommendations
    WHERE organisation_id = $1
      AND is_active = TRUE
      AND deleted_at IS NULL
      AND (site_id = $2 OR site_id IS NULL)
      AND (task_type = $3 OR task_type IS NULL)
      AND (permit_type_id = $4 OR permit_type_id IS NULL)
      AND (weather_category = $5 OR weather_category IS NULL)
    ORDER BY
      CASE WHEN site_id IS NOT NULL THEN 0 ELSE 1 END,
      CASE WHEN task_type IS NOT NULL THEN 0 ELSE 1 END,
      CASE WHEN weather_category IS NOT NULL THEN 0 ELSE 1 END,
      priority ASC
  `, [orgId, siteId, taskType, permitTypeId, weatherCategory]);

  // Combine recommendations, avoiding duplicates
  const seenItems = new Set();
  const items = [];
  const recommendations = [];

  for (const row of result.rows) {
    // Add PPE items from ppe_list
    if (row.ppe_list && Array.isArray(row.ppe_list)) {
      for (const item of row.ppe_list) {
        const normalizedItem = item.toLowerCase().trim();
        if (!seenItems.has(normalizedItem)) {
          seenItems.add(normalizedItem);
          items.push(item);
        }
      }
    }

    // Add recommendation text
    if (row.recommendation_text) {
      recommendations.push({
        id: row.id,
        text: row.recommendation_text,
        weatherTriggered: row.weather_category !== null,
        taskTriggered: row.task_type !== null,
        weatherCategory: row.weather_category,
        taskType: row.task_type
      });
    }
  }

  // Generate summary text
  const summaryParts = [];
  if (weatherCategory !== 'normal') {
    summaryParts.push(`Weather conditions: ${weatherCategory}`);
  }
  if (items.length > 0) {
    summaryParts.push(`Required PPE: ${items.join(', ')}`);
  }

  return {
    items,
    recommendations,
    weatherCategory,
    summary: summaryParts.join('. ') || 'Standard PPE requirements apply',
    count: items.length
  };
};

/**
 * List all PPE recommendation rules
 *
 * @param {number} orgId - Organisation ID
 * @param {Object} options - Filter options
 * @returns {Object} Paginated list of PPE rules
 */
const getPPERules = async (orgId, options = {}) => {
  const {
    page = 1,
    limit = 20,
    siteId = null,
    taskType = null,
    weatherCategory = null,
    isActive = true
  } = options;

  const offset = (page - 1) * limit;
  const conditions = ['pr.organisation_id = $1', 'pr.deleted_at IS NULL'];
  const values = [orgId];
  let paramIndex = 2;

  if (isActive !== null) {
    values.push(isActive);
    conditions.push(`pr.is_active = $${paramIndex++}`);
  }

  if (siteId) {
    values.push(siteId);
    conditions.push(`pr.site_id = $${paramIndex++}`);
  }

  if (taskType) {
    values.push(taskType);
    conditions.push(`pr.task_type = $${paramIndex++}`);
  }

  if (weatherCategory) {
    values.push(weatherCategory);
    conditions.push(`pr.weather_category = $${paramIndex++}`);
  }

  const whereClause = conditions.join(' AND ');

  // Get total count
  const countResult = await query(
    `SELECT COUNT(*) as total FROM ppe_recommendations pr WHERE ${whereClause}`,
    values
  );
  const total = parseInt(countResult.rows[0].total);

  // Get paginated results
  values.push(limit, offset);
  const result = await query(`
    SELECT
      pr.id,
      pr.site_id,
      s.name as site_name,
      pr.task_type,
      pr.permit_type_id,
      pr.weather_category,
      pr.recommendation_text,
      pr.ppe_list,
      pr.priority,
      pr.is_active,
      pr.created_at,
      pr.updated_at
    FROM ppe_recommendations pr
    LEFT JOIN sites s ON s.id = pr.site_id
    WHERE ${whereClause}
    ORDER BY pr.priority ASC, pr.created_at DESC
    LIMIT $${paramIndex++} OFFSET $${paramIndex++}
  `, values);

  return {
    data: result.rows.map(row => ({
      id: row.id,
      siteId: row.site_id,
      siteName: row.site_name,
      taskType: row.task_type,
      permitTypeId: row.permit_type_id,
      weatherCategory: row.weather_category,
      recommendationText: row.recommendation_text,
      ppeList: row.ppe_list || [],
      priority: row.priority,
      isActive: row.is_active,
      createdAt: row.created_at,
      updatedAt: row.updated_at
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
 * Create a new PPE recommendation rule
 * BR-11-10 (C-279)
 *
 * @param {number} orgId - Organisation ID
 * @param {Object} data - Rule data
 * @param {number} userId - User creating the rule
 * @returns {Object} Created rule
 */
const createPPERule = async (orgId, data, userId) => {
  const {
    siteId = null,
    taskType = null,
    permitTypeId = null,
    weatherCategory = null,
    recommendationText,
    ppeList = [],
    priority = 99,
    isActive = true
  } = data;

  const result = await query(`
    INSERT INTO ppe_recommendations (
      organisation_id, site_id, task_type, permit_type_id, weather_category,
      recommendation_text, ppe_list, priority, is_active,
      created_by, created_at
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW())
    RETURNING *
  `, [orgId, siteId, taskType, permitTypeId, weatherCategory, recommendationText, ppeList, priority, isActive, userId]);

  const row = result.rows[0];

  await recordAudit({
    eventType: 'created',
    entityType: 'ppe_recommendation',
    entityId: row.id,
    userId,
    newValue: { siteId, taskType, weatherCategory, ppeList }
  });

  return {
    id: row.id,
    siteId: row.site_id,
    taskType: row.task_type,
    permitTypeId: row.permit_type_id,
    weatherCategory: row.weather_category,
    recommendationText: row.recommendation_text,
    ppeList: row.ppe_list || [],
    priority: row.priority,
    isActive: row.is_active,
    createdAt: row.created_at
  };
};

/**
 * Update a PPE recommendation rule
 *
 * @param {number} orgId - Organisation ID
 * @param {number} ruleId - Rule ID
 * @param {Object} data - Update data
 * @param {number} userId - User updating the rule
 * @returns {Object|null} Updated rule or null if not found
 */
const updatePPERule = async (orgId, ruleId, data, userId) => {
  const {
    siteId,
    taskType,
    permitTypeId,
    weatherCategory,
    recommendationText,
    ppeList,
    priority,
    isActive
  } = data;

  // Check exists
  const existing = await query(
    'SELECT * FROM ppe_recommendations WHERE id = $1 AND organisation_id = $2 AND deleted_at IS NULL',
    [ruleId, orgId]
  );

  if (existing.rowCount === 0) {
    return null;
  }

  const result = await query(`
    UPDATE ppe_recommendations
    SET
      site_id = COALESCE($3, site_id),
      task_type = COALESCE($4, task_type),
      permit_type_id = COALESCE($5, permit_type_id),
      weather_category = COALESCE($6, weather_category),
      recommendation_text = COALESCE($7, recommendation_text),
      ppe_list = COALESCE($8, ppe_list),
      priority = COALESCE($9, priority),
      is_active = COALESCE($10, is_active),
      updated_by = $11,
      updated_at = NOW()
    WHERE id = $1 AND organisation_id = $2
    RETURNING *
  `, [ruleId, orgId, siteId, taskType, permitTypeId, weatherCategory, recommendationText, ppeList, priority, isActive, userId]);

  const row = result.rows[0];

  await recordAudit({
    eventType: 'updated',
    entityType: 'ppe_recommendation',
    entityId: row.id,
    userId,
    newValue: { siteId: row.site_id, taskType: row.task_type, ppeList: row.ppe_list }
  });

  return {
    id: row.id,
    siteId: row.site_id,
    taskType: row.task_type,
    permitTypeId: row.permit_type_id,
    weatherCategory: row.weather_category,
    recommendationText: row.recommendation_text,
    ppeList: row.ppe_list || [],
    priority: row.priority,
    isActive: row.is_active,
    updatedAt: row.updated_at
  };
};

/**
 * Delete a PPE recommendation rule (soft delete)
 *
 * @param {number} orgId - Organisation ID
 * @param {number} ruleId - Rule ID
 * @param {number} userId - User deleting the rule
 * @returns {boolean} Success status
 */
const deletePPERule = async (orgId, ruleId, userId) => {
  const result = await query(`
    UPDATE ppe_recommendations
    SET deleted_at = NOW(), updated_by = $3
    WHERE id = $1 AND organisation_id = $2 AND deleted_at IS NULL
    RETURNING id
  `, [ruleId, orgId, userId]);

  if (result.rowCount === 0) {
    return false;
  }

  await recordAudit({
    eventType: 'deleted',
    entityType: 'ppe_recommendation',
    entityId: ruleId,
    userId,
    newValue: { deleted: true }
  });

  return true;
};

module.exports = {
  categorizeWeather,
  getPPERecommendations,
  getPPERules,
  createPPERule,
  updatePPERule,
  deletePPERule
};

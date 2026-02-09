/**
 * Risk Score Service - Phase 5
 * Calculates and manages site risk scores
 */

const db = require('../config/db');

/**
 * Default risk scoring weights
 */
const DEFAULT_WEIGHTS = {
  incidentCritical: 10,
  incidentHigh: 5,
  incidentMedium: 2,
  incidentLow: 1,
  overdueAction: 3,
  failedInspection: 2
};

/**
 * Default risk category thresholds
 */
const DEFAULT_THRESHOLDS = {
  low: 10,      // 0-10: low
  medium: 30,   // 11-30: medium
  high: 50      // 31-50: high, 51+: critical
};

/**
 * Default scoring window in days
 */
const DEFAULT_SCORING_WINDOW_DAYS = 90;

/**
 * Get risk settings for an organisation
 * @param {string} orgId - Organisation ID
 * @returns {Promise<Object>} - Risk settings
 */
const getOrgRiskSettings = async (orgId) => {
  const result = await db.query(
    `SELECT risk_settings FROM organisations WHERE id = $1`,
    [orgId]
  );

  const settings = result.rows[0]?.risk_settings || {};

  return {
    enabled: settings.enabled !== false,
    scoringWindowDays: settings.scoringWindowDays || DEFAULT_SCORING_WINDOW_DAYS,
    weights: { ...DEFAULT_WEIGHTS, ...settings.weights },
    thresholds: { ...DEFAULT_THRESHOLDS, ...settings.thresholds }
  };
};

/**
 * Determine risk category based on score
 * @param {number} score - Risk score
 * @param {Object} thresholds - Category thresholds
 * @returns {string} - Category name
 */
const getRiskCategory = (score, thresholds = DEFAULT_THRESHOLDS) => {
  if (score > thresholds.high) return 'critical';
  if (score > thresholds.medium) return 'high';
  if (score > thresholds.low) return 'medium';
  return 'low';
};

/**
 * Determine primary contributing factor
 * @param {number} incidentScore - Incident component score
 * @param {number} actionScore - Action component score
 * @param {number} inspectionScore - Inspection component score
 * @returns {string|null} - Primary factor name
 */
const getPrimaryFactor = (incidentScore, actionScore, inspectionScore) => {
  const factors = [
    { name: 'Critical/High Severity Incidents', score: incidentScore },
    { name: 'Overdue Actions', score: actionScore },
    { name: 'Failed Inspections', score: inspectionScore }
  ];

  const max = factors.reduce((a, b) => (a.score > b.score ? a : b));
  return max.score > 0 ? max.name : null;
};

/**
 * Calculate risk score for a single site
 * @param {string} orgId - Organisation ID
 * @param {string} siteId - Site ID
 * @param {Object} settings - Risk settings (optional, will fetch if not provided)
 * @returns {Promise<Object>} - Calculated risk score details
 */
const calculateSiteRiskScore = async (orgId, siteId, settings = null) => {
  if (!settings) {
    settings = await getOrgRiskSettings(orgId);
  }

  const { weights, thresholds, scoringWindowDays } = settings;
  const windowStart = new Date();
  windowStart.setDate(windowStart.getDate() - scoringWindowDays);
  const windowStartStr = windowStart.toISOString().split('T')[0];

  // Get incident counts by severity
  const incidentQuery = `
    SELECT
      COALESCE(SUM(CASE WHEN LOWER(severity) = 'critical' THEN 1 ELSE 0 END), 0) as critical_count,
      COALESCE(SUM(CASE WHEN LOWER(severity) = 'high' THEN 1 ELSE 0 END), 0) as high_count,
      COALESCE(SUM(CASE WHEN LOWER(severity) = 'medium' THEN 1 ELSE 0 END), 0) as medium_count,
      COALESCE(SUM(CASE WHEN LOWER(severity) = 'low' THEN 1 ELSE 0 END), 0) as low_count
    FROM incidents
    WHERE organisation_id = $1
      AND site_id = $2
      AND occurred_at >= $3
      AND deleted_at IS NULL
  `;

  const incidentResult = await db.query(incidentQuery, [orgId, siteId, windowStartStr]);
  const incidents = incidentResult.rows[0];

  // Get overdue actions count
  const overdueQuery = `
    SELECT COUNT(*) as count
    FROM actions a
    JOIN incidents i ON a.source_id = i.id AND a.source_type = 'incident'
    WHERE i.organisation_id = $1
      AND i.site_id = $2
      AND a.status NOT IN ('completed', 'cancelled')
      AND a.due_date < CURRENT_DATE
      AND a.deleted_at IS NULL
  `;

  const overdueResult = await db.query(overdueQuery, [orgId, siteId]);
  const overdueActions = parseInt(overdueResult.rows[0]?.count) || 0;

  // Get failed inspections count
  const failedQuery = `
    SELECT COUNT(*) as count
    FROM inspections
    WHERE organisation_id = $1
      AND site_id = $2
      AND overall_result = 'fail'
      AND performed_at >= $3
      AND deleted_at IS NULL
  `;

  const failedResult = await db.query(failedQuery, [orgId, siteId, windowStartStr]);
  const failedInspections = parseInt(failedResult.rows[0]?.count) || 0;

  // Calculate component scores
  const criticalCount = parseInt(incidents.critical_count) || 0;
  const highCount = parseInt(incidents.high_count) || 0;
  const mediumCount = parseInt(incidents.medium_count) || 0;
  const lowCount = parseInt(incidents.low_count) || 0;

  const incidentScore =
    (criticalCount * weights.incidentCritical) +
    (highCount * weights.incidentHigh) +
    (mediumCount * weights.incidentMedium) +
    (lowCount * weights.incidentLow);

  const actionScore = overdueActions * weights.overdueAction;
  const inspectionScore = failedInspections * weights.failedInspection;

  const totalScore = incidentScore + actionScore + inspectionScore;
  const category = getRiskCategory(totalScore, thresholds);
  const primaryFactor = getPrimaryFactor(incidentScore, actionScore, inspectionScore);

  return {
    site_id: siteId,
    organisation_id: orgId,
    risk_score: totalScore,
    risk_category: category,
    incident_score: incidentScore,
    action_score: actionScore,
    inspection_score: inspectionScore,
    incidents_critical: criticalCount,
    incidents_high: highCount,
    incidents_medium: mediumCount,
    incidents_low: lowCount,
    overdue_actions: overdueActions,
    failed_inspections: failedInspections,
    primary_factor: primaryFactor,
    scoring_window_days: scoringWindowDays
  };
};

/**
 * Save risk score to database
 * @param {Object} riskScore - Risk score data
 */
const saveRiskScore = async (riskScore) => {
  const query = `
    INSERT INTO site_risk_scores (
      organisation_id, site_id, risk_score, risk_category,
      incident_score, action_score, inspection_score,
      incidents_critical, incidents_high, incidents_medium, incidents_low,
      overdue_actions, failed_inspections, primary_factor,
      scoring_window_days, calculated_at
    ) VALUES (
      $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, NOW()
    )
    ON CONFLICT (organisation_id, site_id)
    DO UPDATE SET
      risk_score = $3,
      risk_category = $4,
      incident_score = $5,
      action_score = $6,
      inspection_score = $7,
      incidents_critical = $8,
      incidents_high = $9,
      incidents_medium = $10,
      incidents_low = $11,
      overdue_actions = $12,
      failed_inspections = $13,
      primary_factor = $14,
      scoring_window_days = $15,
      calculated_at = NOW(),
      updated_at = NOW()
  `;

  await db.query(query, [
    riskScore.organisation_id,
    riskScore.site_id,
    riskScore.risk_score,
    riskScore.risk_category,
    riskScore.incident_score,
    riskScore.action_score,
    riskScore.inspection_score,
    riskScore.incidents_critical,
    riskScore.incidents_high,
    riskScore.incidents_medium,
    riskScore.incidents_low,
    riskScore.overdue_actions,
    riskScore.failed_inspections,
    riskScore.primary_factor,
    riskScore.scoring_window_days
  ]);
};

/**
 * Record risk score in history
 * @param {Object} riskScore - Risk score data
 */
const recordRiskHistory = async (riskScore) => {
  const today = new Date().toISOString().split('T')[0];

  const query = `
    INSERT INTO site_risk_score_history (
      organisation_id, site_id, risk_score, risk_category, recorded_date
    ) VALUES ($1, $2, $3, $4, $5)
    ON CONFLICT (organisation_id, site_id, recorded_date)
    DO UPDATE SET
      risk_score = $3,
      risk_category = $4
  `;

  await db.query(query, [
    riskScore.organisation_id,
    riskScore.site_id,
    riskScore.risk_score,
    riskScore.risk_category,
    today
  ]);
};

/**
 * Calculate risk scores for all sites in an organisation
 * @param {string} orgId - Organisation ID
 * @returns {Promise<Object>} - Summary of calculation
 */
const calculateAllSiteScoresForOrg = async (orgId) => {
  const settings = await getOrgRiskSettings(orgId);

  if (!settings.enabled) {
    console.log(`[RiskScoreService] Risk scoring disabled for org ${orgId}`);
    return { sitesProcessed: 0, skipped: true };
  }

  // Get all sites for this organisation
  const sitesResult = await db.query(
    `SELECT id FROM sites WHERE organisation_id = $1 AND deleted_at IS NULL`,
    [orgId]
  );

  let processed = 0;
  const errors = [];

  for (const site of sitesResult.rows) {
    try {
      const riskScore = await calculateSiteRiskScore(orgId, site.id, settings);
      await saveRiskScore(riskScore);
      await recordRiskHistory(riskScore);
      processed++;
    } catch (error) {
      console.error(`[RiskScoreService] Error calculating score for site ${site.id}:`, error.message);
      errors.push({ siteId: site.id, error: error.message });
    }
  }

  return { sitesProcessed: processed, errors };
};

/**
 * Calculate risk scores for all organisations
 * @returns {Promise<Object>} - Summary of calculation
 */
const calculateAllSiteScores = async () => {
  console.log('[RiskScoreService] Starting risk score calculation for all organisations');

  const result = {
    organisationsProcessed: 0,
    totalSitesProcessed: 0,
    errors: []
  };

  // Get all active organisations
  const orgsResult = await db.query(
    `SELECT id FROM organisations WHERE deleted_at IS NULL`
  );

  for (const org of orgsResult.rows) {
    try {
      const orgResult = await calculateAllSiteScoresForOrg(org.id);
      result.organisationsProcessed++;
      result.totalSitesProcessed += orgResult.sitesProcessed || 0;
      if (orgResult.errors?.length > 0) {
        result.errors.push(...orgResult.errors.map(e => ({ ...e, organisationId: org.id })));
      }
    } catch (error) {
      console.error(`[RiskScoreService] Error processing org ${org.id}:`, error.message);
      result.errors.push({ organisationId: org.id, error: error.message });
    }
  }

  console.log(`[RiskScoreService] Completed: ${result.organisationsProcessed} orgs, ${result.totalSitesProcessed} sites`);
  return result;
};

/**
 * Get risk scores for an organisation
 * @param {string} orgId - Organisation ID
 * @param {Object} options - Query options
 * @returns {Promise<Object[]>} - Risk scores with site info
 */
const getRiskScores = async (orgId, options = {}) => {
  const { category, limit, orderBy = 'risk_score DESC' } = options;

  let query = `
    SELECT
      srs.*,
      s.name as site_name,
      prev.risk_score as previous_score,
      prev.risk_category as previous_category
    FROM site_risk_scores srs
    JOIN sites s ON s.id = srs.site_id
    LEFT JOIN site_risk_score_history prev
      ON prev.site_id = srs.site_id
      AND prev.organisation_id = srs.organisation_id
      AND prev.recorded_date = CURRENT_DATE - INTERVAL '7 days'
    WHERE srs.organisation_id = $1
  `;

  const params = [orgId];
  let paramIndex = 2;

  if (category) {
    query += ` AND srs.risk_category = $${paramIndex}`;
    params.push(category);
    paramIndex++;
  }

  query += ` ORDER BY srs.${orderBy}`;

  if (limit) {
    query += ` LIMIT $${paramIndex}`;
    params.push(limit);
  }

  const result = await db.query(query, params);

  return result.rows.map(row => ({
    ...row,
    trend: row.previous_score !== null
      ? (row.risk_score > row.previous_score ? 'up' : row.risk_score < row.previous_score ? 'down' : 'stable')
      : null,
    trend_change: row.previous_score !== null
      ? row.risk_score - row.previous_score
      : null
  }));
};

/**
 * Get top high-risk sites
 * @param {string} orgId - Organisation ID
 * @param {number} limit - Number of sites to return
 * @returns {Promise<Object[]>} - Top risk sites
 */
const getTopRiskSites = async (orgId, limit = 5) => {
  return getRiskScores(orgId, { limit, orderBy: 'risk_score DESC' });
};

/**
 * Get risk score for a specific site
 * @param {string} orgId - Organisation ID
 * @param {string} siteId - Site ID
 * @returns {Promise<Object|null>} - Risk score or null
 */
const getSiteRiskScore = async (orgId, siteId) => {
  const query = `
    SELECT
      srs.*,
      s.name as site_name
    FROM site_risk_scores srs
    JOIN sites s ON s.id = srs.site_id
    WHERE srs.organisation_id = $1
      AND srs.site_id = $2
  `;

  const result = await db.query(query, [orgId, siteId]);
  return result.rows[0] || null;
};

/**
 * Get risk score history for a site
 * @param {string} orgId - Organisation ID
 * @param {string} siteId - Site ID
 * @param {number} days - Number of days of history
 * @returns {Promise<Object[]>} - Risk score history
 */
const getSiteRiskHistory = async (orgId, siteId, days = 90) => {
  const query = `
    SELECT recorded_date, risk_score, risk_category
    FROM site_risk_score_history
    WHERE organisation_id = $1
      AND site_id = $2
      AND recorded_date >= CURRENT_DATE - $3 * INTERVAL '1 day'
    ORDER BY recorded_date ASC
  `;

  const result = await db.query(query, [orgId, siteId, days]);
  return result.rows;
};

/**
 * Clean up old risk history records
 * @param {number} retentionDays - Days to retain
 * @returns {Promise<number>} - Number of deleted records
 */
const cleanupOldHistory = async (retentionDays = 365) => {
  const result = await db.query(
    `DELETE FROM site_risk_score_history
     WHERE recorded_date < CURRENT_DATE - $1 * INTERVAL '1 day'`,
    [retentionDays]
  );

  console.log(`[RiskScoreService] Cleaned up ${result.rowCount} old history records`);
  return result.rowCount;
};

module.exports = {
  calculateSiteRiskScore,
  calculateAllSiteScoresForOrg,
  calculateAllSiteScores,
  getRiskScores,
  getTopRiskSites,
  getSiteRiskScore,
  getSiteRiskHistory,
  cleanupOldHistory,
  getOrgRiskSettings,
  DEFAULT_WEIGHTS,
  DEFAULT_THRESHOLDS
};

/**
 * RiskAnalyticsService - Phase 9
 * Handles risk heatmap, top risks, trends, and analytics aggregations
 */

const { query } = require('../config/db');
const { AppError } = require('../utils/appError');

// =====================================================
// HEATMAP FUNCTIONS
// =====================================================

/**
 * Get heatmap data for 5x5 risk matrix
 */
const getHeatmapData = async (organisationId, options = {}) => {
  const {
    scoreType = 'residual', // 'inherent' or 'residual'
    categoryId,
    siteId,
    status = ['emerging', 'active', 'under_review', 'accepted'] // exclude closed by default
  } = options;
  
  // Determine which score columns to use
  const likelihoodCol = scoreType === 'inherent' ? 'inherent_likelihood' : 'residual_likelihood';
  const impactCol = scoreType === 'inherent' ? 'inherent_impact' : 'residual_impact';
  
  let sql = `
    SELECT 
      ${likelihoodCol} AS likelihood,
      ${impactCol} AS impact,
      COUNT(*) AS count,
      ARRAY_AGG(id) AS risk_ids
    FROM risks r
    WHERE r.organisation_id = $1
      AND r.${likelihoodCol} IS NOT NULL
      AND r.${impactCol} IS NOT NULL
  `;
  
  const values = [organisationId];
  let paramIndex = 2;
  
  // Filter by status
  if (status && status.length > 0) {
    sql += ` AND r.status = ANY($${paramIndex}::risk_status[])`;
    values.push(status);
    paramIndex++;
  }
  
  // Filter by category
  if (categoryId) {
    sql += ` AND r.category_id = $${paramIndex}`;
    values.push(categoryId);
    paramIndex++;
  }
  
  // Filter by site
  if (siteId) {
    sql += ` AND EXISTS (SELECT 1 FROM risk_sites rs WHERE rs.risk_id = r.id AND rs.site_id = $${paramIndex})`;
    values.push(siteId);
    paramIndex++;
  }
  
  sql += ` GROUP BY ${likelihoodCol}, ${impactCol}`;
  
  const result = await query(sql, values);
  
  // Build complete 5x5 matrix
  const matrix = [];
  for (let likelihood = 1; likelihood <= 5; likelihood++) {
    for (let impact = 1; impact <= 5; impact++) {
      const cell = result.rows.find(r => 
        parseInt(r.likelihood, 10) === likelihood && parseInt(r.impact, 10) === impact
      );
      
      const score = likelihood * impact;
      let level;
      if (score >= 17) level = 'extreme';
      else if (score >= 10) level = 'high';
      else if (score >= 5) level = 'medium';
      else level = 'low';
      
      matrix.push({
        likelihood,
        impact,
        level,
        count: cell ? parseInt(cell.count, 10) : 0,
        riskIds: cell ? cell.risk_ids : []
      });
    }
  }
  
  // Calculate summary
  const summary = {
    totalRisks: 0,
    byLevel: {
      low: 0,
      medium: 0,
      high: 0,
      extreme: 0
    }
  };
  
  matrix.forEach(cell => {
    summary.totalRisks += cell.count;
    summary.byLevel[cell.level] += cell.count;
  });
  
  return {
    scoreType,
    matrix,
    summary,
    filters: {
      categoryId: categoryId || null,
      siteId: siteId || null,
      status
    }
  };
};

// =====================================================
// TOP RISKS FUNCTIONS
// =====================================================

/**
 * Get top risks by score
 */
const getTopRisks = async (organisationId, options = {}) => {
  const {
    count = 5,
    scoreType = 'residual',
    categoryId,
    siteId
  } = options;
  
  const scoreCol = scoreType === 'inherent' ? 'inherent_score' : 'residual_score';
  const levelCol = scoreType === 'inherent' ? 'inherent_level' : 'residual_level';
  
  let sql = `
    SELECT r.id, r.reference_number, r.title, r.status,
           r.${scoreCol} AS score, r.${levelCol} AS level,
           r.next_review_date,
           u.name AS owner_name
    FROM risks r
    LEFT JOIN users u ON r.owner_user_id = u.id
    WHERE r.organisation_id = $1
      AND r.status NOT IN ('closed')
      AND r.${scoreCol} IS NOT NULL
  `;
  
  const values = [organisationId];
  let paramIndex = 2;
  
  if (categoryId) {
    sql += ` AND r.category_id = $${paramIndex}`;
    values.push(categoryId);
    paramIndex++;
  }
  
  if (siteId) {
    sql += ` AND EXISTS (SELECT 1 FROM risk_sites rs WHERE rs.risk_id = r.id AND rs.site_id = $${paramIndex})`;
    values.push(siteId);
    paramIndex++;
  }
  
  sql += ` ORDER BY r.${scoreCol} DESC, r.${levelCol} DESC LIMIT $${paramIndex}`;
  values.push(count);
  
  const result = await query(sql, values);
  
  return {
    risks: result.rows.map(row => ({
      id: row.id,
      reference: row.reference_number,
      title: row.title,
      status: row.status,
      score: row.score,
      level: row.level,
      nextReviewDate: row.next_review_date,
      ownerName: row.owner_name || null
    }))
  };
};

// =====================================================
// DIMENSION BREAKDOWNS
// =====================================================

/**
 * Get risks grouped by dimension
 */
const getRisksByDimension = async (organisationId, dimension, options = {}) => {
  const { excludeClosed = true } = options;
  
  let sql;
  const values = [organisationId];
  let statusFilter = excludeClosed ? "AND r.status != 'closed'" : '';
  
  switch (dimension) {
    case 'category':
      sql = `
        SELECT c.id, c.name, c.colour, COUNT(r.id) AS count,
               COUNT(*) FILTER (WHERE r.residual_level = 'extreme') AS extreme_count,
               COUNT(*) FILTER (WHERE r.residual_level = 'high') AS high_count,
               COUNT(*) FILTER (WHERE r.residual_level = 'medium') AS medium_count,
               COUNT(*) FILTER (WHERE r.residual_level = 'low') AS low_count
        FROM risk_categories c
        LEFT JOIN risks r ON c.id = r.category_id AND r.organisation_id = $1 ${statusFilter}
        WHERE (c.organisation_id = $1 OR c.organisation_id IS NULL) AND c.is_active = TRUE
        GROUP BY c.id, c.name, c.colour
        ORDER BY count DESC
      `;
      break;
      
    case 'status':
      sql = `
        SELECT status AS name, COUNT(*) AS count,
               COUNT(*) FILTER (WHERE residual_level = 'extreme') AS extreme_count,
               COUNT(*) FILTER (WHERE residual_level = 'high') AS high_count,
               COUNT(*) FILTER (WHERE residual_level = 'medium') AS medium_count,
               COUNT(*) FILTER (WHERE residual_level = 'low') AS low_count
        FROM risks
        WHERE organisation_id = $1
        GROUP BY status
        ORDER BY count DESC
      `;
      break;
      
    case 'owner':
      sql = `
        SELECT u.id, u.name, COUNT(r.id) AS count,
               COUNT(*) FILTER (WHERE r.residual_level = 'extreme') AS extreme_count,
               COUNT(*) FILTER (WHERE r.residual_level = 'high') AS high_count,
               COUNT(*) FILTER (WHERE r.residual_level = 'medium') AS medium_count,
               COUNT(*) FILTER (WHERE r.residual_level = 'low') AS low_count
        FROM users u
        LEFT JOIN risks r ON u.id = r.owner_user_id AND r.organisation_id = $1 ${statusFilter}
        WHERE u.organisation_id = $1
        GROUP BY u.id, u.name
        HAVING COUNT(r.id) > 0
        ORDER BY count DESC
      `;
      break;
      
    case 'site':
      sql = `
        SELECT s.id, s.name, COUNT(DISTINCT r.id) AS count,
               COUNT(*) FILTER (WHERE r.residual_level = 'extreme') AS extreme_count,
               COUNT(*) FILTER (WHERE r.residual_level = 'high') AS high_count,
               COUNT(*) FILTER (WHERE r.residual_level = 'medium') AS medium_count,
               COUNT(*) FILTER (WHERE r.residual_level = 'low') AS low_count
        FROM sites s
        LEFT JOIN risk_sites rs ON s.id = rs.site_id
        LEFT JOIN risks r ON rs.risk_id = r.id AND r.organisation_id = $1 ${statusFilter}
        WHERE s.organisation_id = $1 AND s.is_active = TRUE
        GROUP BY s.id, s.name
        ORDER BY count DESC
      `;
      break;
      
    case 'level':
      sql = `
        SELECT residual_level AS name, COUNT(*) AS count
        FROM risks
        WHERE organisation_id = $1 ${statusFilter} AND residual_level IS NOT NULL
        GROUP BY residual_level
        ORDER BY 
          CASE residual_level 
            WHEN 'extreme' THEN 1 
            WHEN 'high' THEN 2 
            WHEN 'medium' THEN 3 
            WHEN 'low' THEN 4 
          END
      `;
      break;
      
    default:
      throw new AppError('Invalid dimension', 400, 'INVALID_DIMENSION');
  }
  
  const result = await query(sql, values);
  
  return {
    dimension,
    data: result.rows.map(row => ({
      id: row.id,
      name: row.name,
      colour: row.colour,
      count: parseInt(row.count || 0, 10),
      byLevel: row.extreme_count !== undefined ? {
        extreme: parseInt(row.extreme_count || 0, 10),
        high: parseInt(row.high_count || 0, 10),
        medium: parseInt(row.medium_count || 0, 10),
        low: parseInt(row.low_count || 0, 10)
      } : undefined
    }))
  };
};

// =====================================================
// REVIEW COMPLIANCE
// =====================================================

/**
 * Get review compliance metrics
 */
const getReviewCompliance = async (organisationId) => {
  const result = await query(
    `SELECT 
       COUNT(*) AS total_active,
       COUNT(*) FILTER (WHERE next_review_date < CURRENT_DATE) AS overdue,
       COUNT(*) FILTER (WHERE next_review_date >= CURRENT_DATE AND next_review_date <= CURRENT_DATE + INTERVAL '7 days') AS due_7_days,
       COUNT(*) FILTER (WHERE next_review_date >= CURRENT_DATE AND next_review_date <= CURRENT_DATE + INTERVAL '30 days') AS due_30_days,
       COUNT(*) FILTER (WHERE last_reviewed_at IS NOT NULL) AS reviewed_at_least_once,
       AVG(CASE WHEN last_reviewed_at IS NOT NULL THEN EXTRACT(DAY FROM (NOW() - last_reviewed_at)) END) AS avg_days_since_review
     FROM risks
     WHERE organisation_id = $1 AND status NOT IN ('closed')`,
    [organisationId]
  );
  
  const data = result.rows[0];
  const totalActive = parseInt(data.total_active, 10);
  const overdue = parseInt(data.overdue, 10);
  const onTime = totalActive - overdue;
  
  return {
    totalActive,
    overdue,
    onTime,
    complianceRate: totalActive > 0 ? Math.round((onTime / totalActive) * 100) : 100,
    due7Days: parseInt(data.due_7_days, 10),
    due30Days: parseInt(data.due_30_days, 10),
    reviewedAtLeastOnce: parseInt(data.reviewed_at_least_once, 10),
    avgDaysSinceReview: data.avg_days_since_review ? Math.round(parseFloat(data.avg_days_since_review)) : null
  };
};

// =====================================================
// CONTROL EFFECTIVENESS
// =====================================================

/**
 * Get control effectiveness summary
 */
const getControlEffectiveness = async (organisationId) => {
  const result = await query(
    `SELECT 
       rc.effectiveness,
       COUNT(*) AS count
     FROM risk_controls rc
     JOIN risks r ON rc.risk_id = r.id
     WHERE r.organisation_id = $1 AND rc.is_active = TRUE
     GROUP BY rc.effectiveness`,
    [organisationId]
  );
  
  const summary = {
    effective: 0,
    partially_effective: 0,
    ineffective: 0,
    unknown: 0
  };
  
  result.rows.forEach(row => {
    summary[row.effectiveness] = parseInt(row.count, 10);
  });
  
  const total = Object.values(summary).reduce((a, b) => a + b, 0);
  
  return {
    total,
    byEffectiveness: summary,
    effectiveRate: total > 0 ? Math.round((summary.effective / total) * 100) : 0
  };
};

// =====================================================
// TRENDS (Basic implementation)
// =====================================================

/**
 * Get risk level trends over time
 */
const getRiskTrends = async (organisationId, months = 6) => {
  // This is a simplified implementation - in production you'd use daily snapshots
  const result = await query(
    `SELECT 
       DATE_TRUNC('month', created_at) AS month,
       COUNT(*) AS new_risks,
       COUNT(*) FILTER (WHERE residual_level = 'extreme') AS extreme,
       COUNT(*) FILTER (WHERE residual_level = 'high') AS high,
       COUNT(*) FILTER (WHERE residual_level = 'medium') AS medium,
       COUNT(*) FILTER (WHERE residual_level = 'low') AS low
     FROM risks
     WHERE organisation_id = $1 
       AND created_at >= NOW() - ($2 || ' months')::interval
     GROUP BY DATE_TRUNC('month', created_at)
     ORDER BY month`,
    [organisationId, months]
  );
  
  return {
    months,
    data: result.rows.map(row => ({
      month: row.month,
      newRisks: parseInt(row.new_risks, 10),
      byLevel: {
        extreme: parseInt(row.extreme, 10),
        high: parseInt(row.high, 10),
        medium: parseInt(row.medium, 10),
        low: parseInt(row.low, 10)
      }
    }))
  };
};

module.exports = {
  getHeatmapData,
  getTopRisks,
  getRisksByDimension,
  getReviewCompliance,
  getControlEffectiveness,
  getRiskTrends
};

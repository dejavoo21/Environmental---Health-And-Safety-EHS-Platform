/**
 * Analytics Service - Phase 5
 * Handles analytics queries using hybrid aggregated + live data approach
 */

const db = require('../config/db');

/**
 * Cutoff hours for hybrid query (use live data for this many hours)
 */
const LIVE_DATA_CUTOFF_HOURS = 48;

/**
 * Get date strings for hybrid query
 * @returns {Object} - cutoffDate and today strings
 */
const getDateBoundaries = () => {
  const now = new Date();
  const cutoff = new Date(now.getTime() - LIVE_DATA_CUTOFF_HOURS * 60 * 60 * 1000);
  return {
    cutoffDate: cutoff.toISOString().split('T')[0],
    today: now.toISOString().split('T')[0]
  };
};

/**
 * Parse filter parameters
 * @param {Object} filters - Raw filter object
 * @returns {Object} - Parsed filters
 */
const parseFilters = (filters) => {
  return {
    startDate: filters.startDate || null,
    endDate: filters.endDate || null,
    siteIds: filters.siteIds ? (Array.isArray(filters.siteIds) ? filters.siteIds : [filters.siteIds]) : null,
    incidentTypeIds: filters.incidentTypeIds ? (Array.isArray(filters.incidentTypeIds) ? filters.incidentTypeIds : [filters.incidentTypeIds]) : null,
    severities: filters.severities ? (Array.isArray(filters.severities) ? filters.severities : [filters.severities]) : null,
    preset: filters.preset || null
  };
};

/**
 * Get date range from preset or explicit dates
 * @param {Object} filters - Filter object with preset or startDate/endDate
 * @returns {Object} - { startDate, endDate }
 */
const getDateRange = (filters) => {
  const now = new Date();
  let startDate, endDate;

  if (filters.preset) {
    endDate = now.toISOString().split('T')[0];
    switch (filters.preset) {
      case 'last7':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        break;
      case 'last30':
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        break;
      case 'last90':
        startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        break;
      case 'last365':
        startDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        break;
      case 'thisYear':
        startDate = `${now.getFullYear()}-01-01`;
        break;
      case 'thisMonth':
        startDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
        break;
      default:
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    }
  } else {
    startDate = filters.startDate || new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    endDate = filters.endDate || now.toISOString().split('T')[0];
  }

  return { startDate, endDate };
};

/**
 * Get analytics summary (KPIs)
 * @param {string} orgId - Organisation ID
 * @param {Object} filters - Query filters
 * @returns {Promise<Object>} - Summary KPIs
 */
const getSummary = async (orgId, filters = {}) => {
  const { startDate, endDate } = getDateRange(filters);
  const parsed = parseFilters(filters);
  const { cutoffDate } = getDateBoundaries();

  // Calculate previous period for comparison
  const periodDays = Math.ceil((new Date(endDate) - new Date(startDate)) / (24 * 60 * 60 * 1000));
  const prevEndDate = new Date(new Date(startDate).getTime() - 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  const prevStartDate = new Date(new Date(prevEndDate).getTime() - periodDays * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  // Build site filter clause
  let siteFilter = '';
  const params = [orgId, startDate, endDate];
  let paramIndex = 4;

  if (parsed.siteIds?.length > 0) {
    siteFilter = ` AND site_id = ANY($${paramIndex})`;
    params.push(parsed.siteIds);
    paramIndex++;
  }

  // Current period - using hybrid approach
  const currentIncidentsQuery = `
    SELECT
      COUNT(*) as total,
      COUNT(CASE WHEN severity::text IN ('high', 'critical') THEN 1 END) as high_severity
    FROM incidents
    WHERE organisation_id = $1
      AND occurred_at >= $2
      AND occurred_at <= $3
      ${siteFilter}
  `;

  const currentActionsQuery = `
    SELECT
      COUNT(*) as total_open,
      COUNT(CASE WHEN due_date < CURRENT_DATE THEN 1 END) as overdue
    FROM actions a
    JOIN incidents i ON a.source_id = i.id AND a.source_type = 'incident'
    WHERE i.organisation_id = $1
      AND a.status NOT IN ('done')
      ${siteFilter.replace('site_id', 'i.site_id')}
  `;

  const currentInspectionsQuery = `
    SELECT
      COUNT(*) as total,
      COUNT(CASE WHEN overall_result = 'pass' THEN 1 END) as passed
    FROM inspections
    WHERE organisation_id = $1
      AND performed_at >= $2
      AND performed_at <= $3
      ${siteFilter}
  `;

  const resolutionTimeQuery = `
    SELECT
      AVG(EXTRACT(EPOCH FROM (updated_at - occurred_at)) / 86400) as avg_days
    FROM incidents
    WHERE organisation_id = $1
      AND occurred_at >= $2
      AND occurred_at <= $3
      AND status = 'closed'
      ${siteFilter}
  `;

  // Previous period queries (for trend calculation)
  const prevParams = [orgId, prevStartDate, prevEndDate];
  if (parsed.siteIds?.length > 0) {
    prevParams.push(parsed.siteIds);
  }

  const prevIncidentsQuery = `
    SELECT COUNT(*) as total
    FROM incidents
    WHERE organisation_id = $1
      AND occurred_at >= $2
      AND occurred_at <= $3
      ${siteFilter}
  `;

  const prevInspectionsQuery = `
    SELECT
      COUNT(*) as total,
      COUNT(CASE WHEN overall_result = 'pass' THEN 1 END) as passed
    FROM inspections
    WHERE organisation_id = $1
      AND performed_at >= $2
      AND performed_at <= $3
      ${siteFilter}
  `;

  // Execute all queries in parallel
  const [
    currentIncidents,
    currentActions,
    currentInspections,
    resolutionTime,
    prevIncidents,
    prevInspections
  ] = await Promise.all([
    db.query(currentIncidentsQuery, params),
    db.query(currentActionsQuery, [orgId, ...(parsed.siteIds?.length > 0 ? [parsed.siteIds] : [])]),
    db.query(currentInspectionsQuery, params),
    db.query(resolutionTimeQuery, params),
    db.query(prevIncidentsQuery, prevParams),
    db.query(prevInspectionsQuery, prevParams)
  ]);

  const curr = {
    incidents: parseInt(currentIncidents.rows[0]?.total) || 0,
    highSeverity: parseInt(currentIncidents.rows[0]?.high_severity) || 0,
    openActions: parseInt(currentActions.rows[0]?.total_open) || 0,
    overdueActions: parseInt(currentActions.rows[0]?.overdue) || 0,
    inspections: parseInt(currentInspections.rows[0]?.total) || 0,
    inspectionsPassed: parseInt(currentInspections.rows[0]?.passed) || 0,
    avgResolutionDays: parseFloat(resolutionTime.rows[0]?.avg_days) || null
  };

  const prev = {
    incidents: parseInt(prevIncidents.rows[0]?.total) || 0,
    inspections: parseInt(prevInspections.rows[0]?.total) || 0,
    inspectionsPassed: parseInt(prevInspections.rows[0]?.passed) || 0
  };

  // Calculate trends
  const calcTrend = (current, previous) => {
    if (previous === 0) return current > 0 ? 100 : 0;
    return Math.round(((current - previous) / previous) * 100);
  };

  return {
    period: { startDate, endDate },
    kpis: {
      totalIncidents: {
        value: curr.incidents,
        trend: calcTrend(curr.incidents, prev.incidents),
        trendDirection: curr.incidents >= prev.incidents ? 'up' : 'down'
      },
      highSeverityPercent: {
        value: curr.incidents > 0 ? Math.round((curr.highSeverity / curr.incidents) * 100) : 0,
        trend: null, // Calculated differently
        trendDirection: null
      },
      avgResolutionDays: {
        value: curr.avgResolutionDays !== null ? Math.round(curr.avgResolutionDays * 10) / 10 : null,
        trend: null,
        trendDirection: null
      },
      openActions: {
        value: curr.openActions,
        trend: null, // Snapshot value, no trend
        trendDirection: null
      },
      overduePercent: {
        value: curr.openActions > 0 ? Math.round((curr.overdueActions / curr.openActions) * 100) : 0,
        trend: null,
        trendDirection: null
      },
      inspectionPassRate: {
        value: curr.inspections > 0 ? Math.round((curr.inspectionsPassed / curr.inspections) * 100) : 0,
        trend: calcTrend(
          curr.inspections > 0 ? (curr.inspectionsPassed / curr.inspections) * 100 : 0,
          prev.inspections > 0 ? (prev.inspectionsPassed / prev.inspections) * 100 : 0
        ),
        trendDirection: null // Pass rate going up is good
      }
    }
  };
};

/**
 * Get incidents time series data
 * @param {string} orgId - Organisation ID
 * @param {Object} filters - Query filters
 * @returns {Promise<Object[]>} - Time series data
 */
const getIncidentTimeSeries = async (orgId, filters = {}) => {
  const { startDate, endDate } = getDateRange(filters);
  const parsed = parseFilters(filters);
  const groupBy = filters.groupBy || 'severity';

  let siteFilter = '';
  let severityFilter = '';
  const params = [orgId, startDate, endDate];
  let paramIndex = 4;

  if (parsed.siteIds?.length > 0) {
    siteFilter = ` AND site_id = ANY($${paramIndex})`;
    params.push(parsed.siteIds);
    paramIndex++;
  }

  if (parsed.severities?.length > 0) {
    severityFilter = ` AND severity::text = ANY($${paramIndex})`;
    params.push(parsed.severities.map(s => s.toLowerCase()));
    paramIndex++;
  }

  const query = `
    SELECT
      DATE_TRUNC('month', occurred_at)::DATE as period,
      ${groupBy === 'severity' ? 'severity::text as group_key' : 'type_id::text as group_key'},
      COUNT(*) as count
    FROM incidents
    WHERE organisation_id = $1
      AND occurred_at >= $2
      AND occurred_at <= $3
      ${siteFilter}
      ${severityFilter}
    GROUP BY period, group_key
    ORDER BY period ASC, group_key
  `;

  const result = await db.query(query, params);

  // Transform to time series format
  const seriesMap = new Map();
  for (const row of result.rows) {
    const period = row.period.toISOString().split('T')[0];
    if (!seriesMap.has(period)) {
      seriesMap.set(period, { period, data: {} });
    }
    seriesMap.get(period).data[row.group_key] = parseInt(row.count);
  }

  return Array.from(seriesMap.values());
};

/**
 * Get incidents by site
 * @param {string} orgId - Organisation ID
 * @param {Object} filters - Query filters
 * @returns {Promise<Object[]>} - Site comparison data
 */
const getIncidentsBySite = async (orgId, filters = {}) => {
  const { startDate, endDate } = getDateRange(filters);
  const parsed = parseFilters(filters);
  const limit = filters.limit || 20;

  let severityFilter = '';
  const params = [orgId, startDate, endDate];
  let paramIndex = 4;

  if (parsed.severities?.length > 0) {
    severityFilter = ` AND i.severity::text = ANY($${paramIndex})`;
    params.push(parsed.severities.map(s => s.toLowerCase()));
    paramIndex++;
  }

  params.push(limit);

  const query = `
    SELECT
      s.id as site_id,
      s.name as site_name,
      COUNT(i.id) as incident_count
    FROM sites s
    LEFT JOIN incidents i
      ON i.site_id = s.id
      AND i.organisation_id = s.organisation_id
      AND i.occurred_at >= $2
      AND i.occurred_at <= $3
      ${severityFilter}
    WHERE s.organisation_id = $1
      AND s.is_active = TRUE
    GROUP BY s.id, s.name
    ORDER BY incident_count DESC
    LIMIT $${paramIndex}
  `;

  const result = await db.query(query, params);

  return result.rows.map(row => ({
    siteId: row.site_id,
    siteName: row.site_name,
    incidentCount: parseInt(row.incident_count)
  }));
};

/**
 * Get incidents by type
 * @param {string} orgId - Organisation ID
 * @param {Object} filters - Query filters
 * @returns {Promise<Object[]>} - Type breakdown data
 */
const getIncidentsByType = async (orgId, filters = {}) => {
  const { startDate, endDate } = getDateRange(filters);
  const parsed = parseFilters(filters);
  const limit = filters.limit || 10;

  let siteFilter = '';
  const params = [orgId, startDate, endDate];
  let paramIndex = 4;

  if (parsed.siteIds?.length > 0) {
    siteFilter = ` AND i.site_id = ANY($${paramIndex})`;
    params.push(parsed.siteIds);
    paramIndex++;
  }

  params.push(limit);

  const query = `
    SELECT
      it.id as type_id,
      it.name as type_name,
      COUNT(i.id) as incident_count,
      ROUND(COUNT(i.id) * 100.0 / NULLIF(SUM(COUNT(i.id)) OVER(), 0), 1) as percentage
    FROM incident_types it
    LEFT JOIN incidents i
      ON i.type_id = it.id
      AND i.occurred_at >= $2
      AND i.occurred_at <= $3
      ${siteFilter}
    WHERE (it.organisation_id = $1 OR it.is_system = TRUE)
    GROUP BY it.id, it.name
    ORDER BY incident_count DESC
    LIMIT $${paramIndex}
  `;

  const result = await db.query(query, params);

  return result.rows.map(row => ({
    typeId: row.type_id,
    typeName: row.type_name,
    incidentCount: parseInt(row.incident_count),
    percentage: parseFloat(row.percentage) || 0
  }));
};

/**
 * Get inspections time series
 * @param {string} orgId - Organisation ID
 * @param {Object} filters - Query filters
 * @returns {Promise<Object[]>} - Time series data
 */
const getInspectionsTimeSeries = async (orgId, filters = {}) => {
  const { startDate, endDate } = getDateRange(filters);
  const parsed = parseFilters(filters);

  let siteFilter = '';
  const params = [orgId, startDate, endDate];
  let paramIndex = 4;

  if (parsed.siteIds?.length > 0) {
    siteFilter = ` AND site_id = ANY($${paramIndex})`;
    params.push(parsed.siteIds);
    paramIndex++;
  }

  const query = `
    SELECT
      DATE_TRUNC('month', performed_at)::DATE as period,
      COUNT(*) as total,
      COUNT(CASE WHEN overall_result = 'pass' THEN 1 END) as passed,
      COUNT(CASE WHEN overall_result = 'fail' THEN 1 END) as failed
    FROM inspections
    WHERE organisation_id = $1
      AND performed_at >= $2
      AND performed_at <= $3
      ${siteFilter}
    GROUP BY period
    ORDER BY period ASC
  `;

  const result = await db.query(query, params);

  return result.rows.map(row => ({
    period: row.period.toISOString().split('T')[0],
    total: parseInt(row.total),
    passed: parseInt(row.passed),
    failed: parseInt(row.failed),
    passRate: row.total > 0 ? Math.round((parseInt(row.passed) / parseInt(row.total)) * 100) : 0
  }));
};

/**
 * Get inspections by site
 * @param {string} orgId - Organisation ID
 * @param {Object} filters - Query filters
 * @returns {Promise<Object[]>} - Site comparison data
 */
const getInspectionsBySite = async (orgId, filters = {}) => {
  const { startDate, endDate } = getDateRange(filters);
  const limit = filters.limit || 20;

  const query = `
    SELECT
      s.id as site_id,
      s.name as site_name,
      COUNT(insp.id) as total,
      COUNT(CASE WHEN insp.overall_result = 'pass' THEN 1 END) as passed,
      COUNT(CASE WHEN insp.overall_result = 'fail' THEN 1 END) as failed
    FROM sites s
    LEFT JOIN inspections insp
      ON insp.site_id = s.id
      AND insp.organisation_id = s.organisation_id
      AND insp.performed_at >= $2
      AND insp.performed_at <= $3
    WHERE s.organisation_id = $1
      AND s.is_active = TRUE
    GROUP BY s.id, s.name
    ORDER BY total DESC
    LIMIT $4
  `;

  const result = await db.query(query, [orgId, startDate, endDate, limit]);

  return result.rows.map(row => ({
    siteId: row.site_id,
    siteName: row.site_name,
    total: parseInt(row.total),
    passed: parseInt(row.passed),
    failed: parseInt(row.failed),
    passRate: row.total > 0 ? Math.round((parseInt(row.passed) / parseInt(row.total)) * 100) : 0
  }));
};

/**
 * Get actions time series
 * @param {string} orgId - Organisation ID
 * @param {Object} filters - Query filters
 * @returns {Promise<Object[]>} - Time series data
 */
const getActionsTimeSeries = async (orgId, filters = {}) => {
  const { startDate, endDate } = getDateRange(filters);
  const parsed = parseFilters(filters);

  let siteFilter = '';
  const params = [orgId, startDate, endDate];
  let paramIndex = 4;

  if (parsed.siteIds?.length > 0) {
    siteFilter = ` AND i.site_id = ANY($${paramIndex})`;
    params.push(parsed.siteIds);
    paramIndex++;
  }

  const query = `
    SELECT
      DATE_TRUNC('month', a.created_at)::DATE as period,
      COUNT(*) as created,
      COUNT(CASE WHEN a.status = 'done' THEN 1 END) as completed
    FROM actions a
    LEFT JOIN incidents i ON a.source_id = i.id AND a.source_type = 'incident'
    WHERE a.organisation_id = $1
      AND a.created_at >= $2
      AND a.created_at <= $3
      ${siteFilter}
    GROUP BY period
    ORDER BY period ASC
  `;

  const result = await db.query(query, params);

  return result.rows.map(row => ({
    period: row.period.toISOString().split('T')[0],
    created: parseInt(row.created),
    completed: parseInt(row.completed)
  }));
};

/**
 * Get overdue actions by site
 * @param {string} orgId - Organisation ID
 * @param {Object} filters - Query filters
 * @returns {Promise<Object[]>} - Site comparison data
 */
const getOverdueActionsBySite = async (orgId, filters = {}) => {
  const limit = filters.limit || 20;

  const query = `
    SELECT
      s.id as site_id,
      s.name as site_name,
      COUNT(a.id) as overdue_count
    FROM sites s
    LEFT JOIN incidents i
      ON i.site_id = s.id
      AND i.organisation_id = s.organisation_id
    LEFT JOIN actions a
      ON a.source_id = i.id
      AND a.source_type = 'incident'
      AND a.status NOT IN ('done')
      AND a.due_date < CURRENT_DATE
    WHERE s.organisation_id = $1
      AND s.is_active = TRUE
    GROUP BY s.id, s.name
    HAVING COUNT(a.id) > 0
    ORDER BY overdue_count DESC
    LIMIT $2
  `;

  const result = await db.query(query, [orgId, limit]);

  return result.rows.map(row => ({
    siteId: row.site_id,
    siteName: row.site_name,
    overdueCount: parseInt(row.overdue_count)
  }));
};

module.exports = {
  getSummary,
  getIncidentTimeSeries,
  getIncidentsBySite,
  getIncidentsByType,
  getInspectionsTimeSeries,
  getInspectionsBySite,
  getActionsTimeSeries,
  getOverdueActionsBySite,
  getDateRange,
  parseFilters
};

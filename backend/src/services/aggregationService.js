/**
 * Aggregation Service - Phase 5
 * Handles daily aggregation of analytics data for reporting
 */

const db = require('../config/db');

/**
 * Default nil UUID for COALESCE in unique index
 */
const NIL_UUID = '00000000-0000-0000-0000-000000000000';

/**
 * Run daily aggregation for all active organisations
 * @param {Date} targetDate - The date to aggregate (defaults to yesterday)
 * @returns {Promise<Object>} - Aggregation summary
 */
const runDailyAggregation = async (targetDate = null) => {
  const date = targetDate || new Date(Date.now() - 24 * 60 * 60 * 1000);
  const dateStr = date.toISOString().split('T')[0];

  console.log(`[AggregationService] Starting daily aggregation for ${dateStr}`);

  const result = {
    date: dateStr,
    organisationsProcessed: 0,
    errors: []
  };

  try {
    // Get all active organisations
    const orgsResult = await db.query(
      `SELECT id FROM organisations WHERE deleted_at IS NULL`
    );

    for (const org of orgsResult.rows) {
      try {
        await aggregateOrganisation(org.id, dateStr);
        result.organisationsProcessed++;
      } catch (error) {
        console.error(`[AggregationService] Error aggregating org ${org.id}:`, error.message);
        result.errors.push({ organisationId: org.id, error: error.message });
      }
    }

    console.log(`[AggregationService] Completed aggregation for ${result.organisationsProcessed} organisations`);
    return result;
  } catch (error) {
    console.error('[AggregationService] Fatal error during aggregation:', error.message);
    throw error;
  }
};

/**
 * Aggregate all data for a single organisation on a given date
 * @param {string} orgId - Organisation ID
 * @param {string} dateStr - Date string (YYYY-MM-DD)
 */
const aggregateOrganisation = async (orgId, dateStr) => {
  console.log(`[AggregationService] Aggregating org ${orgId} for ${dateStr}`);

  // Clear existing aggregations for this date (idempotent)
  await clearSummaryForDate(orgId, dateStr);

  // Run all aggregations in parallel
  await Promise.all([
    aggregateIncidents(orgId, dateStr),
    aggregateInspections(orgId, dateStr),
    aggregateActions(orgId, dateStr)
  ]);
};

/**
 * Clear existing summary rows for a date
 */
const clearSummaryForDate = async (orgId, dateStr) => {
  await db.query(
    `DELETE FROM analytics_daily_summary
     WHERE organisation_id = $1 AND summary_date = $2`,
    [orgId, dateStr]
  );
};

/**
 * Aggregate incidents for a given organisation and date
 * Creates summary rows broken down by site and severity
 */
const aggregateIncidents = async (orgId, dateStr) => {
  // Aggregate by site and severity
  const incidentQuery = `
    SELECT
      site_id,
      incident_type_id,
      severity,
      COUNT(*) as incident_count,
      COUNT(CASE WHEN status = 'closed' THEN 1 END) as incidents_closed,
      SUM(
        CASE
          WHEN status = 'closed' AND closed_at IS NOT NULL AND occurred_at IS NOT NULL
          THEN EXTRACT(EPOCH FROM (closed_at - occurred_at)) / 86400
          ELSE 0
        END
      ) as resolution_days_sum
    FROM incidents
    WHERE organisation_id = $1
      AND DATE(occurred_at) = $2
      AND deleted_at IS NULL
    GROUP BY site_id, incident_type_id, severity
  `;

  const result = await db.query(incidentQuery, [orgId, dateStr]);

  for (const row of result.rows) {
    await upsertSummary(orgId, dateStr, {
      site_id: row.site_id,
      incident_type_id: row.incident_type_id,
      severity: row.severity,
      incident_count: parseInt(row.incident_count) || 0,
      incidents_closed: parseInt(row.incidents_closed) || 0,
      incident_resolution_days_sum: parseFloat(row.resolution_days_sum) || 0
    });
  }

  // Also create org-wide totals (site_id = NULL)
  const orgWideQuery = `
    SELECT
      severity,
      COUNT(*) as incident_count,
      COUNT(CASE WHEN status = 'closed' THEN 1 END) as incidents_closed,
      SUM(
        CASE
          WHEN status = 'closed' AND closed_at IS NOT NULL AND occurred_at IS NOT NULL
          THEN EXTRACT(EPOCH FROM (closed_at - occurred_at)) / 86400
          ELSE 0
        END
      ) as resolution_days_sum
    FROM incidents
    WHERE organisation_id = $1
      AND DATE(occurred_at) = $2
      AND deleted_at IS NULL
    GROUP BY severity
  `;

  const orgWideResult = await db.query(orgWideQuery, [orgId, dateStr]);

  for (const row of orgWideResult.rows) {
    await upsertSummary(orgId, dateStr, {
      site_id: null,
      incident_type_id: null,
      severity: row.severity,
      incident_count: parseInt(row.incident_count) || 0,
      incidents_closed: parseInt(row.incidents_closed) || 0,
      incident_resolution_days_sum: parseFloat(row.resolution_days_sum) || 0
    });
  }
};

/**
 * Aggregate inspections for a given organisation and date
 */
const aggregateInspections = async (orgId, dateStr) => {
  // Aggregate by site
  const inspectionQuery = `
    SELECT
      site_id,
      COUNT(*) as inspection_count,
      COUNT(CASE WHEN overall_result = 'pass' THEN 1 END) as inspections_passed,
      COUNT(CASE WHEN overall_result = 'fail' THEN 1 END) as inspections_failed
    FROM inspections
    WHERE organisation_id = $1
      AND DATE(performed_at) = $2
      AND deleted_at IS NULL
    GROUP BY site_id
  `;

  const result = await db.query(inspectionQuery, [orgId, dateStr]);

  for (const row of result.rows) {
    await upsertSummary(orgId, dateStr, {
      site_id: row.site_id,
      incident_type_id: null,
      severity: null,
      inspection_count: parseInt(row.inspection_count) || 0,
      inspections_passed: parseInt(row.inspections_passed) || 0,
      inspections_failed: parseInt(row.inspections_failed) || 0
    });
  }

  // Org-wide totals
  const orgWideQuery = `
    SELECT
      COUNT(*) as inspection_count,
      COUNT(CASE WHEN overall_result = 'pass' THEN 1 END) as inspections_passed,
      COUNT(CASE WHEN overall_result = 'fail' THEN 1 END) as inspections_failed
    FROM inspections
    WHERE organisation_id = $1
      AND DATE(performed_at) = $2
      AND deleted_at IS NULL
  `;

  const orgWideResult = await db.query(orgWideQuery, [orgId, dateStr]);
  const orgRow = orgWideResult.rows[0];

  if (orgRow && parseInt(orgRow.inspection_count) > 0) {
    await upsertSummary(orgId, dateStr, {
      site_id: null,
      incident_type_id: null,
      severity: null,
      inspection_count: parseInt(orgRow.inspection_count) || 0,
      inspections_passed: parseInt(orgRow.inspections_passed) || 0,
      inspections_failed: parseInt(orgRow.inspections_failed) || 0
    });
  }
};

/**
 * Aggregate actions for a given organisation and date
 * Tracks created, completed, and overdue counts
 */
const aggregateActions = async (orgId, dateStr) => {
  // Get actions created on this date, grouped by incident site
  const createdQuery = `
    SELECT
      i.site_id,
      COUNT(*) as actions_created
    FROM actions a
    JOIN incidents i ON a.source_id = i.id AND a.source_type = 'incident'
    WHERE i.organisation_id = $1
      AND DATE(a.created_at) = $2
      AND a.deleted_at IS NULL
    GROUP BY i.site_id
  `;

  const createdResult = await db.query(createdQuery, [orgId, dateStr]);

  for (const row of createdResult.rows) {
    await upsertSummary(orgId, dateStr, {
      site_id: row.site_id,
      incident_type_id: null,
      severity: null,
      actions_created: parseInt(row.actions_created) || 0
    });
  }

  // Get actions completed on this date
  const completedQuery = `
    SELECT
      i.site_id,
      COUNT(*) as actions_completed
    FROM actions a
    JOIN incidents i ON a.source_id = i.id AND a.source_type = 'incident'
    WHERE i.organisation_id = $1
      AND a.status = 'completed'
      AND DATE(a.updated_at) = $2
      AND a.deleted_at IS NULL
    GROUP BY i.site_id
  `;

  const completedResult = await db.query(completedQuery, [orgId, dateStr]);

  for (const row of completedResult.rows) {
    await upsertSummary(orgId, dateStr, {
      site_id: row.site_id,
      incident_type_id: null,
      severity: null,
      actions_completed: parseInt(row.actions_completed) || 0
    });
  }

  // Get actions that became overdue as of this date
  const overdueQuery = `
    SELECT
      i.site_id,
      COUNT(*) as actions_overdue
    FROM actions a
    JOIN incidents i ON a.source_id = i.id AND a.source_type = 'incident'
    WHERE i.organisation_id = $1
      AND a.status NOT IN ('completed', 'cancelled')
      AND a.due_date = $2
      AND a.deleted_at IS NULL
    GROUP BY i.site_id
  `;

  const overdueResult = await db.query(overdueQuery, [orgId, dateStr]);

  for (const row of overdueResult.rows) {
    await upsertSummary(orgId, dateStr, {
      site_id: row.site_id,
      incident_type_id: null,
      severity: null,
      actions_overdue: parseInt(row.actions_overdue) || 0
    });
  }

  // Org-wide action totals
  const orgWideCreatedQuery = `
    SELECT COUNT(*) as count
    FROM actions a
    JOIN incidents i ON a.source_id = i.id AND a.source_type = 'incident'
    WHERE i.organisation_id = $1
      AND DATE(a.created_at) = $2
      AND a.deleted_at IS NULL
  `;

  const orgWideCompletedQuery = `
    SELECT COUNT(*) as count
    FROM actions a
    JOIN incidents i ON a.source_id = i.id AND a.source_type = 'incident'
    WHERE i.organisation_id = $1
      AND a.status = 'completed'
      AND DATE(a.updated_at) = $2
      AND a.deleted_at IS NULL
  `;

  const orgWideOverdueQuery = `
    SELECT COUNT(*) as count
    FROM actions a
    JOIN incidents i ON a.source_id = i.id AND a.source_type = 'incident'
    WHERE i.organisation_id = $1
      AND a.status NOT IN ('completed', 'cancelled')
      AND a.due_date = $2
      AND a.deleted_at IS NULL
  `;

  const [createdOrgWide, completedOrgWide, overdueOrgWide] = await Promise.all([
    db.query(orgWideCreatedQuery, [orgId, dateStr]),
    db.query(orgWideCompletedQuery, [orgId, dateStr]),
    db.query(orgWideOverdueQuery, [orgId, dateStr])
  ]);

  const hasOrgWideActions =
    parseInt(createdOrgWide.rows[0]?.count) > 0 ||
    parseInt(completedOrgWide.rows[0]?.count) > 0 ||
    parseInt(overdueOrgWide.rows[0]?.count) > 0;

  if (hasOrgWideActions) {
    await upsertSummary(orgId, dateStr, {
      site_id: null,
      incident_type_id: null,
      severity: null,
      actions_created: parseInt(createdOrgWide.rows[0]?.count) || 0,
      actions_completed: parseInt(completedOrgWide.rows[0]?.count) || 0,
      actions_overdue: parseInt(overdueOrgWide.rows[0]?.count) || 0
    });
  }
};

/**
 * Upsert a summary row using the unique index
 * Handles merging of partial updates (e.g., incidents + inspections for same site)
 */
const upsertSummary = async (orgId, dateStr, data) => {
  const siteId = data.site_id || null;
  const incidentTypeId = data.incident_type_id || null;
  const severity = data.severity || null;

  // Build dynamic update columns
  const updateColumns = [];
  const values = [orgId, dateStr, siteId, incidentTypeId, severity];
  let paramIndex = 6;

  const columnMappings = {
    incident_count: data.incident_count,
    incidents_closed: data.incidents_closed,
    incident_resolution_days_sum: data.incident_resolution_days_sum,
    inspection_count: data.inspection_count,
    inspections_passed: data.inspections_passed,
    inspections_failed: data.inspections_failed,
    actions_created: data.actions_created,
    actions_completed: data.actions_completed,
    actions_overdue: data.actions_overdue
  };

  const insertColumns = ['organisation_id', 'summary_date', 'site_id', 'incident_type_id', 'severity'];
  const insertValues = ['$1', '$2', '$3', '$4', '$5'];

  for (const [col, val] of Object.entries(columnMappings)) {
    if (val !== undefined && val !== null) {
      insertColumns.push(col);
      insertValues.push(`$${paramIndex}`);
      updateColumns.push(`${col} = COALESCE(analytics_daily_summary.${col}, 0) + $${paramIndex}`);
      values.push(val);
      paramIndex++;
    }
  }

  if (updateColumns.length === 0) {
    return; // Nothing to update
  }

  updateColumns.push('updated_at = NOW()');

  const query = `
    INSERT INTO analytics_daily_summary (${insertColumns.join(', ')}, created_at, updated_at)
    VALUES (${insertValues.join(', ')}, NOW(), NOW())
    ON CONFLICT (
      organisation_id,
      COALESCE(site_id, '${NIL_UUID}'),
      summary_date,
      COALESCE(incident_type_id, '${NIL_UUID}'),
      COALESCE(severity, 'ALL')
    )
    DO UPDATE SET ${updateColumns.join(', ')}
  `;

  await db.query(query, values);
};

/**
 * Backfill aggregations for a date range
 * @param {Date} startDate - Start date
 * @param {Date} endDate - End date
 * @returns {Promise<Object>} - Backfill summary
 */
const backfillAggregations = async (startDate, endDate) => {
  console.log(`[AggregationService] Starting backfill from ${startDate.toISOString().split('T')[0]} to ${endDate.toISOString().split('T')[0]}`);

  const results = {
    datesProcessed: 0,
    errors: []
  };

  const current = new Date(startDate);
  while (current <= endDate) {
    try {
      await runDailyAggregation(current);
      results.datesProcessed++;
    } catch (error) {
      results.errors.push({ date: current.toISOString().split('T')[0], error: error.message });
    }
    current.setDate(current.getDate() + 1);
  }

  console.log(`[AggregationService] Backfill completed: ${results.datesProcessed} dates processed`);
  return results;
};

module.exports = {
  runDailyAggregation,
  aggregateOrganisation,
  backfillAggregations
};

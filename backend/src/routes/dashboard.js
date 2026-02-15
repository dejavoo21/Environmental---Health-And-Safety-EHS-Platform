const express = require('express');
const { query } = require('../config/db');
const { toIso } = require('../utils/format');

const router = express.Router();

const formatMonth = (date) => {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
};

// Helper to safely query tables that might not exist
const safeQuery = async (sql, params = []) => {
  try {
    return await query(sql, params);
  } catch (err) {
    if (err.code === '42P01' || err.code === '42703') {
      // Table or column doesn't exist
      return { rows: [], rowCount: 0 };
    }
    throw err;
  }
};

router.get('/summary', async (req, res, next) => {
  try {
    // Core KPIs - incidents, inspections, actions
    const kpiResult = await query(
      `SELECT
        (SELECT COUNT(*) FROM incidents) AS total_incidents,
        (SELECT COUNT(*) FROM incidents WHERE status = 'open') AS open_incidents,
        (SELECT COUNT(*) FROM incidents WHERE created_at >= NOW() - INTERVAL '30 days') AS incidents_last_30,
        (SELECT COUNT(*) FROM inspections WHERE performed_at >= NOW() - INTERVAL '30 days') AS inspections_last_30,
        (SELECT COUNT(*) FROM inspections WHERE performed_at >= NOW() - INTERVAL '30 days' AND overall_result = 'fail') AS failed_inspections_last_30,
        (SELECT COUNT(*) FROM actions WHERE status = 'open') AS open_actions,
        (SELECT COUNT(*) FROM actions WHERE status = 'open' AND due_date < CURRENT_DATE) AS overdue_actions`
    );

    const kpis = kpiResult.rows[0];

    // Additional KPIs from Phase 7+ tables (permits, risks, training)
    let permitsData = { active: 0, expiring: 0 };
    let risksData = { total: 0, high: 0, extreme: 0 };
    let trainingData = { overdue: 0, completed: 0 };

    // Permits KPIs
    const permitsResult = await safeQuery(`
      SELECT
        COUNT(*) FILTER (WHERE status = 'active') AS active_permits,
        COUNT(*) FILTER (WHERE status = 'active' AND valid_to < NOW() + INTERVAL '7 days') AS expiring_permits
      FROM permits
    `);
    if (permitsResult.rows[0]) {
      permitsData = {
        active: Number(permitsResult.rows[0].active_permits || 0),
        expiring: Number(permitsResult.rows[0].expiring_permits || 0)
      };
    }

    // Risks KPIs
    const risksResult = await safeQuery(`
      SELECT
        COUNT(*) AS total_risks,
        COUNT(*) FILTER (WHERE residual_level = 'high') AS high_risks,
        COUNT(*) FILTER (WHERE residual_level = 'extreme') AS extreme_risks
      FROM risks WHERE status = 'active'
    `);
    if (risksResult.rows[0]) {
      risksData = {
        total: Number(risksResult.rows[0].total_risks || 0),
        high: Number(risksResult.rows[0].high_risks || 0),
        extreme: Number(risksResult.rows[0].extreme_risks || 0)
      };
    }

    // Training KPIs
    const trainingResult = await safeQuery(`
      SELECT
        COUNT(*) FILTER (WHERE status = 'overdue' OR (status = 'assigned' AND due_date < CURRENT_DATE)) AS overdue_training,
        COUNT(*) FILTER (WHERE status = 'completed') AS completed_training
      FROM training_assignments
    `);
    if (trainingResult.rows[0]) {
      trainingData = {
        overdue: Number(trainingResult.rows[0].overdue_training || 0),
        completed: Number(trainingResult.rows[0].completed_training || 0)
      };
    }

    const typeResult = await query(
      `SELECT it.name AS type, COUNT(*)::int AS count
       FROM incidents i
       JOIN incident_types it ON it.id = i.type_id
       GROUP BY it.name
       ORDER BY it.name`
    );

    const incidentsByType = typeResult.rows.map((row) => ({
      type: row.type,
      count: Number(row.count)
    }));

    const severityResult = await query(
      `SELECT DATE_TRUNC('month', occurred_at) AS month, severity, COUNT(*)::int AS count
       FROM incidents
       WHERE occurred_at >= NOW() - INTERVAL '12 months'
       GROUP BY month, severity
       ORDER BY month`
    );

    const months = [];
    const now = new Date();
    for (let i = 11; i >= 0; i -= 1) {
      const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1));
      months.push(formatMonth(d));
    }

    const severityMap = {};
    for (const month of months) {
      severityMap[month] = { month, low: 0, medium: 0, high: 0, critical: 0 };
    }

    for (const row of severityResult.rows) {
      const monthKey = formatMonth(row.month);
      if (!severityMap[monthKey]) {
        severityMap[monthKey] = { month: monthKey, low: 0, medium: 0, high: 0, critical: 0 };
      }
      severityMap[monthKey][row.severity] = Number(row.count);
    }

    const severityTrend = months.map((month) => severityMap[month]);

    const recentIncidentsRes = await query(
      `SELECT id, title, severity, status, occurred_at
       FROM incidents
       ORDER BY occurred_at DESC
       LIMIT 10`
    );

    const recentIncidents = recentIncidentsRes.rows.map((row) => ({
      id: row.id,
      title: row.title,
      severity: row.severity,
      status: row.status,
      occurredAt: toIso(row.occurred_at)
    }));

    const recentInspectionsRes = await query(
      `SELECT ins.id, ins.overall_result, ins.performed_at,
              t.name AS template_name, s.name AS site_name
       FROM inspections ins
       JOIN inspection_templates t ON t.id = ins.template_id
       JOIN sites s ON s.id = ins.site_id
       ORDER BY ins.performed_at DESC
       LIMIT 10`
    );

    const recentInspections = recentInspectionsRes.rows.map((row) => ({
      id: row.id,
      templateName: row.template_name,
      siteName: row.site_name,
      overallResult: row.overall_result,
      performedAt: toIso(row.performed_at)
    }));

    // Incidents by status for pie chart
    const statusResult = await query(`
      SELECT status, COUNT(*)::int AS count
      FROM incidents
      GROUP BY status
    `);
    const incidentsByStatus = statusResult.rows.map(row => ({
      name: row.status.replace('_', ' '),
      value: row.count
    }));

    // Incidents by severity for donut chart
    const severityDistResult = await query(`
      SELECT severity, COUNT(*)::int AS count
      FROM incidents
      GROUP BY severity
    `);
    const incidentsBySeverity = severityDistResult.rows.map(row => ({
      name: row.severity,
      value: row.count
    }));

    // Actions summary
    const actionsResult = await query(`
      SELECT
        COUNT(*) FILTER (WHERE status = 'open') AS open_count,
        COUNT(*) FILTER (WHERE status = 'in_progress') AS in_progress_count,
        COUNT(*) FILTER (WHERE status = 'completed') AS completed_count,
        COUNT(*) FILTER (WHERE status = 'open' AND due_date < CURRENT_DATE) AS overdue_count
      FROM actions
    `);
    const actionsSummary = actionsResult.rows[0] ? {
      open: Number(actionsResult.rows[0].open_count || 0),
      inProgress: Number(actionsResult.rows[0].in_progress_count || 0),
      completed: Number(actionsResult.rows[0].completed_count || 0),
      overdue: Number(actionsResult.rows[0].overdue_count || 0)
    } : { open: 0, inProgress: 0, completed: 0, overdue: 0 };

    // Recent actions (top 5)
    const recentActionsRes = await query(`
      SELECT a.id, a.title, a.status, a.priority, a.due_date
      FROM actions a
      WHERE a.status IN ('open', 'in_progress')
      ORDER BY a.due_date ASC NULLS LAST
      LIMIT 5
    `);
    const upcomingActions = recentActionsRes.rows.map(row => ({
      id: row.id,
      title: row.title,
      status: row.status,
      priority: row.priority,
      dueDate: toIso(row.due_date)
    }));

    return res.json({
      kpis: {
        totalIncidents: Number(kpis.total_incidents),
        openIncidents: Number(kpis.open_incidents),
        incidentsLast30Days: Number(kpis.incidents_last_30),
        inspectionsLast30Days: Number(kpis.inspections_last_30),
        failedInspectionsLast30Days: Number(kpis.failed_inspections_last_30),
        openActions: Number(kpis.open_actions || 0),
        overdueActions: Number(kpis.overdue_actions || 0),
        // Extended KPIs
        activePermits: permitsData.active,
        expiringPermits: permitsData.expiring,
        activeRisks: risksData.total,
        highRisks: risksData.high + risksData.extreme,
        overdueTraining: trainingData.overdue
      },
      incidentsByType,
      incidentsByStatus,
      incidentsBySeverity,
      severityTrend,
      actionsSummary,
      upcomingActions,
      recentIncidents: recentIncidents.slice(0, 5),
      recentInspections: recentInspections.slice(0, 5)
    });
  } catch (err) {
    return next(err);
  }
});

module.exports = router;

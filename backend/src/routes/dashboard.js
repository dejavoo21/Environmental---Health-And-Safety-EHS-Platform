const express = require('express');
const { query } = require('../config/db');
const { toIso } = require('../utils/format');

const router = express.Router();

const formatMonth = (date) => {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
};

router.get('/summary', async (req, res, next) => {
  try {
    const kpiResult = await query(
      `SELECT
        (SELECT COUNT(*) FROM incidents) AS total_incidents,
        (SELECT COUNT(*) FROM incidents WHERE status = 'open') AS open_incidents,
        (SELECT COUNT(*) FROM incidents WHERE created_at >= NOW() - INTERVAL '30 days') AS incidents_last_30,
        (SELECT COUNT(*) FROM inspections WHERE performed_at >= NOW() - INTERVAL '30 days') AS inspections_last_30,
        (SELECT COUNT(*) FROM inspections WHERE performed_at >= NOW() - INTERVAL '30 days' AND overall_result = 'fail') AS failed_inspections_last_30`
    );

    const kpis = kpiResult.rows[0];

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

    return res.json({
      kpis: {
        totalIncidents: Number(kpis.total_incidents),
        openIncidents: Number(kpis.open_incidents),
        incidentsLast30Days: Number(kpis.incidents_last_30),
        inspectionsLast30Days: Number(kpis.inspections_last_30),
        failedInspectionsLast30Days: Number(kpis.failed_inspections_last_30)
      },
      incidentsByType,
      severityTrend,
      recentIncidents,
      recentInspections
    });
  } catch (err) {
    return next(err);
  }
});

module.exports = router;

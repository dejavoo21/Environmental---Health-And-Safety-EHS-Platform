/**
 * Analytics Routes - Phase 5
 * Provides analytics and insights API endpoints
 */

const express = require('express');
const router = express.Router();
const analyticsService = require('../services/analyticsService');
const riskScoreService = require('../services/riskScoreService');
const db = require('../config/db');
const AppError = require('../utils/appError');

/**
 * GET /api/analytics/summary
 * Get analytics summary KPIs
 */
router.get('/summary', async (req, res, next) => {
  try {
    const orgId = req.user.organisationId;
    const filters = {
      startDate: req.query.startDate,
      endDate: req.query.endDate,
      preset: req.query.preset,
      siteIds: req.query.siteIds,
      severities: req.query.severities
    };

    const summary = await analyticsService.getSummary(orgId, filters);
    res.json(summary);
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/analytics/incidents/time-series
 * Get incidents time series data
 */
router.get('/incidents/time-series', async (req, res, next) => {
  try {
    const orgId = req.user.organisationId;
    const filters = {
      startDate: req.query.startDate,
      endDate: req.query.endDate,
      preset: req.query.preset,
      siteIds: req.query.siteIds,
      severities: req.query.severities,
      groupBy: req.query.groupBy || 'severity'
    };

    const data = await analyticsService.getIncidentTimeSeries(orgId, filters);
    res.json({ data });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/analytics/incidents/by-site
 * Get incidents breakdown by site
 */
router.get('/incidents/by-site', async (req, res, next) => {
  try {
    const orgId = req.user.organisationId;
    const filters = {
      startDate: req.query.startDate,
      endDate: req.query.endDate,
      preset: req.query.preset,
      severities: req.query.severities,
      limit: parseInt(req.query.limit) || 20
    };

    const data = await analyticsService.getIncidentsBySite(orgId, filters);
    res.json({ data });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/analytics/incidents/by-type
 * Get incidents breakdown by type
 */
router.get('/incidents/by-type', async (req, res, next) => {
  try {
    const orgId = req.user.organisationId;
    const filters = {
      startDate: req.query.startDate,
      endDate: req.query.endDate,
      preset: req.query.preset,
      siteIds: req.query.siteIds,
      limit: parseInt(req.query.limit) || 10
    };

    const data = await analyticsService.getIncidentsByType(orgId, filters);
    res.json({ data });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/analytics/inspections/time-series
 * Get inspections time series data
 */
router.get('/inspections/time-series', async (req, res, next) => {
  try {
    const orgId = req.user.organisationId;
    const filters = {
      startDate: req.query.startDate,
      endDate: req.query.endDate,
      preset: req.query.preset,
      siteIds: req.query.siteIds
    };

    const data = await analyticsService.getInspectionsTimeSeries(orgId, filters);
    res.json({ data });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/analytics/inspections/by-site
 * Get inspections breakdown by site
 */
router.get('/inspections/by-site', async (req, res, next) => {
  try {
    const orgId = req.user.organisationId;
    const filters = {
      startDate: req.query.startDate,
      endDate: req.query.endDate,
      preset: req.query.preset,
      limit: parseInt(req.query.limit) || 20
    };

    const data = await analyticsService.getInspectionsBySite(orgId, filters);
    res.json({ data });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/analytics/actions/time-series
 * Get actions time series data
 */
router.get('/actions/time-series', async (req, res, next) => {
  try {
    const orgId = req.user.organisationId;
    const filters = {
      startDate: req.query.startDate,
      endDate: req.query.endDate,
      preset: req.query.preset,
      siteIds: req.query.siteIds
    };

    const data = await analyticsService.getActionsTimeSeries(orgId, filters);
    res.json({ data });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/analytics/actions/overdue-by-site
 * Get overdue actions breakdown by site
 */
router.get('/actions/overdue-by-site', async (req, res, next) => {
  try {
    const orgId = req.user.organisationId;
    const filters = {
      limit: parseInt(req.query.limit) || 20
    };

    const data = await analyticsService.getOverdueActionsBySite(orgId, filters);
    res.json({ data });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/analytics/risk-scores
 * Get all site risk scores for organisation
 */
router.get('/risk-scores', async (req, res, next) => {
  try {
    const orgId = req.user.organisationId;
    const options = {
      category: req.query.category,
      limit: req.query.limit ? parseInt(req.query.limit) : null,
      orderBy: req.query.orderBy || 'risk_score DESC'
    };

    const data = await riskScoreService.getRiskScores(orgId, options);
    res.json({ data });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/analytics/risk-scores/top
 * Get top high-risk sites
 */
router.get('/risk-scores/top', async (req, res, next) => {
  try {
    const orgId = req.user.organisationId;
    const limit = parseInt(req.query.limit) || 5;

    const data = await riskScoreService.getTopRiskSites(orgId, limit);
    res.json({ data });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/analytics/risk-scores/:siteId
 * Get risk score for a specific site
 */
router.get('/risk-scores/:siteId', async (req, res, next) => {
  try {
    const orgId = req.user.organisationId;
    const { siteId } = req.params;

    const score = await riskScoreService.getSiteRiskScore(orgId, siteId);
    if (!score) {
      throw new AppError('Site risk score not found', 404);
    }

    res.json(score);
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/analytics/risk-scores/:siteId/history
 * Get risk score history for a site
 */
router.get('/risk-scores/:siteId/history', async (req, res, next) => {
  try {
    const orgId = req.user.organisationId;
    const { siteId } = req.params;
    const days = parseInt(req.query.days) || 90;

    const history = await riskScoreService.getSiteRiskHistory(orgId, siteId, days);
    res.json({ data: history });
  } catch (error) {
    next(error);
  }
});

// =============================================================================
// SAVED VIEWS ENDPOINTS
// =============================================================================

/**
 * GET /api/analytics/views
 * Get saved views (user's own + shared)
 */
router.get('/views', async (req, res, next) => {
  try {
    const orgId = req.user.organisationId;
    const userId = req.user.id;

    const query = `
      SELECT
        sv.*,
        u.name as owner_name,
        CASE WHEN sv.user_id = $2 THEN true ELSE false END as is_owner
      FROM saved_views sv
      JOIN users u ON u.id = sv.user_id
      WHERE sv.organisation_id = $1
        AND (sv.user_id = $2 OR sv.is_shared = TRUE)
      ORDER BY sv.is_default DESC, sv.updated_at DESC
    `;

    const result = await db.query(query, [orgId, userId]);
    res.json({ data: result.rows });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/analytics/views
 * Create a new saved view
 */
router.post('/views', async (req, res, next) => {
  try {
    const orgId = req.user.organisationId;
    const userId = req.user.id;
    const { name, description, filters, is_shared, is_default } = req.body;

    if (!name || !name.trim()) {
      throw new AppError('View name is required', 400);
    }

    if (!filters || typeof filters !== 'object') {
      throw new AppError('Filters must be a valid object', 400);
    }

    // Check view limit (max 20 per user)
    const countResult = await db.query(
      `SELECT COUNT(*) as count FROM saved_views WHERE user_id = $1`,
      [userId]
    );

    if (parseInt(countResult.rows[0].count) >= 20) {
      throw new AppError('Maximum of 20 saved views per user reached', 400);
    }

    const query = `
      INSERT INTO saved_views (organisation_id, user_id, name, description, filters, is_shared, is_default)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `;

    const result = await db.query(query, [
      orgId,
      userId,
      name.trim(),
      description || null,
      JSON.stringify(filters),
      is_shared || false,
      is_default || false
    ]);

    res.status(201).json(result.rows[0]);
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/analytics/views/:id
 * Get a specific saved view
 */
router.get('/views/:id', async (req, res, next) => {
  try {
    const orgId = req.user.organisationId;
    const userId = req.user.id;
    const { id } = req.params;

    const query = `
      SELECT sv.*,
        CASE WHEN sv.user_id = $3 THEN true ELSE false END as is_owner
      FROM saved_views sv
      WHERE sv.id = $1
        AND sv.organisation_id = $2
        AND (sv.user_id = $3 OR sv.is_shared = TRUE)
    `;

    const result = await db.query(query, [id, orgId, userId]);

    if (result.rows.length === 0) {
      throw new AppError('Saved view not found', 404);
    }

    res.json(result.rows[0]);
  } catch (error) {
    next(error);
  }
});

/**
 * PUT /api/analytics/views/:id
 * Update a saved view
 */
router.put('/views/:id', async (req, res, next) => {
  try {
    const orgId = req.user.organisationId;
    const userId = req.user.id;
    const { id } = req.params;
    const { name, description, filters, is_shared, is_default } = req.body;

    // Check ownership
    const checkQuery = `
      SELECT id FROM saved_views
      WHERE id = $1 AND organisation_id = $2 AND user_id = $3
    `;
    const checkResult = await db.query(checkQuery, [id, orgId, userId]);

    if (checkResult.rows.length === 0) {
      throw new AppError('Saved view not found or not owned by you', 404);
    }

    // Build update query
    const updates = [];
    const values = [id];
    let paramIndex = 2;

    if (name !== undefined) {
      updates.push(`name = $${paramIndex}`);
      values.push(name.trim());
      paramIndex++;
    }

    if (description !== undefined) {
      updates.push(`description = $${paramIndex}`);
      values.push(description);
      paramIndex++;
    }

    if (filters !== undefined) {
      updates.push(`filters = $${paramIndex}`);
      values.push(JSON.stringify(filters));
      paramIndex++;
    }

    if (is_shared !== undefined) {
      updates.push(`is_shared = $${paramIndex}`);
      values.push(is_shared);
      paramIndex++;
    }

    if (is_default !== undefined) {
      updates.push(`is_default = $${paramIndex}`);
      values.push(is_default);
      paramIndex++;
    }

    if (updates.length === 0) {
      throw new AppError('No fields to update', 400);
    }

    const updateQuery = `
      UPDATE saved_views
      SET ${updates.join(', ')}, updated_at = NOW()
      WHERE id = $1
      RETURNING *
    `;

    const result = await db.query(updateQuery, values);
    res.json(result.rows[0]);
  } catch (error) {
    next(error);
  }
});

/**
 * DELETE /api/analytics/views/:id
 * Delete a saved view
 */
router.delete('/views/:id', async (req, res, next) => {
  try {
    const orgId = req.user.organisationId;
    const userId = req.user.id;
    const { id } = req.params;

    const query = `
      DELETE FROM saved_views
      WHERE id = $1 AND organisation_id = $2 AND user_id = $3
      RETURNING id
    `;

    const result = await db.query(query, [id, orgId, userId]);

    if (result.rows.length === 0) {
      throw new AppError('Saved view not found or not owned by you', 404);
    }

    res.json({ message: 'View deleted successfully' });
  } catch (error) {
    next(error);
  }
});

module.exports = router;

/**
 * Risk Routes - Phase 9
 * Handles all risk register endpoints
 */

const express = require('express');
const router = express.Router();
const { authMiddleware, requireRole } = require('../middleware/auth');
const riskService = require('../services/riskService');
const controlService = require('../services/riskControlService');
const reviewService = require('../services/riskReviewService');
const linkService = require('../services/riskLinkService');
const analyticsService = require('../services/riskAnalyticsService');
const { AppError } = require('../utils/appError');

// Role middleware shortcuts
const requireManager = requireRole('manager', 'admin');
const requireAdmin = requireRole('admin');

// All routes require authentication
router.use(authMiddleware);

// ==================== ANALYTICS & AGGREGATIONS ====================

/**
 * GET /api/risks/heatmap
 * Get heatmap data for 5x5 risk matrix
 */
router.get('/heatmap', async (req, res, next) => {
  try {
    const data = await analyticsService.getHeatmapData(req.user.organisationId, {
      scoreType: req.query.scoreType || 'residual',
      categoryId: req.query.categoryId,
      siteId: req.query.siteId,
      status: req.query.status ? req.query.status.split(',') : undefined
    });
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/risks/top
 * Get top risks by score
 */
router.get('/top', async (req, res, next) => {
  try {
    const data = await analyticsService.getTopRisks(req.user.organisationId, {
      count: parseInt(req.query.count, 10) || 5,
      scoreType: req.query.scoreType || 'residual',
      categoryId: req.query.categoryId,
      siteId: req.query.siteId
    });
    res.json({ success: true, data: data.risks });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/risks/upcoming-reviews
 * Get risks with upcoming reviews
 */
router.get('/upcoming-reviews', async (req, res, next) => {
  try {
    const data = await reviewService.getUpcomingReviews(req.user.organisationId, 
      parseInt(req.query.days, 10) || 30,
      { limit: parseInt(req.query.limit, 10) || 20 }
    );
    res.json({ success: true, data: data.reviews });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/risks/overdue-reviews
 * Get risks with overdue reviews
 */
router.get('/overdue-reviews', async (req, res, next) => {
  try {
    const data = await reviewService.getOverdueReviews(req.user.organisationId);
    res.json({ success: true, data: data.reviews, summary: data.summary });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/risks/analytics/:dimension
 * Get risks grouped by dimension
 */
router.get('/analytics/:dimension', async (req, res, next) => {
  try {
    const data = await analyticsService.getRisksByDimension(
      req.user.organisationId,
      req.params.dimension
    );
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/risks/review-compliance
 * Get review compliance metrics
 */
router.get('/review-compliance', async (req, res, next) => {
  try {
    const data = await analyticsService.getReviewCompliance(req.user.organisationId);
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/risks/control-effectiveness
 * Get control effectiveness summary
 */
router.get('/control-effectiveness', async (req, res, next) => {
  try {
    const data = await analyticsService.getControlEffectiveness(req.user.organisationId);
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/risks/trends
 * Get risk trends over time
 */
router.get('/trends', async (req, res, next) => {
  try {
    const data = await analyticsService.getRiskTrends(
      req.user.organisationId,
      parseInt(req.query.months, 10) || 6
    );
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
});

// ==================== RISK CRUD ====================

/**
 * GET /api/risks
 * List risks with filters and pagination
 */
router.get('/', async (req, res, next) => {
  try {
    const result = await riskService.listRisks(req.user.organisationId, {
      status: req.query.status,
      level: req.query.level,
      categoryId: req.query.categoryId,
      siteId: req.query.siteId,
      ownerId: req.query.ownerId,
      reviewOverdue: req.query.reviewOverdue,
      search: req.query.search,
      page: parseInt(req.query.page, 10) || 1,
      limit: parseInt(req.query.limit, 10) || 20,
      sortBy: req.query.sortBy,
      sortOrder: req.query.sortOrder
    });
    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/risks/:id
 * Get risk by ID with full details
 */
router.get('/:id', async (req, res, next) => {
  try {
    const risk = await riskService.getRiskById(req.params.id, req.user.organisationId);
    res.json({ success: true, data: risk });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/risks
 * Create a new risk (Manager+)
 */
router.post('/', requireManager, async (req, res, next) => {
  try {
    const risk = await riskService.createRisk(
      req.user.organisationId,
      req.body,
      req.user.id
    );
    res.status(201).json({ success: true, data: risk, message: 'Risk created successfully' });
  } catch (error) {
    next(error);
  }
});

/**
 * PUT /api/risks/:id
 * Update an existing risk (Manager+)
 */
router.put('/:id', requireManager, async (req, res, next) => {
  try {
    const risk = await riskService.updateRisk(
      req.params.id,
      req.user.organisationId,
      req.body,
      req.user.id
    );
    res.json({ success: true, data: risk, message: 'Risk updated successfully' });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/risks/:id/status
 * Change risk status (Manager+)
 */
router.post('/:id/status', requireManager, async (req, res, next) => {
  try {
    const { status, justification } = req.body;
    const result = await riskService.changeStatus(
      req.params.id,
      req.user.organisationId,
      status,
      justification,
      req.user.id
    );
    res.json({ success: true, data: result, message: `Risk status changed to ${status}` });
  } catch (error) {
    next(error);
  }
});

/**
 * DELETE /api/risks/:id
 * Delete (soft) a risk (Admin only)
 */
router.delete('/:id', requireAdmin, async (req, res, next) => {
  try {
    const result = await riskService.deleteRisk(req.params.id, req.user.organisationId, req.user.id);
    res.json({ success: true, message: result.message });
  } catch (error) {
    next(error);
  }
});

// ==================== CONTROLS ====================

/**
 * GET /api/risks/:id/controls
 * List controls for a risk
 */
router.get('/:id/controls', async (req, res, next) => {
  try {
    const result = await controlService.listControls(req.params.id, req.user.organisationId, {
      includeInactive: req.query.includeInactive === 'true'
    });
    res.json({ success: true, data: result.controls });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/risks/:id/controls
 * Add a control to a risk (Manager+)
 */
router.post('/:id/controls', requireManager, async (req, res, next) => {
  try {
    const control = await controlService.addControl(
      req.params.id,
      req.user.organisationId,
      req.body,
      req.user.id
    );
    res.status(201).json({ success: true, data: control, message: 'Control added successfully' });
  } catch (error) {
    next(error);
  }
});

/**
 * PUT /api/risks/:id/controls/:controlId
 * Update a control (Manager+)
 */
router.put('/:id/controls/:controlId', requireManager, async (req, res, next) => {
  try {
    const control = await controlService.updateControl(
      req.params.controlId,
      req.params.id,
      req.user.organisationId,
      req.body,
      req.user.id
    );
    res.json({ success: true, data: control, message: 'Control updated successfully' });
  } catch (error) {
    next(error);
  }
});

/**
 * DELETE /api/risks/:id/controls/:controlId
 * Delete a control (Manager+)
 */
router.delete('/:id/controls/:controlId', requireManager, async (req, res, next) => {
  try {
    const result = await controlService.deleteControl(
      req.params.controlId,
      req.params.id,
      req.user.organisationId,
      req.user.id
    );
    res.json({ success: true, message: result.message });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/risks/:id/controls/:controlId/verify
 * Verify a control (Manager+)
 */
router.post('/:id/controls/:controlId/verify', requireManager, async (req, res, next) => {
  try {
    const control = await controlService.verifyControl(
      req.params.controlId,
      req.params.id,
      req.user.organisationId,
      req.body,
      req.user.id
    );
    res.json({ success: true, data: control, message: 'Control verified successfully' });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/risks/:id/controls/:controlId/links
 * Link a control to an entity (Manager+)
 */
router.post('/:id/controls/:controlId/links', requireManager, async (req, res, next) => {
  try {
    const link = await controlService.linkControlToEntity(
      req.params.controlId,
      req.params.id,
      req.user.organisationId,
      req.body,
      req.user.id
    );
    res.status(201).json({ success: true, data: link, message: 'Control linked successfully' });
  } catch (error) {
    next(error);
  }
});

/**
 * DELETE /api/risks/:id/controls/:controlId/links/:linkId
 * Remove a control-entity link (Manager+)
 */
router.delete('/:id/controls/:controlId/links/:linkId', requireManager, async (req, res, next) => {
  try {
    const result = await controlService.unlinkControlFromEntity(
      req.params.controlId,
      req.params.id,
      req.user.organisationId,
      req.params.linkId,
      req.user.id
    );
    res.json({ success: true, message: result.message });
  } catch (error) {
    next(error);
  }
});

// ==================== RISK LINKS ====================

/**
 * GET /api/risks/:id/links
 * List links for a risk
 */
router.get('/:id/links', async (req, res, next) => {
  try {
    const result = await linkService.listLinks(req.params.id, req.user.organisationId, {
      entityType: req.query.entityType
    });
    res.json({ success: true, data: result.links, summary: result.summary });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/risks/:id/links
 * Create a link between risk and entity (Manager+)
 */
router.post('/:id/links', requireManager, async (req, res, next) => {
  try {
    const link = await linkService.createLink(
      req.params.id,
      req.user.organisationId,
      req.body,
      req.user.id
    );
    res.status(201).json({ success: true, data: link, message: 'Link created successfully' });
  } catch (error) {
    next(error);
  }
});

/**
 * DELETE /api/risks/:id/links/:linkId
 * Remove a risk link (Manager+)
 */
router.delete('/:id/links/:linkId', requireManager, async (req, res, next) => {
  try {
    const result = await linkService.deleteLink(
      req.params.id,
      req.user.organisationId,
      req.params.linkId,
      req.user.id
    );
    res.json({ success: true, message: result.message });
  } catch (error) {
    next(error);
  }
});

// ==================== REVIEWS ====================

/**
 * GET /api/risks/:id/reviews
 * List reviews for a risk
 */
router.get('/:id/reviews', async (req, res, next) => {
  try {
    const result = await reviewService.listReviews(req.params.id, req.user.organisationId, {
      page: parseInt(req.query.page, 10) || 1,
      limit: parseInt(req.query.limit, 10) || 20
    });
    res.json({ success: true, data: result.reviews, pagination: result.pagination });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/risks/:id/reviews
 * Record a review (Manager+)
 */
router.post('/:id/reviews', requireManager, async (req, res, next) => {
  try {
    const review = await reviewService.recordReview(
      req.params.id,
      req.user.organisationId,
      req.body,
      req.user.id
    );
    res.status(201).json({ success: true, data: review, message: 'Review recorded successfully' });
  } catch (error) {
    next(error);
  }
});

module.exports = router;

/**
 * Safety Admin Routes - Phase 11
 *
 * Admin endpoints for managing Safety Moments, Legislation, and PPE Rules.
 * BR-11-20 to BR-11-22 (C-289 to C-291)
 */

const express = require('express');
const {
  getSafetyMoments,
  createSafetyMoment,
  updateSafetyMoment,
  archiveSafetyMoment,
  acknowledgeSafetyMoment,
  getSafetyMomentAnalytics
} = require('../services/safetyMomentService');
const {
  getLegislationRefs,
  createLegislationRef,
  updateLegislationRef,
  deleteLegislationRef,
  getJurisdictions,
  getLegislationCategories
} = require('../services/legislationService');
const {
  getPPERules,
  createPPERule,
  updatePPERule,
  deletePPERule
} = require('../services/ppeRecommendationService');
const { authMiddleware, requireRole } = require('../middleware/auth');
const { AppError } = require('../utils/appError');

const router = express.Router();

// =============================================================================
// SAFETY MOMENTS ADMIN (C-273)
// =============================================================================

/**
 * GET /api/safety-admin/safety-moments
 * List safety moments with filters
 */
router.get('/safety-moments', authMiddleware, requireRole(['manager', 'admin']), async (req, res, next) => {
  try {
    const { organisationId } = req.user;
    const { page, limit, category, isActive, siteId, includeArchived } = req.query;

    const result = await getSafetyMoments(organisationId, {
      page: page ? parseInt(page) : 1,
      limit: limit ? parseInt(limit) : 20,
      category,
      isActive: isActive !== undefined ? isActive === 'true' : null,
      siteId: siteId ? parseInt(siteId) : null,
      includeArchived: includeArchived === 'true'
    });

    res.json(result);
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/safety-admin/safety-moments
 * Create a new safety moment
 */
router.post('/safety-moments', authMiddleware, requireRole(['manager', 'admin']), async (req, res, next) => {
  try {
    const { organisationId, id: userId } = req.user;
    const { title, body, category, tags, applicableSites, applicableRoles, startDate, endDate, isActive } = req.body;

    if (!title || !body) {
      throw new AppError('Title and body are required', 400, 'VALIDATION_ERROR');
    }

    if (!startDate) {
      throw new AppError('Start date is required', 400, 'VALIDATION_ERROR');
    }

    const moment = await createSafetyMoment(organisationId, {
      title,
      body,
      category,
      tags,
      applicableSites,
      applicableRoles,
      startDate,
      endDate,
      isActive
    }, userId);

    res.status(201).json(moment);
  } catch (err) {
    next(err);
  }
});

/**
 * PUT /api/safety-admin/safety-moments/:id
 * Update a safety moment
 */
router.put('/safety-moments/:id', authMiddleware, requireRole(['manager', 'admin']), async (req, res, next) => {
  try {
    const momentId = parseInt(req.params.id);
    const { organisationId, id: userId } = req.user;
    const { title, body, category, tags, applicableSites, applicableRoles, startDate, endDate, isActive } = req.body;

    if (isNaN(momentId)) {
      throw new AppError('Invalid safety moment ID', 400, 'VALIDATION_ERROR');
    }

    const moment = await updateSafetyMoment(organisationId, momentId, {
      title,
      body,
      category,
      tags,
      applicableSites,
      applicableRoles,
      startDate,
      endDate,
      isActive
    }, userId);

    if (!moment) {
      throw new AppError('Safety moment not found', 404, 'NOT_FOUND');
    }

    res.json(moment);
  } catch (err) {
    next(err);
  }
});

/**
 * DELETE /api/safety-admin/safety-moments/:id
 * Archive a safety moment
 */
router.delete('/safety-moments/:id', authMiddleware, requireRole(['admin']), async (req, res, next) => {
  try {
    const momentId = parseInt(req.params.id);
    const { organisationId, id: userId } = req.user;

    if (isNaN(momentId)) {
      throw new AppError('Invalid safety moment ID', 400, 'VALIDATION_ERROR');
    }

    const success = await archiveSafetyMoment(organisationId, momentId, userId);

    if (!success) {
      throw new AppError('Safety moment not found', 404, 'NOT_FOUND');
    }

    res.json({ message: 'Safety moment archived successfully' });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/safety-admin/safety-moments/:id/acknowledge
 * Acknowledge a safety moment (for testing/admin purposes)
 */
router.post('/safety-moments/:id/acknowledge', authMiddleware, async (req, res, next) => {
  try {
    const momentId = parseInt(req.params.id);
    const { organisationId, id: userId } = req.user;
    const { siteId, channel, entityType, entityId } = req.body || {};

    if (isNaN(momentId)) {
      throw new AppError('Invalid safety moment ID', 400, 'VALIDATION_ERROR');
    }

    const ack = await acknowledgeSafetyMoment(organisationId, momentId, userId, {
      siteId: siteId ? parseInt(siteId) : null,
      channel: channel || 'dashboard',
      entityType,
      entityId: entityId ? parseInt(entityId) : null
    });

    if (!ack) {
      throw new AppError('Safety moment not found', 404, 'NOT_FOUND');
    }

    res.json(ack);
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/safety-admin/safety-moments/analytics
 * Get Safety Moment analytics (C-274)
 */
router.get('/safety-moments/analytics', authMiddleware, requireRole(['manager', 'admin']), async (req, res, next) => {
  try {
    const { organisationId } = req.user;
    const { startDate, endDate, siteId } = req.query;

    const analytics = await getSafetyMomentAnalytics(organisationId, {
      startDate,
      endDate,
      siteId: siteId ? parseInt(siteId) : null
    });

    res.json(analytics);
  } catch (err) {
    next(err);
  }
});

// =============================================================================
// LEGISLATION ADMIN (C-290)
// =============================================================================

/**
 * GET /api/safety-admin/legislation
 * List legislation references
 */
router.get('/legislation', authMiddleware, requireRole(['manager', 'admin']), async (req, res, next) => {
  try {
    const { organisationId } = req.user;
    const { page, limit, siteId, category, jurisdiction, search } = req.query;

    const result = await getLegislationRefs(organisationId, {
      page: page ? parseInt(page) : 1,
      limit: limit ? parseInt(limit) : 20,
      siteId: siteId ? parseInt(siteId) : null,
      category,
      jurisdiction,
      search
    });

    res.json(result);
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/safety-admin/legislation/jurisdictions
 * Get unique jurisdictions
 */
router.get('/legislation/jurisdictions', authMiddleware, requireRole(['manager', 'admin']), async (req, res, next) => {
  try {
    const { organisationId } = req.user;
    const jurisdictions = await getJurisdictions(organisationId);
    res.json({ data: jurisdictions });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/safety-admin/legislation/categories
 * Get legislation categories
 */
router.get('/legislation/categories', authMiddleware, async (req, res, next) => {
  try {
    const categories = getLegislationCategories();
    res.json({ data: categories });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/safety-admin/legislation
 * Create a legislation reference
 */
router.post('/legislation', authMiddleware, requireRole(['admin']), async (req, res, next) => {
  try {
    const { organisationId, id: userId } = req.user;
    const { siteId, title, jurisdiction, category, summary, referenceUrl, isPrimary } = req.body;

    if (!siteId || !title) {
      throw new AppError('Site ID and title are required', 400, 'VALIDATION_ERROR');
    }

    const ref = await createLegislationRef(organisationId, {
      siteId: parseInt(siteId),
      title,
      jurisdiction,
      category,
      summary,
      referenceUrl,
      isPrimary
    }, userId);

    res.status(201).json(ref);
  } catch (err) {
    next(err);
  }
});

/**
 * PUT /api/safety-admin/legislation/:id
 * Update a legislation reference
 */
router.put('/legislation/:id', authMiddleware, requireRole(['admin']), async (req, res, next) => {
  try {
    const refId = parseInt(req.params.id);
    const { organisationId, id: userId } = req.user;
    const { title, jurisdiction, category, summary, referenceUrl, isPrimary } = req.body;

    if (isNaN(refId)) {
      throw new AppError('Invalid legislation reference ID', 400, 'VALIDATION_ERROR');
    }

    const ref = await updateLegislationRef(organisationId, refId, {
      title,
      jurisdiction,
      category,
      summary,
      referenceUrl,
      isPrimary
    }, userId);

    if (!ref) {
      throw new AppError('Legislation reference not found', 404, 'NOT_FOUND');
    }

    res.json(ref);
  } catch (err) {
    next(err);
  }
});

/**
 * DELETE /api/safety-admin/legislation/:id
 * Delete a legislation reference
 */
router.delete('/legislation/:id', authMiddleware, requireRole(['admin']), async (req, res, next) => {
  try {
    const refId = parseInt(req.params.id);
    const { organisationId, id: userId } = req.user;

    if (isNaN(refId)) {
      throw new AppError('Invalid legislation reference ID', 400, 'VALIDATION_ERROR');
    }

    const success = await deleteLegislationRef(organisationId, refId, userId);

    if (!success) {
      throw new AppError('Legislation reference not found', 404, 'NOT_FOUND');
    }

    res.json({ message: 'Legislation reference deleted successfully' });
  } catch (err) {
    next(err);
  }
});

// =============================================================================
// PPE RULES ADMIN (C-291)
// =============================================================================

/**
 * GET /api/safety-admin/ppe-rules
 * List PPE recommendation rules
 */
router.get('/ppe-rules', authMiddleware, requireRole(['manager', 'admin']), async (req, res, next) => {
  try {
    const { organisationId } = req.user;
    const { page, limit, siteId, taskType, weatherCategory, isActive } = req.query;

    const result = await getPPERules(organisationId, {
      page: page ? parseInt(page) : 1,
      limit: limit ? parseInt(limit) : 20,
      siteId: siteId ? parseInt(siteId) : null,
      taskType,
      weatherCategory,
      isActive: isActive !== undefined ? isActive === 'true' : true
    });

    res.json(result);
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/safety-admin/ppe-rules
 * Create a PPE rule
 */
router.post('/ppe-rules', authMiddleware, requireRole(['admin']), async (req, res, next) => {
  try {
    const { organisationId, id: userId } = req.user;
    const { siteId, taskType, permitTypeId, weatherCategory, recommendationText, ppeList, priority, isActive } = req.body;

    if (!recommendationText && (!ppeList || ppeList.length === 0)) {
      throw new AppError('Either recommendation text or PPE list is required', 400, 'VALIDATION_ERROR');
    }

    const rule = await createPPERule(organisationId, {
      siteId: siteId ? parseInt(siteId) : null,
      taskType,
      permitTypeId: permitTypeId ? parseInt(permitTypeId) : null,
      weatherCategory,
      recommendationText,
      ppeList,
      priority: priority ? parseInt(priority) : 99,
      isActive
    }, userId);

    res.status(201).json(rule);
  } catch (err) {
    next(err);
  }
});

/**
 * PUT /api/safety-admin/ppe-rules/:id
 * Update a PPE rule
 */
router.put('/ppe-rules/:id', authMiddleware, requireRole(['admin']), async (req, res, next) => {
  try {
    const ruleId = parseInt(req.params.id);
    const { organisationId, id: userId } = req.user;
    const { siteId, taskType, permitTypeId, weatherCategory, recommendationText, ppeList, priority, isActive } = req.body;

    if (isNaN(ruleId)) {
      throw new AppError('Invalid PPE rule ID', 400, 'VALIDATION_ERROR');
    }

    const rule = await updatePPERule(organisationId, ruleId, {
      siteId: siteId !== undefined ? (siteId ? parseInt(siteId) : null) : undefined,
      taskType,
      permitTypeId: permitTypeId !== undefined ? (permitTypeId ? parseInt(permitTypeId) : null) : undefined,
      weatherCategory,
      recommendationText,
      ppeList,
      priority: priority !== undefined ? parseInt(priority) : undefined,
      isActive
    }, userId);

    if (!rule) {
      throw new AppError('PPE rule not found', 404, 'NOT_FOUND');
    }

    res.json(rule);
  } catch (err) {
    next(err);
  }
});

/**
 * DELETE /api/safety-admin/ppe-rules/:id
 * Delete a PPE rule
 */
router.delete('/ppe-rules/:id', authMiddleware, requireRole(['admin']), async (req, res, next) => {
  try {
    const ruleId = parseInt(req.params.id);
    const { organisationId, id: userId } = req.user;

    if (isNaN(ruleId)) {
      throw new AppError('Invalid PPE rule ID', 400, 'VALIDATION_ERROR');
    }

    const success = await deletePPERule(organisationId, ruleId, userId);

    if (!success) {
      throw new AppError('PPE rule not found', 404, 'NOT_FOUND');
    }

    res.json({ message: 'PPE rule deleted successfully' });
  } catch (err) {
    next(err);
  }
});

module.exports = router;

/**
 * Safety Advisor Routes - Phase 11
 *
 * Provides safety intelligence endpoints for sites and tasks.
 * BR-11-16 to BR-11-20 (C-285 to C-289)
 */

const express = require('express');
const {
  getSafetySummaryForSite,
  getSafetySummaryForTask,
  recordSafetyAcknowledgement,
  checkSafetyAcknowledgement,
  getUserSafetyOverview,
  getMissingAcknowledgements,
  getSafetyAdvisorAnalytics
} = require('../services/safetyAdvisorService');
const { getWeatherForSite, getForecastForSite } = require('../services/weatherService');
const { authMiddleware, requireRole } = require('../middleware/auth');
const { AppError } = require('../utils/appError');

const router = express.Router();

/**
 * GET /api/safety-advisor/sites/:id/summary
 * Get complete safety summary for a site
 * BR-11-16 (C-285)
 */
router.get('/sites/:id/summary', authMiddleware, async (req, res, next) => {
  try {
    const siteId = parseInt(req.params.id);
    const { organisationId, id: userId, role } = req.user;

    if (isNaN(siteId)) {
      throw new AppError('Invalid site ID', 400, 'VALIDATION_ERROR');
    }

    const summary = await getSafetySummaryForSite(siteId, organisationId, userId, role);

    if (!summary) {
      throw new AppError('Site not found', 404, 'NOT_FOUND');
    }

    res.json(summary);
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/safety-advisor/sites/:id/acknowledge
 * Record site-based safety acknowledgement (daily briefing)
 * BR-11-18 (C-287)
 */
router.post('/sites/:id/acknowledge', authMiddleware, async (req, res, next) => {
  try {
    const siteId = req.params.id;
    const { organisationId, id: userId } = req.user;

    if (!siteId) {
      throw new AppError('Invalid site ID', 400, 'VALIDATION_ERROR');
    }

    const acknowledgement = await recordSafetyAcknowledgement(
      organisationId,
      userId,
      'site_briefing',
      siteId,
      {
        siteId,
        isHighRisk: false,
        safetySummarySnapshot: null
      }
    );

    res.json(acknowledgement);
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/safety-advisor/sites/:id/weather
 * Get weather for a site
 * BR-11-07 (C-276)
 */
router.get('/sites/:id/weather', authMiddleware, async (req, res, next) => {
  try {
    const siteId = parseInt(req.params.id);
    const { organisationId } = req.user;

    if (isNaN(siteId)) {
      throw new AppError('Invalid site ID', 400, 'VALIDATION_ERROR');
    }

    const weather = await getWeatherForSite(siteId, organisationId);
    res.json(weather);
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/safety-advisor/sites/:id/forecast
 * Get weather forecast for a site
 * BR-11-07 (C-276)
 */
router.get('/sites/:id/forecast', authMiddleware, async (req, res, next) => {
  try {
    const siteId = parseInt(req.params.id);

    if (isNaN(siteId)) {
      throw new AppError('Invalid site ID', 400, 'VALIDATION_ERROR');
    }

    const forecast = await getForecastForSite(siteId);
    res.json(forecast);
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/safety-advisor/tasks/:type/:id/summary
 * Get safety summary for a specific task/entity
 * BR-11-17 (C-286)
 */
router.get('/tasks/:type/:id/summary', authMiddleware, async (req, res, next) => {
  try {
    const { type, id } = req.params;
    const entityId = parseInt(id);
    const { organisationId, id: userId, role } = req.user;

    const validTypes = ['incident', 'inspection', 'action', 'training', 'permit'];
    if (!validTypes.includes(type)) {
      throw new AppError('Invalid entity type', 400, 'VALIDATION_ERROR');
    }

    if (isNaN(entityId)) {
      throw new AppError('Invalid entity ID', 400, 'VALIDATION_ERROR');
    }

    const summary = await getSafetySummaryForTask(type, entityId, organisationId, userId, role);

    if (summary.error) {
      throw new AppError(summary.error, 404, 'NOT_FOUND');
    }

    res.json(summary);
  } catch (err) {
    next(err);
  }
});

/**
 * PUT /api/safety-advisor/tasks/:type/:id/acknowledge
 * Record safety acknowledgement for a task
 * BR-11-18, BR-11-19 (C-287, C-288)
 */
router.put('/tasks/:type/:id/acknowledge', authMiddleware, async (req, res, next) => {
  try {
    const { type, id } = req.params;
    const entityId = parseInt(id);
    const { organisationId, id: userId } = req.user;
    const { siteId, isHighRisk, safetySummarySnapshot } = req.body || {};

    const validTypes = ['incident', 'inspection', 'action', 'training', 'permit'];
    if (!validTypes.includes(type)) {
      throw new AppError('Invalid entity type', 400, 'VALIDATION_ERROR');
    }

    if (isNaN(entityId)) {
      throw new AppError('Invalid entity ID', 400, 'VALIDATION_ERROR');
    }

    const acknowledgement = await recordSafetyAcknowledgement(
      organisationId,
      userId,
      type,
      entityId,
      {
        siteId: siteId ? parseInt(siteId) : null,
        isHighRisk: !!isHighRisk,
        safetySummarySnapshot
      }
    );

    res.json(acknowledgement);
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/safety-advisor/tasks/:type/:id/acknowledgement-status
 * Check acknowledgement status for a task
 * BR-11-18a, BR-11-18b (C-287a, C-287b)
 */
router.get('/tasks/:type/:id/acknowledgement-status', authMiddleware, async (req, res, next) => {
  try {
    const { type, id } = req.params;
    const entityId = parseInt(id);
    const { organisationId, id: userId } = req.user;

    const validTypes = ['incident', 'inspection', 'action', 'training', 'permit'];
    if (!validTypes.includes(type)) {
      throw new AppError('Invalid entity type', 400, 'VALIDATION_ERROR');
    }

    if (isNaN(entityId)) {
      throw new AppError('Invalid entity ID', 400, 'VALIDATION_ERROR');
    }

    const status = await checkSafetyAcknowledgement(organisationId, userId, type, entityId);
    res.json(status);
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/safety-advisor/my/overview
 * Get user's safety overview
 */
router.get('/my/overview', authMiddleware, async (req, res, next) => {
  try {
    const { organisationId, id: userId, role, primarySiteId } = req.user;

    const overview = await getUserSafetyOverview(organisationId, userId, role, primarySiteId || null);
    res.json(overview);
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/safety-advisor/missing-acknowledgements
 * Get tasks missing required safety acknowledgement
 * BR-11-20 (C-289)
 */
router.get('/missing-acknowledgements', authMiddleware, requireRole(['supervisor', 'manager', 'admin']), async (req, res, next) => {
  try {
    const { organisationId } = req.user;
    const { siteId, userId, limit } = req.query;

    const result = await getMissingAcknowledgements(organisationId, {
      siteId: siteId ? parseInt(siteId) : null,
      userId: userId ? parseInt(userId) : null,
      limit: limit ? parseInt(limit) : 50
    });

    res.json(result);
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/safety-advisor/analytics
 * Get Safety Advisor analytics
 * BR-11-24, BR-11-25 (C-293, C-294)
 */
router.get('/analytics', authMiddleware, requireRole(['manager', 'admin']), async (req, res, next) => {
  try {
    const { organisationId } = req.user;
    const { startDate, endDate, siteId } = req.query;

    const analytics = await getSafetyAdvisorAnalytics(organisationId, {
      startDate,
      endDate,
      siteId: siteId ? parseInt(siteId) : null
    });

    res.json(analytics);
  } catch (err) {
    next(err);
  }
});

module.exports = router;

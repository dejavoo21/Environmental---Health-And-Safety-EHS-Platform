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
    const siteId = req.params.id; // UUID, not integer
    const { organisationId, id: userId, role } = req.user;

    if (!siteId) {
      throw new AppError('Invalid site ID', 400, 'VALIDATION_ERROR');
    }

    const summary = await getSafetySummaryForSite(siteId, organisationId, userId, role);

    if (!summary) {
      // Return empty summary instead of 404 to avoid blank screen
      return res.json({
        siteId,
        siteName: 'Unknown Site',
        weather: { status: 'unavailable' },
        ppeAdvice: { items: [], summary: 'No PPE data available' },
        safetyMoment: null,
        legislation: [],
        lastAcknowledgedAt: null
      });
    }

    res.json(summary);
  } catch (err) {
    // Handle missing tables gracefully
    if (err.code === '42P01') {
      console.error('Safety Advisor tables not found - run migrations 010-011:', err.message);
      return res.json({
        siteId: req.params.id,
        siteName: 'Site',
        weather: { status: 'unavailable' },
        ppeAdvice: { items: [], summary: 'Safety Advisor not configured' },
        safetyMoment: null,
        legislation: [],
        lastAcknowledgedAt: null,
        meta: { warning: 'Safety Advisor tables not found. Run migrations 010-011.' }
      });
    }
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
    const siteId = req.params.id; // UUID
    const { organisationId } = req.user;

    if (!siteId) {
      throw new AppError('Invalid site ID', 400, 'VALIDATION_ERROR');
    }

    const weather = await getWeatherForSite(siteId, organisationId);
    res.json(weather);
  } catch (err) {
    // Handle missing tables or weather not configured
    if (err.code === '42P01') {
      return res.json({ status: 'unavailable', message: 'Weather tables not configured' });
    }
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
    const siteId = req.params.id; // UUID

    if (!siteId) {
      throw new AppError('Invalid site ID', 400, 'VALIDATION_ERROR');
    }

    const forecast = await getForecastForSite(siteId);
    res.json(forecast);
  } catch (err) {
    if (err.code === '42P01') {
      return res.json({ status: 'unavailable', forecast: [] });
    }
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
    const { type, id: entityId } = req.params; // entityId is UUID string
    const { organisationId, id: userId, role } = req.user;

    const validTypes = ['incident', 'inspection', 'action', 'training', 'permit'];
    if (!validTypes.includes(type)) {
      throw new AppError('Invalid entity type', 400, 'VALIDATION_ERROR');
    }

    if (!entityId) {
      throw new AppError('Invalid entity ID', 400, 'VALIDATION_ERROR');
    }

    const summary = await getSafetySummaryForTask(type, entityId, organisationId, userId, role);

    if (summary.error) {
      throw new AppError(summary.error, 404, 'NOT_FOUND');
    }

    res.json(summary);
  } catch (err) {
    // Handle missing tables gracefully
    if (err.code === '42P01') {
      console.error('[SafetyAdvisor] Tables not found:', err.message);
      return res.json({
        entityType: req.params.type,
        entityId: req.params.id,
        weather: { status: 'unavailable' },
        ppeAdvice: { items: [], summary: 'Safety Advisor not configured' },
        safetyMoment: null,
        legislation: [],
        hasAcknowledged: false
      });
    }
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
    const { type, id: entityId } = req.params; // entityId is UUID string
    const { organisationId, id: userId } = req.user;
    const { siteId, isHighRisk, safetySummarySnapshot } = req.body || {};

    const validTypes = ['incident', 'inspection', 'action', 'training', 'permit'];
    if (!validTypes.includes(type)) {
      throw new AppError('Invalid entity type', 400, 'VALIDATION_ERROR');
    }

    if (!entityId) {
      throw new AppError('Invalid entity ID', 400, 'VALIDATION_ERROR');
    }

    console.log(`[SafetyAdvisor] Recording acknowledgement for ${type}/${entityId} by user ${userId}`);

    const acknowledgement = await recordSafetyAcknowledgement(
      organisationId,
      userId,
      type,
      entityId,
      {
        siteId: siteId || null, // siteId is also UUID, don't parseInt
        isHighRisk: !!isHighRisk,
        safetySummarySnapshot
      }
    );

    console.log(`[SafetyAdvisor] Acknowledgement recorded successfully: ${acknowledgement.id}`);

    res.json({ success: true, ...acknowledgement });
  } catch (err) {
    console.error(`[SafetyAdvisor] Acknowledgement error for ${req.params.type}/${req.params.id}:`, err.message);

    // Handle missing tables
    if (err.code === '42P01') {
      return res.status(500).json({
        success: false,
        error: 'Safety acknowledgement tables not configured. Please run migrations.'
      });
    }

    // Handle unique constraint violation (already acknowledged)
    if (err.code === '23505') {
      return res.json({ success: true, message: 'Already acknowledged' });
    }

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
    const { type, id: entityId } = req.params; // entityId is UUID string
    const { organisationId, id: userId } = req.user;

    const validTypes = ['incident', 'inspection', 'action', 'training', 'permit'];
    if (!validTypes.includes(type)) {
      throw new AppError('Invalid entity type', 400, 'VALIDATION_ERROR');
    }

    if (!entityId) {
      throw new AppError('Invalid entity ID', 400, 'VALIDATION_ERROR');
    }

    const status = await checkSafetyAcknowledgement(organisationId, userId, type, entityId);
    res.json(status);
  } catch (err) {
    // Handle missing tables gracefully
    if (err.code === '42P01') {
      return res.json({ hasAcknowledged: false, acknowledgedAt: null });
    }
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
      siteId: siteId || null, // UUID string
      userId: userId || null, // UUID string
      limit: limit ? parseInt(limit) : 50
    });

    res.json(result);
  } catch (err) {
    // Handle missing tables gracefully
    if (err.code === '42P01') {
      return res.json({ missing: [], total: 0 });
    }
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
      siteId: siteId || null // UUID string
    });

    res.json(analytics);
  } catch (err) {
    // Handle missing tables gracefully
    if (err.code === '42P01') {
      return res.json({
        totalAcknowledgements: 0,
        highRiskAcknowledgements: 0,
        byEntityType: {},
        bySite: {},
        trend: []
      });
    }
    next(err);
  }
});

module.exports = router;

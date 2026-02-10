/**
 * Access Request Routes - Phase 6
 * Public and admin endpoints for self-service access requests
 */

const express = require('express');
const { query } = require('../config/db');
const { AppError } = require('../utils/appError');
const { authMiddleware, requireRole } = require('../middleware/auth');
const accessRequestService = require('../services/accessRequestService');

const router = express.Router();

// Helper to get client IP
const getClientIp = (req) => {
  return req.headers['x-forwarded-for']?.split(',')[0].trim() || req.ip || req.connection?.remoteAddress;
};

// ==========================================
// Public Endpoints
// ==========================================

/**
 * POST /api/access-requests
 * Submit a new access request (public)
 */
router.post('/', async (req, res, next) => {
  const { email, fullName, organisationCode, requestedRole, reason, termsAccepted } = req.body || {};
  
  if (!email) {
    return next(new AppError('Email is required', 400, 'VALIDATION_ERROR'));
  }
  
  if (!fullName) {
    return next(new AppError('Full name is required', 400, 'VALIDATION_ERROR'));
  }
  
  if (!organisationCode) {
    return next(new AppError('Organisation code is required', 400, 'VALIDATION_ERROR'));
  }
  
  try {
    const result = await accessRequestService.submitAccessRequest({
      email,
      fullName,
      organisationCode,
      requestedRole: requestedRole || 'worker',
      reason,
      termsAccepted: termsAccepted === true,
      ipAddress: getClientIp(req),
      userAgent: req.headers['user-agent']
    });
    
    if (!result.success) {
      return res.status(400).json(result);
    }
    
    return res.status(201).json(result);
  } catch (err) {
    console.error('[AccessRequest Route] Error:', {
      message: err.message,
      code: err.code,
      stack: err.stack
    });
    
    // Handle database connection errors gracefully
    if (err.code === 'ECONNREFUSED' || err.message?.includes('connect') || err.message?.includes('ENOENT')) {
      return res.status(503).json({
        success: false,
        error: 'SERVICE_UNAVAILABLE',
        message: 'The system is temporarily unavailable. Please try again in a few moments.'
      });
    }
    
    return next(err);
  }
});

// ==========================================
// Admin Endpoints
// ==========================================

/**
 * GET /api/access-requests/admin
 * List access requests for the organisation (admin only)
 */
router.get('/admin', authMiddleware, requireRole('admin'), async (req, res, next) => {
  const { status, search, page = 1, limit = 20 } = req.query;
  
  try {
    const result = await accessRequestService.listAccessRequests({
      organisationId: req.user.organisationId,
      status,
      search,
      page: parseInt(page, 10),
      limit: Math.min(parseInt(limit, 10), 100)
    });
    
    return res.json(result);
  } catch (err) {
    return next(err);
  }
});

/**
 * GET /api/access-requests/admin/:id
 * Get access request details (admin only)
 */
router.get('/admin/:id', authMiddleware, requireRole('admin'), async (req, res, next) => {
  try {
    const request = await accessRequestService.getAccessRequest(
      req.params.id,
      req.user.organisationId
    );
    
    if (!request) {
      return next(new AppError('Access request not found', 404, 'NOT_FOUND'));
    }
    
    return res.json(request);
  } catch (err) {
    return next(err);
  }
});

/**
 * POST /api/access-requests/admin/:id/approve
 * Approve an access request (admin only)
 */
router.post('/admin/:id/approve', authMiddleware, requireRole('admin'), async (req, res, next) => {
  const { assignedRole, sendWelcomeEmail = true } = req.body || {};
  
  try {
    const result = await accessRequestService.approveAccessRequest({
      requestId: req.params.id,
      organisationId: req.user.organisationId,
      adminUserId: req.user.id,
      assignedRole,
      sendWelcomeEmail,
      ipAddress: getClientIp(req),
      userAgent: req.headers['user-agent']
    });
    
    if (!result.success) {
      return res.status(400).json(result);
    }
    
    return res.json(result);
  } catch (err) {
    return next(err);
  }
});

/**
 * POST /api/access-requests/admin/:id/reject
 * Reject an access request (admin only)
 */
router.post('/admin/:id/reject', authMiddleware, requireRole('admin'), async (req, res, next) => {
  const { reason, sendEmail = true } = req.body || {};
  
  try {
    const result = await accessRequestService.rejectAccessRequest({
      requestId: req.params.id,
      organisationId: req.user.organisationId,
      adminUserId: req.user.id,
      reason,
      sendEmail,
      ipAddress: getClientIp(req),
      userAgent: req.headers['user-agent']
    });
    
    if (!result.success) {
      return res.status(400).json(result);
    }
    
    return res.json(result);
  } catch (err) {
    return next(err);
  }
});

/**
 * GET /api/access-requests/admin/pending-count
 * Get count of pending requests (for badge/notification)
 */
router.get('/admin/pending-count', authMiddleware, requireRole('admin'), async (req, res, next) => {
  try {
    const result = await query(
      `SELECT COUNT(*) FROM access_requests 
       WHERE organisation_id = $1 AND status = 'pending' AND expires_at > NOW()`,
      [req.user.organisationId]
    );
    
    return res.json({
      pendingCount: parseInt(result.rows[0].count, 10)
    });
  } catch (err) {
    return next(err);
  }
});

module.exports = router;

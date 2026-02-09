/**
 * Security Routes - Phase 6
 * Security Centre, login history, password change, and theme preferences
 */

const express = require('express');
const { query } = require('../config/db');
const { AppError } = require('../utils/appError');
const { authMiddleware, requireRole } = require('../middleware/auth');
const passwordResetService = require('../services/passwordResetService');
const twoFactorService = require('../services/twoFactorService');
const securityAuditService = require('../services/securityAuditService');

const router = express.Router();

// Helper to get client IP
const getClientIp = (req) => {
  return req.headers['x-forwarded-for']?.split(',')[0].trim() || req.ip || req.connection?.remoteAddress;
};

// Helper to mask IP address
const maskIpAddress = (ip) => {
  if (!ip) return null;
  const ipStr = ip.toString();
  if (ipStr.includes('.')) {
    const parts = ipStr.split('.');
    if (parts.length === 4) {
      parts[3] = 'xxx';
      return parts.join('.');
    }
  }
  if (ipStr.includes(':')) {
    const parts = ipStr.split(':');
    if (parts.length > 2) {
      return `${parts[0]}:${parts[1]}:...`;
    }
  }
  return ipStr;
};

// ==========================================
// User Security Centre Endpoints
// ==========================================

/**
 * GET /api/users/me/security
 * Get security summary for the current user
 */
router.get('/me/security', authMiddleware, async (req, res, next) => {
  try {
    // Get user security info
    const userResult = await query(
      `SELECT 
        u.is_active, u.has_2fa_enabled, u.password_changed_at,
        u.failed_login_attempts, u.locked_until, u.last_login_at, u.last_login_ip
       FROM users u WHERE u.id = $1`,
      [req.user.id]
    );
    
    if (userResult.rowCount === 0) {
      return next(new AppError('User not found', 404, 'NOT_FOUND'));
    }
    
    const user = userResult.rows[0];
    
    // Get 2FA status
    const twoFAStatus = await twoFactorService.get2FAStatus(req.user.id);
    
    // Get last login info (most recent successful login before current session)
    const lastLoginResult = await query(
      `SELECT login_at, ip_address, browser, location_city, location_country
       FROM login_history
       WHERE user_id = $1 AND success = TRUE
       ORDER BY login_at DESC
       LIMIT 1 OFFSET 1`,
      [req.user.id]
    );
    
    let lastLogin = null;
    if (lastLoginResult.rowCount > 0) {
      const ll = lastLoginResult.rows[0];
      lastLogin = {
        at: ll.login_at,
        ipAddress: maskIpAddress(ll.ip_address),
        browser: ll.browser,
        location: [ll.location_city, ll.location_country].filter(Boolean).join(', ') || null
      };
    }
    
    return res.json({
      accountStatus: user.is_active ? 'active' : 'disabled',
      twoFactorEnabled: user.has_2fa_enabled,
      twoFactorEnabledAt: twoFAStatus.enabledAt,
      backupCodesRemaining: twoFAStatus.backupCodesRemaining,
      passwordLastChanged: user.password_changed_at,
      lastLogin,
      failedLoginAttempts: user.failed_login_attempts,
      accountLocked: user.locked_until ? new Date(user.locked_until) > new Date() : false
    });
  } catch (err) {
    return next(err);
  }
});

/**
 * GET /api/users/me/login-history
 * Get recent login history for the current user
 */
router.get('/me/login-history', authMiddleware, async (req, res, next) => {
  const { limit = 20 } = req.query;
  
  try {
    const result = await query(
      `SELECT 
        login_at, ip_address, browser, device_type, 
        location_city, location_country, success, failure_reason, mfa_used
       FROM login_history
       WHERE user_id = $1
       ORDER BY login_at DESC
       LIMIT $2`,
      [req.user.id, Math.min(parseInt(limit, 10), 50)]
    );
    
    return res.json({
      data: result.rows.map(row => ({
        at: row.login_at,
        ipAddress: maskIpAddress(row.ip_address),
        browser: row.browser,
        deviceType: row.device_type,
        location: [row.location_city, row.location_country].filter(Boolean).join(', ') || null,
        success: row.success,
        failureReason: row.failure_reason,
        mfaUsed: row.mfa_used
      }))
    });
  } catch (err) {
    return next(err);
  }
});

/**
 * POST /api/users/me/change-password
 * Change the current user's password
 */
router.post('/me/change-password', authMiddleware, async (req, res, next) => {
  const { currentPassword, newPassword } = req.body || {};
  
  if (!currentPassword) {
    return res.status(400).json({
      success: false,
      error: 'VALIDATION_ERROR',
      message: 'Current password is required.'
    });
  }
  
  if (!newPassword) {
    return res.status(400).json({
      success: false,
      error: 'VALIDATION_ERROR',
      message: 'New password is required.'
    });
  }
  
  try {
    const result = await passwordResetService.changePassword({
      userId: req.user.id,
      organisationId: req.user.organisationId,
      currentPassword,
      newPassword,
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

// ==========================================
// Theme Preference Endpoints
// ==========================================

/**
 * GET /api/users/me/theme
 * Get current user's theme preference
 */
router.get('/me/theme', authMiddleware, async (req, res, next) => {
  try {
    const result = await query(
      `SELECT u.theme_preference, o.default_theme
       FROM users u
       LEFT JOIN organisations o ON o.id = u.organisation_id
       WHERE u.id = $1`,
      [req.user.id]
    );
    
    if (result.rowCount === 0) {
      return next(new AppError('User not found', 404, 'NOT_FOUND'));
    }
    
    const { theme_preference, default_theme } = result.rows[0];
    
    // Determine effective theme
    let effectiveTheme = theme_preference;
    if (theme_preference === 'system') {
      effectiveTheme = default_theme || 'light';
    }
    
    return res.json({
      themePreference: theme_preference,
      effectiveTheme,
      organisationDefault: default_theme || 'light'
    });
  } catch (err) {
    return next(err);
  }
});

/**
 * PUT /api/users/me/theme
 * Update user's theme preference
 */
router.put('/me/theme', authMiddleware, async (req, res, next) => {
  const { themePreference } = req.body || {};
  
  if (!['light', 'dark', 'system'].includes(themePreference)) {
    return res.status(400).json({
      success: false,
      error: 'INVALID_THEME',
      message: 'Theme must be "light", "dark", or "system".'
    });
  }
  
  try {
    await query(
      `UPDATE users SET theme_preference = $1, updated_at = NOW() WHERE id = $2`,
      [themePreference, req.user.id]
    );
    
    return res.json({
      success: true,
      themePreference
    });
  } catch (err) {
    return next(err);
  }
});

// ==========================================
// Admin Organisation Theme Endpoints
// ==========================================

/**
 * GET /api/admin/organisation/theme
 * Get organisation's default theme (admin only)
 */
router.get('/admin/organisation/theme', authMiddleware, requireRole('admin'), async (req, res, next) => {
  try {
    const result = await query(
      `SELECT default_theme FROM organisations WHERE id = $1`,
      [req.user.organisationId]
    );
    
    if (result.rowCount === 0) {
      return next(new AppError('Organisation not found', 404, 'NOT_FOUND'));
    }
    
    return res.json({
      defaultTheme: result.rows[0].default_theme
    });
  } catch (err) {
    return next(err);
  }
});

/**
 * PUT /api/admin/organisation/theme
 * Update organisation's default theme (admin only)
 */
router.put('/admin/organisation/theme', authMiddleware, requireRole('admin'), async (req, res, next) => {
  const { defaultTheme } = req.body || {};
  
  if (!['light', 'dark'].includes(defaultTheme)) {
    return res.status(400).json({
      success: false,
      error: 'INVALID_THEME',
      message: 'Theme must be "light" or "dark".'
    });
  }
  
  try {
    await query(
      `UPDATE organisations SET default_theme = $1, updated_at = NOW() WHERE id = $2`,
      [defaultTheme, req.user.organisationId]
    );
    
    return res.json({
      success: true,
      defaultTheme
    });
  } catch (err) {
    return next(err);
  }
});

// ==========================================
// Admin Security Audit Log Endpoints
// ==========================================

/**
 * GET /api/admin/security-audit
 * Query security audit log (admin only)
 */
router.get('/admin/security-audit', authMiddleware, requireRole('admin'), async (req, res, next) => {
  const { 
    eventType, userId, startDate, endDate, ipAddress, 
    page = 1, limit = 50 
  } = req.query;
  
  try {
    const result = await securityAuditService.querySecurityAudit({
      organisationId: req.user.organisationId,
      eventType,
      userId,
      startDate,
      endDate,
      ipAddress,
      page: parseInt(page, 10),
      limit: Math.min(parseInt(limit, 10), 200)
    });
    
    return res.json(result);
  } catch (err) {
    return next(err);
  }
});

/**
 * GET /api/admin/security-audit/:id
 * Get audit event details (admin only)
 */
router.get('/admin/security-audit/:id', authMiddleware, requireRole('admin'), async (req, res, next) => {
  try {
    const event = await securityAuditService.getSecurityAuditEvent(
      req.params.id,
      req.user.organisationId
    );
    
    if (!event) {
      return next(new AppError('Audit event not found', 404, 'NOT_FOUND'));
    }
    
    return res.json(event);
  } catch (err) {
    return next(err);
  }
});

/**
 * GET /api/admin/security-audit/export
 * Export security audit log as CSV (admin only)
 */
router.get('/admin/security-audit/export', authMiddleware, requireRole('admin'), async (req, res, next) => {
  const { eventType, userId, startDate, endDate, ipAddress } = req.query;
  
  try {
    // Get all matching events (up to 10000)
    const result = await securityAuditService.querySecurityAudit({
      organisationId: req.user.organisationId,
      eventType,
      userId,
      startDate,
      endDate,
      ipAddress,
      page: 1,
      limit: 10000
    });
    
    // Generate CSV
    const headers = ['Timestamp', 'Event Type', 'User', 'Target User', 'IP Address', 'Details'];
    const rows = result.data.map(event => [
      event.createdAt,
      event.eventType,
      event.userName || '',
      event.targetUserName || '',
      event.ipAddress || '',
      event.metadata ? JSON.stringify(event.metadata) : ''
    ]);
    
    const csv = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    ].join('\n');
    
    const filename = `security-audit-${new Date().toISOString().split('T')[0]}.csv`;
    
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    return res.send(csv);
  } catch (err) {
    return next(err);
  }
});

module.exports = router;

const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { query } = require('../config/db');
const env = require('../config/env');
const { AppError } = require('../utils/appError');
const { splitName } = require('../utils/format');
const { authMiddleware } = require('../middleware/auth');
const passwordResetService = require('../services/passwordResetService');
const securityAuditService = require('../services/securityAuditService');
const twoFactorService = require('../services/twoFactorService');

const router = express.Router();

// Constants
const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_MINUTES = 15;
const TEMP_TOKEN_EXPIRY = '5m';

// Helper to get client IP
const getClientIp = (req) => {
  return req.headers['x-forwarded-for']?.split(',')[0].trim() || req.ip || req.connection?.remoteAddress;
};

// Helper to parse user agent
const parseUserAgent = (userAgent) => {
  if (!userAgent) return { browser: 'Unknown', deviceType: 'unknown' };
  
  let browser = 'Unknown';
  let deviceType = 'desktop';
  
  if (userAgent.includes('Chrome')) browser = 'Chrome';
  else if (userAgent.includes('Firefox')) browser = 'Firefox';
  else if (userAgent.includes('Safari')) browser = 'Safari';
  else if (userAgent.includes('Edge')) browser = 'Edge';
  
  if (userAgent.includes('Mobile') || userAgent.includes('Android')) deviceType = 'mobile';
  else if (userAgent.includes('Tablet') || userAgent.includes('iPad')) deviceType = 'tablet';
  
  return { browser, deviceType };
};

// Helper to record login history
const recordLoginHistory = async ({
  userId,
  organisationId,
  ipAddress,
  userAgent,
  success,
  failureReason = null,
  mfaUsed = false
}) => {
  const { browser, deviceType } = parseUserAgent(userAgent);
  
  await query(
    `INSERT INTO login_history 
     (user_id, organisation_id, ip_address, user_agent, device_type, browser, success, failure_reason, mfa_used)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
    [userId, organisationId, ipAddress, userAgent, deviceType, browser, success, failureReason, mfaUsed]
  );
};

router.post('/login', async (req, res, next) => {
  const { email, password } = req.body || {};
  const ipAddress = getClientIp(req);
  const userAgent = req.headers['user-agent'];
  
  if (!email || !password) {
    return next(new AppError('Invalid email or password', 401, 'INVALID_CREDENTIALS'));
  }

  try {
    const result = await query(
      `SELECT u.id, u.email, u.name, u.role, u.password_hash, u.is_active, u.organisation_id,
              u.has_2fa_enabled, u.failed_login_attempts, u.locked_until, u.theme_preference,
              o.name AS org_name, o.slug AS org_slug
       FROM users u
       LEFT JOIN organisations o ON o.id = u.organisation_id
       WHERE u.email = $1`,
      [email.toLowerCase().trim()]
    );

    if (result.rowCount === 0) {
      // Log failed attempt (user not found)
      await securityAuditService.logLoginAttempt({
        success: false,
        email,
        ipAddress,
        userAgent,
        failureReason: 'user_not_found'
      });
      return next(new AppError('Invalid email or password', 401, 'INVALID_CREDENTIALS'));
    }

    const user = result.rows[0];

    // Check if account is locked
    if (user.locked_until && new Date(user.locked_until) > new Date()) {
      const minutesRemaining = Math.ceil((new Date(user.locked_until) - new Date()) / 60000);
      
      await securityAuditService.logLoginAttempt({
        success: false,
        userId: user.id,
        organisationId: user.organisation_id,
        email,
        ipAddress,
        userAgent,
        failureReason: 'account_locked'
      });
      
      return res.status(423).json({
        error: 'ACCOUNT_LOCKED',
        message: 'Your account is locked due to too many failed attempts.',
        unlocksAt: user.locked_until,
        minutesRemaining
      });
    }

    // Check if user account is disabled
    if (user.is_active === false) {
      await securityAuditService.logLoginAttempt({
        success: false,
        userId: user.id,
        organisationId: user.organisation_id,
        email,
        ipAddress,
        userAgent,
        failureReason: 'account_disabled'
      });
      return next(new AppError('Your account has been disabled. Contact your administrator.', 401, 'ACCOUNT_DISABLED'));
    }

    const matches = await bcrypt.compare(password, user.password_hash);
    if (!matches) {
      // Increment failed attempts
      const newFailedAttempts = (user.failed_login_attempts || 0) + 1;
      
      if (newFailedAttempts >= MAX_FAILED_ATTEMPTS) {
        // Lock the account
        const lockUntil = new Date(Date.now() + LOCKOUT_MINUTES * 60 * 1000);
        await query(
          `UPDATE users SET failed_login_attempts = $1, locked_until = $2 WHERE id = $3`,
          [newFailedAttempts, lockUntil, user.id]
        );
        
        await securityAuditService.logAccountLocked({
          userId: user.id,
          organisationId: user.organisation_id,
          ipAddress,
          userAgent
        });
        
        await recordLoginHistory({
          userId: user.id,
          organisationId: user.organisation_id,
          ipAddress,
          userAgent,
          success: false,
          failureReason: 'invalid_password'
        });
        
        return res.status(423).json({
          error: 'ACCOUNT_LOCKED',
          message: 'Your account is locked due to too many failed attempts.',
          unlocksAt: lockUntil,
          minutesRemaining: LOCKOUT_MINUTES
        });
      } else {
        await query(
          `UPDATE users SET failed_login_attempts = $1 WHERE id = $2`,
          [newFailedAttempts, user.id]
        );
      }
      
      await securityAuditService.logLoginAttempt({
        success: false,
        userId: user.id,
        organisationId: user.organisation_id,
        email,
        ipAddress,
        userAgent,
        failureReason: 'invalid_password'
      });
      
      await recordLoginHistory({
        userId: user.id,
        organisationId: user.organisation_id,
        ipAddress,
        userAgent,
        success: false,
        failureReason: 'invalid_password'
      });
      
      return next(new AppError('Invalid email or password', 401, 'INVALID_CREDENTIALS'));
    }

    // Password is correct - check if 2FA is required
    if (user.has_2fa_enabled) {
      // Generate temporary token for 2FA step
      const tempToken = jwt.sign(
        {
          sub: user.id,
          type: '2fa_pending',
          organisationId: user.organisation_id
        },
        env.jwtSecret,
        { expiresIn: TEMP_TOKEN_EXPIRY }
      );
      
      return res.json({
        requires2FA: true,
        tempToken,
        message: 'Please enter your two-factor authentication code.'
      });
    }

    // No 2FA - complete login
    // Reset failed attempts and update last login
    await query(
      `UPDATE users 
       SET failed_login_attempts = 0, locked_until = NULL, last_login_at = NOW(), last_login_ip = $1 
       WHERE id = $2`,
      [ipAddress, user.id]
    );

    // Log successful login
    await securityAuditService.logLoginAttempt({
      success: true,
      userId: user.id,
      organisationId: user.organisation_id,
      ipAddress,
      userAgent
    });
    
    await recordLoginHistory({
      userId: user.id,
      organisationId: user.organisation_id,
      ipAddress,
      userAgent,
      success: true,
      mfaUsed: false
    });

    const token = jwt.sign(
      {
        sub: user.id,
        role: user.role,
        organisationId: user.organisation_id,
        organisationSlug: user.org_slug
      },
      env.jwtSecret,
      { expiresIn: env.jwtExpiresIn }
    );

    const nameParts = splitName(user.name);

    return res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        firstName: nameParts.firstName,
        lastName: nameParts.lastName,
        name: user.name,
        role: user.role,
        organisationId: user.organisation_id,
        organisationName: user.org_name,
        organisationSlug: user.org_slug,
        themePreference: user.theme_preference
      }
    });
  } catch (err) {
    return next(err);
  }
});

router.get('/me', authMiddleware, (req, res) => {
  const nameParts = splitName(req.user.name);
  return res.json({
    id: req.user.id,
    email: req.user.email,
    firstName: nameParts.firstName,
    lastName: nameParts.lastName,
    name: req.user.name,
    role: req.user.role,
    organisationId: req.user.organisationId,
    organisationName: req.user.organisationName,
    organisationSlug: req.user.organisationSlug
  });
});

// ==========================================
// Password Reset Endpoints (Phase 6)
// ==========================================

/**
 * POST /api/auth/forgot-password
 * Request a password reset email (public)
 */
router.post('/forgot-password', async (req, res, next) => {
  const { email } = req.body || {};
  
  if (!email) {
    return next(new AppError('Email is required', 400, 'VALIDATION_ERROR'));
  }
  
  try {
    const result = await passwordResetService.requestPasswordReset({
      email,
      ipAddress: getClientIp(req),
      userAgent: req.headers['user-agent']
    });
    
    return res.json(result);
  } catch (err) {
    return next(err);
  }
});

/**
 * GET /api/auth/reset-password/validate
 * Validate a password reset token (public)
 */
router.get('/reset-password/validate', async (req, res, next) => {
  const { token } = req.query;
  
  if (!token) {
    return res.status(400).json({
      valid: false,
      error: 'TOKEN_INVALID',
      message: 'No reset token provided.'
    });
  }
  
  try {
    const result = await passwordResetService.validateResetToken(token);
    
    if (!result.valid) {
      return res.status(400).json(result);
    }
    
    return res.json(result);
  } catch (err) {
    return next(err);
  }
});

/**
 * POST /api/auth/reset-password
 * Reset password using a valid token (public)
 */
router.post('/reset-password', async (req, res, next) => {
  const { token, newPassword } = req.body || {};
  
  if (!token) {
    return res.status(400).json({
      success: false,
      error: 'TOKEN_INVALID',
      message: 'No reset token provided.'
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
    const result = await passwordResetService.resetPassword({
      token,
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
// Two-Factor Authentication Endpoints (Phase 6)
// ==========================================

/**
 * POST /api/auth/2fa/setup
 * Initiate 2FA setup - generate secret and QR code
 */
router.post('/2fa/setup', authMiddleware, async (req, res, next) => {
  try {
    const result = await twoFactorService.initiate2FASetup(
      req.user.id,
      req.user.email
    );
    return res.json(result);
  } catch (err) {
    return next(err);
  }
});

/**
 * POST /api/auth/2fa/verify
 * Verify TOTP code and enable 2FA
 */
router.post('/2fa/verify', authMiddleware, async (req, res, next) => {
  const { code } = req.body || {};
  
  if (!code || code.length !== 6) {
    return res.status(400).json({
      success: false,
      error: 'INVALID_CODE',
      message: 'Please enter a valid 6-digit code.'
    });
  }
  
  try {
    const result = await twoFactorService.verifyAndEnable2FA({
      userId: req.user.id,
      organisationId: req.user.organisationId,
      code,
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
 * POST /api/auth/2fa/login-verify
 * Verify 2FA code during login (after password verification)
 */
router.post('/2fa/login-verify', async (req, res, next) => {
  const { tempToken, code, isBackupCode } = req.body || {};
  const ipAddress = getClientIp(req);
  const userAgent = req.headers['user-agent'];
  
  if (!tempToken) {
    return res.status(400).json({
      success: false,
      error: 'TOKEN_REQUIRED',
      message: 'Temporary token is required.'
    });
  }
  
  if (!code) {
    return res.status(400).json({
      success: false,
      error: 'CODE_REQUIRED',
      message: 'Verification code is required.'
    });
  }
  
  try {
    // Verify temp token
    let decoded;
    try {
      decoded = jwt.verify(tempToken, env.jwtSecret);
    } catch (err) {
      return res.status(400).json({
        success: false,
        error: 'TOKEN_EXPIRED',
        message: 'Session expired. Please log in again.'
      });
    }
    
    if (decoded.type !== '2fa_pending') {
      return res.status(400).json({
        success: false,
        error: 'TOKEN_INVALID',
        message: 'Invalid token type.'
      });
    }
    
    const userId = decoded.sub;
    const organisationId = decoded.organisationId;
    
    let verification;
    let backupCodeWarning = null;
    
    if (isBackupCode) {
      // Verify backup code
      verification = await twoFactorService.verifyBackupCode({
        userId,
        organisationId,
        code,
        ipAddress,
        userAgent
      });
      if (verification.warning) {
        backupCodeWarning = verification.warning;
      }
    } else {
      // Verify TOTP code
      verification = await twoFactorService.verifyTOTP(userId, code);
    }
    
    if (!verification.valid) {
      await securityAuditService.logLoginAttempt({
        success: false,
        userId,
        organisationId,
        ipAddress,
        userAgent,
        failureReason: 'invalid_2fa_code'
      });
      
      return res.status(400).json({
        success: false,
        error: 'INVALID_CODE',
        message: isBackupCode ? 'Invalid backup code.' : 'Invalid verification code.'
      });
    }
    
    // 2FA verified - get user data and complete login
    const userResult = await query(
      `SELECT u.id, u.email, u.name, u.role, u.organisation_id, u.theme_preference,
              o.name AS org_name, o.slug AS org_slug
       FROM users u
       LEFT JOIN organisations o ON o.id = u.organisation_id
       WHERE u.id = $1`,
      [userId]
    );
    
    if (userResult.rowCount === 0) {
      return res.status(400).json({
        success: false,
        error: 'USER_NOT_FOUND',
        message: 'User not found.'
      });
    }
    
    const user = userResult.rows[0];
    
    // Reset failed attempts and update last login
    await query(
      `UPDATE users 
       SET failed_login_attempts = 0, locked_until = NULL, last_login_at = NOW(), last_login_ip = $1 
       WHERE id = $2`,
      [ipAddress, userId]
    );
    
    // Log successful login
    await securityAuditService.logLoginAttempt({
      success: true,
      userId,
      organisationId,
      ipAddress,
      userAgent
    });
    
    await recordLoginHistory({
      userId,
      organisationId,
      ipAddress,
      userAgent,
      success: true,
      mfaUsed: true
    });
    
    // Generate full auth token
    const token = jwt.sign(
      {
        sub: user.id,
        role: user.role,
        organisationId: user.organisation_id,
        organisationSlug: user.org_slug
      },
      env.jwtSecret,
      { expiresIn: env.jwtExpiresIn }
    );
    
    const nameParts = splitName(user.name);
    
    return res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        firstName: nameParts.firstName,
        lastName: nameParts.lastName,
        name: user.name,
        role: user.role,
        organisationId: user.organisation_id,
        organisationName: user.org_name,
        organisationSlug: user.org_slug,
        themePreference: user.theme_preference
      },
      backupCodeWarning
    });
  } catch (err) {
    return next(err);
  }
});

/**
 * DELETE /api/auth/2fa
 * Disable 2FA for the current user
 */
router.delete('/2fa', authMiddleware, async (req, res, next) => {
  const { code } = req.body || {};
  
  if (!code) {
    return res.status(400).json({
      success: false,
      error: 'CODE_REQUIRED',
      message: 'Verification code is required to disable 2FA.'
    });
  }
  
  try {
    const result = await twoFactorService.disable2FA({
      userId: req.user.id,
      organisationId: req.user.organisationId,
      code,
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
 * POST /api/auth/2fa/backup-codes/regenerate
 * Generate new backup codes (invalidates old ones)
 */
router.post('/2fa/backup-codes/regenerate', authMiddleware, async (req, res, next) => {
  const { code } = req.body || {};
  
  if (!code) {
    return res.status(400).json({
      success: false,
      error: 'CODE_REQUIRED',
      message: 'Verification code is required to regenerate backup codes.'
    });
  }
  
  try {
    const result = await twoFactorService.regenerateBackupCodes({
      userId: req.user.id,
      organisationId: req.user.organisationId,
      code,
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
 * GET /api/auth/2fa/status
 * Get current 2FA status for the user
 */
router.get('/2fa/status', authMiddleware, async (req, res, next) => {
  try {
    const status = await twoFactorService.get2FAStatus(req.user.id);
    return res.json(status);
  } catch (err) {
    return next(err);
  }
});

module.exports = router;

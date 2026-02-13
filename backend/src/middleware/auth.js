const jwt = require('jsonwebtoken');
const { query } = require('../config/db');
const env = require('../config/env');
const { AppError } = require('../utils/appError');

const authMiddleware = async (req, res, next) => {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;

  if (!token) {
    return next(new AppError('Invalid or missing token', 401, 'UNAUTHORIZED'));
  }

  try {
    const payload = jwt.verify(token, env.jwtSecret);
    const result = await query(
      `SELECT u.id, u.email, u.name, u.role, u.is_active, u.organisation_id,
              u.force_password_change,
              o.name AS org_name, o.slug AS org_slug
       FROM users u
       LEFT JOIN organisations o ON o.id = u.organisation_id
       WHERE u.id = $1`,
      [payload.sub]
    );

    if (result.rowCount === 0) {
      return next(new AppError('Invalid token', 401, 'UNAUTHORIZED'));
    }

    const user = result.rows[0];

    // Check if user account is disabled (C80)
    if (user.is_active === false) {
      return next(new AppError('Your account has been disabled. Contact your administrator.', 401, 'ACCOUNT_DISABLED'));
    }

    req.user = {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      isActive: user.is_active,
      organisationId: user.organisation_id,
      organisationName: user.org_name,
      organisationSlug: user.org_slug,
      forcePasswordChange: user.force_password_change || false
    };
    return next();
  } catch (err) {
    return next(new AppError('Invalid or expired token', 401, 'UNAUTHORIZED'));
  }
};

/**
 * Middleware to require specific role(s)
 * @param {...string} roles - Allowed roles
 * @returns {Function} Express middleware
 */
const requireRole = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return next(new AppError('Authentication required', 401, 'UNAUTHORIZED'));
    }
    
    if (!roles.includes(req.user.role)) {
      return next(new AppError('Insufficient permissions', 403, 'FORBIDDEN'));
    }
    
    return next();
  };
};

module.exports = { authMiddleware, requireRole };

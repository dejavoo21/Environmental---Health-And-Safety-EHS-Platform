const { AppError } = require('../utils/appError');
const { hasAnyRequiredRole, hasRequiredRole } = require('../utils/roles');

const requireRole = (roles) => (req, res, next) => {
  if (!req.user || !hasAnyRequiredRole(req.user.role, roles)) {
    return next(new AppError('Admin access required', 403, 'FORBIDDEN'));
  }
  return next();
};

const requireManager = (req, res, next) => {
  if (!req.user || !hasRequiredRole(req.user.role, 'manager')) {
    return next(new AppError('Manager access required', 403, 'FORBIDDEN'));
  }
  return next();
};

const requireAdmin = (req, res, next) => {
  if (!req.user || !hasRequiredRole(req.user.role, 'admin')) {
    return next(new AppError('Admin access required', 403, 'FORBIDDEN'));
  }
  return next();
};

module.exports = { requireRole, requireManager, requireAdmin };

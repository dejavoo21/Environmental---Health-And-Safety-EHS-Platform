const { AppError } = require('../utils/appError');

const requireRole = (roles) => (req, res, next) => {
  if (!req.user || !roles.includes(req.user.role)) {
    return next(new AppError('Admin access required', 403, 'FORBIDDEN'));
  }
  return next();
};

const requireManager = (req, res, next) => {
  if (!req.user || (req.user.role !== 'manager' && req.user.role !== 'admin')) {
    return next(new AppError('Manager access required', 403, 'FORBIDDEN'));
  }
  return next();
};

const requireAdmin = (req, res, next) => {
  if (!req.user || req.user.role !== 'admin') {
    return next(new AppError('Admin access required', 403, 'FORBIDDEN'));
  }
  return next();
};

module.exports = { requireRole, requireManager, requireAdmin };

const { query } = require('../config/db');
const { AppError } = require('../utils/appError');

/**
 * Organisation scoping middleware
 * Extracts organisation context from authenticated user and validates org is active
 * Sets req.orgId and req.organisation for downstream use
 */
const orgScopeMiddleware = async (req, res, next) => {
  // Organisation ID is extracted from JWT by authMiddleware
  const orgId = req.user?.organisationId;

  if (!orgId) {
    return next(new AppError('Organisation context required', 401, 'ORG_CONTEXT_REQUIRED'));
  }

  try {
    // Validate organisation exists and is active
    const result = await query(
      'SELECT id, name, slug, logo_url, timezone, settings, is_active FROM organisations WHERE id = $1',
      [orgId]
    );

    if (result.rowCount === 0) {
      return next(new AppError('Organisation not found', 404, 'ORG_NOT_FOUND'));
    }

    const org = result.rows[0];

    if (!org.is_active) {
      return next(new AppError('Organisation is inactive', 403, 'ORG_INACTIVE'));
    }

    // Inject into request for downstream use
    req.orgId = orgId;
    req.organisation = {
      id: org.id,
      name: org.name,
      slug: org.slug,
      logoUrl: org.logo_url,
      timezone: org.timezone,
      settings: org.settings,
      isActive: org.is_active
    };

    return next();
  } catch (err) {
    return next(err);
  }
};

module.exports = { orgScopeMiddleware };

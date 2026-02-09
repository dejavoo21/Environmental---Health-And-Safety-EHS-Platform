const express = require('express');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const { query } = require('../config/db');
const { AppError } = require('../utils/appError');
const { requireRole } = require('../middleware/requireRole');
const { orgScopeMiddleware } = require('../middleware/orgScope');
const { toIso } = require('../utils/format');
const { recordAudit } = require('../utils/audit');
const env = require('../config/env');

const router = express.Router();

// Configure multer for logo uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const logoDir = path.join(process.cwd(), env.uploadsDir, 'logos', req.orgId);
    fs.mkdirSync(logoDir, { recursive: true });
    cb(null, logoDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `logo${ext}`);
  }
});

const fileFilter = (req, file, cb) => {
  if (env.logoAllowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new AppError('Only PNG, JPEG, and SVG files are allowed', 400, 'INVALID_FILE_TYPE'), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: env.logoMaxSizeBytes }
});

// Valid IANA timezones (subset for validation)
const validTimezones = new Set([
  'UTC', 'GMT',
  'America/New_York', 'America/Chicago', 'America/Denver', 'America/Los_Angeles',
  'America/Toronto', 'America/Vancouver', 'America/Mexico_City', 'America/Sao_Paulo',
  'Europe/London', 'Europe/Paris', 'Europe/Berlin', 'Europe/Madrid', 'Europe/Rome',
  'Europe/Amsterdam', 'Europe/Brussels', 'Europe/Stockholm', 'Europe/Moscow',
  'Asia/Dubai', 'Asia/Singapore', 'Asia/Hong_Kong', 'Asia/Tokyo', 'Asia/Seoul',
  'Asia/Shanghai', 'Asia/Kolkata', 'Asia/Bangkok', 'Asia/Jakarta',
  'Australia/Sydney', 'Australia/Melbourne', 'Australia/Perth', 'Australia/Brisbane',
  'Pacific/Auckland', 'Pacific/Fiji', 'Africa/Cairo', 'Africa/Johannesburg',
  'Africa/Lagos', 'Africa/Nairobi'
]);

const isValidTimezone = (tz) => {
  // Only accept timezones from the valid set
  return validTimezones.has(tz);
};

// Apply orgScope middleware to all routes
router.use(orgScopeMiddleware);

/**
 * GET /api/organisation
 * Get current user's organisation profile and settings (C91, C93)
 */
router.get('/', async (req, res, next) => {
  try {
    const result = await query(
      `SELECT id, name, slug, logo_url, timezone, settings, is_active, created_at, updated_at
       FROM organisations WHERE id = $1`,
      [req.orgId]
    );

    if (result.rowCount === 0) {
      return next(new AppError('Organisation not found', 404, 'ORG_NOT_FOUND'));
    }

    const org = result.rows[0];
    return res.json({
      data: {
        id: org.id,
        name: org.name,
        slug: org.slug,
        logoUrl: org.logo_url,
        timezone: org.timezone,
        settings: org.settings,
        isActive: org.is_active,
        createdAt: toIso(org.created_at),
        updatedAt: toIso(org.updated_at)
      }
    });
  } catch (err) {
    return next(err);
  }
});

/**
 * PUT /api/organisation
 * Update organisation profile (name and timezone) (C91, C93, C95)
 */
router.put('/', requireRole(['admin']), async (req, res, next) => {
  const { name, timezone } = req.body || {};

  // Validate name length
  if (name !== undefined) {
    if (typeof name !== 'string' || name.trim().length === 0) {
      return next(new AppError('Name is required', 400, 'NAME_REQUIRED'));
    }
    if (name.length > 200) {
      return next(new AppError('Name must be 200 characters or less', 400, 'NAME_TOO_LONG'));
    }
  }

  // Validate timezone
  if (timezone !== undefined && !isValidTimezone(timezone)) {
    return next(new AppError('Invalid timezone format', 400, 'INVALID_TIMEZONE'));
  }

  try {
    // Get current values for audit log
    const current = await query('SELECT name, timezone FROM organisations WHERE id = $1', [req.orgId]);
    const oldValues = current.rows[0];

    const result = await query(
      `UPDATE organisations
       SET name = COALESCE($1, name),
           timezone = COALESCE($2, timezone),
           updated_at = NOW()
       WHERE id = $3
       RETURNING id, name, slug, logo_url, timezone, settings, is_active, created_at, updated_at`,
      [name || null, timezone || null, req.orgId]
    );

    const org = result.rows[0];

    // Record audit log
    await recordAudit({
      eventType: 'updated',
      entityType: 'organisation',
      entityId: req.orgId,
      userId: req.user.id,
      oldValue: { name: oldValues.name, timezone: oldValues.timezone },
      newValue: { name: org.name, timezone: org.timezone },
      organisationId: req.orgId
    });

    return res.json({
      data: {
        id: org.id,
        name: org.name,
        slug: org.slug,
        logoUrl: org.logo_url,
        timezone: org.timezone,
        settings: org.settings,
        isActive: org.is_active,
        createdAt: toIso(org.created_at),
        updatedAt: toIso(org.updated_at)
      }
    });
  } catch (err) {
    return next(err);
  }
});

/**
 * POST /api/organisation/logo
 * Upload or replace organisation logo (C92, C95)
 */
router.post('/logo', requireRole(['admin']), (req, res, next) => {
  upload.single('file')(req, res, async (err) => {
    if (err) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return next(new AppError('Logo must be under 2 MB', 400, 'FILE_TOO_LARGE'));
      }
      return next(err);
    }

    if (!req.file) {
      return next(new AppError('No file provided', 400, 'NO_FILE_PROVIDED'));
    }

    try {
      // Delete old logo files (if any with different extensions)
      const logoDir = path.join(process.cwd(), env.uploadsDir, 'logos', req.orgId);
      const files = fs.readdirSync(logoDir);
      for (const f of files) {
        if (f !== req.file.filename && f.startsWith('logo.')) {
          fs.unlinkSync(path.join(logoDir, f));
        }
      }

      const logoUrl = `/uploads/logos/${req.orgId}/${req.file.filename}`;

      await query(
        'UPDATE organisations SET logo_url = $1, updated_at = NOW() WHERE id = $2',
        [logoUrl, req.orgId]
      );

      // Record audit log
      await recordAudit({
        eventType: 'logo_uploaded',
        entityType: 'organisation',
        entityId: req.orgId,
        userId: req.user.id,
        newValue: { logoUrl },
        organisationId: req.orgId
      });

      return res.json({
        data: {
          logoUrl,
          message: 'Logo uploaded successfully'
        }
      });
    } catch (uploadErr) {
      return next(uploadErr);
    }
  });
});

/**
 * DELETE /api/organisation/logo
 * Remove organisation logo (C92, C95)
 */
router.delete('/logo', requireRole(['admin']), async (req, res, next) => {
  try {
    // Get current logo URL
    const current = await query('SELECT logo_url FROM organisations WHERE id = $1', [req.orgId]);
    const oldLogoUrl = current.rows[0]?.logo_url;

    // Delete file from disk
    if (oldLogoUrl) {
      const filePath = path.join(process.cwd(), oldLogoUrl);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }

    await query(
      'UPDATE organisations SET logo_url = NULL, updated_at = NOW() WHERE id = $1',
      [req.orgId]
    );

    // Record audit log
    await recordAudit({
      eventType: 'logo_deleted',
      entityType: 'organisation',
      entityId: req.orgId,
      userId: req.user.id,
      oldValue: { logoUrl: oldLogoUrl },
      organisationId: req.orgId
    });

    return res.json({
      data: {
        message: 'Logo removed successfully'
      }
    });
  } catch (err) {
    return next(err);
  }
});

/**
 * PUT /api/organisation/dashboard-settings
 * Update dashboard KPI threshold settings (C94, C95)
 */
router.put('/dashboard-settings', requireRole(['admin']), async (req, res, next) => {
  const {
    openIncidentsWarning,
    openIncidentsCritical,
    overdueActionsWarning,
    overdueActionsCritical,
    failedInspectionsWarning,
    failedInspectionsCritical
  } = req.body || {};

  // Validate threshold values are non-negative integers
  const thresholds = {
    openIncidentsWarning,
    openIncidentsCritical,
    overdueActionsWarning,
    overdueActionsCritical,
    failedInspectionsWarning,
    failedInspectionsCritical
  };

  for (const [key, value] of Object.entries(thresholds)) {
    if (value !== undefined) {
      if (!Number.isInteger(value) || value < 0) {
        return next(new AppError('Threshold values must be non-negative integers', 400, 'NEGATIVE_VALUE'));
      }
    }
  }

  // Validate critical >= warning
  if (openIncidentsWarning !== undefined && openIncidentsCritical !== undefined) {
    if (openIncidentsCritical < openIncidentsWarning) {
      return next(new AppError('Critical threshold must be >= warning threshold', 400, 'INVALID_THRESHOLD'));
    }
  }
  if (overdueActionsWarning !== undefined && overdueActionsCritical !== undefined) {
    if (overdueActionsCritical < overdueActionsWarning) {
      return next(new AppError('Critical threshold must be >= warning threshold', 400, 'INVALID_THRESHOLD'));
    }
  }
  if (failedInspectionsWarning !== undefined && failedInspectionsCritical !== undefined) {
    if (failedInspectionsCritical < failedInspectionsWarning) {
      return next(new AppError('Critical threshold must be >= warning threshold', 400, 'INVALID_THRESHOLD'));
    }
  }

  try {
    // Get current settings
    const current = await query('SELECT settings FROM organisations WHERE id = $1', [req.orgId]);
    const oldSettings = current.rows[0]?.settings || {};
    const oldDashboard = oldSettings.dashboard || {};

    // Build new dashboard settings
    const newDashboard = {
      openIncidentsWarning: openIncidentsWarning ?? oldDashboard.openIncidentsWarning ?? 5,
      openIncidentsCritical: openIncidentsCritical ?? oldDashboard.openIncidentsCritical ?? 10,
      overdueActionsWarning: overdueActionsWarning ?? oldDashboard.overdueActionsWarning ?? 3,
      overdueActionsCritical: overdueActionsCritical ?? oldDashboard.overdueActionsCritical ?? 5,
      failedInspectionsWarning: failedInspectionsWarning ?? oldDashboard.failedInspectionsWarning ?? 2,
      failedInspectionsCritical: failedInspectionsCritical ?? oldDashboard.failedInspectionsCritical ?? 5
    };

    // Validate after merging with existing values
    if (newDashboard.openIncidentsCritical < newDashboard.openIncidentsWarning) {
      return next(new AppError('Critical threshold must be >= warning threshold', 400, 'INVALID_THRESHOLD'));
    }
    if (newDashboard.overdueActionsCritical < newDashboard.overdueActionsWarning) {
      return next(new AppError('Critical threshold must be >= warning threshold', 400, 'INVALID_THRESHOLD'));
    }
    if (newDashboard.failedInspectionsCritical < newDashboard.failedInspectionsWarning) {
      return next(new AppError('Critical threshold must be >= warning threshold', 400, 'INVALID_THRESHOLD'));
    }

    const newSettings = { ...oldSettings, dashboard: newDashboard };

    const result = await query(
      `UPDATE organisations SET settings = $1, updated_at = NOW() WHERE id = $2
       RETURNING settings`,
      [JSON.stringify(newSettings), req.orgId]
    );

    // Record audit log
    await recordAudit({
      eventType: 'settings_updated',
      entityType: 'organisation',
      entityId: req.orgId,
      userId: req.user.id,
      oldValue: { dashboard: oldDashboard },
      newValue: { dashboard: newDashboard },
      organisationId: req.orgId
    });

    return res.json({
      data: {
        settings: result.rows[0].settings,
        message: 'Dashboard settings updated successfully'
      }
    });
  } catch (err) {
    return next(err);
  }
});

module.exports = router;

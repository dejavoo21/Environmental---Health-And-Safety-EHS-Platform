const express = require('express');
const bcrypt = require('bcryptjs');
const fs = require('fs');
const path = require('path');
const multer = require('multer');
const { query } = require('../config/db');
const { AppError } = require('../utils/appError');
const { requireRole } = require('../middleware/requireRole');
const { orgScopeMiddleware } = require('../middleware/orgScope');
const { toIso, splitName } = require('../utils/format');
const { recordAudit } = require('../utils/audit');
const env = require('../config/env');
const { hasRequiredRole } = require('../utils/roles');

const router = express.Router();

const validRoles = new Set(['worker', 'manager', 'admin', 'super_admin']);

const photoStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(process.cwd(), env.uploadsDir, 'profile-photos', req.orgId);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname || '').toLowerCase() || '.jpg';
    cb(null, `${req.params.id}_${Date.now()}${ext}`);
  }
});

const photoUpload = multer({
  storage: photoStorage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (!file.mimetype || !file.mimetype.startsWith('image/')) {
      return cb(new AppError('Only image files are allowed for profile photo.', 400, 'INVALID_FILE_TYPE'));
    }
    cb(null, true);
  }
});

// Apply orgScope middleware to all routes
router.use(orgScopeMiddleware);

// All user management routes require admin role (C95)
router.use(requireRole(['admin']));

/**
 * Map a user row to API response format
 */
const mapUserRow = (row) => ({
  id: row.id,
  email: row.email,
  name: row.name,
  role: row.role,
  isActive: row.is_active,
  profilePhotoUrl: row.profile_photo_url || null,
  createdAt: toIso(row.created_at),
  updatedAt: toIso(row.updated_at)
});

/**
 * GET /api/org-users
 * List all users in the current organisation (C77)
 */
router.get('/', async (req, res, next) => {
  const { role, isActive } = req.query;

  const conditions = ['organisation_id = $1'];
  const values = [req.orgId];

  if (role) {
    if (!validRoles.has(role)) {
      return next(new AppError('Invalid role', 400, 'INVALID_ROLE'));
    }
    values.push(role);
    conditions.push(`role = $${values.length}`);
  }

  if (isActive !== undefined) {
    values.push(isActive === 'true');
    conditions.push(`is_active = $${values.length}`);
  }

  try {
    const result = await query(
      `SELECT id, email, name, role, is_active, profile_photo_url, created_at, updated_at
       FROM users
       WHERE ${conditions.join(' AND ')}
       ORDER BY name`,
      values
    );

    return res.json({
      data: {
        users: result.rows.map(mapUserRow),
        total: result.rowCount
      }
    });
  } catch (err) {
    return next(err);
  }
});

/**
 * POST /api/org-users
 * Create a new user in the current organisation (C78, C81, C82)
 */
router.post('/', async (req, res, next) => {
  const { email, name, password, role } = req.body || {};

  // Validation
  if (!email || typeof email !== 'string') {
    return next(new AppError('Email is required', 400, 'INVALID_EMAIL'));
  }
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return next(new AppError('Invalid email format', 400, 'INVALID_EMAIL'));
  }

  if (!name || typeof name !== 'string' || name.trim().length === 0) {
    return next(new AppError('Name is required', 400, 'NAME_REQUIRED'));
  }
  if (name.length > 200) {
    return next(new AppError('Name must be 200 characters or less', 400, 'NAME_TOO_LONG'));
  }

  if (!password || typeof password !== 'string') {
    return next(new AppError('Password is required', 400, 'PASSWORD_REQUIRED'));
  }
  if (password.length < 8) {
    return next(new AppError('Password must be at least 8 characters', 400, 'PASSWORD_TOO_SHORT'));
  }

  if (!role || !validRoles.has(role)) {
    return next(new AppError('Role must be worker, manager, admin, or super admin', 400, 'INVALID_ROLE'));
  }
  if (role === 'super_admin' && req.user.role !== 'super_admin') {
    return next(new AppError('Only a super admin can assign super admin role', 403, 'FORBIDDEN'));
  }

  try {
    // Check email uniqueness within org (C72)
    const existing = await query(
      'SELECT id FROM users WHERE email = $1 AND organisation_id = $2',
      [email.toLowerCase(), req.orgId]
    );
    if (existing.rowCount > 0) {
      return next(new AppError('A user with this email already exists in your organisation', 409, 'EMAIL_EXISTS'));
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);

    // Create user
    const result = await query(
      `INSERT INTO users (email, name, password_hash, role, organisation_id, is_active)
       VALUES ($1, $2, $3, $4, $5, TRUE)
       RETURNING id, email, name, role, is_active, profile_photo_url, created_at, updated_at`,
      [email.toLowerCase(), name.trim(), passwordHash, role, req.orgId]
    );

    const user = result.rows[0];

    // Record audit log
    await recordAudit({
      eventType: 'user_created',
      entityType: 'user',
      entityId: user.id,
      userId: req.user.id,
      newValue: { email: user.email, name: user.name, role: user.role },
      organisationId: req.orgId
    });

    return res.status(201).json({
      data: mapUserRow(user)
    });
  } catch (err) {
    return next(err);
  }
});

/**
 * GET /api/org-users/:id
 * Get a specific user by ID (C77)
 */
router.get('/:id', async (req, res, next) => {
  const { id } = req.params;

  try {
    const result = await query(
      `SELECT id, email, name, role, is_active, profile_photo_url, created_at, updated_at
       FROM users
       WHERE id = $1 AND organisation_id = $2`,
      [id, req.orgId]
    );

    if (result.rowCount === 0) {
      return next(new AppError('User not found', 404, 'USER_NOT_FOUND'));
    }

    return res.json({
      data: mapUserRow(result.rows[0])
    });
  } catch (err) {
    return next(err);
  }
});

/**
 * PUT /api/org-users/:id
 * Update user details (name, email, role) (C79, C81)
 */
router.put('/:id', async (req, res, next) => {
  const { id } = req.params;
  const { email, name, role } = req.body || {};

  // Cannot change own role
  if (role && id === req.user.id) {
    return next(new AppError('You cannot change your own role', 400, 'CANNOT_CHANGE_OWN_ROLE'));
  }

  // Validate role if provided
  if (role !== undefined && !validRoles.has(role)) {
    return next(new AppError('Role must be worker, manager, admin, or super admin', 400, 'INVALID_ROLE'));
  }
  if (role === 'super_admin' && req.user.role !== 'super_admin') {
    return next(new AppError('Only a super admin can assign super admin role', 403, 'FORBIDDEN'));
  }

  // Validate email if provided
  if (email !== undefined) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return next(new AppError('Invalid email format', 400, 'INVALID_EMAIL'));
    }
  }

  // Validate name if provided
  if (name !== undefined) {
    if (typeof name !== 'string' || name.trim().length === 0) {
      return next(new AppError('Name cannot be empty', 400, 'NAME_REQUIRED'));
    }
    if (name.length > 200) {
      return next(new AppError('Name must be 200 characters or less', 400, 'NAME_TOO_LONG'));
    }
  }

  try {
    // Check user exists in org
    const existing = await query(
      'SELECT id, email, name, role FROM users WHERE id = $1 AND organisation_id = $2',
      [id, req.orgId]
    );
    if (existing.rowCount === 0) {
      return next(new AppError('User not found', 404, 'USER_NOT_FOUND'));
    }

    const oldUser = existing.rows[0];
    if (oldUser.role === 'super_admin' && req.user.role !== 'super_admin') {
      return next(new AppError('Only a super admin can modify a super admin account', 403, 'FORBIDDEN'));
    }

    // Check email uniqueness if changing email
    if (email && email.toLowerCase() !== oldUser.email) {
      const emailCheck = await query(
        'SELECT id FROM users WHERE email = $1 AND organisation_id = $2 AND id <> $3',
        [email.toLowerCase(), req.orgId, id]
      );
      if (emailCheck.rowCount > 0) {
        return next(new AppError('A user with this email already exists in your organisation', 409, 'EMAIL_EXISTS'));
      }
    }

    // Update user
    const result = await query(
      `UPDATE users
       SET email = COALESCE($1, email),
           name = COALESCE($2, name),
           role = COALESCE($3, role),
           updated_at = NOW()
       WHERE id = $4 AND organisation_id = $5
       RETURNING id, email, name, role, is_active, profile_photo_url, created_at, updated_at`,
      [email ? email.toLowerCase() : null, name ? name.trim() : null, role || null, id, req.orgId]
    );

    const user = result.rows[0];

    // Record audit log
    await recordAudit({
      eventType: 'user_updated',
      entityType: 'user',
      entityId: id,
      userId: req.user.id,
      oldValue: { email: oldUser.email, name: oldUser.name, role: oldUser.role },
      newValue: { email: user.email, name: user.name, role: user.role },
      organisationId: req.orgId
    });

    return res.json({
      data: mapUserRow(user)
    });
  } catch (err) {
    return next(err);
  }
});

/**
 * POST /api/org-users/:id/disable
 * Disable a user account (C80)
 */
router.post('/:id/disable', async (req, res, next) => {
  const { id } = req.params;

  // Cannot disable self
  if (id === req.user.id) {
    return next(new AppError('You cannot disable your own account', 400, 'CANNOT_DISABLE_SELF'));
  }

  try {
    // Check user exists in org
    const existing = await query(
      'SELECT id, email, name, role, is_active FROM users WHERE id = $1 AND organisation_id = $2',
      [id, req.orgId]
    );
    if (existing.rowCount === 0) {
      return next(new AppError('User not found', 404, 'USER_NOT_FOUND'));
    }

    const user = existing.rows[0];
    if (user.role === 'super_admin' && req.user.role !== 'super_admin') {
      return next(new AppError('Only a super admin can disable a super admin account', 403, 'FORBIDDEN'));
    }

    // Check if this is the last privileged admin/super admin
    if (hasRequiredRole(user.role, 'admin')) {
      const adminCount = await query(
        `SELECT COUNT(*) AS cnt
         FROM users
         WHERE organisation_id = $1
           AND role IN ('admin', 'super_admin')
           AND is_active = TRUE`,
        [req.orgId]
      );
      if (parseInt(adminCount.rows[0].cnt, 10) <= 1) {
        return next(new AppError('Cannot disable the only active admin/super admin in the organisation', 400, 'LAST_ADMIN'));
      }
    }

    // Disable user
    const result = await query(
      `UPDATE users SET is_active = FALSE, updated_at = NOW()
       WHERE id = $1 AND organisation_id = $2
       RETURNING id, email, name, role, is_active`,
      [id, req.orgId]
    );

    const updated = result.rows[0];

    // Record audit log
    await recordAudit({
      eventType: 'user_disabled',
      entityType: 'user',
      entityId: id,
      userId: req.user.id,
      oldValue: { isActive: true },
      newValue: { isActive: false },
      organisationId: req.orgId
    });

    return res.json({
      data: {
        id: updated.id,
        email: updated.email,
        name: updated.name,
        role: updated.role,
        isActive: updated.is_active,
        message: 'User disabled successfully'
      }
    });
  } catch (err) {
    return next(err);
  }
});

/**
 * POST /api/org-users/:id/enable
 * Enable a disabled user account (C80)
 */
router.post('/:id/enable', async (req, res, next) => {
  const { id } = req.params;

  try {
    // Check user exists in org
    const existing = await query(
      'SELECT id, role FROM users WHERE id = $1 AND organisation_id = $2',
      [id, req.orgId]
    );
    if (existing.rowCount === 0) {
      return next(new AppError('User not found', 404, 'USER_NOT_FOUND'));
    }
    if (existing.rows[0].role === 'super_admin' && req.user.role !== 'super_admin') {
      return next(new AppError('Only a super admin can enable a super admin account', 403, 'FORBIDDEN'));
    }

    // Enable user
    const result = await query(
      `UPDATE users SET is_active = TRUE, updated_at = NOW()
       WHERE id = $1 AND organisation_id = $2
       RETURNING id, email, name, role, is_active`,
      [id, req.orgId]
    );

    const updated = result.rows[0];

    // Record audit log
    await recordAudit({
      eventType: 'user_enabled',
      entityType: 'user',
      entityId: id,
      userId: req.user.id,
      oldValue: { isActive: false },
      newValue: { isActive: true },
      organisationId: req.orgId
    });

    return res.json({
      data: {
        id: updated.id,
        email: updated.email,
        name: updated.name,
        role: updated.role,
        isActive: updated.is_active,
        message: 'User enabled successfully'
      }
    });
  } catch (err) {
    return next(err);
  }
});

/**
 * POST /api/org-users/:id/reset-password
 * Reset a user's password (C83)
 */
router.post('/:id/reset-password', async (req, res, next) => {
  const { id } = req.params;
  const { newPassword } = req.body || {};

  // Validate password
  if (!newPassword || typeof newPassword !== 'string') {
    return next(new AppError('New password is required', 400, 'PASSWORD_REQUIRED'));
  }
  if (newPassword.length < 8) {
    return next(new AppError('Password must be at least 8 characters', 400, 'PASSWORD_TOO_SHORT'));
  }

  try {
    // Check user exists in org
    const existing = await query(
      'SELECT id, role FROM users WHERE id = $1 AND organisation_id = $2',
      [id, req.orgId]
    );
    if (existing.rowCount === 0) {
      return next(new AppError('User not found', 404, 'USER_NOT_FOUND'));
    }
    if (existing.rows[0].role === 'super_admin' && req.user.role !== 'super_admin') {
      return next(new AppError('Only a super admin can reset a super admin password', 403, 'FORBIDDEN'));
    }

    // Hash new password
    const passwordHash = await bcrypt.hash(newPassword, 10);

    // Update password
    await query(
      'UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2',
      [passwordHash, id]
    );

    // Record audit log
    await recordAudit({
      eventType: 'password_reset',
      entityType: 'user',
      entityId: id,
      userId: req.user.id,
      newValue: { resetBy: req.user.id },
      organisationId: req.orgId
    });

    return res.json({
      data: {
        message: 'Password reset successfully'
      }
    });
  } catch (err) {
    return next(err);
  }
});

router.post('/:id/profile-photo', (req, res, next) => {
  photoUpload.single('file')(req, res, async (err) => {
    if (err) {
      return next(err);
    }

    const { id } = req.params;
    if (!req.file) {
      return next(new AppError('Profile photo file is required.', 400, 'FILE_REQUIRED'));
    }

    try {
      const existing = await query(
        'SELECT id, profile_photo_url FROM users WHERE id = $1 AND organisation_id = $2',
        [id, req.orgId]
      );
      if (existing.rowCount === 0) {
        return next(new AppError('User not found', 404, 'USER_NOT_FOUND'));
      }

      const oldPhotoUrl = existing.rows[0].profile_photo_url;
      const photoUrl = `/uploads/profile-photos/${req.orgId}/${req.file.filename}`;

      const updated = await query(
        `UPDATE users
         SET profile_photo_url = $1, updated_at = NOW()
         WHERE id = $2 AND organisation_id = $3
         RETURNING id, email, name, role, is_active, profile_photo_url, created_at, updated_at`,
        [photoUrl, id, req.orgId]
      );

      if (oldPhotoUrl && oldPhotoUrl !== photoUrl) {
        try {
          const oldPath = path.join(process.cwd(), env.uploadsDir, oldPhotoUrl.replace(/^\/uploads\//, ''));
          if (fs.existsSync(oldPath)) {
            fs.unlinkSync(oldPath);
          }
        } catch (cleanupErr) {
          console.warn('[OrgUsers] Failed to cleanup old profile photo:', cleanupErr.message);
        }
      }

      await recordAudit({
        eventType: 'user_profile_photo_updated',
        entityType: 'user',
        entityId: id,
        userId: req.user.id,
        organisationId: req.orgId
      });

      return res.json({ data: mapUserRow(updated.rows[0]) });
    } catch (uploadErr) {
      return next(uploadErr);
    }
  });
});

module.exports = router;

const express = require('express');
const bcrypt = require('bcryptjs');
const { query } = require('../config/db');
const { AppError } = require('../utils/appError');
const { requireRole } = require('../middleware/requireRole');
const { toIso } = require('../utils/format');

const router = express.Router();

const allowedRoles = ['worker', 'manager', 'admin'];

// Helper to split name into firstName/lastName for API response
const splitName = (name) => {
  if (!name) return { firstName: '', lastName: '' };
  const parts = name.trim().split(' ');
  const firstName = parts[0] || '';
  const lastName = parts.slice(1).join(' ') || '';
  return { firstName, lastName };
};

// GET /api/users - List users (managers/admins only)
router.get('/', async (req, res, next) => {
  try {
    // Only managers and admins can list users
    if (!['manager', 'admin'].includes(req.user.role)) {
      return next(new AppError('Forbidden', 403, 'FORBIDDEN'));
    }

    const result = await query(
      `SELECT id, email, name, role, created_at, updated_at
       FROM users
       ORDER BY name`
    );

    const users = result.rows.map(u => {
      const { firstName, lastName } = splitName(u.name);
      return {
        id: u.id,
        email: u.email,
        firstName,
        lastName,
        name: u.name,
        role: u.role,
        createdAt: toIso(u.created_at),
        updatedAt: toIso(u.updated_at)
      };
    });

    return res.json({ users });
  } catch (err) {
    return next(err);
  }
});

// GET /api/users/:id - Get single user (admin only)
router.get('/:id', requireRole(['admin']), async (req, res, next) => {
  const { id } = req.params;

  try {
    const result = await query(
      `SELECT id, email, name, role, created_at, updated_at
       FROM users WHERE id = $1`,
      [id]
    );

    if (result.rowCount === 0) {
      return next(new AppError('User not found', 404, 'NOT_FOUND'));
    }

    const u = result.rows[0];
    const { firstName, lastName } = splitName(u.name);
    return res.json({
      id: u.id,
      email: u.email,
      firstName,
      lastName,
      name: u.name,
      role: u.role,
      createdAt: toIso(u.created_at),
      updatedAt: toIso(u.updated_at)
    });
  } catch (err) {
    return next(err);
  }
});

// POST /api/users - Create a new user (admin only)
router.post('/', requireRole(['admin']), async (req, res, next) => {
  const { email, firstName, lastName, name: fullNameInput, password, role } = req.body || {};

  // Support both name formats: either {firstName, lastName} or {name}
  const fullName = fullNameInput || (firstName && lastName ? `${firstName.trim()} ${lastName.trim()}` : null);

  // Validation
  if (!email || !email.trim()) {
    return next(new AppError('Email is required', 400, 'VALIDATION_ERROR'));
  }
  if (!fullName || !fullName.trim()) {
    return next(new AppError('Name is required', 400, 'VALIDATION_ERROR'));
  }
  if (!password || password.length < 8) {
    return next(new AppError('Password must be at least 8 characters', 400, 'VALIDATION_ERROR'));
  }
  if (!role || !allowedRoles.includes(role)) {
    return next(new AppError('Role must be worker, manager, or admin', 400, 'VALIDATION_ERROR'));
  }

  // Email format check
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return next(new AppError('Invalid email format', 400, 'VALIDATION_ERROR'));
  }

  try {
    // Check for duplicate email
    const existing = await query('SELECT 1 FROM users WHERE email = $1', [email.toLowerCase()]);
    if (existing.rowCount > 0) {
      return next(new AppError('Email already exists', 400, 'DUPLICATE_EMAIL'));
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);

    const insert = await query(
      `INSERT INTO users (email, name, password_hash, role)
       VALUES ($1, $2, $3, $4)
       RETURNING id, email, name, role, created_at, updated_at`,
      [email.toLowerCase().trim(), fullName.trim(), passwordHash, role]
    );

    const u = insert.rows[0];
    const { firstName: fName, lastName: lName } = splitName(u.name);
    return res.status(201).json({
      id: u.id,
      email: u.email,
      firstName: fName,
      lastName: lName,
      name: u.name,
      role: u.role,
      createdAt: toIso(u.created_at),
      updatedAt: toIso(u.updated_at)
    });
  } catch (err) {
    return next(err);
  }
});

// PUT /api/users/:id - Update user (admin only)
router.put('/:id', requireRole(['admin']), async (req, res, next) => {
  const { id } = req.params;
  const { email, firstName, lastName, name: fullNameInput, password, role } = req.body || {};

  try {
    // Verify user exists
    const existing = await query('SELECT id, email FROM users WHERE id = $1', [id]);
    if (existing.rowCount === 0) {
      return next(new AppError('User not found', 404, 'NOT_FOUND'));
    }

    // Check duplicate email if changing
    if (email && email.toLowerCase() !== existing.rows[0].email) {
      const emailCheck = await query('SELECT 1 FROM users WHERE email = $1 AND id <> $2', [email.toLowerCase(), id]);
      if (emailCheck.rowCount > 0) {
        return next(new AppError('Email already exists', 400, 'DUPLICATE_EMAIL'));
      }
    }

    // Validate email format if provided
    if (email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return next(new AppError('Invalid email format', 400, 'VALIDATION_ERROR'));
      }
    }

    // Validate role if provided
    if (role !== undefined && !allowedRoles.includes(role)) {
      return next(new AppError('Role must be worker, manager, or admin', 400, 'VALIDATION_ERROR'));
    }

    // Build update query dynamically
    const updates = [];
    const values = [];
    let paramIndex = 1;

    if (email !== undefined) {
      values.push(email.toLowerCase().trim());
      updates.push(`email = $${paramIndex++}`);
    }

    // Support both name formats
    const newName = fullNameInput || (firstName !== undefined && lastName !== undefined ? `${firstName.trim()} ${lastName.trim()}` : null);
    if (newName) {
      values.push(newName.trim());
      updates.push(`name = $${paramIndex++}`);
    }

    if (password !== undefined) {
      if (password.length < 8) {
        return next(new AppError('Password must be at least 8 characters', 400, 'VALIDATION_ERROR'));
      }
      const passwordHash = await bcrypt.hash(password, 10);
      values.push(passwordHash);
      updates.push(`password_hash = $${paramIndex++}`);
    }
    if (role !== undefined) {
      values.push(role);
      updates.push(`role = $${paramIndex++}`);
    }

    if (updates.length === 0) {
      return next(new AppError('No updates provided', 400, 'VALIDATION_ERROR'));
    }

    values.push(id);
    const result = await query(
      `UPDATE users SET ${updates.join(', ')}, updated_at = NOW()
       WHERE id = $${paramIndex}
       RETURNING id, email, name, role, created_at, updated_at`,
      values
    );

    const u = result.rows[0];
    const { firstName: fName, lastName: lName } = splitName(u.name);
    return res.json({
      id: u.id,
      email: u.email,
      firstName: fName,
      lastName: lName,
      name: u.name,
      role: u.role,
      createdAt: toIso(u.created_at),
      updatedAt: toIso(u.updated_at)
    });
  } catch (err) {
    return next(err);
  }
});

module.exports = router;

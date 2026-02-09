const express = require('express');
const { query } = require('../config/db');
const { AppError } = require('../utils/appError');
const { requireRole } = require('../middleware/requireRole');

const router = express.Router();

router.get('/', async (req, res, next) => {
  try {
    const result = await query(
      'SELECT id, name, description FROM incident_types WHERE is_active = TRUE ORDER BY name'
    );
    const incidentTypes = result.rows.map((row) => ({
      id: row.id,
      name: row.name,
      description: row.description
    }));
    return res.json({ incidentTypes });
  } catch (err) {
    return next(err);
  }
});

router.post('/', requireRole(['admin']), async (req, res, next) => {
  const { name, description } = req.body || {};
  if (!name) {
    return next(new AppError('Name is required', 400, 'VALIDATION_ERROR'));
  }

  try {
    const existing = await query('SELECT 1 FROM incident_types WHERE name = $1', [name]);
    if (existing.rowCount > 0) {
      return next(new AppError('Incident type name already exists', 400, 'DUPLICATE_NAME'));
    }

    const insert = await query(
      'INSERT INTO incident_types (name, description) VALUES ($1, $2) RETURNING id, name, description, is_active',
      [name, description || null]
    );
    const row = insert.rows[0];
    return res.status(201).json({
      id: row.id,
      name: row.name,
      description: row.description,
      isActive: row.is_active
    });
  } catch (err) {
    return next(err);
  }
});

router.put('/:id', requireRole(['admin']), async (req, res, next) => {
  const { id } = req.params;
  const { name, description } = req.body || {};
  if (!name) {
    return next(new AppError('Name is required', 400, 'VALIDATION_ERROR'));
  }

  try {
    const existing = await query('SELECT id FROM incident_types WHERE id = $1', [id]);
    if (existing.rowCount === 0) {
      return next(new AppError('Incident type not found', 404, 'NOT_FOUND'));
    }

    const duplicate = await query('SELECT id FROM incident_types WHERE name = $1 AND id <> $2', [name, id]);
    if (duplicate.rowCount > 0) {
      return next(new AppError('Incident type name already exists', 400, 'DUPLICATE_NAME'));
    }

    const update = await query(
      'UPDATE incident_types SET name = $1, description = $2 WHERE id = $3 RETURNING id, name, description, is_active',
      [name, description || null, id]
    );
    const row = update.rows[0];
    return res.json({
      id: row.id,
      name: row.name,
      description: row.description,
      isActive: row.is_active
    });
  } catch (err) {
    return next(err);
  }
});

router.patch('/:id', requireRole(['admin']), async (req, res, next) => {
  const { id } = req.params;
  const { isActive } = req.body || {};
  if (typeof isActive !== 'boolean') {
    return next(new AppError('isActive must be boolean', 400, 'VALIDATION_ERROR'));
  }

  try {
    const update = await query(
      'UPDATE incident_types SET is_active = $1 WHERE id = $2 RETURNING id, name, description, is_active',
      [isActive, id]
    );
    if (update.rowCount === 0) {
      return next(new AppError('Incident type not found', 404, 'NOT_FOUND'));
    }

    const row = update.rows[0];
    return res.json({
      id: row.id,
      name: row.name,
      description: row.description,
      isActive: row.is_active
    });
  } catch (err) {
    return next(err);
  }
});

module.exports = router;

const express = require('express');
const { query } = require('../config/db');
const { AppError } = require('../utils/appError');
const { requireRole } = require('../middleware/requireRole');
const { toIso } = require('../utils/format');

const router = express.Router();

router.get('/', async (req, res, next) => {
  try {
    const result = await query(
      'SELECT id, name, code, country_code, city, timezone, latitude, longitude, created_at, updated_at FROM sites WHERE is_active = TRUE ORDER BY name'
    );
    const sites = result.rows.map((row) => ({
      id: row.id,
      name: row.name,
      code: row.code,
      country_code: row.country_code,
      city: row.city,
      timezone: row.timezone,
      latitude: row.latitude ? parseFloat(row.latitude) : null,
      longitude: row.longitude ? parseFloat(row.longitude) : null,
      createdAt: toIso(row.created_at),
      updatedAt: toIso(row.updated_at)
    }));
    return res.json({ sites });
  } catch (err) {
    return next(err);
  }
});

router.post('/', requireRole(['admin']), async (req, res, next) => {
  const { name, code, country_code, city, timezone, latitude, longitude } = req.body || {};
  
  // Validate required fields
  if (!name) {
    return next(new AppError('Name is required', 400, 'VALIDATION_ERROR'));
  }
  if (!code) {
    return next(new AppError('Code is required', 400, 'VALIDATION_ERROR'));
  }
  if (!country_code) {
    return next(new AppError('Country is required', 400, 'VALIDATION_ERROR'));
  }
  if (!city) {
    return next(new AppError('City is required', 400, 'VALIDATION_ERROR'));
  }
  if (!timezone) {
    return next(new AppError('Timezone is required', 400, 'VALIDATION_ERROR'));
  }

  // Validate coordinates if provided
  if ((latitude !== undefined && latitude !== null) || (longitude !== undefined && longitude !== null)) {
    if (!latitude || !longitude || isNaN(latitude) || isNaN(longitude)) {
      return next(new AppError('Latitude and Longitude must both be valid numbers', 400, 'VALIDATION_ERROR'));
    }
  }

  try {
    const existing = await query('SELECT 1 FROM sites WHERE code = $1', [code]);
    if (existing.rowCount > 0) {
      return next(new AppError('Site code already exists', 400, 'DUPLICATE_CODE'));
    }

    const insert = await query(
      `INSERT INTO sites (name, code, country_code, city, timezone, latitude, longitude)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id, name, code, country_code, city, timezone, latitude, longitude, created_at, updated_at`,
      [name, code, country_code, city, timezone, latitude || null, longitude || null]
    );
    const row = insert.rows[0];
    return res.status(201).json({
      id: row.id,
      name: row.name,
      code: row.code,
      country_code: row.country_code,
      city: row.city,
      timezone: row.timezone,
      latitude: row.latitude ? parseFloat(row.latitude) : null,
      longitude: row.longitude ? parseFloat(row.longitude) : null,
      createdAt: toIso(row.created_at),
      updatedAt: toIso(row.updated_at)
    });
  } catch (err) {
    return next(err);
  }
});

router.put('/:id', requireRole(['admin']), async (req, res, next) => {
  const { id } = req.params;
  const { name, code, country_code, city, timezone, latitude, longitude } = req.body || {};

  try {
    const existing = await query('SELECT id FROM sites WHERE id = $1', [id]);
    if (existing.rowCount === 0) {
      return next(new AppError('Site not found', 404, 'NOT_FOUND'));
    }

    if (code) {
      const codeCheck = await query('SELECT id FROM sites WHERE code = $1 AND id <> $2', [code, id]);
      if (codeCheck.rowCount > 0) {
        return next(new AppError('Site code already exists', 400, 'DUPLICATE_CODE'));
      }
    }

    // Validate coordinates if provided
    if ((latitude !== undefined && latitude !== null) || (longitude !== undefined && longitude !== null)) {
      if (!latitude || !longitude || isNaN(latitude) || isNaN(longitude)) {
        return next(new AppError('Latitude and Longitude must both be valid numbers', 400, 'VALIDATION_ERROR'));
      }
    }

    const update = await query(
      `UPDATE sites
       SET name = COALESCE($1, name),
           code = COALESCE($2, code),
           country_code = COALESCE($3, country_code),
           city = COALESCE($4, city),
           timezone = COALESCE($5, timezone),
           latitude = COALESCE($6, latitude),
           longitude = COALESCE($7, longitude),
           updated_at = NOW()
       WHERE id = $8
       RETURNING id, name, code, country_code, city, timezone, latitude, longitude, created_at, updated_at`,
      [name || null, code || null, country_code || null, city || null, timezone || null, latitude || null, longitude || null, id]
    );

    const row = update.rows[0];
    return res.json({
      id: row.id,
      name: row.name,
      code: row.code,
      country_code: row.country_code,
      city: row.city,
      timezone: row.timezone,
      latitude: row.latitude ? parseFloat(row.latitude) : null,
      longitude: row.longitude ? parseFloat(row.longitude) : null,
      createdAt: toIso(row.created_at),
      updatedAt: toIso(row.updated_at)
    });
  } catch (err) {
    return next(err);
  }
});

module.exports = router;

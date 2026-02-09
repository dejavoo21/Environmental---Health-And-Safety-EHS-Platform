const express = require('express');
const { query, withTransaction } = require('../config/db');
const { AppError } = require('../utils/appError');
const { requireRole } = require('../middleware/requireRole');
const { toIso } = require('../utils/format');

const router = express.Router();

const fetchTemplate = async (client, id) => {
  const templateRes = await client.query(
    'SELECT id, name, description, created_at, updated_at FROM inspection_templates WHERE id = $1',
    [id]
  );

  if (templateRes.rowCount === 0) {
    return null;
  }

  const itemsRes = await client.query(
    'SELECT id, label, category, sort_order FROM inspection_template_items WHERE template_id = $1 ORDER BY sort_order, label',
    [id]
  );

  const template = templateRes.rows[0];
  return {
    id: template.id,
    name: template.name,
    description: template.description,
    items: itemsRes.rows.map((item) => ({
      id: item.id,
      label: item.label,
      category: item.category,
      sortOrder: item.sort_order
    })),
    createdAt: toIso(template.created_at),
    updatedAt: toIso(template.updated_at)
  };
};

router.get('/', async (req, res, next) => {
  try {
    const result = await query(
      `SELECT t.id, t.name, t.description, t.created_at, t.updated_at,
              COUNT(i.id) AS item_count
       FROM inspection_templates t
       LEFT JOIN inspection_template_items i ON i.template_id = t.id
       WHERE t.is_active = TRUE
       GROUP BY t.id
       ORDER BY t.name`
    );

    const templates = result.rows.map((row) => ({
      id: row.id,
      name: row.name,
      description: row.description,
      itemCount: Number(row.item_count || 0),
      createdAt: toIso(row.created_at),
      updatedAt: toIso(row.updated_at)
    }));

    return res.json({ templates });
  } catch (err) {
    return next(err);
  }
});

router.get('/:id', async (req, res, next) => {
  try {
    const template = await fetchTemplate({ query }, req.params.id);
    if (!template) {
      return next(new AppError('Template not found', 404, 'NOT_FOUND'));
    }
    return res.json(template);
  } catch (err) {
    return next(err);
  }
});

router.post('/', requireRole(['admin']), async (req, res, next) => {
  const { name, description, items } = req.body || {};
  if (!name) {
    return next(new AppError('Name is required', 400, 'VALIDATION_ERROR'));
  }

  try {
    const template = await withTransaction(async (client) => {
      const insertTemplate = await client.query(
        'INSERT INTO inspection_templates (name, description) VALUES ($1, $2) RETURNING id',
        [name, description || null]
      );
      const templateId = insertTemplate.rows[0].id;

      if (Array.isArray(items)) {
        for (const item of items) {
          if (!item.label) {
            throw new AppError('Item label is required', 400, 'VALIDATION_ERROR');
          }
          await client.query(
            'INSERT INTO inspection_template_items (template_id, label, category, sort_order) VALUES ($1, $2, $3, $4)',
            [templateId, item.label, item.category || null, Number(item.sortOrder || 0)]
          );
        }
      }

      return fetchTemplate(client, templateId);
    });

    return res.status(201).json(template);
  } catch (err) {
    return next(err);
  }
});

router.put('/:id', requireRole(['admin']), async (req, res, next) => {
  const { name, description, items } = req.body || {};
  if (!name) {
    return next(new AppError('Name is required', 400, 'VALIDATION_ERROR'));
  }

  try {
    const template = await withTransaction(async (client) => {
      const existing = await client.query('SELECT id FROM inspection_templates WHERE id = $1', [req.params.id]);
      if (existing.rowCount === 0) {
        throw new AppError('Template not found', 404, 'NOT_FOUND');
      }

      await client.query(
        'UPDATE inspection_templates SET name = $1, description = $2, updated_at = NOW() WHERE id = $3',
        [name, description || null, req.params.id]
      );

      await client.query('DELETE FROM inspection_template_items WHERE template_id = $1', [req.params.id]);

      if (Array.isArray(items)) {
        for (const item of items) {
          if (!item.label) {
            throw new AppError('Item label is required', 400, 'VALIDATION_ERROR');
          }
          await client.query(
            'INSERT INTO inspection_template_items (template_id, label, category, sort_order) VALUES ($1, $2, $3, $4)',
            [req.params.id, item.label, item.category || null, Number(item.sortOrder || 0)]
          );
        }
      }

      return fetchTemplate(client, req.params.id);
    });

    return res.json(template);
  } catch (err) {
    return next(err);
  }
});

module.exports = router;

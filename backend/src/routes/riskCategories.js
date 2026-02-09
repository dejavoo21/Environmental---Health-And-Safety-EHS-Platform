/**
 * Risk Categories Routes - Phase 9
 * Handles risk category management
 */

const express = require('express');
const router = express.Router();
const { authMiddleware, requireRole } = require('../middleware/auth');
const riskService = require('../services/riskService');

// Role middleware shortcuts
const requireAdmin = requireRole('admin');

// All routes require authentication
router.use(authMiddleware);

/**
 * GET /api/risk-categories
 * List all risk categories
 */
router.get('/', async (req, res, next) => {
  try {
    const result = await riskService.listCategories(req.user.organisationId, {
      includeInactive: req.query.includeInactive === 'true'
    });
    res.json({ success: true, data: result.categories });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/risk-categories/:id
 * Get a category by ID
 */
router.get('/:id', async (req, res, next) => {
  try {
    const category = await riskService.getCategoryById(req.params.id, req.user.organisationId);
    res.json({ success: true, data: category });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/risk-categories
 * Create a new category (Admin only)
 */
router.post('/', requireAdmin, async (req, res, next) => {
  try {
    const category = await riskService.createCategory(
      req.user.organisationId,
      req.body,
      req.user.id
    );
    res.status(201).json({ success: true, data: category, message: 'Category created successfully' });
  } catch (error) {
    next(error);
  }
});

/**
 * PUT /api/risk-categories/:id
 * Update a category (Admin only)
 */
router.put('/:id', requireAdmin, async (req, res, next) => {
  try {
    const category = await riskService.updateCategory(
      req.params.id,
      req.user.organisationId,
      req.body,
      req.user.id
    );
    res.json({ success: true, data: category, message: 'Category updated successfully' });
  } catch (error) {
    next(error);
  }
});

/**
 * DELETE /api/risk-categories/:id
 * Delete a category (Admin only)
 */
router.delete('/:id', requireAdmin, async (req, res, next) => {
  try {
    const result = await riskService.deleteCategory(req.params.id, req.user.organisationId, req.user.id);
    res.json({ success: true, message: result.message });
  } catch (error) {
    next(error);
  }
});

module.exports = router;

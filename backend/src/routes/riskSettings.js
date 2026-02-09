/**
 * Risk Settings Routes - Phase 9
 * Handles scoring matrix and tolerance settings
 */

const express = require('express');
const router = express.Router();
const { authMiddleware, requireRole } = require('../middleware/auth');
const { query } = require('../config/db');
const { AppError } = require('../utils/appError');

// Role middleware
const requireAdmin = requireRole('admin');

// All routes require authentication
router.use(authMiddleware);

// ==================== SCORING MATRIX ====================

/**
 * GET /api/risk-settings/scoring-matrix
 * Get the scoring matrix for the organisation
 */
router.get('/scoring-matrix', async (req, res, next) => {
  try {
    const result = await query(
      `SELECT id, likelihood, impact, score, level
       FROM risk_scoring_matrices
       WHERE organisation_id = $1
       ORDER BY likelihood, impact`,
      [req.user.organisationId]
    );
    
    // If no custom matrix, return default
    if (result.rows.length === 0) {
      const defaultResult = await query(
        `SELECT id, likelihood, impact, score, level
         FROM risk_scoring_matrices
         WHERE organisation_id IS NULL
         ORDER BY likelihood, impact`
      );
      res.json({ success: true, data: { matrix: defaultResult.rows, isDefault: true } });
    } else {
      res.json({ success: true, data: { matrix: result.rows, isDefault: false } });
    }
  } catch (error) {
    next(error);
  }
});

/**
 * PUT /api/risk-settings/scoring-matrix
 * Update the scoring matrix (Admin only)
 */
router.put('/scoring-matrix', requireAdmin, async (req, res, next) => {
  const client = await db.getClient();
  try {
    await client.query('BEGIN');
    
    const { matrix } = req.body;
    
    if (!Array.isArray(matrix) || matrix.length !== 25) {
      throw new AppError('Matrix must contain exactly 25 entries (5x5)', 400);
    }
    
    // Delete existing custom matrix
    await client.query(
      'DELETE FROM risk_scoring_matrices WHERE organisation_id = $1',
      [req.user.organisationId]
    );
    
    // Insert new matrix
    for (const entry of matrix) {
      await client.query(
        `INSERT INTO risk_scoring_matrices (organisation_id, likelihood, impact, score, level, created_by)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [req.user.organisationId, entry.likelihood, entry.impact, entry.score, entry.level, req.user.id]
      );
    }
    
    await client.query('COMMIT');
    
    res.json({ success: true, message: 'Scoring matrix updated successfully' });
  } catch (error) {
    await client.query('ROLLBACK');
    next(error);
  } finally {
    client.release();
  }
});

/**
 * DELETE /api/risk-settings/scoring-matrix
 * Reset to default scoring matrix (Admin only)
 */
router.delete('/scoring-matrix', requireAdmin, async (req, res, next) => {
  try {
    await query(
      'DELETE FROM risk_scoring_matrices WHERE organisation_id = $1',
      [req.user.organisationId]
    );
    
    res.json({ success: true, message: 'Scoring matrix reset to default' });
  } catch (error) {
    next(error);
  }
});

// ==================== RISK TOLERANCES ====================

/**
 * GET /api/risk-settings/tolerances
 * Get risk tolerances for the organisation
 */
router.get('/tolerances', async (req, res, next) => {
  try {
    const result = await query(
      `SELECT id, level, requires_immediate_action, escalation_required, 
              max_acceptance_period_days, review_frequency, notifications_config,
              created_at, updated_at
       FROM risk_tolerances
       WHERE organisation_id = $1
       ORDER BY CASE level 
         WHEN 'low' THEN 1 
         WHEN 'medium' THEN 2 
         WHEN 'high' THEN 3 
         WHEN 'extreme' THEN 4 
       END`,
      [req.user.organisationId]
    );
    
    // If no custom tolerances, return defaults
    if (result.rows.length === 0) {
      const defaults = [
        { level: 'low', requires_immediate_action: false, escalation_required: false, max_acceptance_period_days: null, review_frequency: 'annual' },
        { level: 'medium', requires_immediate_action: false, escalation_required: false, max_acceptance_period_days: 365, review_frequency: 'semi_annual' },
        { level: 'high', requires_immediate_action: true, escalation_required: true, max_acceptance_period_days: 90, review_frequency: 'quarterly' },
        { level: 'extreme', requires_immediate_action: true, escalation_required: true, max_acceptance_period_days: 30, review_frequency: 'monthly' }
      ];
      res.json({ success: true, data: { tolerances: defaults, isDefault: true } });
    } else {
      res.json({ success: true, data: { tolerances: result.rows, isDefault: false } });
    }
  } catch (error) {
    next(error);
  }
});

/**
 * PUT /api/risk-settings/tolerances
 * Update risk tolerances (Admin only)
 */
router.put('/tolerances', requireAdmin, async (req, res, next) => {
  const client = await db.getClient();
  try {
    await client.query('BEGIN');
    
    const { tolerances } = req.body;
    
    if (!Array.isArray(tolerances)) {
      throw new AppError('Tolerances must be an array', 400);
    }
    
    // Delete existing tolerances
    await client.query(
      'DELETE FROM risk_tolerances WHERE organisation_id = $1',
      [req.user.organisationId]
    );
    
    // Insert new tolerances
    for (const t of tolerances) {
      await client.query(
        `INSERT INTO risk_tolerances 
         (organisation_id, level, requires_immediate_action, escalation_required,
          max_acceptance_period_days, review_frequency, notifications_config, created_by)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [
          req.user.organisationId,
          t.level,
          t.requires_immediate_action,
          t.escalation_required,
          t.max_acceptance_period_days,
          t.review_frequency,
          t.notifications_config ? JSON.stringify(t.notifications_config) : null,
          req.user.id
        ]
      );
    }
    
    await client.query('COMMIT');
    
    res.json({ success: true, message: 'Risk tolerances updated successfully' });
  } catch (error) {
    await client.query('ROLLBACK');
    next(error);
  } finally {
    client.release();
  }
});

/**
 * DELETE /api/risk-settings/tolerances
 * Reset to default tolerances (Admin only)
 */
router.delete('/tolerances', requireAdmin, async (req, res, next) => {
  try {
    await query(
      'DELETE FROM risk_tolerances WHERE organisation_id = $1',
      [req.user.organisationId]
    );
    
    res.json({ success: true, message: 'Risk tolerances reset to default' });
  } catch (error) {
    next(error);
  }
});

// ==================== ORGANISATION RISK CONFIG ====================

/**
 * GET /api/risk-settings/config
 * Get organisation risk configuration
 */
router.get('/config', async (req, res, next) => {
  try {
    const result = await query(
      `SELECT risk_reference_prefix, next_risk_number, 
              default_review_frequency, risk_notifications_enabled
       FROM organisations
       WHERE id = $1`,
      [req.user.organisationId]
    );
    
    if (result.rows.length === 0) {
      throw new AppError('Organisation not found', 404);
    }
    
    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    next(error);
  }
});

/**
 * PUT /api/risk-settings/config
 * Update organisation risk configuration (Admin only)
 */
router.put('/config', requireAdmin, async (req, res, next) => {
  try {
    const { 
      risk_reference_prefix, 
      default_review_frequency, 
      risk_notifications_enabled 
    } = req.body;
    
    const updates = [];
    const values = [];
    let paramCount = 0;
    
    if (risk_reference_prefix !== undefined) {
      paramCount++;
      updates.push(`risk_reference_prefix = $${paramCount}`);
      values.push(risk_reference_prefix);
    }
    
    if (default_review_frequency !== undefined) {
      paramCount++;
      updates.push(`default_review_frequency = $${paramCount}`);
      values.push(default_review_frequency);
    }
    
    if (risk_notifications_enabled !== undefined) {
      paramCount++;
      updates.push(`risk_notifications_enabled = $${paramCount}`);
      values.push(risk_notifications_enabled);
    }
    
    if (updates.length === 0) {
      throw new AppError('No valid fields to update', 400);
    }
    
    paramCount++;
    values.push(req.user.organisationId);
    
    await query(
      `UPDATE organisations SET ${updates.join(', ')}, updated_at = NOW() WHERE id = $${paramCount}`,
      values
    );
    
    res.json({ success: true, message: 'Risk configuration updated successfully' });
  } catch (error) {
    next(error);
  }
});

module.exports = router;

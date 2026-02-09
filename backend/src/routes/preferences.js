/**
 * Preferences Routes - Phase 4
 * Handles user notification preferences
 */

const express = require('express');
const { AppError } = require('../utils/appError');
const preferencesService = require('../services/preferencesService');

const router = express.Router();

const validDigestFrequencies = new Set(['daily', 'weekly', 'none']);

/**
 * Validate time format (HH:MM)
 * @param {string} time - Time string
 * @returns {boolean} - True if valid
 */
const isValidTimeFormat = (time) => {
  if (typeof time !== 'string') return false;
  const match = time.match(/^([0-1]?[0-9]|2[0-3]):([0-5][0-9])$/);
  return !!match;
};

/**
 * GET /api/preferences/notifications
 * Get the authenticated user's notification preferences
 */
router.get('/notifications', async (req, res, next) => {
  try {
    const preferences = await preferencesService.getPreferences(
      req.user.id,
      req.user.organisationId,
      req.user.role
    );

    return res.json({
      success: true,
      data: preferences
    });
  } catch (err) {
    return next(err);
  }
});

/**
 * PUT /api/preferences/notifications
 * Update the authenticated user's notification preferences
 */
router.put('/notifications', async (req, res, next) => {
  try {
    const {
      emailActionAssigned,
      emailActionOverdue,
      emailHighSeverityIncident,
      emailInspectionFailed,
      digestFrequency,
      digestTime,
      digestDayOfWeek,
      inappEnabled
    } = req.body || {};

    const updates = {};

    // Validate and build updates
    if (emailActionAssigned !== undefined) {
      if (typeof emailActionAssigned !== 'boolean') {
        return next(new AppError('emailActionAssigned must be a boolean', 400, 'VALIDATION_ERROR'));
      }
      updates.emailActionAssigned = emailActionAssigned;
    }

    if (emailActionOverdue !== undefined) {
      if (typeof emailActionOverdue !== 'boolean') {
        return next(new AppError('emailActionOverdue must be a boolean', 400, 'VALIDATION_ERROR'));
      }
      updates.emailActionOverdue = emailActionOverdue;
    }

    if (emailHighSeverityIncident !== undefined) {
      if (typeof emailHighSeverityIncident !== 'boolean') {
        return next(new AppError('emailHighSeverityIncident must be a boolean', 400, 'VALIDATION_ERROR'));
      }
      updates.emailHighSeverityIncident = emailHighSeverityIncident;
    }

    if (emailInspectionFailed !== undefined) {
      if (typeof emailInspectionFailed !== 'boolean') {
        return next(new AppError('emailInspectionFailed must be a boolean', 400, 'VALIDATION_ERROR'));
      }
      updates.emailInspectionFailed = emailInspectionFailed;
    }

    if (digestFrequency !== undefined) {
      if (!validDigestFrequencies.has(digestFrequency)) {
        return next(new AppError('digestFrequency must be daily, weekly, or none', 400, 'VALIDATION_ERROR'));
      }
      updates.digestFrequency = digestFrequency;
    }

    if (digestTime !== undefined) {
      if (!isValidTimeFormat(digestTime)) {
        return next(new AppError('digestTime must be in HH:MM format', 400, 'VALIDATION_ERROR'));
      }
      updates.digestTime = digestTime;
    }

    if (digestDayOfWeek !== undefined) {
      const day = parseInt(digestDayOfWeek, 10);
      if (isNaN(day) || day < 0 || day > 6) {
        return next(new AppError('digestDayOfWeek must be 0-6 (0=Sunday)', 400, 'VALIDATION_ERROR'));
      }
      updates.digestDayOfWeek = day;
    }

    if (inappEnabled !== undefined) {
      if (typeof inappEnabled !== 'boolean') {
        return next(new AppError('inappEnabled must be a boolean', 400, 'VALIDATION_ERROR'));
      }
      updates.inappEnabled = inappEnabled;
    }

    const preferences = await preferencesService.updatePreferences(
      req.user.id,
      req.user.organisationId,
      updates
    );

    return res.json({
      success: true,
      data: preferences
    });
  } catch (err) {
    return next(err);
  }
});

module.exports = router;

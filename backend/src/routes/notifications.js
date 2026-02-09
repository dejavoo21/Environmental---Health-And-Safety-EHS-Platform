/**
 * Notification Routes - Phase 4
 * Handles notification CRUD operations
 */

const express = require('express');
const { AppError } = require('../utils/appError');
const notificationService = require('../services/notificationService');

const router = express.Router();

/**
 * GET /api/notifications
 * Get paginated list of notifications for the authenticated user
 */
router.get('/', async (req, res, next) => {
  try {
    const { page = '1', limit = '20', type, is_read, startDate, endDate } = req.query;

    const options = {
      page: parseInt(page, 10) || 1,
      limit: parseInt(limit, 10) || 20,
      type: type || undefined,
      isRead: is_read !== undefined ? is_read === 'true' : undefined,
      startDate: startDate || undefined,
      endDate: endDate || undefined
    };

    const result = await notificationService.getNotifications(
      req.user.id,
      req.user.organisationId,
      options
    );

    return res.json({
      success: true,
      data: result
    });
  } catch (err) {
    return next(err);
  }
});

/**
 * GET /api/notifications/unread-count
 * Get count of unread notifications (for badge display)
 */
router.get('/unread-count', async (req, res, next) => {
  try {
    const count = await notificationService.getUnreadCount(
      req.user.id,
      req.user.organisationId
    );

    return res.json({
      success: true,
      data: { count }
    });
  } catch (err) {
    return next(err);
  }
});

/**
 * PUT /api/notifications/:id/read
 * Mark a single notification as read
 */
router.put('/:id/read', async (req, res, next) => {
  try {
    const { id } = req.params;

    const result = await notificationService.markAsRead(id, req.user.id);

    if (!result) {
      return next(new AppError('Notification not found', 404, 'NOT_FOUND'));
    }

    return res.json({
      success: true,
      data: result
    });
  } catch (err) {
    return next(err);
  }
});

/**
 * PUT /api/notifications/mark-all-read
 * Mark all notifications as read for the authenticated user
 */
router.put('/mark-all-read', async (req, res, next) => {
  try {
    const updated = await notificationService.markAllAsRead(
      req.user.id,
      req.user.organisationId
    );

    return res.json({
      success: true,
      data: { updated }
    });
  } catch (err) {
    return next(err);
  }
});

/**
 * DELETE /api/notifications/:id
 * Delete a single notification
 */
router.delete('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;

    const deleted = await notificationService.deleteNotification(id, req.user.id);

    if (!deleted) {
      return next(new AppError('Notification not found', 404, 'NOT_FOUND'));
    }

    return res.json({
      success: true,
      message: 'Notification deleted'
    });
  } catch (err) {
    return next(err);
  }
});

module.exports = router;

/**
 * NotificationService - Phase 4
 * Handles creation, retrieval, and management of in-app notifications
 */

const { query, withTransaction } = require('../config/db');
const env = require('../config/env');

/**
 * Calculate expiration date based on org retention settings
 * @param {Object} orgSettings - Organisation settings JSON
 * @returns {Date} - Expiration date
 */
const getExpirationDate = (orgSettings) => {
  const retentionDays = orgSettings?.notifications?.retentionDays || env.notificationRetentionDays;
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + retentionDays);
  return expiresAt;
};

/**
 * Create a new notification
 * @param {Object} params - Notification parameters
 * @param {string} params.userId - Recipient user ID
 * @param {string} params.organisationId - Organisation ID
 * @param {string} params.type - Notification type (action_assigned, action_overdue, etc.)
 * @param {string} params.priority - Priority level (low, normal, high)
 * @param {string} params.title - Notification title
 * @param {string} params.message - Notification message
 * @param {string} [params.relatedType] - Type of related entity (action, incident, inspection)
 * @param {string} [params.relatedId] - ID of related entity
 * @param {Object} [params.metadata] - Additional metadata
 * @param {Object} [client] - Database client for transactions
 * @returns {Promise<Object>} - Created notification
 */
const createNotification = async ({
  userId,
  organisationId,
  type,
  priority = 'normal',
  title,
  message,
  relatedType = null,
  relatedId = null,
  metadata = {}
}, client = null) => {
  const queryFn = client ? client.query.bind(client) : query;

  // Get org settings for retention
  const orgResult = await queryFn(
    'SELECT settings FROM organisations WHERE id = $1',
    [organisationId]
  );
  const orgSettings = orgResult.rows[0]?.settings || {};
  const expiresAt = getExpirationDate(orgSettings);

  const result = await queryFn(
    `INSERT INTO notifications (
      user_id, organisation_id, type, priority, title, message,
      related_type, related_id, metadata, expires_at
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
    RETURNING id, user_id, organisation_id, type, priority, title, message,
              related_type, related_id, is_read, read_at, metadata, created_at, expires_at`,
    [userId, organisationId, type, priority, title, message, relatedType, relatedId, metadata, expiresAt]
  );

  return mapNotificationRow(result.rows[0]);
};

/**
 * Create notifications for multiple users
 * @param {Object} params - Notification parameters (without userId)
 * @param {string[]} userIds - Array of user IDs to notify
 * @param {Object} [client] - Database client for transactions
 * @returns {Promise<Object[]>} - Created notifications
 */
const createNotificationsForUsers = async (params, userIds, client = null) => {
  const notifications = [];
  for (const userId of userIds) {
    const notification = await createNotification({ ...params, userId }, client);
    notifications.push(notification);
  }
  return notifications;
};

/**
 * Get notifications for a user with pagination and filters
 * @param {string} userId - User ID
 * @param {string} organisationId - Organisation ID
 * @param {Object} options - Query options
 * @param {number} options.page - Page number (1-indexed)
 * @param {number} options.limit - Items per page
 * @param {string} options.type - Filter by notification type
 * @param {boolean} options.isRead - Filter by read status
 * @param {string} options.startDate - Filter by start date
 * @param {string} options.endDate - Filter by end date
 * @returns {Promise<Object>} - Notifications with pagination
 */
const getNotifications = async (userId, organisationId, options = {}) => {
  const { page = 1, limit = 20, type, isRead, startDate, endDate } = options;
  const offset = (page - 1) * Math.min(limit, 100);
  const effectiveLimit = Math.min(limit, 100);

  const conditions = ['user_id = $1', 'organisation_id = $2'];
  const values = [userId, organisationId];
  let paramIndex = 3;

  if (type) {
    conditions.push(`type = $${paramIndex++}`);
    values.push(type);
  }

  if (isRead !== undefined) {
    conditions.push(`is_read = $${paramIndex++}`);
    values.push(isRead);
  }

  if (startDate) {
    conditions.push(`created_at >= $${paramIndex++}`);
    values.push(new Date(startDate));
  }

  if (endDate) {
    conditions.push(`created_at <= $${paramIndex++}`);
    values.push(new Date(endDate));
  }

  const whereClause = conditions.join(' AND ');

  // Get total count
  const countResult = await query(
    `SELECT COUNT(*) as total FROM notifications WHERE ${whereClause}`,
    values
  );
  const total = parseInt(countResult.rows[0].total, 10);

  // Get paginated results
  values.push(effectiveLimit, offset);
  const result = await query(
    `SELECT id, user_id, organisation_id, type, priority, title, message,
            related_type, related_id, is_read, read_at, metadata, created_at, expires_at
     FROM notifications
     WHERE ${whereClause}
     ORDER BY created_at DESC
     LIMIT $${paramIndex++} OFFSET $${paramIndex}`,
    values
  );

  return {
    notifications: result.rows.map(mapNotificationRow),
    pagination: {
      page,
      limit: effectiveLimit,
      total,
      totalPages: Math.ceil(total / effectiveLimit)
    }
  };
};

/**
 * Get unread notification count for a user (capped at 99 for badge display)
 * @param {string} userId - User ID
 * @param {string} organisationId - Organisation ID
 * @returns {Promise<number>} - Unread count (max 99)
 */
const getUnreadCount = async (userId, organisationId) => {
  const result = await query(
    `SELECT COUNT(*) as count FROM notifications
     WHERE user_id = $1 AND organisation_id = $2 AND is_read = FALSE
     LIMIT 100`,
    [userId, organisationId]
  );
  const count = parseInt(result.rows[0].count, 10);
  return Math.min(count, 99);
};

/**
 * Mark a notification as read
 * @param {string} notificationId - Notification ID
 * @param {string} userId - User ID (for ownership verification)
 * @returns {Promise<Object|null>} - Updated notification or null if not found
 */
const markAsRead = async (notificationId, userId) => {
  const result = await query(
    `UPDATE notifications
     SET is_read = TRUE, read_at = NOW()
     WHERE id = $1 AND user_id = $2
     RETURNING id, is_read, read_at`,
    [notificationId, userId]
  );

  if (result.rowCount === 0) {
    return null;
  }

  return {
    id: result.rows[0].id,
    isRead: result.rows[0].is_read,
    readAt: result.rows[0].read_at?.toISOString() || null
  };
};

/**
 * Mark all notifications as read for a user
 * @param {string} userId - User ID
 * @param {string} organisationId - Organisation ID
 * @returns {Promise<number>} - Number of notifications updated
 */
const markAllAsRead = async (userId, organisationId) => {
  const result = await query(
    `UPDATE notifications
     SET is_read = TRUE, read_at = NOW()
     WHERE user_id = $1 AND organisation_id = $2 AND is_read = FALSE`,
    [userId, organisationId]
  );
  return result.rowCount;
};

/**
 * Delete a notification
 * @param {string} notificationId - Notification ID
 * @param {string} userId - User ID (for ownership verification)
 * @returns {Promise<boolean>} - True if deleted, false if not found
 */
const deleteNotification = async (notificationId, userId) => {
  const result = await query(
    `DELETE FROM notifications WHERE id = $1 AND user_id = $2`,
    [notificationId, userId]
  );
  return result.rowCount > 0;
};

/**
 * Delete expired notifications
 * @param {string} [organisationId] - Optional organisation ID to scope cleanup
 * @returns {Promise<number>} - Number of notifications deleted
 */
const deleteExpired = async (organisationId = null) => {
  let sql = 'DELETE FROM notifications WHERE expires_at IS NOT NULL AND expires_at < NOW()';
  const values = [];

  if (organisationId) {
    sql += ' AND organisation_id = $1';
    values.push(organisationId);
  }

  const result = await query(sql, values);
  return result.rowCount;
};

/**
 * Get notification by ID
 * @param {string} notificationId - Notification ID
 * @param {string} userId - User ID (for ownership verification)
 * @returns {Promise<Object|null>} - Notification or null if not found
 */
const getNotificationById = async (notificationId, userId) => {
  const result = await query(
    `SELECT id, user_id, organisation_id, type, priority, title, message,
            related_type, related_id, is_read, read_at, metadata, created_at, expires_at
     FROM notifications
     WHERE id = $1 AND user_id = $2`,
    [notificationId, userId]
  );

  if (result.rowCount === 0) {
    return null;
  }

  return mapNotificationRow(result.rows[0]);
};

/**
 * Map database row to notification object
 * @param {Object} row - Database row
 * @returns {Object} - Notification object
 */
const mapNotificationRow = (row) => ({
  id: row.id,
  userId: row.user_id,
  organisationId: row.organisation_id,
  type: row.type,
  priority: row.priority,
  title: row.title,
  message: row.message,
  relatedType: row.related_type,
  relatedId: row.related_id,
  isRead: row.is_read,
  readAt: row.read_at?.toISOString() || null,
  metadata: row.metadata || {},
  createdAt: row.created_at?.toISOString() || null,
  expiresAt: row.expires_at?.toISOString() || null
});

module.exports = {
  createNotification,
  createNotificationsForUsers,
  getNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  deleteExpired,
  getNotificationById
};

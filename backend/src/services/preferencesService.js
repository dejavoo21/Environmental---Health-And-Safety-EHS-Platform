/**
 * PreferencesService - Phase 4
 * Handles user notification preferences
 */

const { query } = require('../config/db');
const env = require('../config/env');

/**
 * Get default preferences based on user role
 * @param {string} role - User role (admin, manager, worker)
 * @returns {Object} - Default preferences
 */
const getDefaultPreferences = (role) => {
  const isManagerOrAdmin = role === 'admin' || role === 'manager';

  return {
    emailActionAssigned: true,
    emailActionOverdue: true,
    emailHighSeverityIncident: true,
    emailInspectionFailed: false,
    digestFrequency: isManagerOrAdmin ? 'weekly' : 'none',
    digestTime: env.digestDefaultTime,
    digestDayOfWeek: env.digestDefaultDayOfWeek,
    inappEnabled: true
  };
};

/**
 * Get notification preferences for a user
 * Creates default preferences if they don't exist
 * @param {string} userId - User ID
 * @param {string} organisationId - Organisation ID
 * @param {string} userRole - User role for defaults
 * @returns {Promise<Object>} - User preferences
 */
const getPreferences = async (userId, organisationId, userRole = 'worker') => {
  // Try to get existing preferences
  const result = await query(
    `SELECT id, user_id, organisation_id, email_action_assigned, email_action_overdue,
            email_high_severity_incident, email_inspection_failed, digest_frequency,
            digest_time, digest_day_of_week, inapp_enabled, created_at, updated_at
     FROM user_notification_preferences
     WHERE user_id = $1 AND organisation_id = $2`,
    [userId, organisationId]
  );

  if (result.rowCount > 0) {
    return mapPreferencesRow(result.rows[0]);
  }

  // Create default preferences
  const defaults = getDefaultPreferences(userRole);

  const insertResult = await query(
    `INSERT INTO user_notification_preferences (
      user_id, organisation_id, email_action_assigned, email_action_overdue,
      email_high_severity_incident, email_inspection_failed, digest_frequency,
      digest_time, digest_day_of_week, inapp_enabled
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
    RETURNING id, user_id, organisation_id, email_action_assigned, email_action_overdue,
              email_high_severity_incident, email_inspection_failed, digest_frequency,
              digest_time, digest_day_of_week, inapp_enabled, created_at, updated_at`,
    [
      userId, organisationId,
      defaults.emailActionAssigned, defaults.emailActionOverdue,
      defaults.emailHighSeverityIncident, defaults.emailInspectionFailed,
      defaults.digestFrequency, defaults.digestTime, defaults.digestDayOfWeek,
      defaults.inappEnabled
    ]
  );

  return mapPreferencesRow(insertResult.rows[0]);
};

/**
 * Update notification preferences for a user
 * @param {string} userId - User ID
 * @param {string} organisationId - Organisation ID
 * @param {Object} updates - Fields to update
 * @returns {Promise<Object>} - Updated preferences
 */
const updatePreferences = async (userId, organisationId, updates) => {
  // Ensure preferences exist first
  const existingResult = await query(
    'SELECT id FROM user_notification_preferences WHERE user_id = $1 AND organisation_id = $2',
    [userId, organisationId]
  );

  if (existingResult.rowCount === 0) {
    // Create with defaults and then apply updates
    await getPreferences(userId, organisationId);
  }

  // Build update query dynamically
  const updateFields = [];
  const values = [];
  let paramIndex = 1;

  const fieldMap = {
    emailActionAssigned: 'email_action_assigned',
    emailActionOverdue: 'email_action_overdue',
    emailHighSeverityIncident: 'email_high_severity_incident',
    emailInspectionFailed: 'email_inspection_failed',
    digestFrequency: 'digest_frequency',
    digestTime: 'digest_time',
    digestDayOfWeek: 'digest_day_of_week',
    inappEnabled: 'inapp_enabled'
  };

  for (const [key, dbField] of Object.entries(fieldMap)) {
    if (updates[key] !== undefined) {
      updateFields.push(`${dbField} = $${paramIndex++}`);
      values.push(updates[key]);
    }
  }

  if (updateFields.length === 0) {
    // No updates, just return current preferences
    return getPreferences(userId, organisationId);
  }

  // Add user_id and organisation_id
  values.push(userId, organisationId);

  const result = await query(
    `UPDATE user_notification_preferences
     SET ${updateFields.join(', ')}, updated_at = NOW()
     WHERE user_id = $${paramIndex++} AND organisation_id = $${paramIndex}
     RETURNING id, user_id, organisation_id, email_action_assigned, email_action_overdue,
               email_high_severity_incident, email_inspection_failed, digest_frequency,
               digest_time, digest_day_of_week, inapp_enabled, created_at, updated_at`,
    values
  );

  return mapPreferencesRow(result.rows[0]);
};

/**
 * Get users with specific digest frequency
 * @param {string} frequency - Digest frequency (daily, weekly)
 * @param {string} [organisationId] - Optional organisation ID to filter
 * @returns {Promise<Object[]>} - Users with their preferences
 */
const getUsersByDigestFrequency = async (frequency, organisationId = null) => {
  let sql = `
    SELECT unp.*, u.email, u.name, u.role, o.name as organisation_name, o.settings as organisation_settings
    FROM user_notification_preferences unp
    JOIN users u ON u.id = unp.user_id
    JOIN organisations o ON o.id = unp.organisation_id
    WHERE unp.digest_frequency = $1
      AND u.is_active = TRUE
      AND o.is_active = TRUE
  `;
  const values = [frequency];

  if (organisationId) {
    sql += ' AND unp.organisation_id = $2';
    values.push(organisationId);
  }

  const result = await query(sql, values);

  return result.rows.map(row => ({
    userId: row.user_id,
    email: row.email,
    name: row.name,
    role: row.role,
    organisationId: row.organisation_id,
    organisationName: row.organisation_name,
    organisationSettings: row.organisation_settings,
    preferences: mapPreferencesRow(row)
  }));
};

/**
 * Check if a user has a specific email preference enabled
 * @param {string} userId - User ID
 * @param {string} organisationId - Organisation ID
 * @param {string} preferenceKey - Preference key (emailActionAssigned, etc.)
 * @returns {Promise<boolean>} - True if enabled
 */
const isEmailPreferenceEnabled = async (userId, organisationId, preferenceKey) => {
  const prefs = await getPreferences(userId, organisationId);
  return prefs[preferenceKey] === true;
};

/**
 * Map database row to preferences object
 * @param {Object} row - Database row
 * @returns {Object} - Preferences object
 */
const mapPreferencesRow = (row) => ({
  id: row.id,
  userId: row.user_id,
  organisationId: row.organisation_id,
  emailActionAssigned: row.email_action_assigned,
  emailActionOverdue: row.email_action_overdue,
  emailHighSeverityIncident: row.email_high_severity_incident,
  emailInspectionFailed: row.email_inspection_failed,
  digestFrequency: row.digest_frequency,
  digestTime: row.digest_time?.toString?.().slice(0, 5) || row.digest_time,
  digestDayOfWeek: row.digest_day_of_week,
  inappEnabled: row.inapp_enabled,
  createdAt: row.created_at?.toISOString() || null,
  updatedAt: row.updated_at?.toISOString() || null
});

module.exports = {
  getDefaultPreferences,
  getPreferences,
  updatePreferences,
  getUsersByDigestFrequency,
  isEmailPreferenceEnabled
};

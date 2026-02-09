/**
 * Notification Triggers - Phase 4
 * Handles creating notifications in response to system events
 */

const { query } = require('../config/db');
const notificationService = require('./notificationService');
const preferencesService = require('./preferencesService');
const emailService = require('./emailService');

/**
 * Trigger notification for action assignment
 * @param {Object} action - Action object
 * @param {Object} assignee - Assigned user {id, name, email, organisationId}
 * @param {Object} creator - Creator user {id, name}
 * @returns {Promise<Object>} - Result with notification and email status
 */
const onActionAssigned = async (action, assignee, creator) => {
  const result = { notificationCreated: false, emailSent: false };

  if (!assignee?.id || !assignee?.organisationId) {
    return result;
  }

  try {
    // Check if in-app notifications are enabled
    const prefs = await preferencesService.getPreferences(
      assignee.id,
      assignee.organisationId,
      'worker' // Default role
    );

    // Create in-app notification if enabled
    if (prefs.inappEnabled) {
      const notification = await notificationService.createNotification({
        userId: assignee.id,
        organisationId: assignee.organisationId,
        type: 'action_assigned',
        priority: 'normal',
        title: 'New Action Assigned',
        message: `You have been assigned to: ${action.title}`,
        relatedType: 'action',
        relatedId: action.id,
        metadata: {
          actionTitle: action.title,
          dueDate: action.dueDate,
          sourceType: action.sourceType,
          sourceId: action.sourceId,
          createdBy: creator?.name || 'Unknown'
        }
      });
      result.notificationCreated = true;
      result.notificationId = notification.id;

      // Send email if preference enabled
      if (prefs.emailActionAssigned && assignee.email) {
        const emailResult = await emailService.sendNotificationEmail(
          notification,
          { id: assignee.id, email: assignee.email, name: assignee.name },
          assignee.organisationId
        );
        result.emailSent = emailResult.success;
        result.emailLogId = emailResult.emailLogId;
      }
    }
  } catch (error) {
    console.error('[NotificationTriggers] onActionAssigned error:', error.message);
    result.error = error.message;
  }

  return result;
};

/**
 * Trigger notification for action status change (completed)
 * @param {Object} action - Action object
 * @param {string} oldStatus - Previous status
 * @param {string} newStatus - New status
 * @param {Object} actionCreator - Action creator {id, name, email, organisationId}
 * @param {Object} updatedBy - User who updated {id, name}
 * @returns {Promise<Object>} - Result
 */
const onActionStatusChanged = async (action, oldStatus, newStatus, actionCreator, updatedBy) => {
  const result = { notificationsCreated: 0 };

  // Only notify on completion
  if (newStatus !== 'done' || !actionCreator?.id) {
    return result;
  }

  try {
    // Don't notify if creator completed their own action
    if (actionCreator.id === updatedBy?.id) {
      return result;
    }

    const prefs = await preferencesService.getPreferences(
      actionCreator.id,
      actionCreator.organisationId,
      'manager'
    );

    if (prefs.inappEnabled) {
      await notificationService.createNotification({
        userId: actionCreator.id,
        organisationId: actionCreator.organisationId,
        type: 'action_status_changed',
        priority: 'normal',
        title: 'Action Completed',
        message: `Action "${action.title}" has been marked as completed.`,
        relatedType: 'action',
        relatedId: action.id,
        metadata: {
          actionTitle: action.title,
          completedBy: updatedBy?.name || 'Unknown'
        }
      });
      result.notificationsCreated++;
    }
  } catch (error) {
    console.error('[NotificationTriggers] onActionStatusChanged error:', error.message);
    result.error = error.message;
  }

  return result;
};

/**
 * Trigger notifications for high-severity incident
 * @param {Object} incident - Incident object with severity
 * @param {string} organisationId - Organisation ID
 * @param {Object} reporter - Reporter user {id, name}
 * @returns {Promise<Object>} - Result with notification counts
 */
const onHighSeverityIncident = async (incident, organisationId, reporter) => {
  const result = { notificationsCreated: 0, emailsSent: 0 };

  // Only trigger for high or critical severity
  if (!['high', 'critical'].includes(incident.severity)) {
    return result;
  }

  try {
    // Get all managers and admins in the organisation
    const managersResult = await query(
      `SELECT u.id, u.name, u.email, u.role
       FROM users u
       WHERE u.organisation_id = $1
         AND u.role IN ('admin', 'manager')
         AND u.is_active = TRUE`,
      [organisationId]
    );

    for (const manager of managersResult.rows) {
      // Don't notify the reporter if they're a manager
      if (manager.id === reporter?.id) {
        continue;
      }

      const prefs = await preferencesService.getPreferences(
        manager.id,
        organisationId,
        manager.role
      );

      if (!prefs.inappEnabled) {
        continue;
      }

      const notification = await notificationService.createNotification({
        userId: manager.id,
        organisationId,
        type: 'incident_high_severity',
        priority: 'high',
        title: `${incident.severity === 'critical' ? 'CRITICAL' : 'High Severity'} Incident Reported`,
        message: `A ${incident.severity} severity incident has been reported: ${incident.title}`,
        relatedType: 'incident',
        relatedId: incident.id,
        metadata: {
          incidentTitle: incident.title,
          severity: incident.severity,
          siteName: incident.siteName,
          reportedBy: reporter?.name || 'Unknown'
        }
      });
      result.notificationsCreated++;

      // Send email if preference enabled
      if (prefs.emailHighSeverityIncident && manager.email) {
        const emailResult = await emailService.sendNotificationEmail(
          notification,
          { id: manager.id, email: manager.email, name: manager.name },
          organisationId
        );
        if (emailResult.success) {
          result.emailsSent++;
        }
      }
    }
  } catch (error) {
    console.error('[NotificationTriggers] onHighSeverityIncident error:', error.message);
    result.error = error.message;
  }

  return result;
};

/**
 * Trigger notifications for failed inspection
 * @param {Object} inspection - Inspection object
 * @param {string} organisationId - Organisation ID
 * @returns {Promise<Object>} - Result
 */
const onInspectionFailed = async (inspection, organisationId) => {
  const result = { notificationsCreated: 0, emailsSent: 0 };

  // Only trigger for failed inspections
  if (inspection.overallResult !== 'fail') {
    return result;
  }

  try {
    // Get all managers and admins who have email_inspection_failed enabled
    const managersResult = await query(
      `SELECT u.id, u.name, u.email, u.role, unp.email_inspection_failed, unp.inapp_enabled
       FROM users u
       LEFT JOIN user_notification_preferences unp ON unp.user_id = u.id AND unp.organisation_id = u.organisation_id
       WHERE u.organisation_id = $1
         AND u.role IN ('admin', 'manager')
         AND u.is_active = TRUE`,
      [organisationId]
    );

    for (const manager of managersResult.rows) {
      // Skip if in-app not enabled (or no preferences yet, defaults to true)
      if (manager.inapp_enabled === false) {
        continue;
      }

      const notification = await notificationService.createNotification({
        userId: manager.id,
        organisationId,
        type: 'inspection_failed',
        priority: 'normal',
        title: 'Inspection Failed',
        message: `Inspection "${inspection.templateName}" at ${inspection.siteName} has failed.`,
        relatedType: 'inspection',
        relatedId: inspection.id,
        metadata: {
          templateName: inspection.templateName,
          siteName: inspection.siteName,
          performedBy: inspection.performedBy
        }
      });
      result.notificationsCreated++;

      // Send email if preference enabled
      if (manager.email_inspection_failed && manager.email) {
        const emailResult = await emailService.sendNotificationEmail(
          notification,
          { id: manager.id, email: manager.email, name: manager.name },
          organisationId
        );
        if (emailResult.success) {
          result.emailsSent++;
        }
      }
    }
  } catch (error) {
    console.error('[NotificationTriggers] onInspectionFailed error:', error.message);
    result.error = error.message;
  }

  return result;
};

module.exports = {
  onActionAssigned,
  onActionStatusChanged,
  onHighSeverityIncident,
  onInspectionFailed
};

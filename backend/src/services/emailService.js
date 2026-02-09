/**
 * EmailService - Phase 4
 * Extended email functionality for notifications, digests, and escalations
 */

const { query } = require('../config/db');
const { sendEmail, isSmtpConfigured } = require('../utils/emailSender');
const env = require('../config/env');

/**
 * Log an email send attempt
 * @param {Object} params - Email log parameters
 * @returns {Promise<Object>} - Created email log
 */
const logEmailAttempt = async ({
  organisationId,
  recipientEmail,
  recipientUserId = null,
  subject,
  emailType,
  notificationId = null,
  metadata = {}
}) => {
  const result = await query(
    `INSERT INTO email_logs (
      organisation_id, recipient_email, recipient_user_id, subject,
      email_type, notification_id, metadata
    ) VALUES ($1, $2, $3, $4, $5, $6, $7)
    RETURNING id, status, attempts, created_at`,
    [organisationId, recipientEmail, recipientUserId, subject, emailType, notificationId, metadata]
  );

  return result.rows[0];
};

/**
 * Update email log status
 * @param {string} emailLogId - Email log ID
 * @param {string} status - New status (sent, failed, bounced)
 * @param {string} [errorMessage] - Error message if failed
 * @returns {Promise<void>}
 */
const updateEmailLogStatus = async (emailLogId, status, errorMessage = null) => {
  const updates = ['status = $1', 'attempts = attempts + 1', 'last_attempt_at = NOW()'];
  const values = [status];
  let paramIndex = 2;

  if (status === 'sent') {
    updates.push('sent_at = NOW()');
  }

  if (errorMessage) {
    updates.push(`error_message = $${paramIndex++}`);
    values.push(errorMessage);
  }

  values.push(emailLogId);
  await query(
    `UPDATE email_logs SET ${updates.join(', ')} WHERE id = $${paramIndex}`,
    values
  );
};

/**
 * Send a notification email
 * @param {Object} notification - Notification object
 * @param {Object} user - User object with email and name
 * @param {string} organisationId - Organisation ID
 * @returns {Promise<Object>} - Result with success status and emailLogId
 */
const sendNotificationEmail = async (notification, user, organisationId) => {
  if (!isSmtpConfigured()) {
    return { success: false, error: 'SMTP not configured' };
  }

  const subject = `EHS Portal - ${formatNotificationTypeForSubject(notification.type)}`;
  const text = formatNotificationText(notification);
  const html = formatNotificationHtml(notification, user);

  // Log the email attempt
  const emailLog = await logEmailAttempt({
    organisationId,
    recipientEmail: user.email,
    recipientUserId: user.id,
    subject,
    emailType: 'notification',
    notificationId: notification.id,
    metadata: { notificationType: notification.type }
  });

  try {
    await sendEmail({ to: user.email, subject, text, html });
    await updateEmailLogStatus(emailLog.id, 'sent');
    return { success: true, emailLogId: emailLog.id };
  } catch (error) {
    await updateEmailLogStatus(emailLog.id, 'failed', error.message);
    return { success: false, error: error.message, emailLogId: emailLog.id };
  }
};

/**
 * Send a digest email
 * @param {Object} user - User object with email, name, organisationId
 * @param {Object} digestData - Digest content data
 * @param {string} digestType - 'daily' or 'weekly'
 * @returns {Promise<Object>} - Result with success status
 */
const sendDigestEmail = async (user, digestData, digestType) => {
  if (!isSmtpConfigured()) {
    return { success: false, error: 'SMTP not configured' };
  }

  const periodLabel = digestType === 'daily'
    ? `Daily Summary - ${new Date().toLocaleDateString('en-GB')}`
    : `Weekly Summary - Week of ${getWeekStartDate().toLocaleDateString('en-GB')}`;

  const subject = `EHS Portal - ${periodLabel}`;
  const text = formatDigestText(digestData, periodLabel);
  const html = formatDigestHtml(digestData, periodLabel, user);

  const emailLog = await logEmailAttempt({
    organisationId: user.organisationId,
    recipientEmail: user.email,
    recipientUserId: user.id,
    subject,
    emailType: 'digest',
    metadata: { digestType, period: periodLabel }
  });

  try {
    await sendEmail({ to: user.email, subject, text, html });
    await updateEmailLogStatus(emailLog.id, 'sent');
    return { success: true, emailLogId: emailLog.id };
  } catch (error) {
    await updateEmailLogStatus(emailLog.id, 'failed', error.message);
    return { success: false, error: error.message, emailLogId: emailLog.id };
  }
};

/**
 * Send an escalation email
 * @param {Object} action - Overdue action object
 * @param {Object[]} recipients - Array of {email, name, userId}
 * @param {string} organisationId - Organisation ID
 * @returns {Promise<Object[]>} - Results for each recipient
 */
const sendEscalationEmail = async (action, recipients, organisationId) => {
  if (!isSmtpConfigured()) {
    return recipients.map(() => ({ success: false, error: 'SMTP not configured' }));
  }

  const subject = `EHS Portal - ESCALATION: Overdue Action Requires Attention`;
  const results = [];

  for (const recipient of recipients) {
    const text = formatEscalationText(action);
    const html = formatEscalationHtml(action, recipient);

    const emailLog = await logEmailAttempt({
      organisationId,
      recipientEmail: recipient.email,
      recipientUserId: recipient.userId || null,
      subject,
      emailType: 'escalation',
      metadata: { actionId: action.id, actionTitle: action.title }
    });

    try {
      await sendEmail({ to: recipient.email, subject, text, html });
      await updateEmailLogStatus(emailLog.id, 'sent');
      results.push({ success: true, emailLogId: emailLog.id, email: recipient.email });
    } catch (error) {
      await updateEmailLogStatus(emailLog.id, 'failed', error.message);
      results.push({ success: false, error: error.message, emailLogId: emailLog.id, email: recipient.email });
    }
  }

  return results;
};

/**
 * Retry failed emails
 * @param {number} maxAttempts - Maximum retry attempts
 * @returns {Promise<Object>} - Retry results
 */
const retryFailedEmails = async (maxAttempts = env.emailMaxRetryAttempts) => {
  // Get pending/failed emails that haven't exceeded max attempts
  const result = await query(
    `SELECT el.*, n.title as notification_title, n.message as notification_message, n.type as notification_type
     FROM email_logs el
     LEFT JOIN notifications n ON n.id = el.notification_id
     WHERE el.status IN ('pending', 'failed')
       AND el.attempts < $1
     ORDER BY el.created_at ASC
     LIMIT 50`,
    [maxAttempts]
  );

  const results = { succeeded: 0, failed: 0, skipped: 0 };

  for (const row of result.rows) {
    try {
      // Reconstruct email content based on type
      const subject = row.subject;
      let text = '';

      if (row.email_type === 'notification' && row.notification_title) {
        text = `${row.notification_title}\n\n${row.notification_message || ''}`;
      } else if (row.email_type === 'digest') {
        text = 'Your EHS Portal digest summary';
      } else if (row.email_type === 'escalation') {
        text = `An action requires your attention: ${row.metadata?.actionTitle || 'Unknown'}`;
      } else {
        text = 'EHS Portal notification';
      }

      await sendEmail({ to: row.recipient_email, subject, text });
      await updateEmailLogStatus(row.id, 'sent');
      results.succeeded++;
    } catch (error) {
      await updateEmailLogStatus(row.id, 'failed', error.message);
      results.failed++;
    }
  }

  return results;
};

/**
 * Get email logs with filters
 * @param {string} organisationId - Organisation ID
 * @param {Object} options - Filter options
 * @returns {Promise<Object[]>} - Email logs
 */
const getEmailLogs = async (organisationId, options = {}) => {
  const { status, emailType, limit = 50 } = options;
  const conditions = ['organisation_id = $1'];
  const values = [organisationId];
  let paramIndex = 2;

  if (status) {
    conditions.push(`status = $${paramIndex++}`);
    values.push(status);
  }

  if (emailType) {
    conditions.push(`email_type = $${paramIndex++}`);
    values.push(emailType);
  }

  values.push(Math.min(limit, 200));

  const result = await query(
    `SELECT id, recipient_email, subject, email_type, status, attempts, sent_at, error_message, created_at
     FROM email_logs
     WHERE ${conditions.join(' AND ')}
     ORDER BY created_at DESC
     LIMIT $${paramIndex}`,
    values
  );

  return result.rows.map(row => ({
    id: row.id,
    recipientEmail: row.recipient_email,
    subject: row.subject,
    emailType: row.email_type,
    status: row.status,
    attempts: row.attempts,
    sentAt: row.sent_at?.toISOString() || null,
    errorMessage: row.error_message,
    createdAt: row.created_at?.toISOString() || null
  }));
};

// ============================================================================
// FORMATTING HELPERS
// ============================================================================

const formatNotificationTypeForSubject = (type) => {
  const typeLabels = {
    action_assigned: 'New Action Assigned',
    action_status_changed: 'Action Status Updated',
    action_overdue: 'Action Overdue',
    action_escalated: 'Action Escalated',
    incident_created: 'New Incident Reported',
    incident_high_severity: 'High Severity Incident Alert',
    inspection_failed: 'Inspection Failed',
    system: 'System Notification'
  };
  return typeLabels[type] || 'Notification';
};

const formatNotificationText = (notification) => {
  return `${notification.title}\n\n${notification.message || ''}\n\n---\nThis is an automated message from EHS Portal.`;
};

const formatNotificationHtml = (notification, user) => {
  return `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #2563eb; color: white; padding: 20px; border-radius: 8px 8px 0 0; }
    .content { background: #f9fafb; padding: 20px; border: 1px solid #e5e7eb; }
    .footer { padding: 15px; font-size: 12px; color: #666; border-top: 1px solid #e5e7eb; }
    .button { display: inline-block; background: #2563eb; color: white; padding: 10px 20px; text-decoration: none; border-radius: 4px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1 style="margin:0;">EHS Portal</h1>
    </div>
    <div class="content">
      <h2>${notification.title}</h2>
      <p>Hello ${user.name || 'User'},</p>
      <p>${notification.message || ''}</p>
      ${notification.relatedType && notification.relatedId ? `
      <p><a href="${env.corsOrigin}/${notification.relatedType}s/${notification.relatedId}" class="button">View Details</a></p>
      ` : ''}
    </div>
    <div class="footer">
      <p>This is an automated message from EHS Portal. Please do not reply to this email.</p>
    </div>
  </div>
</body>
</html>`;
};

const formatDigestText = (data, periodLabel) => {
  let text = `EHS Portal - ${periodLabel}\n\n`;

  if (data.newIncidents?.length > 0) {
    text += `NEW INCIDENTS (${data.newIncidents.length})\n`;
    data.newIncidents.forEach(i => {
      text += `  - ${i.title} (${i.severity}) at ${i.siteName}\n`;
    });
    text += '\n';
  }

  if (data.actionsDueSoon?.length > 0) {
    text += `ACTIONS DUE SOON (${data.actionsDueSoon.length})\n`;
    data.actionsDueSoon.forEach(a => {
      text += `  - ${a.title} (due ${a.dueDate})\n`;
    });
    text += '\n';
  }

  if (data.overdueActions?.length > 0) {
    text += `OVERDUE ACTIONS (${data.overdueActions.length})\n`;
    data.overdueActions.forEach(a => {
      text += `  - ${a.title} (${a.daysOverdue} days overdue)\n`;
    });
  }

  return text;
};

const formatDigestHtml = (data, periodLabel, user) => {
  const incidentsSection = data.newIncidents?.length > 0 ? `
    <h3>New Incidents (${data.newIncidents.length})</h3>
    <ul>
      ${data.newIncidents.map(i => `<li><strong>${i.title}</strong> (${i.severity}) - ${i.siteName}</li>`).join('')}
    </ul>
  ` : '';

  const actionsDueSection = data.actionsDueSoon?.length > 0 ? `
    <h3>Actions Due Soon (${data.actionsDueSoon.length})</h3>
    <ul>
      ${data.actionsDueSoon.map(a => `<li><strong>${a.title}</strong> - Due ${a.dueDate}</li>`).join('')}
    </ul>
  ` : '';

  const overdueSection = data.overdueActions?.length > 0 ? `
    <h3 style="color: #dc2626;">Overdue Actions (${data.overdueActions.length})</h3>
    <ul>
      ${data.overdueActions.map(a => `<li><strong>${a.title}</strong> - ${a.daysOverdue} days overdue</li>`).join('')}
    </ul>
  ` : '';

  return `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #2563eb; color: white; padding: 20px; border-radius: 8px 8px 0 0; }
    .content { background: #f9fafb; padding: 20px; border: 1px solid #e5e7eb; }
    .footer { padding: 15px; font-size: 12px; color: #666; }
    h3 { margin-top: 20px; color: #1f2937; }
    ul { padding-left: 20px; }
    li { margin-bottom: 8px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1 style="margin:0;">EHS Portal</h1>
      <p style="margin:5px 0 0;">${periodLabel}</p>
    </div>
    <div class="content">
      <p>Hello ${user.name || 'User'},</p>
      <p>Here's your EHS Portal summary:</p>
      ${incidentsSection}
      ${actionsDueSection}
      ${overdueSection}
      ${!incidentsSection && !actionsDueSection && !overdueSection ? '<p>No new activity to report.</p>' : ''}
    </div>
    <div class="footer">
      <p>This is an automated digest from EHS Portal.</p>
    </div>
  </div>
</body>
</html>`;
};

const formatEscalationText = (action) => {
  return `ESCALATION NOTICE\n\nThe following action is overdue and requires immediate attention:\n\nTitle: ${action.title}\nDue Date: ${action.dueDate}\nDays Overdue: ${action.daysOverdue}\nAssignee: ${action.assigneeName || 'Unassigned'}\n\nPlease take action immediately.`;
};

const formatEscalationHtml = (action, recipient) => {
  return `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #dc2626; color: white; padding: 20px; border-radius: 8px 8px 0 0; }
    .content { background: #fef2f2; padding: 20px; border: 1px solid #fecaca; }
    .action-box { background: white; padding: 15px; border-radius: 4px; margin: 15px 0; }
    .footer { padding: 15px; font-size: 12px; color: #666; }
    .button { display: inline-block; background: #dc2626; color: white; padding: 10px 20px; text-decoration: none; border-radius: 4px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1 style="margin:0;">ESCALATION NOTICE</h1>
    </div>
    <div class="content">
      <p>Hello ${recipient.name || 'User'},</p>
      <p><strong>The following action is overdue and requires immediate attention:</strong></p>
      <div class="action-box">
        <p><strong>Title:</strong> ${action.title}</p>
        <p><strong>Due Date:</strong> ${action.dueDate}</p>
        <p><strong>Days Overdue:</strong> ${action.daysOverdue}</p>
        <p><strong>Assignee:</strong> ${action.assigneeName || 'Unassigned'}</p>
      </div>
      <p><a href="${env.corsOrigin}/actions/${action.id}" class="button">View Action</a></p>
    </div>
    <div class="footer">
      <p>This is an automated escalation from EHS Portal.</p>
    </div>
  </div>
</body>
</html>`;
};

const getWeekStartDate = () => {
  const now = new Date();
  const day = now.getDay();
  const diff = now.getDate() - day + (day === 0 ? -6 : 1);
  return new Date(now.setDate(diff));
};

module.exports = {
  logEmailAttempt,
  updateEmailLogStatus,
  sendNotificationEmail,
  sendDigestEmail,
  sendEscalationEmail,
  retryFailedEmails,
  getEmailLogs
};

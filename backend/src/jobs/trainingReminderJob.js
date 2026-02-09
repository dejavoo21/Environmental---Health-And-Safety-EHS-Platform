/**
 * Training Reminder Job - Phase 8
 * Sends reminders for upcoming training sessions and overdue assignments
 * Scheduled to run at 06:00 UTC daily
 */

const { query } = require('../config/db');
const notificationTriggers = require('../services/notificationTriggers');

/**
 * Run the training reminder job
 */
const runTrainingReminders = async () => {
  console.log('[TrainingReminderJob] Starting training reminders...');
  const startTime = Date.now();
  
  let sessionReminders = 0;
  let assignmentReminders = 0;
  let overdueReminders = 0;
  
  try {
    // Remind about sessions happening tomorrow
    const tomorrowSessions = await query(`
      SELECT s.id as session_id, s.session_date, s.start_time, s.location_detail, s.virtual_link,
             s.organisation_id,
             c.title as course_title,
             e.user_id,
             u.full_name, u.email,
             site.name as site_name
      FROM training_sessions s
      JOIN training_courses c ON s.course_id = c.id
      JOIN training_session_enrollments e ON e.session_id = s.id
      JOIN users u ON e.user_id = u.id
      LEFT JOIN sites site ON s.site_id = site.id
      WHERE s.session_date = CURRENT_DATE + INTERVAL '1 day'
      AND s.status IN ('scheduled', 'confirmed')
      AND e.status = 'enrolled'
    `);
    
    for (const row of tomorrowSessions.rows) {
      try {
        await notificationTriggers.triggerNotification({
          type: 'training_session_reminder',
          userId: row.user_id,
          organisationId: row.organisation_id,
          data: {
            sessionId: row.session_id,
            courseTitle: row.course_title,
            sessionDate: row.session_date,
            startTime: row.start_time,
            location: row.location_detail || row.site_name,
            virtualLink: row.virtual_link,
            daysAhead: 1
          }
        });
        sessionReminders++;
      } catch (err) {
        console.error(`[TrainingReminderJob] Failed to send session reminder for session ${row.session_id}:`, err.message);
      }
    }
    
    // Remind about sessions happening in 3 days
    const threeDaySessions = await query(`
      SELECT s.id as session_id, s.session_date, s.start_time, s.organisation_id,
             c.title as course_title,
             e.user_id
      FROM training_sessions s
      JOIN training_courses c ON s.course_id = c.id
      JOIN training_session_enrollments e ON e.session_id = s.id
      WHERE s.session_date = CURRENT_DATE + INTERVAL '3 days'
      AND s.status IN ('scheduled', 'confirmed')
      AND e.status = 'enrolled'
    `);
    
    for (const row of threeDaySessions.rows) {
      try {
        await notificationTriggers.triggerNotification({
          type: 'training_session_reminder',
          userId: row.user_id,
          organisationId: row.organisation_id,
          data: {
            sessionId: row.session_id,
            courseTitle: row.course_title,
            sessionDate: row.session_date,
            startTime: row.start_time,
            daysAhead: 3
          }
        });
        sessionReminders++;
      } catch (err) {
        console.error(`[TrainingReminderJob] Failed to send session reminder:`, err.message);
      }
    }
    
    // Remind about assignments due in 3 days
    const dueSoonAssignments = await query(`
      SELECT a.id as assignment_id, a.due_date, a.user_id, a.organisation_id, a.priority,
             c.title as course_title
      FROM training_assignments a
      JOIN training_courses c ON a.course_id = c.id
      WHERE a.due_date = CURRENT_DATE + INTERVAL '3 days'
      AND a.status = 'assigned'
    `);
    
    for (const row of dueSoonAssignments.rows) {
      try {
        await notificationTriggers.triggerNotification({
          type: 'training_assignment_due_soon',
          userId: row.user_id,
          organisationId: row.organisation_id,
          data: {
            assignmentId: row.assignment_id,
            courseTitle: row.course_title,
            dueDate: row.due_date,
            priority: row.priority,
            daysUntilDue: 3
          }
        });
        assignmentReminders++;
      } catch (err) {
        console.error(`[TrainingReminderJob] Failed to send assignment reminder:`, err.message);
      }
    }
    
    // Remind about overdue assignments (once per week on Monday)
    const dayOfWeek = new Date().getDay();
    if (dayOfWeek === 1) { // Monday
      const overdueAssignments = await query(`
        SELECT a.id as assignment_id, a.due_date, a.user_id, a.organisation_id,
               c.title as course_title,
               CURRENT_DATE - a.due_date as days_overdue
        FROM training_assignments a
        JOIN training_courses c ON a.course_id = c.id
        WHERE a.due_date < CURRENT_DATE
        AND a.status = 'assigned'
      `);
      
      for (const row of overdueAssignments.rows) {
        try {
          await notificationTriggers.triggerNotification({
            type: 'training_assignment_overdue',
            userId: row.user_id,
            organisationId: row.organisation_id,
            data: {
              assignmentId: row.assignment_id,
              courseTitle: row.course_title,
              dueDate: row.due_date,
              daysOverdue: row.days_overdue
            }
          });
          overdueReminders++;
        } catch (err) {
          console.error(`[TrainingReminderJob] Failed to send overdue reminder:`, err.message);
        }
      }
    }
    
    const duration = Date.now() - startTime;
    console.log(`[TrainingReminderJob] Completed in ${duration}ms. Sessions: ${sessionReminders}, Assignments: ${assignmentReminders}, Overdue: ${overdueReminders}`);
    
    return { sessionReminders, assignmentReminders, overdueReminders, duration };
  } catch (error) {
    console.error('[TrainingReminderJob] Job failed:', error.message);
    throw error;
  }
};

module.exports = {
  runTrainingReminders
};

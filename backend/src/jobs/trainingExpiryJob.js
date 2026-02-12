/**
 * Training Expiry Check Job - Phase 8
 * Checks for expired and soon-to-expire training certifications
 * Scheduled to run at 01:00 UTC daily
 */

const { query } = require('../config/db');
const notificationTriggers = require('../services/notificationTriggers');

/**
 * Run the training expiry check job
 */
const runTrainingExpiryCheck = async () => {
  console.log('[TrainingExpiryJob] Starting training expiry check...');
  const startTime = Date.now();
  
  let expiredCount = 0;
  let expiringSoonCount = 0;
  
  try {
    // Find newly expired certifications (expired today)
    const expiredResult = await query(`
      SELECT comp.id, comp.user_id, comp.course_id, comp.expires_at, comp.organisation_id,
             u.email, u.name as full_name,
             c.title as course_title
      FROM training_completions comp
      JOIN users u ON comp.user_id = u.id
      JOIN training_courses c ON comp.course_id = c.id
      WHERE comp.expires_at = CURRENT_DATE
      AND comp.result IN ('passed', 'attended')
    `);
    
    for (const row of expiredResult.rows) {
      try {
        await notificationTriggers.triggerNotification({
          type: 'training_expired',
          userId: row.user_id,
          organisationId: row.organisation_id,
          data: {
            completionId: row.id,
            courseTitle: row.course_title,
            expiredAt: row.expires_at
          }
        });
        expiredCount++;
      } catch (err) {
        console.error(`[TrainingExpiryJob] Failed to send expiry notification for completion ${row.id}:`, err.message);
      }
    }
    
    // Find certifications expiring in 30 days
    const expiring30Result = await query(`
      SELECT comp.id, comp.user_id, comp.course_id, comp.expires_at, comp.organisation_id,
             u.email, u.name as full_name,
             c.title as course_title
      FROM training_completions comp
      JOIN users u ON comp.user_id = u.id
      JOIN training_courses c ON comp.course_id = c.id
      WHERE comp.expires_at = CURRENT_DATE + INTERVAL '30 days'
      AND comp.result IN ('passed', 'attended')
    `);
    
    for (const row of expiring30Result.rows) {
      try {
        await notificationTriggers.triggerNotification({
          type: 'training_expiring_soon',
          userId: row.user_id,
          organisationId: row.organisation_id,
          data: {
            completionId: row.id,
            courseTitle: row.course_title,
            expiresAt: row.expires_at,
            daysUntilExpiry: 30
          }
        });
        expiringSoonCount++;
      } catch (err) {
        console.error(`[TrainingExpiryJob] Failed to send expiring soon notification for completion ${row.id}:`, err.message);
      }
    }
    
    // Find certifications expiring in 7 days
    const expiring7Result = await query(`
      SELECT comp.id, comp.user_id, comp.course_id, comp.expires_at, comp.organisation_id,
             u.email, u.name as full_name,
             c.title as course_title
      FROM training_completions comp
      JOIN users u ON comp.user_id = u.id
      JOIN training_courses c ON comp.course_id = c.id
      WHERE comp.expires_at = CURRENT_DATE + INTERVAL '7 days'
      AND comp.result IN ('passed', 'attended')
    `);
    
    for (const row of expiring7Result.rows) {
      try {
        await notificationTriggers.triggerNotification({
          type: 'training_expiring_soon',
          userId: row.user_id,
          organisationId: row.organisation_id,
          data: {
            completionId: row.id,
            courseTitle: row.course_title,
            expiresAt: row.expires_at,
            daysUntilExpiry: 7
          }
        });
        expiringSoonCount++;
      } catch (err) {
        console.error(`[TrainingExpiryJob] Failed to send expiring soon notification for completion ${row.id}:`, err.message);
      }
    }
    
    // Also notify managers of their team's expiring certifications
    await notifyManagersOfExpiringCertifications();
    
    const duration = Date.now() - startTime;
    console.log(`[TrainingExpiryJob] Completed in ${duration}ms. Expired: ${expiredCount}, Expiring soon: ${expiringSoonCount}`);
    
    return { expiredCount, expiringSoonCount, duration };
  } catch (error) {
    console.error('[TrainingExpiryJob] Job failed:', error.message);
    throw error;
  }
};

/**
 * Notify managers of team certifications expiring within 30 days
 */
const notifyManagersOfExpiringCertifications = async () => {
  // Find managers with team members having expiring certifications
  const result = await query(`
    SELECT 
      mgr.id as manager_id,
      mgr.email as manager_email,
      mgr.organisation_id,
      COUNT(comp.id) as expiring_count
    FROM users mgr
    JOIN users team ON team.site_id = mgr.site_id 
                    AND team.organisation_id = mgr.organisation_id
                    AND team.id != mgr.id
    JOIN training_completions comp ON comp.user_id = team.id
    WHERE mgr.role_id IN (SELECT id FROM roles WHERE name IN ('admin', 'manager'))
    AND comp.expires_at BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '30 days'
    AND comp.result IN ('passed', 'attended')
    GROUP BY mgr.id, mgr.email, mgr.organisation_id
    HAVING COUNT(comp.id) >= 1
  `);
  
  for (const row of result.rows) {
    try {
      await notificationTriggers.triggerNotification({
        type: 'training_team_expiring',
        userId: row.manager_id,
        organisationId: row.organisation_id,
        data: {
          expiringCount: row.expiring_count,
          periodDays: 30
        }
      });
    } catch (err) {
      console.error(`[TrainingExpiryJob] Failed to notify manager ${row.manager_id}:`, err.message);
    }
  }
};

module.exports = {
  runTrainingExpiryCheck
};

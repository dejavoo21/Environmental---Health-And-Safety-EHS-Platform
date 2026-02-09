/**
 * Training Analytics Aggregation Job - Phase 8
 * Aggregates training metrics into analytics_daily_summary
 * Scheduled to run at 03:00 UTC daily
 */

const { query, withTransaction } = require('../config/db');

/**
 * Run the training analytics aggregation job
 */
const runTrainingAnalyticsAggregation = async () => {
  console.log('[TrainingAnalyticsJob] Starting training analytics aggregation...');
  const startTime = Date.now();
  
  let organisationsProcessed = 0;
  let recordsCreated = 0;
  
  try {
    // Get all active organisations
    const orgsResult = await query(`
      SELECT id FROM organisations WHERE is_active = true
    `);
    
    for (const org of orgsResult.rows) {
      const result = await aggregateOrganisationTrainingMetrics(org.id);
      organisationsProcessed++;
      if (result) recordsCreated++;
    }
    
    const duration = Date.now() - startTime;
    console.log(`[TrainingAnalyticsJob] Completed in ${duration}ms. Orgs: ${organisationsProcessed}, Records: ${recordsCreated}`);
    
    return { organisationsProcessed, recordsCreated, duration };
  } catch (error) {
    console.error('[TrainingAnalyticsJob] Job failed:', error.message);
    throw error;
  }
};

/**
 * Aggregate training metrics for a single organisation
 */
const aggregateOrganisationTrainingMetrics = async (organisationId) => {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const dateStr = yesterday.toISOString().split('T')[0];
  
  try {
    // Get training metrics for yesterday
    const metricsResult = await query(`
      SELECT 
        COUNT(*) as completions_count,
        COUNT(DISTINCT user_id) as users_trained,
        COUNT(DISTINCT course_id) as courses_completed,
        AVG(CASE WHEN score IS NOT NULL THEN score END) as avg_score
      FROM training_completions
      WHERE organisation_id = $1
      AND completion_date = $2
    `, [organisationId, dateStr]);
    
    const sessionsResult = await query(`
      SELECT 
        COUNT(*) FILTER (WHERE status = 'scheduled') as scheduled_sessions,
        COUNT(*) FILTER (WHERE status = 'completed') as completed_sessions,
        COUNT(*) FILTER (WHERE status = 'cancelled') as cancelled_sessions
      FROM training_sessions
      WHERE organisation_id = $1
      AND (session_date = $2 OR (status = 'completed' AND updated_at::date = $2))
    `, [organisationId, dateStr]);
    
    const assignmentsResult = await query(`
      SELECT 
        COUNT(*) FILTER (WHERE assigned_date::date = $2) as new_assignments,
        COUNT(*) FILTER (WHERE status = 'assigned' AND due_date < $2) as overdue_assignments
      FROM training_assignments
      WHERE organisation_id = $1
    `, [organisationId, dateStr]);
    
    const expiryResult = await query(`
      SELECT 
        COUNT(*) FILTER (WHERE expires_at = $2) as expired_today,
        COUNT(*) FILTER (WHERE expires_at BETWEEN $2 AND $2::date + INTERVAL '30 days') as expiring_30_days
      FROM training_completions
      WHERE organisation_id = $1
      AND result IN ('passed', 'attended')
    `, [organisationId, dateStr]);
    
    // Calculate compliance rate
    const complianceResult = await query(`
      WITH required_training AS (
        SELECT u.id as user_id, c.id as course_id
        FROM users u
        CROSS JOIN training_courses c
        WHERE u.organisation_id = $1 AND c.organisation_id = $1
        AND u.is_active = true AND c.status = 'active'
        AND (c.is_mandatory = true 
             OR EXISTS (SELECT 1 FROM training_role_requirements rr WHERE rr.role_id = u.role_id AND rr.course_id = c.id)
             OR EXISTS (SELECT 1 FROM training_site_requirements sr WHERE sr.site_id = u.site_id AND sr.course_id = c.id))
      ),
      completed_training AS (
        SELECT DISTINCT user_id, course_id
        FROM training_completions
        WHERE organisation_id = $1
        AND result IN ('passed', 'attended')
        AND (expires_at IS NULL OR expires_at > CURRENT_DATE)
      )
      SELECT 
        COUNT(*) as total_required,
        COUNT(ct.user_id) as total_completed
      FROM required_training rt
      LEFT JOIN completed_training ct ON rt.user_id = ct.user_id AND rt.course_id = ct.course_id
    `, [organisationId]);
    
    const totalRequired = parseInt(complianceResult.rows[0].total_required, 10) || 0;
    const totalCompleted = parseInt(complianceResult.rows[0].total_completed, 10) || 0;
    const complianceRate = totalRequired > 0 ? Math.round((totalCompleted / totalRequired) * 100) : 100;
    
    const metrics = metricsResult.rows[0];
    const sessions = sessionsResult.rows[0];
    const assignments = assignmentsResult.rows[0];
    const expiry = expiryResult.rows[0];
    
    // Build training metrics JSON
    const trainingMetrics = {
      completions: parseInt(metrics.completions_count, 10) || 0,
      usersTrained: parseInt(metrics.users_trained, 10) || 0,
      coursesCompleted: parseInt(metrics.courses_completed, 10) || 0,
      avgScore: parseFloat(metrics.avg_score) || null,
      scheduledSessions: parseInt(sessions.scheduled_sessions, 10) || 0,
      completedSessions: parseInt(sessions.completed_sessions, 10) || 0,
      cancelledSessions: parseInt(sessions.cancelled_sessions, 10) || 0,
      newAssignments: parseInt(assignments.new_assignments, 10) || 0,
      overdueAssignments: parseInt(assignments.overdue_assignments, 10) || 0,
      expiredToday: parseInt(expiry.expired_today, 10) || 0,
      expiring30Days: parseInt(expiry.expiring_30_days, 10) || 0,
      complianceRate
    };
    
    // Check if analytics_daily_summary has training columns, update accordingly
    await query(`
      INSERT INTO analytics_daily_summary 
      (organisation_id, summary_date, training_completions_count, training_compliance_rate)
      VALUES ($1, $2, $3, $4)
      ON CONFLICT (organisation_id, summary_date) 
      DO UPDATE SET 
        training_completions_count = $3,
        training_compliance_rate = $4,
        updated_at = NOW()
    `, [organisationId, dateStr, trainingMetrics.completions, complianceRate]);
    
    return trainingMetrics;
  } catch (err) {
    console.error(`[TrainingAnalyticsJob] Failed for org ${organisationId}:`, err.message);
    return null;
  }
};

module.exports = {
  runTrainingAnalyticsAggregation
};

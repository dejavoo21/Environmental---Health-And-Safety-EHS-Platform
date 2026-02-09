/**
 * Training Auto-Assignment Job - Phase 8
 * Automatically assigns training based on rules (role/site requirements)
 * Scheduled to run at 02:00 UTC daily
 */

const { query, withTransaction } = require('../config/db');
const notificationTriggers = require('../services/notificationTriggers');

/**
 * Run the training auto-assignment job
 */
const runTrainingAutoAssignment = async () => {
  console.log('[TrainingAutoAssignmentJob] Starting auto-assignment...');
  const startTime = Date.now();
  
  let rulesProcessed = 0;
  let assignmentsCreated = 0;
  let usersAffected = 0;
  
  try {
    // Get all active assignment rules
    const rulesResult = await query(`
      SELECT r.*, c.title as course_title
      FROM training_assignment_rules r
      JOIN training_courses c ON r.course_id = c.id
      WHERE r.is_active = true
    `);
    
    for (const rule of rulesResult.rows) {
      const result = await processAssignmentRule(rule);
      rulesProcessed++;
      assignmentsCreated += result.assignmentsCreated;
      usersAffected += result.usersAffected;
      
      // Update rule stats
      await query(`
        UPDATE training_assignment_rules 
        SET last_run_at = NOW(), 
            users_assigned_count = users_assigned_count + $1
        WHERE id = $2
      `, [result.assignmentsCreated, rule.id]);
    }
    
    // Also process role-based requirements for new users
    const roleAssignments = await processRoleRequirements();
    assignmentsCreated += roleAssignments.count;
    
    // Process site-based requirements for users at specific sites
    const siteAssignments = await processSiteRequirements();
    assignmentsCreated += siteAssignments.count;
    
    const duration = Date.now() - startTime;
    console.log(`[TrainingAutoAssignmentJob] Completed in ${duration}ms. Rules: ${rulesProcessed}, Assignments: ${assignmentsCreated}`);
    
    return { rulesProcessed, assignmentsCreated, usersAffected, duration };
  } catch (error) {
    console.error('[TrainingAutoAssignmentJob] Job failed:', error.message);
    throw error;
  }
};

/**
 * Process a single assignment rule
 */
const processAssignmentRule = async (rule) => {
  let assignmentsCreated = 0;
  let usersAffected = 0;
  
  const criteria = typeof rule.criteria === 'string' ? JSON.parse(rule.criteria) : rule.criteria;
  
  // Build user query based on criteria
  const conditions = ['u.organisation_id = $1', 'u.is_active = true'];
  const values = [rule.organisation_id];
  let paramIndex = 1;
  
  if (criteria.roleIds && criteria.roleIds.length > 0) {
    paramIndex++;
    conditions.push(`u.role_id = ANY($${paramIndex})`);
    values.push(criteria.roleIds);
  }
  
  if (criteria.siteIds && criteria.siteIds.length > 0) {
    paramIndex++;
    conditions.push(`u.site_id = ANY($${paramIndex})`);
    values.push(criteria.siteIds);
  }
  
  if (criteria.departmentIds && criteria.departmentIds.length > 0) {
    paramIndex++;
    conditions.push(`u.department_id = ANY($${paramIndex})`);
    values.push(criteria.departmentIds);
  }
  
  // For onboarding trigger, find users created in last 24 hours
  if (rule.trigger_type === 'onboarding') {
    conditions.push(`u.created_at >= NOW() - INTERVAL '24 hours'`);
  }
  
  // Find users matching criteria who don't have active assignment for this course
  const usersResult = await query(`
    SELECT u.id, u.email, u.full_name
    FROM users u
    WHERE ${conditions.join(' AND ')}
    AND NOT EXISTS (
      SELECT 1 FROM training_assignments a 
      WHERE a.user_id = u.id 
      AND a.course_id = $${paramIndex + 1}
      AND a.status NOT IN ('completed', 'cancelled')
    )
    AND NOT EXISTS (
      SELECT 1 FROM training_completions c
      WHERE c.user_id = u.id
      AND c.course_id = $${paramIndex + 1}
      AND (c.expires_at IS NULL OR c.expires_at > CURRENT_DATE)
      AND c.result IN ('passed', 'attended')
    )
  `, [...values, rule.course_id]);
  
  // Calculate due date
  const dueDate = new Date();
  dueDate.setDate(dueDate.getDate() + (rule.days_to_complete || 30));
  
  await withTransaction(async (client) => {
    for (const user of usersResult.rows) {
      await client.query(`
        INSERT INTO training_assignments 
        (organisation_id, user_id, course_id, assigned_by, due_date, priority, reason)
        VALUES ($1, $2, $3, NULL, $4, $5, $6)
      `, [rule.organisation_id, user.id, rule.course_id, dueDate, rule.priority, 'auto_rule']);
      
      assignmentsCreated++;
      usersAffected++;
      
      // Send notification
      try {
        await notificationTriggers.triggerNotification({
          type: 'training_assigned',
          userId: user.id,
          organisationId: rule.organisation_id,
          data: {
            courseTitle: rule.course_title,
            dueDate: dueDate.toISOString().split('T')[0],
            priority: rule.priority,
            reason: 'Automatic assignment based on organizational requirements'
          }
        });
      } catch (err) {
        console.error(`[TrainingAutoAssignmentJob] Failed to notify user ${user.id}:`, err.message);
      }
    }
  });
  
  return { assignmentsCreated, usersAffected };
};

/**
 * Process role-based requirements
 * Assigns required training to users based on their role
 */
const processRoleRequirements = async () => {
  let count = 0;
  
  // Find users missing required role-based training
  const result = await query(`
    SELECT u.id as user_id, u.organisation_id, u.email,
           rr.course_id, c.title as course_title
    FROM users u
    JOIN training_role_requirements rr ON rr.role_id = u.role_id AND rr.organisation_id = u.organisation_id
    JOIN training_courses c ON rr.course_id = c.id
    WHERE u.is_active = true
    AND rr.is_required = true
    AND NOT EXISTS (
      SELECT 1 FROM training_assignments a 
      WHERE a.user_id = u.id 
      AND a.course_id = rr.course_id
      AND a.status NOT IN ('completed', 'cancelled')
    )
    AND NOT EXISTS (
      SELECT 1 FROM training_completions comp
      WHERE comp.user_id = u.id
      AND comp.course_id = rr.course_id
      AND (comp.expires_at IS NULL OR comp.expires_at > CURRENT_DATE)
      AND comp.result IN ('passed', 'attended')
    )
  `);
  
  const dueDate = new Date();
  dueDate.setDate(dueDate.getDate() + 30); // Default 30 days for role requirements
  
  for (const row of result.rows) {
    try {
      await query(`
        INSERT INTO training_assignments 
        (organisation_id, user_id, course_id, due_date, priority, reason)
        VALUES ($1, $2, $3, $4, 'normal', 'role_requirement')
        ON CONFLICT DO NOTHING
      `, [row.organisation_id, row.user_id, row.course_id, dueDate]);
      
      count++;
    } catch (err) {
      console.error(`[TrainingAutoAssignmentJob] Failed to create role assignment:`, err.message);
    }
  }
  
  console.log(`[TrainingAutoAssignmentJob] Created ${count} role-based assignments`);
  return { count };
};

/**
 * Process site-based requirements
 * Assigns required training to users based on their site
 */
const processSiteRequirements = async () => {
  let count = 0;
  
  // Find users missing required site-based training
  const result = await query(`
    SELECT u.id as user_id, u.organisation_id, u.email,
           sr.course_id, c.title as course_title
    FROM users u
    JOIN training_site_requirements sr ON sr.site_id = u.site_id AND sr.organisation_id = u.organisation_id
    JOIN training_courses c ON sr.course_id = c.id
    WHERE u.is_active = true
    AND sr.is_required = true
    AND NOT EXISTS (
      SELECT 1 FROM training_assignments a 
      WHERE a.user_id = u.id 
      AND a.course_id = sr.course_id
      AND a.status NOT IN ('completed', 'cancelled')
    )
    AND NOT EXISTS (
      SELECT 1 FROM training_completions comp
      WHERE comp.user_id = u.id
      AND comp.course_id = sr.course_id
      AND (comp.expires_at IS NULL OR comp.expires_at > CURRENT_DATE)
      AND comp.result IN ('passed', 'attended')
    )
  `);
  
  const dueDate = new Date();
  dueDate.setDate(dueDate.getDate() + 30); // Default 30 days for site requirements
  
  for (const row of result.rows) {
    try {
      await query(`
        INSERT INTO training_assignments 
        (organisation_id, user_id, course_id, due_date, priority, reason)
        VALUES ($1, $2, $3, $4, 'normal', 'site_requirement')
        ON CONFLICT DO NOTHING
      `, [row.organisation_id, row.user_id, row.course_id, dueDate]);
      
      count++;
    } catch (err) {
      console.error(`[TrainingAutoAssignmentJob] Failed to create site assignment:`, err.message);
    }
  }
  
  console.log(`[TrainingAutoAssignmentJob] Created ${count} site-based assignments`);
  return { count };
};

module.exports = {
  runTrainingAutoAssignment
};

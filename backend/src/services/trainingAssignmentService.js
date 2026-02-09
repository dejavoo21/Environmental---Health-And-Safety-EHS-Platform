/**
 * TrainingAssignmentService - Phase 8
 * Handles training assignments and assignment rules
 */

const { query, withTransaction } = require('../config/db');
const { AppError } = require('../utils/appError');
const { recordAudit } = require('../utils/audit');
const notificationTriggers = require('./notificationTriggers');

/**
 * List assignments with filters
 */
const listAssignments = async (organisationId, options = {}) => {
  const {
    userId,
    courseId,
    status,
    assignedBy,
    dueSoon,
    overdue,
    page = 1,
    limit = 20
  } = options;
  
  const conditions = ['a.organisation_id = $1'];
  const values = [organisationId];
  let paramIndex = 1;
  
  if (userId) {
    paramIndex++;
    conditions.push(`a.user_id = $${paramIndex}`);
    values.push(userId);
  }
  
  if (courseId) {
    paramIndex++;
    conditions.push(`a.course_id = $${paramIndex}`);
    values.push(courseId);
  }
  
  if (status) {
    if (Array.isArray(status)) {
      paramIndex++;
      conditions.push(`a.status = ANY($${paramIndex})`);
      values.push(status);
    } else {
      paramIndex++;
      conditions.push(`a.status = $${paramIndex}`);
      values.push(status);
    }
  }
  
  if (assignedBy) {
    paramIndex++;
    conditions.push(`a.assigned_by = $${paramIndex}`);
    values.push(assignedBy);
  }
  
  if (dueSoon) {
    conditions.push(`a.due_date <= CURRENT_DATE + INTERVAL '7 days' AND a.due_date >= CURRENT_DATE`);
  }
  
  if (overdue) {
    conditions.push(`a.due_date < CURRENT_DATE AND a.status NOT IN ('completed', 'cancelled')`);
  }
  
  const whereClause = conditions.join(' AND ');
  
  // Count
  const countResult = await query(
    `SELECT COUNT(*) FROM training_assignments a WHERE ${whereClause}`,
    values
  );
  const totalItems = parseInt(countResult.rows[0].count, 10);
  
  // Main query
  const offset = (page - 1) * limit;
  const sql = `
    SELECT a.*,
           u.full_name as user_name, u.email as user_email,
           c.code as course_code, c.title as course_title, c.delivery_method,
           ab.full_name as assigned_by_name
    FROM training_assignments a
    JOIN users u ON a.user_id = u.id
    JOIN training_courses c ON a.course_id = c.id
    LEFT JOIN users ab ON a.assigned_by = ab.id
    WHERE ${whereClause}
    ORDER BY 
      CASE WHEN a.status = 'assigned' AND a.due_date < CURRENT_DATE THEN 0 ELSE 1 END,
      a.due_date
    LIMIT $${paramIndex + 1} OFFSET $${paramIndex + 2}
  `;
  
  const result = await query(sql, [...values, limit, offset]);
  
  return {
    assignments: result.rows.map(mapAssignmentRow),
    pagination: {
      page,
      limit,
      totalItems,
      totalPages: Math.ceil(totalItems / limit)
    }
  };
};

/**
 * Get assignment by ID
 */
const getAssignmentById = async (assignmentId, organisationId) => {
  const result = await query(
    `SELECT a.*,
            u.full_name as user_name, u.email as user_email,
            c.code as course_code, c.title as course_title, c.delivery_method, c.estimated_duration_hours,
            ab.full_name as assigned_by_name,
            comp.id as completion_id, comp.completion_date, comp.result, comp.expires_at
     FROM training_assignments a
     JOIN users u ON a.user_id = u.id
     JOIN training_courses c ON a.course_id = c.id
     LEFT JOIN users ab ON a.assigned_by = ab.id
     LEFT JOIN training_completions comp ON a.completion_id = comp.id
     WHERE a.id = $1 AND a.organisation_id = $2`,
    [assignmentId, organisationId]
  );
  
  if (result.rows.length === 0) {
    throw new AppError('Assignment not found', 404, 'NOT_FOUND');
  }
  
  return mapAssignmentDetailRow(result.rows[0]);
};

/**
 * Assign training to users
 */
const assignTraining = async (organisationId, data, assignedBy) => {
  const { courseId, userIds, dueDate, priority = 'normal', notes, reason = 'manual' } = data;
  
  // Verify course exists
  const courseResult = await query(
    `SELECT id, title, status FROM training_courses WHERE id = $1 AND organisation_id = $2`,
    [courseId, organisationId]
  );
  
  if (courseResult.rows.length === 0) {
    throw new AppError('Course not found', 404, 'NOT_FOUND');
  }
  
  const course = courseResult.rows[0];
  if (course.status !== 'active') {
    throw new AppError('Course is not active', 400, 'INVALID_COURSE');
  }
  
  const assignments = [];
  const skipped = [];
  
  await withTransaction(async (client) => {
    for (const userId of userIds) {
      // Check for existing active assignment
      const existing = await client.query(
        `SELECT id, status FROM training_assignments 
         WHERE user_id = $1 AND course_id = $2 AND status NOT IN ('completed', 'cancelled')`,
        [userId, courseId]
      );
      
      if (existing.rows.length > 0) {
        skipped.push({ userId, reason: 'already_assigned', existingId: existing.rows[0].id });
        continue;
      }
      
      const result = await client.query(
        `INSERT INTO training_assignments 
         (organisation_id, user_id, course_id, assigned_by, due_date, priority, notes, reason)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         RETURNING id`,
        [organisationId, userId, courseId, assignedBy, dueDate, priority, notes, reason]
      );
      
      assignments.push({
        id: result.rows[0].id,
        userId,
        courseId,
        dueDate,
        priority,
        status: 'assigned'
      });
      
      // Send notification
      try {
        await notificationTriggers.triggerNotification({
          type: 'training_assigned',
          userId,
          organisationId,
          data: {
            assignmentId: result.rows[0].id,
            courseTitle: course.title,
            dueDate,
            priority
          }
        });
      } catch (err) {
        console.error('Failed to send assignment notification:', err);
      }
    }
  });
  
  await recordAudit(assignedBy, 'training_assignment', null, 'bulk_assigned', null, { courseId, assignedCount: assignments.length, skippedCount: skipped.length }, null);
  
  return {
    assigned: assignments,
    skipped,
    totalAssigned: assignments.length,
    totalSkipped: skipped.length
  };
};

/**
 * Update assignment
 */
const updateAssignment = async (assignmentId, organisationId, data, userId) => {
  const existing = await getAssignmentById(assignmentId, organisationId);
  
  if (existing.status === 'completed' || existing.status === 'cancelled') {
    throw new AppError('Cannot update completed or cancelled assignment', 403, 'FORBIDDEN');
  }
  
  const { dueDate, priority, notes, status } = data;
  
  await query(
    `UPDATE training_assignments SET
       due_date = COALESCE($1, due_date),
       priority = COALESCE($2, priority),
       notes = COALESCE($3, notes),
       status = COALESCE($4, status)
     WHERE id = $5`,
    [dueDate, priority, notes, status, assignmentId]
  );
  
  const updated = await getAssignmentById(assignmentId, organisationId);
  
  await recordAudit(userId, 'training_assignment', assignmentId, 'updated', existing, updated, null);
  
  return updated;
};

/**
 * Cancel assignment
 */
const cancelAssignment = async (assignmentId, organisationId, reason, userId) => {
  const existing = await getAssignmentById(assignmentId, organisationId);
  
  if (existing.status === 'completed') {
    throw new AppError('Cannot cancel completed assignment', 403, 'FORBIDDEN');
  }
  
  await query(
    `UPDATE training_assignments SET status = 'cancelled' WHERE id = $1`,
    [assignmentId]
  );
  
  await recordAudit(userId, 'training_assignment', assignmentId, 'cancelled', { status: existing.status }, { status: 'cancelled', reason }, null);
  
  return { ...existing, status: 'cancelled' };
};

/**
 * Get user's training assignments (My Training)
 */
const getMyTraining = async (userId, organisationId) => {
  // Get active assignments
  const assignedResult = await query(
    `SELECT a.*, 
            c.code as course_code, c.title as course_title, c.delivery_method,
            c.estimated_duration_hours
     FROM training_assignments a
     JOIN training_courses c ON a.course_id = c.id
     WHERE a.user_id = $1 AND a.organisation_id = $2 
     AND a.status NOT IN ('completed', 'cancelled')
     ORDER BY 
       CASE WHEN a.due_date < CURRENT_DATE THEN 0 ELSE 1 END,
       a.due_date`,
    [userId, organisationId]
  );
  
  // Get upcoming sessions user is enrolled in
  const sessionsResult = await query(
    `SELECT s.*, e.status as enrollment_status,
            c.code as course_code, c.title as course_title,
            site.name as site_name,
            t.full_name as trainer_name
     FROM training_session_enrollments e
     JOIN training_sessions s ON e.session_id = s.id
     JOIN training_courses c ON s.course_id = c.id
     LEFT JOIN sites site ON s.site_id = site.id
     LEFT JOIN users t ON s.trainer_id = t.id
     WHERE e.user_id = $1 AND s.organisation_id = $2
     AND s.session_date >= CURRENT_DATE
     AND e.status = 'enrolled'
     ORDER BY s.session_date`,
    [userId, organisationId]
  );
  
  // Get recent completions
  const completionsResult = await query(
    `SELECT comp.*,
            c.code as course_code, c.title as course_title
     FROM training_completions comp
     JOIN training_courses c ON comp.course_id = c.id
     WHERE comp.user_id = $1 AND comp.organisation_id = $2
     ORDER BY comp.completion_date DESC
     LIMIT 10`,
    [userId, organisationId]
  );
  
  return {
    assigned: assignedResult.rows.map(row => ({
      id: row.id,
      course: {
        id: row.course_id,
        code: row.course_code,
        title: row.course_title,
        deliveryMethod: row.delivery_method,
        estimatedDurationHours: row.estimated_duration_hours
      },
      dueDate: row.due_date,
      priority: row.priority,
      status: row.status,
      isOverdue: new Date(row.due_date) < new Date(),
      daysUntilDue: Math.ceil((new Date(row.due_date) - new Date()) / (1000 * 60 * 60 * 24))
    })),
    upcomingSessions: sessionsResult.rows.map(row => ({
      sessionId: row.id,
      course: {
        id: row.course_id,
        code: row.course_code,
        title: row.course_title
      },
      site: row.site_name ? { id: row.site_id, name: row.site_name } : null,
      trainer: row.trainer_name ? { id: row.trainer_id, fullName: row.trainer_name } : null,
      sessionDate: row.session_date,
      startTime: row.start_time,
      endTime: row.end_time,
      virtualLink: row.virtual_link,
      enrollmentStatus: row.enrollment_status
    })),
    recentCompletions: completionsResult.rows.map(row => ({
      id: row.id,
      course: {
        id: row.course_id,
        code: row.course_code,
        title: row.course_title
      },
      completionDate: row.completion_date,
      result: row.result,
      score: row.score,
      expiresAt: row.expires_at,
      isExpired: row.expires_at && new Date(row.expires_at) < new Date(),
      isExpiringSoon: row.expires_at && new Date(row.expires_at) < new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
    })),
    summary: {
      overdueCount: assignedResult.rows.filter(r => new Date(r.due_date) < new Date()).length,
      dueSoonCount: assignedResult.rows.filter(r => {
        const due = new Date(r.due_date);
        return due >= new Date() && due <= new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
      }).length,
      totalAssigned: assignedResult.rows.length,
      upcomingSessionCount: sessionsResult.rows.length
    }
  };
};

/**
 * List assignment rules
 */
const listAssignmentRules = async (organisationId, options = {}) => {
  const { isActive, page = 1, limit = 20 } = options;
  
  const conditions = ['organisation_id = $1'];
  const values = [organisationId];
  
  if (isActive !== undefined) {
    conditions.push(`is_active = $2`);
    values.push(isActive);
  }
  
  const countResult = await query(
    `SELECT COUNT(*) FROM training_assignment_rules WHERE ${conditions.join(' AND ')}`,
    values
  );
  
  const offset = (page - 1) * limit;
  const result = await query(
    `SELECT r.*, c.code as course_code, c.title as course_title
     FROM training_assignment_rules r
     JOIN training_courses c ON r.course_id = c.id
     WHERE ${conditions.join(' AND ')}
     ORDER BY r.created_at DESC
     LIMIT $${values.length + 1} OFFSET $${values.length + 2}`,
    [...values, limit, offset]
  );
  
  return {
    rules: result.rows.map(row => ({
      id: row.id,
      name: row.rule_name,
      course: {
        id: row.course_id,
        code: row.course_code,
        title: row.course_title
      },
      triggerType: row.trigger_type,
      criteria: row.criteria,
      daysToComplete: row.days_to_complete,
      priority: row.priority,
      isActive: row.is_active,
      lastRun: row.last_run_at,
      usersAssigned: row.users_assigned_count
    })),
    pagination: {
      page,
      limit,
      totalItems: parseInt(countResult.rows[0].count, 10),
      totalPages: Math.ceil(parseInt(countResult.rows[0].count, 10) / limit)
    }
  };
};

/**
 * Create assignment rule
 */
const createAssignmentRule = async (organisationId, data, userId) => {
  const { ruleName, courseId, triggerType, criteria, daysToComplete, priority = 'normal' } = data;
  
  const result = await query(
    `INSERT INTO training_assignment_rules 
     (organisation_id, rule_name, course_id, trigger_type, criteria, days_to_complete, priority, created_by)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     RETURNING *`,
    [organisationId, ruleName, courseId, triggerType, JSON.stringify(criteria), daysToComplete, priority, userId]
  );
  
  await recordAudit(userId, 'training_assignment_rule', result.rows[0].id, 'created', null, result.rows[0], null);
  
  return result.rows[0];
};

const mapAssignmentRow = (row) => ({
  id: row.id,
  user: {
    id: row.user_id,
    fullName: row.user_name,
    email: row.user_email
  },
  course: {
    id: row.course_id,
    code: row.course_code,
    title: row.course_title,
    deliveryMethod: row.delivery_method
  },
  assignedBy: row.assigned_by_name ? {
    id: row.assigned_by,
    fullName: row.assigned_by_name
  } : null,
  dueDate: row.due_date,
  priority: row.priority,
  status: row.status,
  assignedDate: row.assigned_date,
  isOverdue: row.due_date && new Date(row.due_date) < new Date() && row.status !== 'completed' && row.status !== 'cancelled'
});

const mapAssignmentDetailRow = (row) => ({
  ...mapAssignmentRow(row),
  notes: row.notes,
  reason: row.reason,
  completion: row.completion_id ? {
    id: row.completion_id,
    completionDate: row.completion_date,
    result: row.result,
    expiresAt: row.expires_at
  } : null,
  estimatedDurationHours: row.estimated_duration_hours,
  createdAt: row.created_at,
  updatedAt: row.updated_at
});

module.exports = {
  listAssignments,
  getAssignmentById,
  assignTraining,
  updateAssignment,
  cancelAssignment,
  getMyTraining,
  listAssignmentRules,
  createAssignmentRule
};

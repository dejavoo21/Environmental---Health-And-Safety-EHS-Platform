/**
 * TrainingSessionService - Phase 8
 * Handles training sessions and enrollments
 */

const { query, withTransaction } = require('../config/db');
const { AppError } = require('../utils/appError');
const { recordAudit } = require('../utils/audit');
const notificationTriggers = require('./notificationTriggers');

/**
 * List sessions with filters
 */
const listSessions = async (organisationId, options = {}) => {
  const {
    courseId,
    siteId,
    trainerId,
    status,
    fromDate,
    toDate,
    page = 1,
    limit = 20
  } = options;
  
  const conditions = ['s.organisation_id = $1'];
  const values = [organisationId];
  let paramIndex = 1;
  
  if (courseId) {
    paramIndex++;
    conditions.push(`s.course_id = $${paramIndex}`);
    values.push(courseId);
  }
  
  if (siteId) {
    paramIndex++;
    conditions.push(`s.site_id = $${paramIndex}`);
    values.push(siteId);
  }
  
  if (trainerId) {
    paramIndex++;
    conditions.push(`s.trainer_id = $${paramIndex}`);
    values.push(trainerId);
  }
  
  if (status) {
    paramIndex++;
    conditions.push(`s.status = $${paramIndex}`);
    values.push(status);
  }
  
  if (fromDate) {
    paramIndex++;
    conditions.push(`s.session_date >= $${paramIndex}`);
    values.push(fromDate);
  }
  
  if (toDate) {
    paramIndex++;
    conditions.push(`s.session_date <= $${paramIndex}`);
    values.push(toDate);
  }
  
  const whereClause = conditions.join(' AND ');
  
  // Count
  const countResult = await query(
    `SELECT COUNT(*) FROM training_sessions s WHERE ${whereClause}`,
    values
  );
  const totalItems = parseInt(countResult.rows[0].count, 10);
  
  // Main query
  const offset = (page - 1) * limit;
  const sql = `
    SELECT s.*,
           c.code as course_code, c.title as course_title,
           site.name as site_name,
           t.full_name as trainer_name,
           (SELECT COUNT(*) FROM training_session_enrollments e WHERE e.session_id = s.id AND e.status = 'enrolled') as enrolled_count,
           (SELECT COUNT(*) FROM training_session_enrollments e WHERE e.session_id = s.id AND e.status = 'waitlisted') as waitlist_count
    FROM training_sessions s
    LEFT JOIN training_courses c ON s.course_id = c.id
    LEFT JOIN sites site ON s.site_id = site.id
    LEFT JOIN users t ON s.trainer_id = t.id
    WHERE ${whereClause}
    ORDER BY s.session_date, s.start_time
    LIMIT $${paramIndex + 1} OFFSET $${paramIndex + 2}
  `;
  
  const result = await query(sql, [...values, limit, offset]);
  
  return {
    sessions: result.rows.map(mapSessionRow),
    pagination: {
      page,
      limit,
      totalItems,
      totalPages: Math.ceil(totalItems / limit)
    }
  };
};

/**
 * Get session by ID with enrollments
 */
const getSessionById = async (sessionId, organisationId) => {
  const result = await query(
    `SELECT s.*,
            c.code as course_code, c.title as course_title, c.validity_months,
            site.name as site_name,
            t.full_name as trainer_name,
            cb.full_name as created_by_name
     FROM training_sessions s
     LEFT JOIN training_courses c ON s.course_id = c.id
     LEFT JOIN sites site ON s.site_id = site.id
     LEFT JOIN users t ON s.trainer_id = t.id
     LEFT JOIN users cb ON s.created_by = cb.id
     WHERE s.id = $1 AND s.organisation_id = $2`,
    [sessionId, organisationId]
  );
  
  if (result.rows.length === 0) {
    throw new AppError('Session not found', 404, 'NOT_FOUND');
  }
  
  const session = mapSessionDetailRow(result.rows[0]);
  
  // Get enrollments
  const enrollResult = await query(
    `SELECT e.*, u.full_name as user_name, u.email as user_email,
            eb.full_name as enrolled_by_name
     FROM training_session_enrollments e
     JOIN users u ON e.user_id = u.id
     LEFT JOIN users eb ON e.enrolled_by = eb.id
     WHERE e.session_id = $1
     ORDER BY e.enrollment_date`,
    [sessionId]
  );
  
  session.enrollments = enrollResult.rows.map(row => ({
    id: row.id,
    user: {
      id: row.user_id,
      fullName: row.user_name,
      email: row.user_email
    },
    enrolledBy: {
      id: row.enrolled_by,
      fullName: row.enrolled_by_name
    },
    enrollmentDate: row.enrollment_date,
    status: row.status,
    attendanceStatus: row.attendance_status,
    notes: row.notes
  }));
  
  session.summary = {
    enrolled: session.enrollments.filter(e => e.status === 'enrolled').length,
    waitlisted: session.enrollments.filter(e => e.status === 'waitlisted').length,
    cancelled: session.enrollments.filter(e => e.status === 'cancelled').length,
    capacity: session.maxParticipants,
    availableSpots: Math.max(0, session.maxParticipants - session.enrollments.filter(e => e.status === 'enrolled').length)
  };
  
  return session;
};

/**
 * Create a training session
 */
const createSession = async (organisationId, data, userId) => {
  const {
    courseId,
    siteId,
    locationDetail,
    trainerId,
    externalTrainerName,
    externalTrainerOrg,
    sessionDate,
    startTime,
    endTime,
    virtualLink,
    maxParticipants = 20,
    minParticipants = 1,
    enrollmentDeadline,
    notes
  } = data;
  
  const result = await query(
    `INSERT INTO training_sessions 
     (organisation_id, course_id, site_id, location_detail, trainer_id,
      external_trainer_name, external_trainer_org, session_date, start_time, end_time,
      virtual_link, max_participants, min_participants, enrollment_deadline, notes, created_by)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
     RETURNING *`,
    [organisationId, courseId, siteId, locationDetail, trainerId,
     externalTrainerName, externalTrainerOrg, sessionDate, startTime, endTime,
     virtualLink, maxParticipants, minParticipants, enrollmentDeadline, notes, userId]
  );
  
  const session = await getSessionById(result.rows[0].id, organisationId);
  
  await recordAudit(userId, 'training_session', session.id, 'created', null, session, null);
  
  return session;
};

/**
 * Update a session
 */
const updateSession = async (sessionId, organisationId, data, userId) => {
  const existing = await getSessionById(sessionId, organisationId);
  
  if (existing.status === 'completed' || existing.status === 'cancelled') {
    throw new AppError('Cannot modify completed or cancelled session', 403, 'FORBIDDEN');
  }
  
  const {
    siteId,
    locationDetail,
    trainerId,
    externalTrainerName,
    externalTrainerOrg,
    sessionDate,
    startTime,
    endTime,
    virtualLink,
    maxParticipants,
    minParticipants,
    enrollmentDeadline,
    notes,
    status
  } = data;
  
  await query(
    `UPDATE training_sessions SET
       site_id = COALESCE($1, site_id),
       location_detail = COALESCE($2, location_detail),
       trainer_id = COALESCE($3, trainer_id),
       external_trainer_name = COALESCE($4, external_trainer_name),
       external_trainer_org = COALESCE($5, external_trainer_org),
       session_date = COALESCE($6, session_date),
       start_time = COALESCE($7, start_time),
       end_time = COALESCE($8, end_time),
       virtual_link = COALESCE($9, virtual_link),
       max_participants = COALESCE($10, max_participants),
       min_participants = COALESCE($11, min_participants),
       enrollment_deadline = COALESCE($12, enrollment_deadline),
       notes = COALESCE($13, notes),
       status = COALESCE($14, status)
     WHERE id = $15`,
    [siteId, locationDetail, trainerId, externalTrainerName, externalTrainerOrg,
     sessionDate, startTime, endTime, virtualLink, maxParticipants, minParticipants,
     enrollmentDeadline, notes, status, sessionId]
  );
  
  const updated = await getSessionById(sessionId, organisationId);
  
  await recordAudit(userId, 'training_session', sessionId, 'updated', existing, updated, null);
  
  return updated;
};

/**
 * Cancel a session
 */
const cancelSession = async (sessionId, organisationId, reason, userId) => {
  const existing = await getSessionById(sessionId, organisationId);
  
  if (existing.status === 'completed') {
    throw new AppError('Cannot cancel completed session', 403, 'FORBIDDEN');
  }
  
  await query(
    `UPDATE training_sessions 
     SET status = 'cancelled', cancelled_reason = $1
     WHERE id = $2`,
    [reason, sessionId]
  );
  
  // Notify enrolled users
  const enrolledUsers = existing.enrollments.filter(e => e.status === 'enrolled');
  for (const enrollment of enrolledUsers) {
    try {
      await notificationTriggers.triggerNotification({
        type: 'training_session_cancelled',
        userId: enrollment.user.id,
        organisationId,
        data: {
          sessionId,
          courseTitle: existing.course.title,
          sessionDate: existing.sessionDate,
          reason
        }
      });
    } catch (err) {
      console.error('Failed to send session cancellation notification:', err);
    }
  }
  
  await recordAudit(userId, 'training_session', sessionId, 'cancelled', { status: existing.status }, { status: 'cancelled', reason }, null);
  
  return { ...existing, status: 'cancelled', cancelledReason: reason };
};

/**
 * Enroll users in a session
 */
const enrollUsers = async (sessionId, organisationId, userIds, enrolledBy, allowWaitlist = true) => {
  const session = await getSessionById(sessionId, organisationId);
  
  if (session.status !== 'scheduled' && session.status !== 'confirmed') {
    throw new AppError('Cannot enroll in this session', 400, 'INVALID_STATUS');
  }
  
  const enrolledCount = session.enrollments.filter(e => e.status === 'enrolled').length;
  let availableSpots = session.maxParticipants - enrolledCount;
  
  const results = {
    enrolled: [],
    waitlisted: [],
    skipped: []
  };
  
  await withTransaction(async (client) => {
    for (const userId of userIds) {
      // Check if already enrolled
      const existingEnrollment = session.enrollments.find(e => e.user.id === userId);
      if (existingEnrollment && existingEnrollment.status !== 'cancelled') {
        results.skipped.push({ userId, reason: 'already_enrolled' });
        continue;
      }
      
      let status = 'enrolled';
      if (availableSpots <= 0) {
        if (!allowWaitlist) {
          results.skipped.push({ userId, reason: 'capacity_full' });
          continue;
        }
        status = 'waitlisted';
      } else {
        availableSpots--;
      }
      
      const result = await client.query(
        `INSERT INTO training_session_enrollments 
         (session_id, user_id, enrolled_by, status)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (session_id, user_id) 
         DO UPDATE SET status = $4, enrollment_date = NOW()
         RETURNING id`,
        [sessionId, userId, enrolledBy, status]
      );
      
      if (status === 'enrolled') {
        results.enrolled.push({ userId, status, enrollmentId: result.rows[0].id });
      } else {
        results.waitlisted.push({ userId, status, enrollmentId: result.rows[0].id });
      }
      
      // Send notification
      try {
        await notificationTriggers.triggerNotification({
          type: status === 'enrolled' ? 'training_session_enrolled' : 'training_session_waitlisted',
          userId,
          organisationId,
          data: {
            sessionId,
            courseTitle: session.course.title,
            sessionDate: session.sessionDate,
            startTime: session.startTime
          }
        });
      } catch (err) {
        console.error('Failed to send enrollment notification:', err);
      }
    }
    
    // Update session status to confirmed if minimum reached
    const newEnrolledCount = enrolledCount + results.enrolled.length;
    if (newEnrolledCount >= session.minParticipants && session.status === 'scheduled') {
      await client.query(
        `UPDATE training_sessions SET status = 'confirmed' WHERE id = $1`,
        [sessionId]
      );
    }
  });
  
  return results;
};

/**
 * Record attendance and create completions
 */
const recordAttendance = async (sessionId, organisationId, attendanceData, userId) => {
  const session = await getSessionById(sessionId, organisationId);
  
  if (session.status === 'cancelled') {
    throw new AppError('Cannot record attendance for cancelled session', 400, 'INVALID_STATUS');
  }
  
  const completions = [];
  
  await withTransaction(async (client) => {
    for (const record of attendanceData.attendance) {
      const { userId: attendeeId, attendanceStatus, result, score, notes } = record;
      
      // Update enrollment
      await client.query(
        `UPDATE training_session_enrollments 
         SET attendance_status = $1, attendance_recorded_by = $2, attendance_recorded_at = NOW(), notes = $3
         WHERE session_id = $4 AND user_id = $5`,
        [attendanceStatus, userId, notes, sessionId, attendeeId]
      );
      
      // Create completion if attended and passed
      if (attendanceStatus === 'attended' && (result === 'passed' || result === 'attended')) {
        // Calculate expiry date
        let expiresAt = null;
        if (session.validityMonths > 0) {
          const expiry = new Date(session.sessionDate);
          expiry.setMonth(expiry.getMonth() + session.validityMonths);
          expiresAt = expiry.toISOString().split('T')[0];
        }
        
        const completionResult = await client.query(
          `INSERT INTO training_completions 
           (organisation_id, user_id, course_id, session_id, completion_date, result, score, trainer_id, expires_at, recorded_by)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
           RETURNING id`,
          [organisationId, attendeeId, session.course.id, sessionId, session.sessionDate, 
           result || 'attended', score, session.trainerId, expiresAt, userId]
        );
        
        const completionId = completionResult.rows[0].id;
        
        // Update related assignment
        await client.query(
          `UPDATE training_assignments 
           SET status = 'completed', completion_id = $1
           WHERE user_id = $2 AND course_id = $3 AND status IN ('assigned', 'in_progress')`,
          [completionId, attendeeId, session.course.id]
        );
        
        completions.push({
          userId: attendeeId,
          completionId,
          result: result || 'attended',
          expiresAt
        });
      }
    }
    
    // Complete session if requested
    if (attendanceData.completeSession) {
      await client.query(
        `UPDATE training_sessions SET status = 'completed' WHERE id = $1`,
        [sessionId]
      );
    }
  });
  
  await recordAudit(userId, 'training_session', sessionId, 'attendance_recorded', null, { attendanceCount: attendanceData.attendance.length, completionsCreated: completions.length }, null);
  
  return {
    attendanceRecorded: attendanceData.attendance.length,
    completionsCreated: completions.length,
    sessionStatus: attendanceData.completeSession ? 'completed' : session.status,
    completions
  };
};

const mapSessionRow = (row) => ({
  id: row.id,
  course: {
    id: row.course_id,
    code: row.course_code,
    title: row.course_title
  },
  site: row.site_name ? {
    id: row.site_id,
    name: row.site_name
  } : null,
  locationDetail: row.location_detail,
  trainer: row.trainer_name ? {
    id: row.trainer_id,
    fullName: row.trainer_name
  } : null,
  externalTrainerName: row.external_trainer_name,
  sessionDate: row.session_date,
  startTime: row.start_time,
  endTime: row.end_time,
  virtualLink: row.virtual_link,
  maxParticipants: row.max_participants,
  enrolledCount: parseInt(row.enrolled_count, 10) || 0,
  waitlistCount: parseInt(row.waitlist_count, 10) || 0,
  status: row.status,
  enrollmentDeadline: row.enrollment_deadline
});

const mapSessionDetailRow = (row) => ({
  ...mapSessionRow(row),
  externalTrainerOrg: row.external_trainer_org,
  minParticipants: row.min_participants,
  notes: row.notes,
  cancelledReason: row.cancelled_reason,
  validityMonths: row.validity_months,
  trainerId: row.trainer_id,
  createdBy: row.created_by_name ? {
    id: row.created_by,
    fullName: row.created_by_name
  } : null,
  createdAt: row.created_at,
  updatedAt: row.updated_at
});

module.exports = {
  listSessions,
  getSessionById,
  createSession,
  updateSession,
  cancelSession,
  enrollUsers,
  recordAttendance
};

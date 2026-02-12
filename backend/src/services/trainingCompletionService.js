/**
 * TrainingCompletionService - Phase 8
 * Handles training completions and external training verification
 */

const { query, withTransaction } = require('../config/db');
const { AppError } = require('../utils/appError');
const { recordAudit } = require('../utils/audit');
const notificationTriggers = require('./notificationTriggers');

/**
 * List completions with filters
 */
const listCompletions = async (organisationId, options = {}) => {
  const {
    userId,
    courseId,
    categoryId,
    result,
    isExpired,
    isExpiringSoon,
    fromDate,
    toDate,
    page = 1,
    limit = 20
  } = options;
  
  const conditions = ['comp.organisation_id = $1'];
  const values = [organisationId];
  let paramIndex = 1;
  
  if (userId) {
    paramIndex++;
    conditions.push(`comp.user_id = $${paramIndex}`);
    values.push(userId);
  }
  
  if (courseId) {
    paramIndex++;
    conditions.push(`comp.course_id = $${paramIndex}`);
    values.push(courseId);
  }
  
  if (categoryId) {
    paramIndex++;
    conditions.push(`c.category_id = $${paramIndex}`);
    values.push(categoryId);
  }
  
  if (result) {
    paramIndex++;
    conditions.push(`comp.result = $${paramIndex}`);
    values.push(result);
  }
  
  if (isExpired) {
    conditions.push(`comp.expires_at < CURRENT_DATE`);
  }
  
  if (isExpiringSoon) {
    conditions.push(`comp.expires_at BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '30 days'`);
  }
  
  if (fromDate) {
    paramIndex++;
    conditions.push(`comp.completion_date >= $${paramIndex}`);
    values.push(fromDate);
  }
  
  if (toDate) {
    paramIndex++;
    conditions.push(`comp.completion_date <= $${paramIndex}`);
    values.push(toDate);
  }
  
  const whereClause = conditions.join(' AND ');
  
  // Count
  const countResult = await query(
    `SELECT COUNT(*) FROM training_completions comp
     JOIN training_courses c ON comp.course_id = c.id
     WHERE ${whereClause}`,
    values
  );
  const totalItems = parseInt(countResult.rows[0].count, 10);
  
  // Main query
  const offset = (page - 1) * limit;
  const sql = `
    SELECT comp.*,
           u.name as user_name, u.email as user_email,
           c.code as course_code, c.title as course_title, c.category_id,
           cat.name as category_name,
           t.name as trainer_name,
           s.session_date
    FROM training_completions comp
    JOIN users u ON comp.user_id = u.id
    JOIN training_courses c ON comp.course_id = c.id
    LEFT JOIN training_categories cat ON c.category_id = cat.id
    LEFT JOIN users t ON comp.trainer_id = t.id
    LEFT JOIN training_sessions s ON comp.session_id = s.id
    WHERE ${whereClause}
    ORDER BY comp.completion_date DESC
    LIMIT $${paramIndex + 1} OFFSET $${paramIndex + 2}
  `;
  
  const resultData = await query(sql, [...values, limit, offset]);
  
  return {
    completions: resultData.rows.map(mapCompletionRow),
    pagination: {
      page,
      limit,
      totalItems,
      totalPages: Math.ceil(totalItems / limit)
    }
  };
};

/**
 * Get completion by ID
 */
const getCompletionById = async (completionId, organisationId) => {
  const result = await query(
    `SELECT comp.*,
            u.name as user_name, u.email as user_email,
            c.code as course_code, c.title as course_title, c.category_id, c.validity_months,
            cat.name as category_name,
            t.name as trainer_name,
            s.session_date, s.location_detail,
            v.name as verified_by_name,
            r.name as recorded_by_name
     FROM training_completions comp
     JOIN users u ON comp.user_id = u.id
     JOIN training_courses c ON comp.course_id = c.id
     LEFT JOIN training_categories cat ON c.category_id = cat.id
     LEFT JOIN users t ON comp.trainer_id = t.id
     LEFT JOIN training_sessions s ON comp.session_id = s.id
     LEFT JOIN users v ON comp.verified_by = v.id
     LEFT JOIN users r ON comp.recorded_by = r.id
     WHERE comp.id = $1 AND comp.organisation_id = $2`,
    [completionId, organisationId]
  );
  
  if (result.rows.length === 0) {
    throw new AppError('Completion not found', 404, 'NOT_FOUND');
  }
  
  const completion = mapCompletionDetailRow(result.rows[0]);
  
  // Get attachments
  const attachmentsResult = await query(
    `SELECT * FROM attachments WHERE training_completion_id = $1`,
    [completionId]
  );
  
  completion.attachments = attachmentsResult.rows.map(row => ({
    id: row.id,
    fileName: row.file_name,
    mimeType: row.mime_type,
    fileSize: row.file_size,
    uploadedAt: row.uploaded_at
  }));
  
  return completion;
};

/**
 * Record a completion (manual entry or external training)
 */
const recordCompletion = async (organisationId, data, recordedBy) => {
  const {
    userId,
    courseId,
    completionDate,
    result = 'passed',
    score,
    trainerId,
    externalTrainerName,
    externalOrg,
    certificateNumber,
    expiresAt,
    notes,
    requiresVerification = false
  } = data;
  
  // Verify course exists
  const courseResult = await query(
    `SELECT id, title, validity_months FROM training_courses 
     WHERE id = $1 AND organisation_id = $2`,
    [courseId, organisationId]
  );
  
  if (courseResult.rows.length === 0) {
    throw new AppError('Course not found', 404, 'NOT_FOUND');
  }
  
  const course = courseResult.rows[0];
  
  // Calculate expiry if not provided
  let calculatedExpiry = expiresAt;
  if (!calculatedExpiry && course.validity_months > 0) {
    const expiry = new Date(completionDate);
    expiry.setMonth(expiry.getMonth() + course.validity_months);
    calculatedExpiry = expiry.toISOString().split('T')[0];
  }
  
  // Determine verification status
  const verificationStatus = requiresVerification ? 'pending' : 'not_required';
  
  let completionId;
  
  await withTransaction(async (client) => {
    const insertResult = await client.query(
      `INSERT INTO training_completions 
       (organisation_id, user_id, course_id, completion_date, result, score,
        trainer_id, external_trainer_name, external_org, certificate_number,
        expires_at, notes, verification_status, recorded_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
       RETURNING id`,
      [organisationId, userId, courseId, completionDate, result, score,
       trainerId, externalTrainerName, externalOrg, certificateNumber,
       calculatedExpiry, notes, verificationStatus, recordedBy]
    );
    
    completionId = insertResult.rows[0].id;
    
    // Update any related assignment
    await client.query(
      `UPDATE training_assignments 
       SET status = 'completed', completion_id = $1
       WHERE user_id = $2 AND course_id = $3 
       AND status IN ('assigned', 'in_progress')`,
      [completionId, userId, courseId]
    );
  });
  
  const completion = await getCompletionById(completionId, organisationId);
  
  await recordAudit(recordedBy, 'training_completion', completionId, 'recorded', null, completion, null);
  
  // Send notification to user
  try {
    await notificationTriggers.triggerNotification({
      type: 'training_completed',
      userId,
      organisationId,
      data: {
        completionId,
        courseTitle: course.title,
        completionDate,
        result,
        expiresAt: calculatedExpiry
      }
    });
  } catch (err) {
    console.error('Failed to send completion notification:', err);
  }
  
  return completion;
};

/**
 * Verify external training completion
 */
const verifyCompletion = async (completionId, organisationId, verificationData, verifiedBy) => {
  const existing = await getCompletionById(completionId, organisationId);
  
  if (existing.verificationStatus !== 'pending') {
    throw new AppError('Completion does not require verification', 400, 'INVALID_STATE');
  }
  
  const { approved, verificationNotes, certificateVerified } = verificationData;
  
  const newStatus = approved ? 'verified' : 'rejected';
  
  await query(
    `UPDATE training_completions 
     SET verification_status = $1, 
         verified_by = $2, 
         verified_at = NOW(),
         verification_notes = $3,
         certificate_verified = $4
     WHERE id = $5`,
    [newStatus, verifiedBy, verificationNotes, certificateVerified, completionId]
  );
  
  const updated = await getCompletionById(completionId, organisationId);
  
  await recordAudit(verifiedBy, 'training_completion', completionId, approved ? 'verified' : 'rejected', { verificationStatus: 'pending' }, { verificationStatus: newStatus }, null);
  
  // Notify user
  try {
    await notificationTriggers.triggerNotification({
      type: approved ? 'training_verified' : 'training_rejected',
      userId: existing.user.id,
      organisationId,
      data: {
        completionId,
        courseTitle: existing.course.title,
        verificationNotes
      }
    });
  } catch (err) {
    console.error('Failed to send verification notification:', err);
  }
  
  return updated;
};

/**
 * Get user's training history
 */
const getUserTrainingHistory = async (userId, organisationId, options = {}) => {
  const { page = 1, limit = 50 } = options;
  
  const countResult = await query(
    `SELECT COUNT(*) FROM training_completions 
     WHERE user_id = $1 AND organisation_id = $2`,
    [userId, organisationId]
  );
  
  const offset = (page - 1) * limit;
  const result = await query(
    `SELECT comp.*,
            c.code as course_code, c.title as course_title, c.category_id,
            cat.name as category_name
     FROM training_completions comp
     JOIN training_courses c ON comp.course_id = c.id
     LEFT JOIN training_categories cat ON c.category_id = cat.id
     WHERE comp.user_id = $1 AND comp.organisation_id = $2
     ORDER BY comp.completion_date DESC
     LIMIT $3 OFFSET $4`,
    [userId, organisationId, limit, offset]
  );
  
  // Calculate statistics
  const statsResult = await query(
    `SELECT 
       COUNT(*) as total_completions,
       COUNT(DISTINCT course_id) as unique_courses,
       COUNT(*) FILTER (WHERE result = 'passed') as passed,
       COUNT(*) FILTER (WHERE result = 'failed') as failed,
       COUNT(*) FILTER (WHERE expires_at IS NOT NULL AND expires_at < CURRENT_DATE) as expired,
       COUNT(*) FILTER (WHERE expires_at BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '30 days') as expiring_soon,
       SUM(CASE WHEN c.duration_hours IS NOT NULL THEN c.duration_hours ELSE 0 END) as total_hours
     FROM training_completions comp
     JOIN training_courses c ON comp.course_id = c.id
     WHERE comp.user_id = $1 AND comp.organisation_id = $2`,
    [userId, organisationId]
  );
  
  const stats = statsResult.rows[0];
  
  return {
    completions: result.rows.map(row => ({
      id: row.id,
      course: {
        id: row.course_id,
        code: row.course_code,
        title: row.course_title,
        categoryId: row.category_id,
        categoryName: row.category_name
      },
      completionDate: row.completion_date,
      result: row.result,
      score: row.score,
      expiresAt: row.expires_at,
      isExpired: row.expires_at && new Date(row.expires_at) < new Date(),
      isExpiringSoon: row.expires_at && new Date(row.expires_at) < new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      certificateNumber: row.certificate_number,
      verificationStatus: row.verification_status
    })),
    statistics: {
      totalCompletions: parseInt(stats.total_completions, 10),
      uniqueCourses: parseInt(stats.unique_courses, 10),
      passed: parseInt(stats.passed, 10),
      failed: parseInt(stats.failed, 10),
      expired: parseInt(stats.expired, 10),
      expiringSoon: parseInt(stats.expiring_soon, 10),
      totalTrainingHours: parseFloat(stats.total_hours) || 0
    },
    pagination: {
      page,
      limit,
      totalItems: parseInt(countResult.rows[0].count, 10),
      totalPages: Math.ceil(parseInt(countResult.rows[0].count, 10) / limit)
    }
  };
};

/**
 * Get expiring certifications
 */
const getExpiringCertifications = async (organisationId, options = {}) => {
  const { daysAhead = 30, siteId, departmentId } = options;
  
  const conditions = ['comp.organisation_id = $1', `comp.expires_at BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '${daysAhead} days'`];
  const values = [organisationId];
  let paramIndex = 1;
  
  if (siteId) {
    paramIndex++;
    conditions.push(`u.site_id = $${paramIndex}`);
    values.push(siteId);
  }
  
  if (departmentId) {
    paramIndex++;
    conditions.push(`u.department_id = $${paramIndex}`);
    values.push(departmentId);
  }
  
  const result = await query(
    `SELECT comp.*, 
            u.name as user_name, u.email as user_email, u.site_id, u.department_id,
            c.code as course_code, c.title as course_title, c.validity_months
     FROM training_completions comp
     JOIN users u ON comp.user_id = u.id
     JOIN training_courses c ON comp.course_id = c.id
     WHERE ${conditions.join(' AND ')}
     ORDER BY comp.expires_at`,
    values
  );
  
  return {
    expiringCertifications: result.rows.map(row => ({
      completionId: row.id,
      user: {
        id: row.user_id,
        fullName: row.user_name,
        email: row.user_email,
        siteId: row.site_id,
        departmentId: row.department_id
      },
      course: {
        id: row.course_id,
        code: row.course_code,
        title: row.course_title,
        validityMonths: row.validity_months
      },
      completionDate: row.completion_date,
      expiresAt: row.expires_at,
      daysUntilExpiry: Math.ceil((new Date(row.expires_at) - new Date()) / (1000 * 60 * 60 * 24))
    })),
    totalCount: result.rows.length
  };
};

const mapCompletionRow = (row) => ({
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
    categoryId: row.category_id,
    categoryName: row.category_name
  },
  completionDate: row.completion_date,
  sessionDate: row.session_date,
  result: row.result,
  score: row.score,
  trainer: row.trainer_name ? {
    id: row.trainer_id,
    fullName: row.trainer_name
  } : null,
  expiresAt: row.expires_at,
  isExpired: row.expires_at && new Date(row.expires_at) < new Date(),
  verificationStatus: row.verification_status,
  certificateNumber: row.certificate_number
});

const mapCompletionDetailRow = (row) => ({
  ...mapCompletionRow(row),
  externalTrainerName: row.external_trainer_name,
  externalOrg: row.external_org,
  notes: row.notes,
  certificateVerified: row.certificate_verified,
  verifiedBy: row.verified_by_name ? {
    id: row.verified_by,
    fullName: row.verified_by_name
  } : null,
  verifiedAt: row.verified_at,
  verificationNotes: row.verification_notes,
  recordedBy: row.recorded_by_name ? {
    id: row.recorded_by,
    fullName: row.recorded_by_name
  } : null,
  validityMonths: row.validity_months,
  locationDetail: row.location_detail,
  createdAt: row.created_at,
  updatedAt: row.updated_at
});

module.exports = {
  listCompletions,
  getCompletionById,
  recordCompletion,
  verifyCompletion,
  getUserTrainingHistory,
  getExpiringCertifications
};

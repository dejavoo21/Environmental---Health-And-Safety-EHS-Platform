/**
 * TrainingService - Phase 8
 * Handles training categories and courses
 */

const { query, withTransaction } = require('../config/db');
const { AppError } = require('../utils/appError');
const { recordAudit } = require('../utils/audit');

// =====================================================
// CATEGORY FUNCTIONS
// =====================================================

/**
 * List training categories
 */
const listCategories = async (organisationId, options = {}) => {
  const { includeSystem = true, activeOnly = true } = options;
  
  let sql = `
    SELECT id, organisation_id, name, code, description, display_order, 
           is_system, is_active, created_at, updated_at
    FROM training_categories
    WHERE (organisation_id = $1 OR organisation_id IS NULL)
  `;
  const values = [organisationId];
  
  if (activeOnly) {
    sql += ` AND is_active = TRUE`;
  }
  
  if (!includeSystem) {
    sql += ` AND is_system = FALSE`;
  }
  
  sql += ` ORDER BY display_order, name`;
  
  const result = await query(sql, values);
  return result.rows.map(mapCategoryRow);
};

/**
 * Get category by ID
 */
const getCategoryById = async (categoryId, organisationId) => {
  const result = await query(
    `SELECT * FROM training_categories 
     WHERE id = $1 AND (organisation_id = $2 OR organisation_id IS NULL)`,
    [categoryId, organisationId]
  );
  
  if (result.rows.length === 0) {
    throw new AppError('Category not found', 404, 'NOT_FOUND');
  }
  
  return mapCategoryRow(result.rows[0]);
};

/**
 * Create a custom category
 */
const createCategory = async (organisationId, data, userId) => {
  const { name, code, description, displayOrder = 100 } = data;
  
  // Check for duplicate code
  const existing = await query(
    `SELECT id FROM training_categories 
     WHERE code = $1 AND (organisation_id = $2 OR organisation_id IS NULL)`,
    [code, organisationId]
  );
  
  if (existing.rows.length > 0) {
    throw new AppError('Category code already exists', 409, 'DUPLICATE');
  }
  
  const result = await query(
    `INSERT INTO training_categories 
     (organisation_id, name, code, description, display_order, is_system, is_active)
     VALUES ($1, $2, $3, $4, $5, FALSE, TRUE)
     RETURNING *`,
    [organisationId, name, code.toUpperCase(), description, displayOrder]
  );
  
  const category = mapCategoryRow(result.rows[0]);
  
  await recordAudit(userId, 'training_category', category.id, 'created', null, category, null);
  
  return category;
};

/**
 * Update a category
 */
const updateCategory = async (categoryId, organisationId, data, userId) => {
  const category = await getCategoryById(categoryId, organisationId);
  
  if (category.isSystem) {
    throw new AppError('Cannot modify system category', 403, 'FORBIDDEN');
  }
  
  const { name, description, displayOrder, isActive } = data;
  
  const result = await query(
    `UPDATE training_categories 
     SET name = COALESCE($1, name),
         description = COALESCE($2, description),
         display_order = COALESCE($3, display_order),
         is_active = COALESCE($4, is_active)
     WHERE id = $5
     RETURNING *`,
    [name, description, displayOrder, isActive, categoryId]
  );
  
  const updated = mapCategoryRow(result.rows[0]);
  
  await recordAudit(userId, 'training_category', categoryId, 'updated', category, updated, null);
  
  return updated;
};

const mapCategoryRow = (row) => ({
  id: row.id,
  organisationId: row.organisation_id,
  name: row.name,
  code: row.code,
  description: row.description,
  displayOrder: row.display_order,
  isSystem: row.is_system,
  isActive: row.is_active,
  createdAt: row.created_at,
  updatedAt: row.updated_at
});

// =====================================================
// COURSE FUNCTIONS
// =====================================================

/**
 * List courses with filters and pagination
 */
const listCourses = async (organisationId, options = {}) => {
  const {
    status,
    categoryId,
    deliveryType,
    courseType,
    requirementLevel,
    search,
    page = 1,
    limit = 20,
    sortBy = 'title',
    sortOrder = 'asc'
  } = options;
  
  const conditions = ['c.organisation_id = $1'];
  const values = [organisationId];
  let paramIndex = 1;
  
  if (status) {
    paramIndex++;
    conditions.push(`c.status = $${paramIndex}`);
    values.push(status);
  }
  
  if (categoryId) {
    paramIndex++;
    conditions.push(`c.category_id = $${paramIndex}`);
    values.push(categoryId);
  }
  
  if (deliveryType) {
    paramIndex++;
    conditions.push(`c.delivery_type = $${paramIndex}`);
    values.push(deliveryType);
  }
  
  if (courseType) {
    paramIndex++;
    conditions.push(`c.course_type = $${paramIndex}`);
    values.push(courseType);
  }
  
  if (requirementLevel) {
    paramIndex++;
    conditions.push(`c.requirement_level = $${paramIndex}`);
    values.push(requirementLevel);
  }
  
  if (search) {
    paramIndex++;
    conditions.push(`(c.title ILIKE $${paramIndex} OR c.code ILIKE $${paramIndex} OR c.description ILIKE $${paramIndex})`);
    values.push(`%${search}%`);
  }
  
  const whereClause = conditions.join(' AND ');
  
  // Validate sort field
  const allowedSorts = ['title', 'code', 'created_at', 'updated_at'];
  const sortField = allowedSorts.includes(sortBy) ? sortBy : 'title';
  const order = sortOrder.toLowerCase() === 'desc' ? 'DESC' : 'ASC';
  
  // Count query
  const countResult = await query(
    `SELECT COUNT(*) FROM training_courses c WHERE ${whereClause}`,
    values
  );
  const totalItems = parseInt(countResult.rows[0].count, 10);
  
  // Main query
  const offset = (page - 1) * limit;
  const sql = `
    SELECT c.*, 
           cat.name as category_name, cat.code as category_code,
           (SELECT COUNT(*) FROM training_assignments a WHERE a.course_id = c.id AND a.status NOT IN ('completed', 'cancelled', 'waived')) as assignment_count,
           (SELECT COUNT(*) FROM training_completions tc WHERE tc.course_id = c.id AND tc.result IN ('passed', 'attended')) as completion_count
    FROM training_courses c
    LEFT JOIN training_categories cat ON c.category_id = cat.id
    WHERE ${whereClause}
    ORDER BY c.${sortField} ${order}
    LIMIT $${paramIndex + 1} OFFSET $${paramIndex + 2}
  `;
  
  const result = await query(sql, [...values, limit, offset]);
  
  return {
    courses: result.rows.map(mapCourseRow),
    pagination: {
      page,
      limit,
      totalItems,
      totalPages: Math.ceil(totalItems / limit)
    }
  };
};

/**
 * Get course by ID with full details
 */
const getCourseById = async (courseId, organisationId) => {
  const result = await query(
    `SELECT c.*, 
            cat.name as category_name, cat.code as category_code,
            u.name as owner_name,
            cb.name as created_by_name,
            rc.id as refresher_id, rc.code as refresher_code, rc.title as refresher_title
     FROM training_courses c
     LEFT JOIN training_categories cat ON c.category_id = cat.id
     LEFT JOIN users u ON c.owner_id = u.id
     LEFT JOIN users cb ON c.created_by = cb.id
     LEFT JOIN training_courses rc ON c.refresher_course_id = rc.id
     WHERE c.id = $1 AND c.organisation_id = $2`,
    [courseId, organisationId]
  );
  
  if (result.rows.length === 0) {
    throw new AppError('Course not found', 404, 'NOT_FOUND');
  }
  
  const course = mapCourseDetailRow(result.rows[0]);
  
  // Get prerequisites
  const prereqResult = await query(
    `SELECT p.id, p.is_mandatory, 
            c.id as course_id, c.code as course_code, c.title as course_title
     FROM training_course_prerequisites p
     JOIN training_courses c ON p.prerequisite_course_id = c.id
     WHERE p.course_id = $1`,
    [courseId]
  );
  
  course.prerequisites = prereqResult.rows.map(row => ({
    id: row.id,
    isMandatory: row.is_mandatory,
    course: {
      id: row.course_id,
      code: row.course_code,
      title: row.course_title
    }
  }));
  
  // Get attachments
  const attachResult = await query(
    `SELECT id, file_name, file_type, file_size, created_at
     FROM attachments
     WHERE training_course_id = $1`,
    [courseId]
  );
  
  course.attachments = attachResult.rows.map(row => ({
    id: row.id,
    fileName: row.file_name,
    fileType: row.file_type,
    fileSize: row.file_size,
    uploadedAt: row.created_at
  }));
  
  // Get stats
  const statsResult = await query(
    `SELECT 
       (SELECT COUNT(*) FROM training_assignments WHERE course_id = $1 AND status NOT IN ('completed', 'cancelled', 'waived')) as total_assignments,
       (SELECT COUNT(*) FROM training_assignments WHERE course_id = $1 AND status = 'completed') as completed_assignments,
       (SELECT COUNT(*) FROM training_assignments WHERE course_id = $1 AND status = 'overdue') as overdue_assignments,
       (SELECT COUNT(*) FROM training_completions WHERE course_id = $1 AND result IN ('passed', 'attended')) as total_completions,
       (SELECT COUNT(*) FROM training_sessions WHERE course_id = $1 AND session_date >= CURRENT_DATE AND status = 'scheduled') as upcoming_sessions,
       (SELECT ROUND(AVG(CASE WHEN result = 'passed' THEN 100.0 ELSE 0 END), 1) 
        FROM training_completions WHERE course_id = $1 AND result IN ('passed', 'failed')) as pass_rate`,
    [courseId]
  );
  
  course.stats = {
    totalAssignments: parseInt(statsResult.rows[0].total_assignments, 10),
    completedAssignments: parseInt(statsResult.rows[0].completed_assignments, 10),
    overdueAssignments: parseInt(statsResult.rows[0].overdue_assignments, 10),
    totalCompletions: parseInt(statsResult.rows[0].total_completions, 10),
    upcomingSessions: parseInt(statsResult.rows[0].upcoming_sessions, 10),
    passRate: parseFloat(statsResult.rows[0].pass_rate) || 0
  };
  
  return course;
};

/**
 * Create a new course
 */
const createCourse = async (organisationId, data, userId) => {
  const {
    code,
    title,
    description,
    categoryId,
    durationHours,
    deliveryType,
    courseType = 'initial',
    requirementLevel = 'mandatory',
    validityMonths = 0,
    ownerId,
    externalUrl,
    passingScore,
    maxAttempts,
    selfEnrollment = false,
    status = 'active',
    prerequisiteCourseIds = [],
    refresherCourseId
  } = data;
  
  // Check for duplicate code
  const existing = await query(
    `SELECT id FROM training_courses WHERE code = $1 AND organisation_id = $2`,
    [code, organisationId]
  );
  
  if (existing.rows.length > 0) {
    throw new AppError('Course code already exists', 409, 'DUPLICATE');
  }
  
  // Validate category exists
  await getCategoryById(categoryId, organisationId);
  
  const result = await withTransaction(async (client) => {
    // Create course
    const courseResult = await client.query(
      `INSERT INTO training_courses 
       (organisation_id, category_id, code, title, description, duration_hours,
        delivery_type, course_type, requirement_level, validity_months,
        refresher_course_id, owner_id, external_url, passing_score, max_attempts,
        self_enrollment, status, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)
       RETURNING *`,
      [organisationId, categoryId, code.toUpperCase(), title, description, durationHours,
       deliveryType, courseType, requirementLevel, validityMonths,
       refresherCourseId, ownerId, externalUrl, passingScore, maxAttempts,
       selfEnrollment, status, userId]
    );
    
    const courseId = courseResult.rows[0].id;
    
    // Add prerequisites
    if (prerequisiteCourseIds.length > 0) {
      for (const prereqId of prerequisiteCourseIds) {
        await client.query(
          `INSERT INTO training_course_prerequisites (course_id, prerequisite_course_id, is_mandatory)
           VALUES ($1, $2, TRUE)`,
          [courseId, prereqId]
        );
      }
    }
    
    return courseResult.rows[0];
  });
  
  const course = await getCourseById(result.id, organisationId);
  
  await recordAudit(userId, 'training_course', course.id, 'created', null, course, null);
  
  return course;
};

/**
 * Update a course
 */
const updateCourse = async (courseId, organisationId, data, userId) => {
  const existing = await getCourseById(courseId, organisationId);
  
  if (existing.status === 'archived') {
    throw new AppError('Cannot modify archived course', 403, 'FORBIDDEN');
  }
  
  const {
    title,
    description,
    categoryId,
    durationHours,
    deliveryType,
    courseType,
    requirementLevel,
    validityMonths,
    ownerId,
    externalUrl,
    passingScore,
    maxAttempts,
    selfEnrollment,
    status,
    refresherCourseId,
    prerequisiteCourseIds
  } = data;
  
  await withTransaction(async (client) => {
    await client.query(
      `UPDATE training_courses SET
         title = COALESCE($1, title),
         description = COALESCE($2, description),
         category_id = COALESCE($3, category_id),
         duration_hours = COALESCE($4, duration_hours),
         delivery_type = COALESCE($5, delivery_type),
         course_type = COALESCE($6, course_type),
         requirement_level = COALESCE($7, requirement_level),
         validity_months = COALESCE($8, validity_months),
         owner_id = COALESCE($9, owner_id),
         external_url = COALESCE($10, external_url),
         passing_score = COALESCE($11, passing_score),
         max_attempts = COALESCE($12, max_attempts),
         self_enrollment = COALESCE($13, self_enrollment),
         status = COALESCE($14, status),
         refresher_course_id = COALESCE($15, refresher_course_id)
       WHERE id = $16`,
      [title, description, categoryId, durationHours, deliveryType, courseType,
       requirementLevel, validityMonths, ownerId, externalUrl, passingScore,
       maxAttempts, selfEnrollment, status, refresherCourseId, courseId]
    );
    
    // Update prerequisites if provided
    if (prerequisiteCourseIds !== undefined) {
      await client.query(
        `DELETE FROM training_course_prerequisites WHERE course_id = $1`,
        [courseId]
      );
      
      for (const prereqId of prerequisiteCourseIds) {
        await client.query(
          `INSERT INTO training_course_prerequisites (course_id, prerequisite_course_id, is_mandatory)
           VALUES ($1, $2, TRUE)`,
          [courseId, prereqId]
        );
      }
    }
  });
  
  const updated = await getCourseById(courseId, organisationId);
  
  await recordAudit(userId, 'training_course', courseId, 'updated', existing, updated, null);
  
  return updated;
};

/**
 * Archive a course
 */
const archiveCourse = async (courseId, organisationId, userId) => {
  const existing = await getCourseById(courseId, organisationId);
  
  await query(
    `UPDATE training_courses SET status = 'archived' WHERE id = $1`,
    [courseId]
  );
  
  await recordAudit(userId, 'training_course', courseId, 'archived', { status: existing.status }, { status: 'archived' }, null);
  
  return { ...existing, status: 'archived' };
};

const mapCourseRow = (row) => ({
  id: row.id,
  code: row.code,
  title: row.title,
  description: row.description,
  category: row.category_name ? {
    id: row.category_id,
    name: row.category_name,
    code: row.category_code
  } : null,
  durationHours: parseFloat(row.duration_hours) || null,
  deliveryType: row.delivery_type,
  courseType: row.course_type,
  requirementLevel: row.requirement_level,
  validityMonths: row.validity_months,
  refresherCourseId: row.refresher_course_id,
  passingScore: parseFloat(row.passing_score) || null,
  selfEnrollment: row.self_enrollment,
  status: row.status,
  assignmentCount: parseInt(row.assignment_count, 10) || 0,
  completionCount: parseInt(row.completion_count, 10) || 0,
  createdAt: row.created_at
});

const mapCourseDetailRow = (row) => ({
  ...mapCourseRow(row),
  owner: row.owner_name ? {
    id: row.owner_id,
    fullName: row.owner_name
  } : null,
  externalUrl: row.external_url,
  maxAttempts: row.max_attempts,
  refresherCourse: row.refresher_id ? {
    id: row.refresher_id,
    code: row.refresher_code,
    title: row.refresher_title
  } : null,
  createdBy: row.created_by_name ? {
    id: row.created_by,
    fullName: row.created_by_name
  } : null,
  updatedAt: row.updated_at
});

module.exports = {
  // Categories
  listCategories,
  getCategoryById,
  createCategory,
  updateCategory,
  // Courses
  listCourses,
  getCourseById,
  createCourse,
  updateCourse,
  archiveCourse
};

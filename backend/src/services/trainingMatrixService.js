/**
 * TrainingMatrixService - Phase 8
 * Handles training matrix generation, gap analysis, and requirements management
 */

const { query } = require('../config/db');
const { AppError } = require('../utils/appError');
const { recordAudit } = require('../utils/audit');

/**
 * Get training matrix for a site/department
 */
const getTrainingMatrix = async (organisationId, options = {}) => {
  const { siteId, departmentId, roleId, categoryId, includeOptional = false } = options;
  
  // Get users based on filters
  const userConditions = ['u.organisation_id = $1', 'u.is_active = true'];
  const userValues = [organisationId];
  let paramIndex = 1;
  
  if (siteId) {
    paramIndex++;
    userConditions.push(`u.site_id = $${paramIndex}`);
    userValues.push(siteId);
  }
  
  if (departmentId) {
    paramIndex++;
    userConditions.push(`u.department_id = $${paramIndex}`);
    userValues.push(departmentId);
  }
  
  if (roleId) {
    paramIndex++;
    userConditions.push(`u.role_id = $${paramIndex}`);
    userValues.push(roleId);
  }
  
  const usersResult = await query(
    `SELECT u.id, u.full_name, u.email, u.role_id, u.site_id, u.department_id,
            r.name as role_name, s.name as site_name, d.name as department_name
     FROM users u
     LEFT JOIN roles r ON u.role_id = r.id
     LEFT JOIN sites s ON u.site_id = s.id
     LEFT JOIN departments d ON u.department_id = d.id
     WHERE ${userConditions.join(' AND ')}
     ORDER BY u.full_name`,
    userValues
  );
  
  const users = usersResult.rows;
  
  // Get courses (required courses based on role/site requirements)
  const courseConditions = ['c.organisation_id = $1', 'c.status = \'active\''];
  const courseValues = [organisationId];
  let courseParamIndex = 1;
  
  if (categoryId) {
    courseParamIndex++;
    courseConditions.push(`c.category_id = $${courseParamIndex}`);
    courseValues.push(categoryId);
  }
  
  const coursesResult = await query(
    `SELECT c.id, c.code, c.title, c.category_id, c.validity_months, c.is_mandatory,
            cat.name as category_name
     FROM training_courses c
     LEFT JOIN training_categories cat ON c.category_id = cat.id
     WHERE ${courseConditions.join(' AND ')}
     ORDER BY c.is_mandatory DESC, cat.name, c.title`,
    courseValues
  );
  
  const courses = coursesResult.rows;
  
  // Get all completions for these users
  const completionsResult = await query(
    `SELECT comp.user_id, comp.course_id, comp.completion_date, comp.expires_at, comp.result
     FROM training_completions comp
     WHERE comp.organisation_id = $1
     AND comp.user_id = ANY($2)
     AND comp.result IN ('passed', 'attended')
     ORDER BY comp.completion_date DESC`,
    [organisationId, users.map(u => u.id)]
  );
  
  // Build completion map (user -> course -> latest completion)
  const completionMap = {};
  for (const comp of completionsResult.rows) {
    const key = `${comp.user_id}_${comp.course_id}`;
    if (!completionMap[key] || new Date(comp.completion_date) > new Date(completionMap[key].completion_date)) {
      completionMap[key] = comp;
    }
  }
  
  // Get role requirements
  const roleRequirements = await getRoleRequirements(organisationId);
  
  // Get site requirements
  const siteRequirements = await getSiteRequirements(organisationId);
  
  // Build matrix
  const matrix = users.map(user => {
    const userCourses = courses.map(course => {
      const key = `${user.id}_${course.id}`;
      const completion = completionMap[key];
      
      // Check if required for this user
      const isRequiredForRole = roleRequirements.some(
        r => r.roleId === user.role_id && r.courseId === course.id
      );
      const isRequiredForSite = siteRequirements.some(
        r => r.siteId === user.site_id && r.courseId === course.id
      );
      const isRequired = course.is_mandatory || isRequiredForRole || isRequiredForSite;
      
      if (!isRequired && !includeOptional) {
        return null;
      }
      
      let status = 'not_started';
      let expiryStatus = null;
      
      if (completion) {
        const isExpired = completion.expires_at && new Date(completion.expires_at) < new Date();
        const isExpiringSoon = completion.expires_at && 
          new Date(completion.expires_at) >= new Date() &&
          new Date(completion.expires_at) < new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
        
        if (isExpired) {
          status = 'expired';
          expiryStatus = 'expired';
        } else if (isExpiringSoon) {
          status = 'completed';
          expiryStatus = 'expiring_soon';
        } else {
          status = 'completed';
          expiryStatus = 'valid';
        }
      }
      
      return {
        courseId: course.id,
        courseCode: course.code,
        courseTitle: course.title,
        isRequired,
        status,
        expiryStatus,
        completionDate: completion?.completion_date || null,
        expiresAt: completion?.expires_at || null
      };
    }).filter(Boolean);
    
    // Calculate user statistics
    const stats = {
      required: userCourses.filter(c => c.isRequired).length,
      completed: userCourses.filter(c => c.status === 'completed').length,
      expired: userCourses.filter(c => c.status === 'expired').length,
      notStarted: userCourses.filter(c => c.status === 'not_started').length,
      expiringSoon: userCourses.filter(c => c.expiryStatus === 'expiring_soon').length
    };
    stats.compliancePercentage = stats.required > 0 
      ? Math.round((stats.completed / stats.required) * 100) 
      : 100;
    
    return {
      user: {
        id: user.id,
        fullName: user.full_name,
        email: user.email,
        role: { id: user.role_id, name: user.role_name },
        site: { id: user.site_id, name: user.site_name },
        department: { id: user.department_id, name: user.department_name }
      },
      courses: userCourses,
      statistics: stats
    };
  });
  
  // Calculate overall statistics
  const overallStats = {
    totalUsers: matrix.length,
    totalRequiredTrainings: matrix.reduce((sum, u) => sum + u.statistics.required, 0),
    totalCompleted: matrix.reduce((sum, u) => sum + u.statistics.completed, 0),
    totalExpired: matrix.reduce((sum, u) => sum + u.statistics.expired, 0),
    totalGaps: matrix.reduce((sum, u) => sum + u.statistics.notStarted + u.statistics.expired, 0),
    averageCompliancePercentage: matrix.length > 0
      ? Math.round(matrix.reduce((sum, u) => sum + u.statistics.compliancePercentage, 0) / matrix.length)
      : 100,
    fullyCompliantUsers: matrix.filter(u => u.statistics.compliancePercentage === 100).length
  };
  
  return {
    matrix,
    courses: courses.map(c => ({
      id: c.id,
      code: c.code,
      title: c.title,
      categoryId: c.category_id,
      categoryName: c.category_name,
      isMandatory: c.is_mandatory,
      validityMonths: c.validity_months
    })),
    summary: overallStats,
    filters: { siteId, departmentId, roleId, categoryId }
  };
};

/**
 * Get training gap analysis
 */
const getGapAnalysis = async (organisationId, options = {}) => {
  const { siteId, departmentId, roleId } = options;
  
  // Get all required training gaps
  const matrix = await getTrainingMatrix(organisationId, { siteId, departmentId, roleId, includeOptional: false });
  
  const gaps = [];
  
  for (const userRow of matrix.matrix) {
    for (const course of userRow.courses) {
      if (course.isRequired && (course.status === 'not_started' || course.status === 'expired')) {
        gaps.push({
          user: userRow.user,
          course: {
            id: course.courseId,
            code: course.courseCode,
            title: course.courseTitle
          },
          gapType: course.status === 'expired' ? 'expired' : 'missing',
          previousCompletion: course.status === 'expired' ? {
            completionDate: course.completionDate,
            expiredAt: course.expiresAt
          } : null
        });
      }
    }
  }
  
  // Group by course
  const gapsByCourse = {};
  for (const gap of gaps) {
    if (!gapsByCourse[gap.course.id]) {
      gapsByCourse[gap.course.id] = {
        course: gap.course,
        missingCount: 0,
        expiredCount: 0,
        users: []
      };
    }
    if (gap.gapType === 'expired') {
      gapsByCourse[gap.course.id].expiredCount++;
    } else {
      gapsByCourse[gap.course.id].missingCount++;
    }
    gapsByCourse[gap.course.id].users.push({
      user: gap.user,
      gapType: gap.gapType,
      previousCompletion: gap.previousCompletion
    });
  }
  
  // Group by user
  const gapsByUser = {};
  for (const gap of gaps) {
    if (!gapsByUser[gap.user.id]) {
      gapsByUser[gap.user.id] = {
        user: gap.user,
        gaps: []
      };
    }
    gapsByUser[gap.user.id].gaps.push({
      course: gap.course,
      gapType: gap.gapType,
      previousCompletion: gap.previousCompletion
    });
  }
  
  return {
    totalGaps: gaps.length,
    gapsByCourse: Object.values(gapsByCourse).sort((a, b) => (b.missingCount + b.expiredCount) - (a.missingCount + a.expiredCount)),
    gapsByUser: Object.values(gapsByUser).sort((a, b) => b.gaps.length - a.gaps.length),
    summary: matrix.summary,
    recommendations: generateRecommendations(Object.values(gapsByCourse))
  };
};

/**
 * Get role requirements
 */
const getRoleRequirements = async (organisationId) => {
  const result = await query(
    `SELECT rr.*, c.code as course_code, c.title as course_title, r.name as role_name
     FROM training_role_requirements rr
     JOIN training_courses c ON rr.course_id = c.id
     JOIN roles r ON rr.role_id = r.id
     WHERE rr.organisation_id = $1
     ORDER BY r.name, c.title`,
    [organisationId]
  );
  
  return result.rows.map(row => ({
    id: row.id,
    roleId: row.role_id,
    roleName: row.role_name,
    courseId: row.course_id,
    courseCode: row.course_code,
    courseTitle: row.course_title,
    isRequired: row.is_required
  }));
};

/**
 * Set role requirements
 */
const setRoleRequirements = async (organisationId, roleId, courseIds, userId) => {
  // Remove existing requirements for this role
  await query(
    `DELETE FROM training_role_requirements WHERE organisation_id = $1 AND role_id = $2`,
    [organisationId, roleId]
  );
  
  // Insert new requirements
  if (courseIds.length > 0) {
    const values = courseIds.map((courseId, i) => 
      `($1, $2, $${i + 3})`
    ).join(', ');
    
    await query(
      `INSERT INTO training_role_requirements (organisation_id, role_id, course_id)
       VALUES ${values}`,
      [organisationId, roleId, ...courseIds]
    );
  }
  
  await recordAudit(userId, 'training_role_requirements', roleId, 'updated', null, { roleId, courseIds }, null);
  
  return getRoleRequirements(organisationId);
};

/**
 * Get site requirements
 */
const getSiteRequirements = async (organisationId) => {
  const result = await query(
    `SELECT sr.*, c.code as course_code, c.title as course_title, s.name as site_name
     FROM training_site_requirements sr
     JOIN training_courses c ON sr.course_id = c.id
     JOIN sites s ON sr.site_id = s.id
     WHERE sr.organisation_id = $1
     ORDER BY s.name, c.title`,
    [organisationId]
  );
  
  return result.rows.map(row => ({
    id: row.id,
    siteId: row.site_id,
    siteName: row.site_name,
    courseId: row.course_id,
    courseCode: row.course_code,
    courseTitle: row.course_title,
    isRequired: row.is_required
  }));
};

/**
 * Set site requirements
 */
const setSiteRequirements = async (organisationId, siteId, courseIds, userId) => {
  // Remove existing requirements for this site
  await query(
    `DELETE FROM training_site_requirements WHERE organisation_id = $1 AND site_id = $2`,
    [organisationId, siteId]
  );
  
  // Insert new requirements
  if (courseIds.length > 0) {
    const values = courseIds.map((courseId, i) => 
      `($1, $2, $${i + 3})`
    ).join(', ');
    
    await query(
      `INSERT INTO training_site_requirements (organisation_id, site_id, course_id)
       VALUES ${values}`,
      [organisationId, siteId, ...courseIds]
    );
  }
  
  await recordAudit(userId, 'training_site_requirements', siteId, 'updated', null, { siteId, courseIds }, null);
  
  return getSiteRequirements(organisationId);
};

/**
 * Generate recommendations based on gaps
 */
const generateRecommendations = (gapsByCourse) => {
  const recommendations = [];
  
  // Find courses with most gaps
  const highGapCourses = gapsByCourse.filter(g => (g.missingCount + g.expiredCount) > 5);
  
  for (const gap of highGapCourses) {
    recommendations.push({
      type: 'schedule_session',
      priority: 'high',
      message: `Schedule training session for "${gap.course.title}" - ${gap.missingCount + gap.expiredCount} users need this training`,
      courseId: gap.course.id,
      affectedUsers: gap.missingCount + gap.expiredCount
    });
  }
  
  // Find courses with many expirations
  const highExpiryCourses = gapsByCourse.filter(g => g.expiredCount > 3);
  
  for (const gap of highExpiryCourses) {
    recommendations.push({
      type: 'refresher_training',
      priority: 'medium',
      message: `Schedule refresher for "${gap.course.title}" - ${gap.expiredCount} certifications expired`,
      courseId: gap.course.id,
      affectedUsers: gap.expiredCount
    });
  }
  
  return recommendations;
};

module.exports = {
  getTrainingMatrix,
  getGapAnalysis,
  getRoleRequirements,
  setRoleRequirements,
  getSiteRequirements,
  setSiteRequirements
};

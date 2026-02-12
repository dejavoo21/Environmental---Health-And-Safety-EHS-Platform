/**
 * Training Routes - Phase 8
 * Handles all training module endpoints
 */

const express = require('express');
const router = express.Router();
const { authMiddleware, requireRole } = require('../middleware/auth');
const trainingService = require('../services/trainingService');
const sessionService = require('../services/trainingSessionService');
const assignmentService = require('../services/trainingAssignmentService');
const completionService = require('../services/trainingCompletionService');
const matrixService = require('../services/trainingMatrixService');
const reportService = require('../services/trainingReportService');
const { AppError } = require('../utils/appError');

// Role middleware shortcuts
const requireManager = requireRole('manager', 'admin');
const requireAdmin = requireRole('admin');

// All routes require authentication
router.use(authMiddleware);

// ==================== CATEGORIES ====================

/**
 * GET /api/training/categories
 * List training categories
 */
router.get('/categories', async (req, res, next) => {
  try {
    const categories = await trainingService.listCategories(req.user.organisationId, req.query);
    res.json(categories);
  } catch (error) {
    // Check if this is a missing table error
    if (error.code === '42P01') {
      console.error('Training tables not found:', error.message);
      return res.json({ data: [], total: 0 });
    }
    next(error);
  }
});

/**
 * GET /api/training/categories/:id
 * Get category by ID
 */
router.get('/categories/:id', async (req, res, next) => {
  try {
    const category = await trainingService.getCategoryById(req.params.id, req.user.organisationId);
    res.json(category);
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/training/categories
 * Create custom category (Manager+)
 */
router.post('/categories', requireManager, async (req, res, next) => {
  try {
    const category = await trainingService.createCategory(
      req.user.organisationId,
      req.body,
      req.user.id
    );
    res.status(201).json(category);
  } catch (error) {
    next(error);
  }
});

/**
 * PUT /api/training/categories/:id
 * Update category (Manager+)
 */
router.put('/categories/:id', requireManager, async (req, res, next) => {
  try {
    const category = await trainingService.updateCategory(
      req.params.id,
      req.user.organisationId,
      req.body,
      req.user.id
    );
    res.json(category);
  } catch (error) {
    next(error);
  }
});

// ==================== COURSES ====================

/**
 * GET /api/training/courses
 * List courses with filters and pagination
 */
router.get('/courses', async (req, res, next) => {
  try {
    const result = await trainingService.listCourses(req.user.organisationId, {
      categoryId: req.query.categoryId,
      status: req.query.status,
      deliveryMethod: req.query.deliveryMethod,
      isMandatory: req.query.isMandatory === 'true',
      search: req.query.search,
      page: parseInt(req.query.page, 10) || 1,
      limit: parseInt(req.query.limit, 10) || 20,
      sortBy: req.query.sortBy,
      sortOrder: req.query.sortOrder
    });
    res.json(result);
  } catch (error) {
    // Check if this is a missing table error
    if (error.code === '42P01') {
      console.error('Training tables not found:', error.message);
      return res.json({ data: [], total: 0, page: 1, limit: 20 });
    }
    next(error);
  }
});

/**
 * GET /api/training/courses/:id
 * Get course by ID with details
 */
router.get('/courses/:id', async (req, res, next) => {
  try {
    const course = await trainingService.getCourseById(req.params.id, req.user.organisationId);
    res.json(course);
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/training/courses
 * Create course (Manager+)
 */
router.post('/courses', requireManager, async (req, res, next) => {
  try {
    const course = await trainingService.createCourse(
      req.user.organisationId,
      req.body,
      req.user.id
    );
    res.status(201).json(course);
  } catch (error) {
    next(error);
  }
});

/**
 * PUT /api/training/courses/:id
 * Update course (Manager+)
 */
router.put('/courses/:id', requireManager, async (req, res, next) => {
  try {
    const course = await trainingService.updateCourse(
      req.params.id,
      req.user.organisationId,
      req.body,
      req.user.id
    );
    res.json(course);
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/training/courses/:id/archive
 * Archive course (Manager+)
 */
router.post('/courses/:id/archive', requireManager, async (req, res, next) => {
  try {
    const course = await trainingService.archiveCourse(
      req.params.id,
      req.user.organisationId,
      req.user.id
    );
    res.json(course);
  } catch (error) {
    next(error);
  }
});

// ==================== SESSIONS ====================

/**
 * GET /api/training/sessions
 * List training sessions
 */
router.get('/sessions', async (req, res, next) => {
  try {
    const result = await sessionService.listSessions(req.user.organisationId, {
      courseId: req.query.courseId,
      siteId: req.query.siteId,
      trainerId: req.query.trainerId,
      status: req.query.status,
      fromDate: req.query.fromDate,
      toDate: req.query.toDate,
      page: parseInt(req.query.page, 10) || 1,
      limit: parseInt(req.query.limit, 10) || 20
    });
    res.json(result);
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/training/sessions/:id
 * Get session by ID with enrollments
 */
router.get('/sessions/:id', async (req, res, next) => {
  try {
    const session = await sessionService.getSessionById(req.params.id, req.user.organisationId);
    res.json(session);
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/training/sessions
 * Create session (Manager+)
 */
router.post('/sessions', requireManager, async (req, res, next) => {
  try {
    const session = await sessionService.createSession(
      req.user.organisationId,
      req.body,
      req.user.id
    );
    res.status(201).json(session);
  } catch (error) {
    next(error);
  }
});

/**
 * PUT /api/training/sessions/:id
 * Update session (Manager+)
 */
router.put('/sessions/:id', requireManager, async (req, res, next) => {
  try {
    const session = await sessionService.updateSession(
      req.params.id,
      req.user.organisationId,
      req.body,
      req.user.id
    );
    res.json(session);
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/training/sessions/:id/cancel
 * Cancel session (Manager+)
 */
router.post('/sessions/:id/cancel', requireManager, async (req, res, next) => {
  try {
    const session = await sessionService.cancelSession(
      req.params.id,
      req.user.organisationId,
      req.body.reason,
      req.user.id
    );
    res.json(session);
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/training/sessions/:id/enroll
 * Enroll users in session (Manager+)
 */
router.post('/sessions/:id/enroll', requireManager, async (req, res, next) => {
  try {
    const result = await sessionService.enrollUsers(
      req.params.id,
      req.user.organisationId,
      req.body.userIds,
      req.user.id,
      req.body.allowWaitlist !== false
    );
    res.json(result);
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/training/sessions/:id/self-enroll
 * Self-enroll in session
 */
router.post('/sessions/:id/self-enroll', async (req, res, next) => {
  try {
    const result = await sessionService.enrollUsers(
      req.params.id,
      req.user.organisationId,
      [req.user.id],
      req.user.id,
      true
    );
    res.json(result);
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/training/sessions/:id/attendance
 * Record attendance and create completions (Manager+)
 */
router.post('/sessions/:id/attendance', requireManager, async (req, res, next) => {
  try {
    const result = await sessionService.recordAttendance(
      req.params.id,
      req.user.organisationId,
      req.body,
      req.user.id
    );
    res.json(result);
  } catch (error) {
    next(error);
  }
});

// ==================== ASSIGNMENTS ====================

/**
 * GET /api/training/assignments
 * List assignments (Manager+ sees all, users see own)
 */
router.get('/assignments', async (req, res, next) => {
  try {
    const options = {
      courseId: req.query.courseId,
      status: req.query.status,
      dueSoon: req.query.dueSoon === 'true',
      overdue: req.query.overdue === 'true',
      page: parseInt(req.query.page, 10) || 1,
      limit: parseInt(req.query.limit, 10) || 20
    };

    // Non-managers only see their own
    if (req.user.role !== 'admin' && req.user.role !== 'manager') {
      options.userId = req.user.id;
    } else if (req.query.userId) {
      options.userId = req.query.userId;
    }

    const result = await assignmentService.listAssignments(req.user.organisationId, options);
    res.json(result);
  } catch (error) {
    // Check if this is a missing table error
    if (error.code === '42P01') {
      console.error('Training assignments table not found:', error.message);
      return res.json({
        assignments: [],
        pagination: { page: 1, limit: 20, totalItems: 0, totalPages: 0 }
      });
    }
    // Check if this is a missing column error (schema mismatch)
    if (error.code === '42703') {
      console.error('Training assignments column not found:', error.message);
      return res.json({
        assignments: [],
        pagination: { page: 1, limit: 20, totalItems: 0, totalPages: 0 },
        meta: { warning: 'Schema mismatch - please run migrations' }
      });
    }
    next(error);
  }
});

/**
 * GET /api/training/assignments/:id
 * Get assignment by ID
 */
router.get('/assignments/:id', async (req, res, next) => {
  try {
    const assignment = await assignmentService.getAssignmentById(
      req.params.id,
      req.user.organisationId
    );
    
    // Check access
    if (req.user.role !== 'admin' && req.user.role !== 'manager' && assignment.user.id !== req.user.id) {
      throw new AppError('Access denied', 403, 'FORBIDDEN');
    }
    
    res.json(assignment);
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/training/assignments
 * Assign training to users (Manager+)
 */
router.post('/assignments', requireManager, async (req, res, next) => {
  try {
    const result = await assignmentService.assignTraining(
      req.user.organisationId,
      req.body,
      req.user.id
    );
    res.status(201).json(result);
  } catch (error) {
    next(error);
  }
});

/**
 * PUT /api/training/assignments/:id
 * Update assignment (Manager+)
 */
router.put('/assignments/:id', requireManager, async (req, res, next) => {
  try {
    const assignment = await assignmentService.updateAssignment(
      req.params.id,
      req.user.organisationId,
      req.body,
      req.user.id
    );
    res.json(assignment);
  } catch (error) {
    next(error);
  }
});

/**
 * DELETE /api/training/assignments/:id
 * Cancel assignment (Manager+)
 */
router.delete('/assignments/:id', requireManager, async (req, res, next) => {
  try {
    await assignmentService.cancelAssignment(
      req.params.id,
      req.user.organisationId,
      req.body.reason,
      req.user.id
    );
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

// ==================== MY TRAINING ====================

/**
 * GET /api/training/my-training
 * Get current user's training dashboard
 */
router.get('/my-training', async (req, res, next) => {
  try {
    const myTraining = await assignmentService.getMyTraining(
      req.user.id,
      req.user.organisationId
    );
    res.json(myTraining);
  } catch (error) {
    console.error('[Training] my-training error:', error.message, error.code, error.stack?.split('\n').slice(0, 3).join(' '));
    // Check if this is a missing table error
    if (error.code === '42P01') {
      console.error('Training tables not found - migrations may not have run:', error.message);
      return res.json({
        assignments: [],
        upcomingDue: [],
        completed: 0,
        overdueCount: 0,
        meta: { warning: 'Training module not configured. Please run migrations 008+.' }
      });
    }
    next(error);
  }
});

/**
 * GET /api/training/my-training/history
 * Get current user's training history
 */
router.get('/my-training/history', async (req, res, next) => {
  try {
    const history = await completionService.getUserTrainingHistory(
      req.user.id,
      req.user.organisationId,
      {
        page: parseInt(req.query.page, 10) || 1,
        limit: parseInt(req.query.limit, 10) || 50
      }
    );
    res.json(history);
  } catch (error) {
    console.error('[Training] my-training/history error:', error.message, error.code, error.stack?.split('\n').slice(0, 3).join(' '));
    // Check if this is a missing table error
    if (error.code === '42P01') {
      console.error('Training tables not found:', error.message);
      return res.json({ data: [], total: 0 });
    }
    next(error);
  }
});

// ==================== COMPLETIONS ====================

/**
 * GET /api/training/completions
 * List completions
 */
router.get('/completions', async (req, res, next) => {
  try {
    const options = {
      courseId: req.query.courseId,
      categoryId: req.query.categoryId,
      result: req.query.result,
      isExpired: req.query.isExpired === 'true',
      isExpiringSoon: req.query.isExpiringSoon === 'true',
      fromDate: req.query.fromDate,
      toDate: req.query.toDate,
      page: parseInt(req.query.page, 10) || 1,
      limit: parseInt(req.query.limit, 10) || 20
    };
    
    // Non-managers only see their own
    if (req.user.role !== 'admin' && req.user.role !== 'manager') {
      options.userId = req.user.id;
    } else if (req.query.userId) {
      options.userId = req.query.userId;
    }
    
    const result = await completionService.listCompletions(req.user.organisationId, options);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/training/completions/:id
 * Get completion by ID
 */
router.get('/completions/:id', async (req, res, next) => {
  try {
    const completion = await completionService.getCompletionById(
      req.params.id,
      req.user.organisationId
    );
    
    // Check access
    if (req.user.role !== 'admin' && req.user.role !== 'manager' && completion.user.id !== req.user.id) {
      throw new AppError('Access denied', 403, 'FORBIDDEN');
    }
    
    res.json(completion);
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/training/completions
 * Record manual completion (Manager+)
 */
router.post('/completions', requireManager, async (req, res, next) => {
  try {
    const completion = await completionService.recordCompletion(
      req.user.organisationId,
      req.body,
      req.user.id
    );
    res.status(201).json(completion);
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/training/completions/external
 * Submit external training for verification
 */
router.post('/completions/external', async (req, res, next) => {
  try {
    const completion = await completionService.recordCompletion(
      req.user.organisationId,
      {
        ...req.body,
        userId: req.user.id,
        requiresVerification: true
      },
      req.user.id
    );
    res.status(201).json(completion);
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/training/completions/:id/verify
 * Verify external completion (Manager+)
 */
router.post('/completions/:id/verify', requireManager, async (req, res, next) => {
  try {
    const completion = await completionService.verifyCompletion(
      req.params.id,
      req.user.organisationId,
      req.body,
      req.user.id
    );
    res.json(completion);
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/training/completions/expiring
 * Get expiring certifications (Manager+)
 */
router.get('/completions/expiring', requireManager, async (req, res, next) => {
  try {
    const result = await completionService.getExpiringCertifications(
      req.user.organisationId,
      {
        daysAhead: parseInt(req.query.daysAhead, 10) || 30,
        siteId: req.query.siteId,
        departmentId: req.query.departmentId
      }
    );
    res.json(result);
  } catch (error) {
    next(error);
  }
});

// ==================== TRAINING MATRIX ====================

/**
 * GET /api/training/matrix
 * Get training matrix (Manager+)
 */
router.get('/matrix', requireManager, async (req, res, next) => {
  try {
    const matrix = await matrixService.getTrainingMatrix(req.user.organisationId, {
      siteId: req.query.siteId,
      departmentId: req.query.departmentId,
      roleId: req.query.roleId,
      categoryId: req.query.categoryId,
      includeOptional: req.query.includeOptional === 'true'
    });
    res.json(matrix);
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/training/matrix/gaps
 * Get training gap analysis (Manager+)
 */
router.get('/matrix/gaps', requireManager, async (req, res, next) => {
  try {
    const gaps = await matrixService.getGapAnalysis(req.user.organisationId, {
      siteId: req.query.siteId,
      departmentId: req.query.departmentId,
      roleId: req.query.roleId
    });
    res.json(gaps);
  } catch (error) {
    next(error);
  }
});

// ==================== REQUIREMENTS ====================

/**
 * GET /api/training/requirements/roles
 * Get role training requirements (Manager+)
 */
router.get('/requirements/roles', requireManager, async (req, res, next) => {
  try {
    const requirements = await matrixService.getRoleRequirements(req.user.organisationId);
    res.json(requirements);
  } catch (error) {
    next(error);
  }
});

/**
 * PUT /api/training/requirements/roles/:roleId
 * Set role training requirements (Admin)
 */
router.put('/requirements/roles/:roleId', requireAdmin, async (req, res, next) => {
  try {
    const requirements = await matrixService.setRoleRequirements(
      req.user.organisationId,
      req.params.roleId,
      req.body.courseIds,
      req.user.id
    );
    res.json(requirements);
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/training/requirements/sites
 * Get site training requirements (Manager+)
 */
router.get('/requirements/sites', requireManager, async (req, res, next) => {
  try {
    const requirements = await matrixService.getSiteRequirements(req.user.organisationId);
    res.json(requirements);
  } catch (error) {
    next(error);
  }
});

/**
 * PUT /api/training/requirements/sites/:siteId
 * Set site training requirements (Admin)
 */
router.put('/requirements/sites/:siteId', requireAdmin, async (req, res, next) => {
  try {
    const requirements = await matrixService.setSiteRequirements(
      req.user.organisationId,
      req.params.siteId,
      req.body.courseIds,
      req.user.id
    );
    res.json(requirements);
  } catch (error) {
    next(error);
  }
});

// ==================== ASSIGNMENT RULES ====================

/**
 * GET /api/training/rules
 * List assignment rules (Manager+)
 */
router.get('/rules', requireManager, async (req, res, next) => {
  try {
    const rules = await assignmentService.listAssignmentRules(req.user.organisationId, {
      isActive: req.query.isActive === 'true' ? true : req.query.isActive === 'false' ? false : undefined,
      page: parseInt(req.query.page, 10) || 1,
      limit: parseInt(req.query.limit, 10) || 20
    });
    res.json(rules);
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/training/rules
 * Create assignment rule (Admin)
 */
router.post('/rules', requireAdmin, async (req, res, next) => {
  try {
    const rule = await assignmentService.createAssignmentRule(
      req.user.organisationId,
      req.body,
      req.user.id
    );
    res.status(201).json(rule);
  } catch (error) {
    next(error);
  }
});

// ==================== REPORTS & EXPORTS ====================

/**
 * GET /api/training/reports/dashboard
 * Get training dashboard stats (Manager+)
 */
router.get('/reports/dashboard', requireManager, async (req, res, next) => {
  try {
    const stats = await reportService.getDashboardStats(req.user.organisationId, {
      siteId: req.query.siteId,
      fromDate: req.query.fromDate,
      toDate: req.query.toDate
    });
    res.json(stats);
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/training/reports/compliance
 * Get compliance report (Manager+)
 */
router.get('/reports/compliance', requireManager, async (req, res, next) => {
  try {
    const report = await reportService.generateComplianceReport(req.user.organisationId, {
      siteId: req.query.siteId,
      departmentId: req.query.departmentId,
      roleId: req.query.roleId
    });
    res.json(report);
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/training/exports/matrix
 * Export training matrix to Excel (Manager+)
 */
router.get('/exports/matrix', requireManager, async (req, res, next) => {
  try {
    const matrix = await matrixService.getTrainingMatrix(req.user.organisationId, {
      siteId: req.query.siteId,
      departmentId: req.query.departmentId,
      roleId: req.query.roleId,
      includeOptional: req.query.includeOptional === 'true'
    });
    
    const workbook = await reportService.exportMatrixToExcel(req.user.organisationId, matrix);
    
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=training_matrix_${new Date().toISOString().split('T')[0]}.xlsx`);
    
    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/training/exports/completions
 * Export completions to Excel (Manager+)
 */
router.get('/exports/completions', requireManager, async (req, res, next) => {
  try {
    const result = await completionService.listCompletions(req.user.organisationId, {
      userId: req.query.userId,
      courseId: req.query.courseId,
      fromDate: req.query.fromDate,
      toDate: req.query.toDate,
      limit: 10000 // Export up to 10k records
    });
    
    const workbook = await reportService.exportCompletionsToExcel(
      req.user.organisationId,
      result.completions
    );
    
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=training_completions_${new Date().toISOString().split('T')[0]}.xlsx`);
    
    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    next(error);
  }
});

module.exports = router;

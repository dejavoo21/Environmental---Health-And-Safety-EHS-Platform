/**
 * Public API Routes - Phase 10
 * External API endpoints using X-API-Key authentication
 */

const express = require('express');
const router = express.Router();
const { apiKeyAuth, requireScopes, apiRequestLogger, apiErrorHandler } = require('../middleware/apiAuth');
const { query } = require('../config/db');
const { AppError } = require('../utils/appError');

// Apply API key authentication and logging to all routes
router.use(apiRequestLogger);
router.use(apiKeyAuth);

// =====================================================
// API INFO
// =====================================================

/**
 * @route   GET /api/public/v1
 * @desc    API info and status
 * @access  API Key Required
 */
router.get('/', async (req, res) => {
  res.json({
    api: 'EHS Platform Public API',
    version: 'v1',
    client: req.apiClient.name,
    scopes: req.apiClient.scopes,
    rate_limit: {
      tier: req.apiClient.rateLimitTier,
      remaining: res.get('X-RateLimit-Remaining'),
      reset: res.get('X-RateLimit-Reset')
    }
  });
});

// =====================================================
// INCIDENTS
// =====================================================

/**
 * @route   GET /api/public/v1/incidents
 * @desc    List incidents
 * @access  incidents:read scope
 */
router.get('/incidents', requireScopes('incidents:read'), async (req, res, next) => {
  try {
    const { page = 1, limit = 50, status, severity, start_date, end_date } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);
    
    let whereClause = 'WHERE i.organisation_id = $1';
    const params = [req.apiClient.organisationId];
    
    if (status) {
      params.push(status);
      whereClause += ` AND i.status = $${params.length}`;
    }
    
    if (severity) {
      params.push(severity);
      whereClause += ` AND i.severity = $${params.length}`;
    }
    
    if (start_date) {
      params.push(start_date);
      whereClause += ` AND i.incident_date >= $${params.length}`;
    }
    
    if (end_date) {
      params.push(end_date);
      whereClause += ` AND i.incident_date <= $${params.length}`;
    }
    
    const countResult = await query(
      `SELECT COUNT(*) FROM incidents i ${whereClause}`,
      params
    );
    
    const result = await query(
      `SELECT i.id, i.title, i.description, i.incident_date, i.location_id, 
              i.status, i.severity, i.incident_type, i.is_confidential,
              i.created_at, i.updated_at,
              l.name as location_name,
              u.name as reported_by_name, u.email as reported_by_email
       FROM incidents i
       LEFT JOIN locations l ON l.id = i.location_id
       LEFT JOIN users u ON u.id = i.reported_by
       ${whereClause}
       ORDER BY i.incident_date DESC
       LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
      [...params, parseInt(limit), offset]
    );
    
    return res.json({
      data: result.rows,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: parseInt(countResult.rows[0].count),
        total_pages: Math.ceil(countResult.rows[0].count / parseInt(limit))
      }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   GET /api/public/v1/incidents/:id
 * @desc    Get incident by ID
 * @access  incidents:read scope
 */
router.get('/incidents/:id', requireScopes('incidents:read'), async (req, res, next) => {
  try {
    const result = await query(
      `SELECT i.*, l.name as location_name,
              u.name as reported_by_name, u.email as reported_by_email
       FROM incidents i
       LEFT JOIN locations l ON l.id = i.location_id
       LEFT JOIN users u ON u.id = i.reported_by
       WHERE i.id = $1 AND i.organisation_id = $2`,
      [req.params.id, req.apiClient.organisationId]
    );
    
    if (result.rowCount === 0) {
      throw new AppError('Incident not found', 404, 'NOT_FOUND');
    }
    
    return res.json({ data: result.rows[0] });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   POST /api/public/v1/incidents
 * @desc    Create an incident
 * @access  incidents:write scope
 */
router.post('/incidents', requireScopes('incidents:write'), async (req, res, next) => {
  try {
    const { title, description, incident_date, location_id, severity, incident_type, is_confidential } = req.body;
    
    if (!title || !incident_date) {
      throw new AppError('Title and incident_date are required', 400, 'VALIDATION_ERROR');
    }
    
    const result = await query(
      `INSERT INTO incidents (
         organisation_id, title, description, incident_date, location_id,
         severity, incident_type, is_confidential, status
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'open')
       RETURNING id, title, status, severity, created_at`,
      [
        req.apiClient.organisationId,
        title,
        description,
        incident_date,
        location_id,
        severity || 'medium',
        incident_type || 'near_miss',
        is_confidential || false
      ]
    );
    
    return res.status(201).json({ data: result.rows[0] });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   PUT /api/public/v1/incidents/:id
 * @desc    Update an incident
 * @access  incidents:write scope
 */
router.put('/incidents/:id', requireScopes('incidents:write'), async (req, res, next) => {
  try {
    const { title, description, status, severity, incident_type, location_id } = req.body;
    
    // Verify incident exists and belongs to org
    const existing = await query(
      `SELECT id FROM incidents WHERE id = $1 AND organisation_id = $2`,
      [req.params.id, req.apiClient.organisationId]
    );
    
    if (existing.rowCount === 0) {
      throw new AppError('Incident not found', 404, 'NOT_FOUND');
    }
    
    const result = await query(
      `UPDATE incidents SET
         title = COALESCE($1, title),
         description = COALESCE($2, description),
         status = COALESCE($3, status),
         severity = COALESCE($4, severity),
         incident_type = COALESCE($5, incident_type),
         location_id = COALESCE($6, location_id),
         updated_at = NOW()
       WHERE id = $7
       RETURNING id, title, status, severity, updated_at`,
      [title, description, status, severity, incident_type, location_id, req.params.id]
    );
    
    return res.json({ data: result.rows[0] });
  } catch (error) {
    next(error);
  }
});

// =====================================================
// ACTIONS
// =====================================================

/**
 * @route   GET /api/public/v1/actions
 * @desc    List actions
 * @access  actions:read scope
 */
router.get('/actions', requireScopes('actions:read'), async (req, res, next) => {
  try {
    const { page = 1, limit = 50, status, priority, assigned_to, overdue } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);
    
    let whereClause = 'WHERE a.organisation_id = $1';
    const params = [req.apiClient.organisationId];
    
    if (status) {
      params.push(status);
      whereClause += ` AND a.status = $${params.length}`;
    }
    
    if (priority) {
      params.push(priority);
      whereClause += ` AND a.priority = $${params.length}`;
    }
    
    if (assigned_to) {
      params.push(assigned_to);
      whereClause += ` AND a.assigned_to = $${params.length}`;
    }
    
    if (overdue === 'true') {
      whereClause += ` AND a.due_date < NOW() AND a.status NOT IN ('completed', 'cancelled')`;
    }
    
    const countResult = await query(
      `SELECT COUNT(*) FROM actions a ${whereClause}`,
      params
    );
    
    const result = await query(
      `SELECT a.id, a.title, a.description, a.due_date, a.status, a.priority,
              a.source_type, a.source_id, a.created_at, a.updated_at,
              u.name as assigned_to_name, u.email as assigned_to_email
       FROM actions a
       LEFT JOIN users u ON u.id = a.assigned_to
       ${whereClause}
       ORDER BY a.due_date ASC
       LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
      [...params, parseInt(limit), offset]
    );
    
    return res.json({
      data: result.rows,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: parseInt(countResult.rows[0].count),
        total_pages: Math.ceil(countResult.rows[0].count / parseInt(limit))
      }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   GET /api/public/v1/actions/:id
 * @desc    Get action by ID
 * @access  actions:read scope
 */
router.get('/actions/:id', requireScopes('actions:read'), async (req, res, next) => {
  try {
    const result = await query(
      `SELECT a.*, u.name as assigned_to_name, u.email as assigned_to_email
       FROM actions a
       LEFT JOIN users u ON u.id = a.assigned_to
       WHERE a.id = $1 AND a.organisation_id = $2`,
      [req.params.id, req.apiClient.organisationId]
    );
    
    if (result.rowCount === 0) {
      throw new AppError('Action not found', 404, 'NOT_FOUND');
    }
    
    return res.json({ data: result.rows[0] });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   POST /api/public/v1/actions
 * @desc    Create an action
 * @access  actions:write scope
 */
router.post('/actions', requireScopes('actions:write'), async (req, res, next) => {
  try {
    const { title, description, due_date, priority, assigned_to, source_type, source_id } = req.body;
    
    if (!title || !due_date) {
      throw new AppError('Title and due_date are required', 400, 'VALIDATION_ERROR');
    }
    
    const result = await query(
      `INSERT INTO actions (
         organisation_id, title, description, due_date, priority,
         assigned_to, source_type, source_id, status
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'open')
       RETURNING id, title, status, priority, due_date, created_at`,
      [
        req.apiClient.organisationId,
        title,
        description,
        due_date,
        priority || 'medium',
        assigned_to,
        source_type || 'manual',
        source_id
      ]
    );
    
    return res.status(201).json({ data: result.rows[0] });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   PUT /api/public/v1/actions/:id
 * @desc    Update an action
 * @access  actions:write scope
 */
router.put('/actions/:id', requireScopes('actions:write'), async (req, res, next) => {
  try {
    const { title, description, status, priority, due_date, assigned_to, completion_notes } = req.body;
    
    const existing = await query(
      `SELECT id FROM actions WHERE id = $1 AND organisation_id = $2`,
      [req.params.id, req.apiClient.organisationId]
    );
    
    if (existing.rowCount === 0) {
      throw new AppError('Action not found', 404, 'NOT_FOUND');
    }
    
    const result = await query(
      `UPDATE actions SET
         title = COALESCE($1, title),
         description = COALESCE($2, description),
         status = COALESCE($3, status),
         priority = COALESCE($4, priority),
         due_date = COALESCE($5, due_date),
         assigned_to = COALESCE($6, assigned_to),
         completion_notes = COALESCE($7, completion_notes),
         completed_at = CASE WHEN $3 = 'completed' THEN NOW() ELSE completed_at END,
         updated_at = NOW()
       WHERE id = $8
       RETURNING id, title, status, priority, due_date, updated_at`,
      [title, description, status, priority, due_date, assigned_to, completion_notes, req.params.id]
    );
    
    return res.json({ data: result.rows[0] });
  } catch (error) {
    next(error);
  }
});

// =====================================================
// RISKS
// =====================================================

/**
 * @route   GET /api/public/v1/risks
 * @desc    List risks
 * @access  risks:read scope
 */
router.get('/risks', requireScopes('risks:read'), async (req, res, next) => {
  try {
    const { page = 1, limit = 50, status, risk_level, category } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);
    
    let whereClause = 'WHERE r.organisation_id = $1';
    const params = [req.apiClient.organisationId];
    
    if (status) {
      params.push(status);
      whereClause += ` AND r.status = $${params.length}`;
    }
    
    if (risk_level) {
      params.push(risk_level);
      whereClause += ` AND r.risk_level = $${params.length}`;
    }
    
    if (category) {
      params.push(category);
      whereClause += ` AND r.category = $${params.length}`;
    }
    
    const countResult = await query(
      `SELECT COUNT(*) FROM risks r ${whereClause}`,
      params
    );
    
    const result = await query(
      `SELECT r.id, r.title, r.description, r.category, r.status, r.risk_level,
              r.likelihood, r.consequence, r.risk_score, r.residual_risk_level,
              r.location_id, r.created_at, r.updated_at,
              l.name as location_name
       FROM risks r
       LEFT JOIN locations l ON l.id = r.location_id
       ${whereClause}
       ORDER BY r.risk_score DESC
       LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
      [...params, parseInt(limit), offset]
    );
    
    return res.json({
      data: result.rows,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: parseInt(countResult.rows[0].count),
        total_pages: Math.ceil(countResult.rows[0].count / parseInt(limit))
      }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   GET /api/public/v1/risks/:id
 * @desc    Get risk by ID
 * @access  risks:read scope
 */
router.get('/risks/:id', requireScopes('risks:read'), async (req, res, next) => {
  try {
    const result = await query(
      `SELECT r.*, l.name as location_name
       FROM risks r
       LEFT JOIN locations l ON l.id = r.location_id
       WHERE r.id = $1 AND r.organisation_id = $2`,
      [req.params.id, req.apiClient.organisationId]
    );
    
    if (result.rowCount === 0) {
      throw new AppError('Risk not found', 404, 'NOT_FOUND');
    }
    
    return res.json({ data: result.rows[0] });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   POST /api/public/v1/risks
 * @desc    Create a risk
 * @access  risks:write scope
 */
router.post('/risks', requireScopes('risks:write'), async (req, res, next) => {
  try {
    const { title, description, category, likelihood, consequence, location_id } = req.body;
    
    if (!title || !category || !likelihood || !consequence) {
      throw new AppError('Title, category, likelihood, and consequence are required', 400, 'VALIDATION_ERROR');
    }
    
    // Calculate risk score
    const likelihoodScores = { rare: 1, unlikely: 2, possible: 3, likely: 4, almost_certain: 5 };
    const consequenceScores = { negligible: 1, minor: 2, moderate: 3, major: 4, catastrophic: 5 };
    const riskScore = (likelihoodScores[likelihood] || 3) * (consequenceScores[consequence] || 3);
    
    // Determine risk level from score
    let riskLevel = 'low';
    if (riskScore >= 15) riskLevel = 'critical';
    else if (riskScore >= 10) riskLevel = 'high';
    else if (riskScore >= 5) riskLevel = 'medium';
    
    const result = await query(
      `INSERT INTO risks (
         organisation_id, title, description, category, likelihood,
         consequence, risk_score, risk_level, location_id, status
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'active')
       RETURNING id, title, risk_level, risk_score, status, created_at`,
      [
        req.apiClient.organisationId,
        title,
        description,
        category,
        likelihood,
        consequence,
        riskScore,
        riskLevel,
        location_id
      ]
    );
    
    return res.status(201).json({ data: result.rows[0] });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   PUT /api/public/v1/risks/:id
 * @desc    Update a risk
 * @access  risks:write scope
 */
router.put('/risks/:id', requireScopes('risks:write'), async (req, res, next) => {
  try {
    const { title, description, status, category, likelihood, consequence, location_id } = req.body;
    
    const existing = await query(
      `SELECT id FROM risks WHERE id = $1 AND organisation_id = $2`,
      [req.params.id, req.apiClient.organisationId]
    );
    
    if (existing.rowCount === 0) {
      throw new AppError('Risk not found', 404, 'NOT_FOUND');
    }
    
    const result = await query(
      `UPDATE risks SET
         title = COALESCE($1, title),
         description = COALESCE($2, description),
         status = COALESCE($3, status),
         category = COALESCE($4, category),
         likelihood = COALESCE($5, likelihood),
         consequence = COALESCE($6, consequence),
         location_id = COALESCE($7, location_id),
         updated_at = NOW()
       WHERE id = $8
       RETURNING id, title, risk_level, risk_score, status, updated_at`,
      [title, description, status, category, likelihood, consequence, location_id, req.params.id]
    );
    
    return res.json({ data: result.rows[0] });
  } catch (error) {
    next(error);
  }
});

// =====================================================
// TRAINING
// =====================================================

/**
 * @route   GET /api/public/v1/training/assignments
 * @desc    List training assignments
 * @access  training:read scope
 */
router.get('/training/assignments', requireScopes('training:read'), async (req, res, next) => {
  try {
    const { page = 1, limit = 50, status, user_id, course_id, overdue } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);
    
    let whereClause = 'WHERE ta.organisation_id = $1';
    const params = [req.apiClient.organisationId];
    
    if (status) {
      params.push(status);
      whereClause += ` AND ta.status = $${params.length}`;
    }
    
    if (user_id) {
      params.push(user_id);
      whereClause += ` AND ta.user_id = $${params.length}`;
    }
    
    if (course_id) {
      params.push(course_id);
      whereClause += ` AND ta.training_course_id = $${params.length}`;
    }
    
    if (overdue === 'true') {
      whereClause += ` AND ta.due_date < NOW() AND ta.status NOT IN ('completed', 'exempt')`;
    }
    
    const countResult = await query(
      `SELECT COUNT(*) FROM training_assignments ta ${whereClause}`,
      params
    );
    
    const result = await query(
      `SELECT ta.id, ta.user_id, ta.training_course_id, ta.status, ta.due_date,
              ta.completed_at, ta.score, ta.created_at, ta.updated_at,
              u.name as user_name, u.email as user_email,
              tc.title as course_title, tc.course_type
       FROM training_assignments ta
       JOIN users u ON u.id = ta.user_id
       JOIN training_courses tc ON tc.id = ta.training_course_id
       ${whereClause}
       ORDER BY ta.due_date ASC
       LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
      [...params, parseInt(limit), offset]
    );
    
    return res.json({
      data: result.rows,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: parseInt(countResult.rows[0].count),
        total_pages: Math.ceil(countResult.rows[0].count / parseInt(limit))
      }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   GET /api/public/v1/training/courses
 * @desc    List training courses
 * @access  training:read scope
 */
router.get('/training/courses', requireScopes('training:read'), async (req, res, next) => {
  try {
    const { page = 1, limit = 50, is_active } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);
    
    let whereClause = 'WHERE organisation_id = $1';
    const params = [req.apiClient.organisationId];
    
    if (is_active !== undefined) {
      params.push(is_active === 'true');
      whereClause += ` AND is_active = $${params.length}`;
    }
    
    const countResult = await query(
      `SELECT COUNT(*) FROM training_courses ${whereClause}`,
      params
    );
    
    const result = await query(
      `SELECT id, title, description, course_type, duration_minutes, 
              is_active, validity_period_months, created_at, updated_at
       FROM training_courses
       ${whereClause}
       ORDER BY title
       LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
      [...params, parseInt(limit), offset]
    );
    
    return res.json({
      data: result.rows,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: parseInt(countResult.rows[0].count),
        total_pages: Math.ceil(countResult.rows[0].count / parseInt(limit))
      }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   POST /api/public/v1/training/assignments
 * @desc    Create a training assignment
 * @access  training:write scope
 */
router.post('/training/assignments', requireScopes('training:write'), async (req, res, next) => {
  try {
    const { user_id, training_course_id, due_date, assigned_by } = req.body;
    
    if (!user_id || !training_course_id || !due_date) {
      throw new AppError('user_id, training_course_id, and due_date are required', 400, 'VALIDATION_ERROR');
    }
    
    // Verify user and course belong to org
    const userCheck = await query(
      `SELECT id FROM users WHERE id = $1 AND organisation_id = $2`,
      [user_id, req.apiClient.organisationId]
    );
    
    if (userCheck.rowCount === 0) {
      throw new AppError('User not found', 404, 'NOT_FOUND');
    }
    
    const courseCheck = await query(
      `SELECT id FROM training_courses WHERE id = $1 AND organisation_id = $2`,
      [training_course_id, req.apiClient.organisationId]
    );
    
    if (courseCheck.rowCount === 0) {
      throw new AppError('Training course not found', 404, 'NOT_FOUND');
    }
    
    const result = await query(
      `INSERT INTO training_assignments (
         organisation_id, user_id, training_course_id, due_date, 
         assigned_by, status
       ) VALUES ($1, $2, $3, $4, $5, 'assigned')
       RETURNING id, user_id, training_course_id, status, due_date, created_at`,
      [
        req.apiClient.organisationId,
        user_id,
        training_course_id,
        due_date,
        assigned_by
      ]
    );
    
    return res.status(201).json({ data: result.rows[0] });
  } catch (error) {
    next(error);
  }
});

// =====================================================
// USERS
// =====================================================

/**
 * @route   GET /api/public/v1/users
 * @desc    List users
 * @access  users:read scope
 */
router.get('/users', requireScopes('users:read'), async (req, res, next) => {
  try {
    const { page = 1, limit = 50, role, is_active } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);
    
    let whereClause = 'WHERE organisation_id = $1';
    const params = [req.apiClient.organisationId];
    
    if (role) {
      params.push(role);
      whereClause += ` AND role = $${params.length}`;
    }
    
    if (is_active !== undefined) {
      params.push(is_active === 'true');
      whereClause += ` AND is_active = $${params.length}`;
    }
    
    const countResult = await query(
      `SELECT COUNT(*) FROM users ${whereClause}`,
      params
    );
    
    const result = await query(
      `SELECT id, email, name, role, department, job_title, 
              is_active, last_login_at, created_at
       FROM users
       ${whereClause}
       ORDER BY name
       LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
      [...params, parseInt(limit), offset]
    );
    
    return res.json({
      data: result.rows,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: parseInt(countResult.rows[0].count),
        total_pages: Math.ceil(countResult.rows[0].count / parseInt(limit))
      }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   GET /api/public/v1/users/:id
 * @desc    Get user by ID
 * @access  users:read scope
 */
router.get('/users/:id', requireScopes('users:read'), async (req, res, next) => {
  try {
    const result = await query(
      `SELECT id, email, name, role, department, job_title,
              is_active, last_login_at, created_at
       FROM users
       WHERE id = $1 AND organisation_id = $2`,
      [req.params.id, req.apiClient.organisationId]
    );
    
    if (result.rowCount === 0) {
      throw new AppError('User not found', 404, 'NOT_FOUND');
    }
    
    return res.json({ data: result.rows[0] });
  } catch (error) {
    next(error);
  }
});

// =====================================================
// LOCATIONS
// =====================================================

/**
 * @route   GET /api/public/v1/locations
 * @desc    List locations
 * @access  Any valid API key
 */
router.get('/locations', async (req, res, next) => {
  try {
    const result = await query(
      `SELECT id, name, address, parent_id, is_active, created_at
       FROM locations
       WHERE organisation_id = $1 AND is_active = true
       ORDER BY name`,
      [req.apiClient.organisationId]
    );
    
    return res.json({ data: result.rows });
  } catch (error) {
    next(error);
  }
});

// Apply error handler
router.use(apiErrorHandler);

module.exports = router;

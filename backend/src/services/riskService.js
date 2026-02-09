/**
 * RiskService - Phase 9
 * Handles risk register CRUD operations, scoring, and status management
 */

const { query, withTransaction } = require('../config/db');
const { AppError } = require('../utils/appError');
const { recordAudit } = require('../utils/audit');

// =====================================================
// SCORING HELPERS
// =====================================================

/**
 * Calculate risk level from score
 */
const calculateLevel = (score) => {
  if (score >= 17) return 'extreme';
  if (score >= 10) return 'high';
  if (score >= 5) return 'medium';
  return 'low';
};

/**
 * Calculate score from likelihood and impact
 */
const calculateScore = (likelihood, impact) => {
  return likelihood * impact;
};

/**
 * Get next review date based on frequency
 */
const calculateNextReviewDate = (frequency, customDays = null) => {
  const today = new Date();
  switch (frequency) {
    case 'monthly':
      return new Date(today.setMonth(today.getMonth() + 1));
    case 'quarterly':
      return new Date(today.setMonth(today.getMonth() + 3));
    case 'semi_annually':
      return new Date(today.setMonth(today.getMonth() + 6));
    case 'annually':
      return new Date(today.setFullYear(today.getFullYear() + 1));
    case 'custom':
      return new Date(today.setDate(today.getDate() + (customDays || 90)));
    default:
      return new Date(today.setMonth(today.getMonth() + 3));
  }
};

// =====================================================
// CATEGORY FUNCTIONS
// =====================================================

/**
 * List risk categories
 */
const listCategories = async (organisationId, options = {}) => {
  const { activeOnly = true } = options;
  
  let sql = `
    SELECT id, organisation_id, name, code, description, category_type, colour,
           display_order, is_active, created_at, updated_at
    FROM risk_categories
    WHERE (organisation_id = $1 OR organisation_id IS NULL)
  `;
  const values = [organisationId];
  
  if (activeOnly) {
    sql += ` AND is_active = TRUE`;
  }
  
  sql += ` ORDER BY display_order, name`;
  
  const result = await query(sql, values);
  
  // Add risk count for each category
  for (const row of result.rows) {
    const countResult = await query(
      'SELECT COUNT(*) FROM risks WHERE category_id = $1 AND organisation_id = $2',
      [row.id, organisationId]
    );
    row.risk_count = parseInt(countResult.rows[0].count, 10);
  }
  
  return {
    categories: result.rows.map(mapCategoryRow)
  };
};

/**
 * Get category by ID
 */
const getCategoryById = async (categoryId, organisationId) => {
  const result = await query(
    `SELECT * FROM risk_categories 
     WHERE id = $1 AND (organisation_id = $2 OR organisation_id IS NULL)`,
    [categoryId, organisationId]
  );
  
  if (result.rows.length === 0) {
    throw new AppError('Category not found', 404, 'CATEGORY_NOT_FOUND');
  }
  
  return mapCategoryRow(result.rows[0]);
};

/**
 * Create a custom category
 */
const createCategory = async (organisationId, data, userId) => {
  const { name, code, description, colour = '#607D8B', displayOrder = 100 } = data;
  
  // Check for duplicate code
  const existing = await query(
    `SELECT id FROM risk_categories 
     WHERE code = $1 AND (organisation_id = $2 OR organisation_id IS NULL)`,
    [code.toUpperCase(), organisationId]
  );
  
  if (existing.rows.length > 0) {
    throw new AppError('Category code already exists', 409, 'DUPLICATE');
  }
  
  const result = await query(
    `INSERT INTO risk_categories 
     (organisation_id, name, code, description, category_type, colour, display_order, is_active)
     VALUES ($1, $2, $3, $4, 'custom', $5, $6, TRUE)
     RETURNING *`,
    [organisationId, name, code.toUpperCase(), description, colour, displayOrder]
  );
  
  const category = mapCategoryRow(result.rows[0]);
  
  await recordAudit({
    eventType: 'created',
    entityType: 'risk_category',
    entityId: category.id,
    userId,
    newValue: category
  });
  
  return category;
};

/**
 * Update a category
 */
const updateCategory = async (categoryId, organisationId, data, userId) => {
  const category = await getCategoryById(categoryId, organisationId);
  
  // Cannot modify system categories
  if (!category.organisationId) {
    throw new AppError('Cannot modify system category', 403, 'FORBIDDEN');
  }
  
  const { name, description, colour, displayOrder, isActive } = data;
  
  const result = await query(
    `UPDATE risk_categories 
     SET name = COALESCE($1, name),
         description = COALESCE($2, description),
         colour = COALESCE($3, colour),
         display_order = COALESCE($4, display_order),
         is_active = COALESCE($5, is_active)
     WHERE id = $6
     RETURNING *`,
    [name, description, colour, displayOrder, isActive, categoryId]
  );
  
  const updated = mapCategoryRow(result.rows[0]);
  
  await recordAudit({
    eventType: 'updated',
    entityType: 'risk_category',
    entityId: categoryId,
    userId,
    oldValue: category,
    newValue: updated
  });
  
  return updated;
};

/**
 * Delete/deactivate a category
 */
const deleteCategory = async (categoryId, organisationId, userId) => {
  const category = await getCategoryById(categoryId, organisationId);
  
  if (!category.organisationId) {
    throw new AppError('Cannot delete system category', 403, 'FORBIDDEN');
  }
  
  // Check for risks using this category
  const riskCount = await query(
    'SELECT COUNT(*) FROM risks WHERE category_id = $1',
    [categoryId]
  );
  
  if (parseInt(riskCount.rows[0].count, 10) > 0) {
    throw new AppError('Cannot delete category with existing risks. Deactivate instead.', 409, 'CATEGORY_HAS_RISKS');
  }
  
  await query('DELETE FROM risk_categories WHERE id = $1', [categoryId]);
  
  await recordAudit({
    eventType: 'deleted',
    entityType: 'risk_category',
    entityId: categoryId,
    userId,
    oldValue: category
  });
  
  return { success: true };
};

const mapCategoryRow = (row) => ({
  id: row.id,
  organisationId: row.organisation_id,
  name: row.name,
  code: row.code,
  description: row.description,
  categoryType: row.category_type,
  colour: row.colour,
  displayOrder: row.display_order,
  isActive: row.is_active,
  riskCount: row.risk_count || 0,
  createdAt: row.created_at,
  updatedAt: row.updated_at
});

// =====================================================
// RISK FUNCTIONS
// =====================================================

/**
 * Generate next risk reference number
 */
const generateReferenceNumber = async (organisationId) => {
  // Get org prefix
  const orgResult = await query(
    'SELECT risk_reference_prefix FROM organisations WHERE id = $1',
    [organisationId]
  );
  const prefix = orgResult.rows[0]?.risk_reference_prefix || 'RISK';
  
  // Get next sequence
  const currentYear = new Date().getFullYear();
  const seqResult = await query(
    `SELECT COALESCE(MAX(
      CAST(SPLIT_PART(reference_number, '-', 3) AS INTEGER)
    ), 0) + 1 AS next_seq
    FROM risks
    WHERE organisation_id = $1
      AND reference_number LIKE $2`,
    [organisationId, `${prefix}-${currentYear}-%`]
  );
  
  const nextSeq = seqResult.rows[0].next_seq;
  return `${prefix}-${currentYear}-${String(nextSeq).padStart(4, '0')}`;
};

/**
 * List risks with filters and pagination
 */
const listRisks = async (organisationId, options = {}) => {
  const {
    status,
    level,
    categoryId,
    siteId,
    ownerId,
    reviewOverdue,
    search,
    page = 1,
    limit = 20,
    sortBy = 'created_at',
    sortOrder = 'desc'
  } = options;
  
  let sql = `
    SELECT r.id, r.reference_number, r.title, r.description, r.status,
           r.inherent_likelihood, r.inherent_impact, r.inherent_score, r.inherent_level,
           r.residual_likelihood, r.residual_impact, r.residual_score, r.residual_level,
           r.next_review_date, r.created_at, r.updated_at,
           c.id AS category_id, c.name AS category_name, c.colour AS category_colour,
           u.id AS owner_user_id, u.name AS owner_name,
           (SELECT COUNT(*) FROM risk_controls WHERE risk_id = r.id AND is_active = TRUE) AS control_count,
           (SELECT COUNT(*) FROM risk_links WHERE risk_id = r.id) AS link_count,
           CASE WHEN r.next_review_date < CURRENT_DATE THEN TRUE ELSE FALSE END AS review_overdue
    FROM risks r
    LEFT JOIN risk_categories c ON r.category_id = c.id
    LEFT JOIN users u ON r.owner_user_id = u.id
    WHERE r.organisation_id = $1
  `;
  
  const values = [organisationId];
  let paramIndex = 2;
  
  if (status) {
    sql += ` AND r.status = $${paramIndex}`;
    values.push(status);
    paramIndex++;
  }
  
  if (level) {
    sql += ` AND r.residual_level = $${paramIndex}`;
    values.push(level);
    paramIndex++;
  }
  
  if (categoryId) {
    sql += ` AND r.category_id = $${paramIndex}`;
    values.push(categoryId);
    paramIndex++;
  }
  
  if (siteId) {
    sql += ` AND EXISTS (SELECT 1 FROM risk_sites rs WHERE rs.risk_id = r.id AND rs.site_id = $${paramIndex})`;
    values.push(siteId);
    paramIndex++;
  }
  
  if (ownerId) {
    sql += ` AND r.owner_user_id = $${paramIndex}`;
    values.push(ownerId);
    paramIndex++;
  }
  
  if (reviewOverdue === 'true' || reviewOverdue === true) {
    sql += ` AND r.next_review_date < CURRENT_DATE`;
  }
  
  if (search) {
    sql += ` AND (r.title ILIKE $${paramIndex} OR r.description ILIKE $${paramIndex} OR r.hazard ILIKE $${paramIndex})`;
    values.push(`%${search}%`);
    paramIndex++;
  }
  
  // Count total before pagination
  const countResult = await query(
    `SELECT COUNT(*) FROM (${sql}) AS filtered`,
    values
  );
  const totalItems = parseInt(countResult.rows[0].count, 10);
  
  // Allowed sort columns
  const allowedSorts = ['created_at', 'residual_score', 'inherent_score', 'next_review_date', 'title', 'updated_at'];
  const safeSort = allowedSorts.includes(sortBy) ? sortBy : 'created_at';
  const safeOrder = sortOrder.toLowerCase() === 'asc' ? 'ASC' : 'DESC';
  
  sql += ` ORDER BY r.${safeSort} ${safeOrder}`;
  sql += ` LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
  values.push(limit, (page - 1) * limit);
  
  const result = await query(sql, values);
  
  // Get sites for each risk
  const risks = await Promise.all(result.rows.map(async (row) => {
    const sitesResult = await query(
      `SELECT s.id, s.name, rs.is_primary 
       FROM risk_sites rs 
       JOIN sites s ON rs.site_id = s.id 
       WHERE rs.risk_id = $1 
       ORDER BY rs.is_primary DESC, s.name`,
      [row.id]
    );
    return mapRiskRow(row, sitesResult.rows);
  }));
  
  // Get summary counts
  const summaryResult = await query(
    `SELECT 
       COUNT(*) AS total,
       COUNT(*) FILTER (WHERE residual_level = 'low') AS low_count,
       COUNT(*) FILTER (WHERE residual_level = 'medium') AS medium_count,
       COUNT(*) FILTER (WHERE residual_level = 'high') AS high_count,
       COUNT(*) FILTER (WHERE residual_level = 'extreme') AS extreme_count,
       COUNT(*) FILTER (WHERE next_review_date < CURRENT_DATE) AS overdue_count
     FROM risks WHERE organisation_id = $1`,
    [organisationId]
  );
  
  return {
    risks,
    pagination: {
      page,
      limit,
      totalItems,
      totalPages: Math.ceil(totalItems / limit)
    },
    summary: {
      total: parseInt(summaryResult.rows[0].total, 10),
      byLevel: {
        low: parseInt(summaryResult.rows[0].low_count, 10),
        medium: parseInt(summaryResult.rows[0].medium_count, 10),
        high: parseInt(summaryResult.rows[0].high_count, 10),
        extreme: parseInt(summaryResult.rows[0].extreme_count, 10)
      },
      reviewOverdue: parseInt(summaryResult.rows[0].overdue_count, 10)
    }
  };
};

/**
 * Get risk by ID with full details
 */
const getRiskById = async (riskId, organisationId) => {
  const result = await query(
    `SELECT r.*, 
            c.id AS category_id, c.name AS category_name, c.colour AS category_colour,
            u.id AS owner_user_id, u.name AS owner_name, u.email AS owner_email,
            cr.id AS creator_id, cr.name AS creator_name
     FROM risks r
     LEFT JOIN risk_categories c ON r.category_id = c.id
     LEFT JOIN users u ON r.owner_user_id = u.id
     LEFT JOIN users cr ON r.created_by = cr.id
     WHERE r.id = $1 AND r.organisation_id = $2`,
    [riskId, organisationId]
  );
  
  if (result.rows.length === 0) {
    throw new AppError('Risk not found', 404, 'RISK_NOT_FOUND');
  }
  
  const row = result.rows[0];
  
  // Get sites
  const sitesResult = await query(
    `SELECT s.id, s.name, rs.is_primary 
     FROM risk_sites rs 
     JOIN sites s ON rs.site_id = s.id 
     WHERE rs.risk_id = $1 
     ORDER BY rs.is_primary DESC, s.name`,
    [riskId]
  );
  
  // Get controls
  const controlsResult = await query(
    `SELECT rc.*, u.name AS owner_name
     FROM risk_controls rc
     LEFT JOIN users u ON rc.owner_user_id = u.id
     WHERE rc.risk_id = $1 AND rc.is_active = TRUE
     ORDER BY rc.sort_order, rc.created_at`,
    [riskId]
  );
  
  // Get links
  const linksResult = await query(
    `SELECT rl.*, u.name AS linked_by_name
     FROM risk_links rl
     LEFT JOIN users u ON rl.linked_by = u.id
     WHERE rl.risk_id = $1
     ORDER BY rl.linked_at DESC`,
    [riskId]
  );
  
  // Get recent reviews
  const reviewsResult = await query(
    `SELECT rr.*, u.name AS reviewer_name
     FROM risk_reviews rr
     LEFT JOIN users u ON rr.reviewer_user_id = u.id
     WHERE rr.risk_id = $1
     ORDER BY rr.reviewed_at DESC
     LIMIT 5`,
    [riskId]
  );
  
  return mapRiskDetailRow(row, sitesResult.rows, controlsResult.rows, linksResult.rows, reviewsResult.rows);
};

/**
 * Create a new risk
 */
const createRisk = async (organisationId, data, userId) => {
  // Support both camelCase and snake_case from frontend
  const {
    title,
    description,
    categoryId = data.category_id,
    ownerUserId = data.owner_id || data.owner_user_id,
    hazard = data.hazard_source,
    cause = data.cause,
    consequence = data.potential_consequences,
    inherentLikelihood = data.inherent_likelihood,
    inherentImpact = data.inherent_impact,
    residualLikelihood = data.residual_likelihood,
    residualImpact = data.residual_impact,
    status = 'emerging',
    reviewFrequency = data.review_frequency || 'quarterly',
    reviewFrequencyDays = data.review_frequency_days,
    siteIds = data.site_ids || []
  } = data;
  
  // Validate category exists
  await getCategoryById(categoryId, organisationId);
  
  // Calculate levels
  const inherentScore = calculateScore(inherentLikelihood, inherentImpact);
  const inherentLevel = calculateLevel(inherentScore);
  
  let residualLevel = null;
  if (residualLikelihood && residualImpact) {
    const residualScore = calculateScore(residualLikelihood, residualImpact);
    residualLevel = calculateLevel(residualScore);
  }
  
  // Generate reference number
  const referenceNumber = await generateReferenceNumber(organisationId);
  
  // Calculate next review date
  const nextReviewDate = calculateNextReviewDate(reviewFrequency, reviewFrequencyDays);
  
  const result = await withTransaction(async (client) => {
    // Insert risk
    const riskResult = await client.query(
      `INSERT INTO risks 
       (organisation_id, reference_number, title, description, category_id, owner_user_id,
        hazard, cause, consequence, inherent_likelihood, inherent_impact, inherent_level,
        residual_likelihood, residual_impact, residual_level, status, review_frequency,
        review_frequency_days, next_review_date, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20)
       RETURNING *`,
      [organisationId, referenceNumber, title, description, categoryId, ownerUserId,
       hazard, cause, consequence, inherentLikelihood, inherentImpact, inherentLevel,
       residualLikelihood, residualImpact, residualLevel, status, reviewFrequency,
       reviewFrequencyDays, nextReviewDate, userId]
    );
    
    const risk = riskResult.rows[0];
    
    // Insert sites
    for (let i = 0; i < siteIds.length; i++) {
      await client.query(
        `INSERT INTO risk_sites (risk_id, site_id, is_primary) VALUES ($1, $2, $3)`,
        [risk.id, siteIds[i], i === 0]
      );
    }
    
    return risk;
  });
  
  await recordAudit({
    eventType: 'created',
    entityType: 'risk',
    entityId: result.id,
    userId,
    newValue: { referenceNumber, title }
  });
  
  return {
    id: result.id,
    reference: result.reference_number,
    title: result.title,
    status: result.status,
    inherentScore,
    inherentLevel,
    residualScore: residualLikelihood && residualImpact ? calculateScore(residualLikelihood, residualImpact) : null,
    residualLevel,
    createdAt: result.created_at
  };
};

/**
 * Update an existing risk
 */
const updateRisk = async (riskId, organisationId, data, userId) => {
  const existing = await getRiskById(riskId, organisationId);
  
  const {
    title,
    description,
    categoryId,
    ownerUserId,
    hazard,
    cause,
    consequence,
    inherentLikelihood,
    inherentImpact,
    residualLikelihood,
    residualImpact,
    reviewFrequency,
    reviewFrequencyDays,
    siteIds
  } = data;
  
  // Recalculate levels if scores changed
  let inherentLevel = existing.inherentLevel;
  if (inherentLikelihood && inherentImpact) {
    const score = calculateScore(inherentLikelihood, inherentImpact);
    inherentLevel = calculateLevel(score);
  }
  
  let residualLevel = existing.residualLevel;
  if (residualLikelihood && residualImpact) {
    const score = calculateScore(residualLikelihood, residualImpact);
    residualLevel = calculateLevel(score);
  }
  
  const result = await withTransaction(async (client) => {
    const updateResult = await client.query(
      `UPDATE risks SET
         title = COALESCE($1, title),
         description = COALESCE($2, description),
         category_id = COALESCE($3, category_id),
         owner_user_id = COALESCE($4, owner_user_id),
         hazard = COALESCE($5, hazard),
         cause = COALESCE($6, cause),
         consequence = COALESCE($7, consequence),
         inherent_likelihood = COALESCE($8, inherent_likelihood),
         inherent_impact = COALESCE($9, inherent_impact),
         inherent_level = $10,
         residual_likelihood = COALESCE($11, residual_likelihood),
         residual_impact = COALESCE($12, residual_impact),
         residual_level = $13,
         review_frequency = COALESCE($14, review_frequency),
         review_frequency_days = COALESCE($15, review_frequency_days),
         updated_at = NOW()
       WHERE id = $16 AND organisation_id = $17
       RETURNING *`,
      [title, description, categoryId, ownerUserId, hazard, cause, consequence,
       inherentLikelihood, inherentImpact, inherentLevel,
       residualLikelihood, residualImpact, residualLevel,
       reviewFrequency, reviewFrequencyDays, riskId, organisationId]
    );
    
    // Update sites if provided
    if (siteIds && siteIds.length > 0) {
      await client.query('DELETE FROM risk_sites WHERE risk_id = $1', [riskId]);
      for (let i = 0; i < siteIds.length; i++) {
        await client.query(
          `INSERT INTO risk_sites (risk_id, site_id, is_primary) VALUES ($1, $2, $3)`,
          [riskId, siteIds[i], i === 0]
        );
      }
    }
    
    return updateResult.rows[0];
  });
  
  await recordAudit({
    eventType: 'updated',
    entityType: 'risk',
    entityId: riskId,
    userId,
    oldValue: existing,
    newValue: { title: result.title }
  });
  
  return {
    id: result.id,
    reference: result.reference_number,
    title: result.title,
    status: result.status,
    inherentScore: result.inherent_score,
    inherentLevel: result.inherent_level,
    residualScore: result.residual_score,
    residualLevel: result.residual_level,
    updatedAt: result.updated_at
  };
};

/**
 * Change risk status
 */
const changeStatus = async (riskId, organisationId, newStatus, justification, userId) => {
  const existing = await getRiskById(riskId, organisationId);
  const previousStatus = existing.status;
  
  // Validate status transitions
  const validTransitions = {
    'emerging': ['active', 'closed'],
    'active': ['under_review', 'closed', 'accepted'],
    'under_review': ['active', 'closed', 'accepted'],
    'closed': ['active'],
    'accepted': ['active', 'under_review', 'closed']
  };
  
  if (!validTransitions[previousStatus]?.includes(newStatus)) {
    throw new AppError(`Invalid status transition from ${previousStatus} to ${newStatus}`, 400, 'INVALID_STATUS_TRANSITION');
  }
  
  // Require justification for closure or acceptance
  if ((newStatus === 'closed' || newStatus === 'accepted') && !justification) {
    throw new AppError('Justification required for status change', 400, 'JUSTIFICATION_REQUIRED');
  }
  
  const updates = {
    status: newStatus,
    updated_at: 'NOW()'
  };
  
  if (newStatus === 'closed') {
    updates.closure_reason = justification;
  } else if (newStatus === 'accepted') {
    updates.acceptance_justification = justification;
  }
  
  const result = await query(
    `UPDATE risks SET
       status = $1::risk_status,
       closure_reason = CASE WHEN $1::risk_status = 'closed' THEN $2 ELSE closure_reason END,
       acceptance_justification = CASE WHEN $1::risk_status = 'accepted' THEN $2 ELSE acceptance_justification END,
       updated_at = NOW()
     WHERE id = $3 AND organisation_id = $4
     RETURNING *`,
    [newStatus, justification, riskId, organisationId]
  );
  
  await recordAudit({
    eventType: 'status_changed',
    entityType: 'risk',
    entityId: riskId,
    userId,
    oldValue: { status: previousStatus },
    newValue: { status: newStatus }
  });
  
  return {
    id: result.rows[0].id,
    reference: result.rows[0].reference_number,
    status: result.rows[0].status,
    previousStatus,
    closedAt: newStatus === 'closed' ? result.rows[0].updated_at : null
  };
};

/**
 * Soft delete (close) a risk
 */
const deleteRisk = async (riskId, organisationId, userId) => {
  const existing = await getRiskById(riskId, organisationId);
  
  await query(
    `UPDATE risks SET status = 'closed', closure_reason = 'Deleted by admin', updated_at = NOW()
     WHERE id = $1 AND organisation_id = $2`,
    [riskId, organisationId]
  );
  
  await recordAudit({
    eventType: 'deleted',
    entityType: 'risk',
    entityId: riskId,
    userId,
    oldValue: existing
  });
  
  return { success: true, message: 'Risk deleted successfully' };
};

// =====================================================
// MAPPING FUNCTIONS
// =====================================================

const mapRiskRow = (row, sites = []) => ({
  id: row.id,
  reference: row.reference_number,
  title: row.title,
  description: row.description,
  status: row.status,
  categoryId: row.category_id,
  categoryName: row.category_name,
  categoryColour: row.category_colour,
  inherentLikelihood: row.inherent_likelihood,
  inherentImpact: row.inherent_impact,
  inherentScore: row.inherent_score,
  inherentLevel: row.inherent_level,
  residualLikelihood: row.residual_likelihood,
  residualImpact: row.residual_impact,
  residualScore: row.residual_score,
  residualLevel: row.residual_level,
  ownerUserId: row.owner_user_id,
  ownerName: row.owner_name || null,
  nextReviewDate: row.next_review_date,
  reviewOverdue: row.review_overdue || false,
  controlCount: parseInt(row.control_count || 0, 10),
  linkCount: parseInt(row.link_count || 0, 10),
  sites: sites.map(s => ({ id: s.id, name: s.name, isPrimary: s.is_primary })),
  createdAt: row.created_at,
  updatedAt: row.updated_at
});

const mapRiskDetailRow = (row, sites, controls, links, reviews) => ({
  ...mapRiskRow(row, sites),
  hazard: row.hazard,
  cause: row.cause,
  consequence: row.consequence,
  reviewFrequency: row.review_frequency,
  reviewFrequencyDays: row.review_frequency_days,
  lastReviewedAt: row.last_reviewed_at,
  acceptanceJustification: row.acceptance_justification,
  closureReason: row.closure_reason,
  owner: {
    id: row.owner_user_id,
    name: row.owner_name,
    email: row.owner_email
  },
  createdBy: {
    id: row.creator_id,
    name: row.creator_name
  },
  controls: controls.map(c => ({
    id: c.id,
    description: c.description,
    controlType: c.control_type,
    hierarchy: c.hierarchy,
    effectiveness: c.effectiveness,
    ownerUserId: c.owner_user_id,
    ownerName: c.owner_name || null,
    verificationMethod: c.verification_method,
    lastVerifiedAt: c.last_verified_at,
    nextVerificationDate: c.next_verification_date,
    sortOrder: c.sort_order,
    createdAt: c.created_at
  })),
  links: links.map(l => ({
    id: l.id,
    entityType: l.entity_type,
    entityId: l.entity_id,
    linkReason: l.link_reason,
    linkedAt: l.linked_at,
    linkedBy: {
      name: l.linked_by_name
    }
  })),
  recentReviews: reviews.map(r => ({
    id: r.id,
    reviewedAt: r.reviewed_at,
    reviewedBy: {
      name: r.reviewer_name
    },
    outcome: r.outcome,
    notes: r.notes,
    inherentScoreSnapshot: r.inherent_score_snapshot,
    residualScoreSnapshot: r.residual_score_snapshot
  }))
});

module.exports = {
  // Scoring helpers
  calculateLevel,
  calculateScore,
  calculateNextReviewDate,
  // Categories
  listCategories,
  getCategoryById,
  createCategory,
  updateCategory,
  deleteCategory,
  // Risks
  generateReferenceNumber,
  listRisks,
  getRiskById,
  createRisk,
  updateRisk,
  changeStatus,
  deleteRisk
};

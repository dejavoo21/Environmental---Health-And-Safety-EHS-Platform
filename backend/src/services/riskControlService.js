/**
 * RiskControlService - Phase 9
 * Handles risk control management, verification, and entity linking
 */

const { query, withTransaction } = require('../config/db');
const { AppError } = require('../utils/appError');
const { recordAudit } = require('../utils/audit');

// =====================================================
// CONTROL FUNCTIONS
// =====================================================

/**
 * List controls for a risk
 */
const listControls = async (riskId, organisationId, options = {}) => {
  const { includeInactive = false } = options;
  
  // Verify risk belongs to org
  const riskCheck = await query(
    'SELECT id FROM risks WHERE id = $1 AND organisation_id = $2',
    [riskId, organisationId]
  );
  
  if (riskCheck.rows.length === 0) {
    throw new AppError('Risk not found', 404, 'RISK_NOT_FOUND');
  }
  
  let sql = `
    SELECT rc.*, 
           u.name AS owner_name
    FROM risk_controls rc
    LEFT JOIN users u ON rc.owner_user_id = u.id
    WHERE rc.risk_id = $1
  `;
  
  if (!includeInactive) {
    sql += ` AND rc.is_active = TRUE`;
  }
  
  sql += ` ORDER BY rc.sort_order, rc.created_at`;
  
  const result = await query(sql, [riskId]);
  
  // Get links for each control
  const controls = await Promise.all(result.rows.map(async (control) => {
    const linksResult = await query(
      `SELECT * FROM risk_control_links WHERE control_id = $1`,
      [control.id]
    );
    return mapControlRow(control, linksResult.rows);
  }));
  
  return { controls };
};

/**
 * Get control by ID
 */
const getControlById = async (controlId, riskId, organisationId) => {
  // Verify risk belongs to org
  const riskCheck = await query(
    'SELECT id FROM risks WHERE id = $1 AND organisation_id = $2',
    [riskId, organisationId]
  );
  
  if (riskCheck.rows.length === 0) {
    throw new AppError('Risk not found', 404, 'RISK_NOT_FOUND');
  }
  
  const result = await query(
    `SELECT rc.*, u.name AS owner_name
     FROM risk_controls rc
     LEFT JOIN users u ON rc.owner_user_id = u.id
     WHERE rc.id = $1 AND rc.risk_id = $2`,
    [controlId, riskId]
  );
  
  if (result.rows.length === 0) {
    throw new AppError('Control not found', 404, 'CONTROL_NOT_FOUND');
  }
  
  const linksResult = await query(
    `SELECT * FROM risk_control_links WHERE control_id = $1`,
    [controlId]
  );
  
  return mapControlRow(result.rows[0], linksResult.rows);
};

/**
 * Add a control to a risk
 */
const addControl = async (riskId, organisationId, data, userId) => {
  // Verify risk belongs to org
  const riskCheck = await query(
    'SELECT id FROM risks WHERE id = $1 AND organisation_id = $2',
    [riskId, organisationId]
  );
  
  if (riskCheck.rows.length === 0) {
    throw new AppError('Risk not found', 404, 'RISK_NOT_FOUND');
  }
  
  const {
    description,
    controlType = data.control_type || data.type,  // Accept camelCase, snake_case, or short form
    hierarchy,
    effectiveness = 'unknown',
    verificationMethod,
    nextVerificationDate,
    sortOrder
  } = data;

  // Handle owner_id - convert empty string to null
  const ownerUserId = data.ownerUserId || data.owner_user_id || data.owner_id || null;
  const finalOwnerUserId = ownerUserId === '' ? null : ownerUserId;
  
  // Get next sort order if not provided
  let finalSortOrder = sortOrder;
  if (finalSortOrder === undefined) {
    const maxOrderResult = await query(
      'SELECT COALESCE(MAX(sort_order), 0) + 1 AS next_order FROM risk_controls WHERE risk_id = $1',
      [riskId]
    );
    finalSortOrder = maxOrderResult.rows[0].next_order;
  }
  
  const result = await query(
    `INSERT INTO risk_controls 
     (risk_id, description, control_type, hierarchy, effectiveness, owner_user_id,
      verification_method, next_verification_date, sort_order, is_active, created_by)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, TRUE, $10)
     RETURNING *`,
    [riskId, description, controlType, hierarchy, effectiveness, finalOwnerUserId,
     verificationMethod, nextVerificationDate, finalSortOrder, userId]
  );
  
  await recordAudit({
    eventType: 'created',
    entityType: 'risk_control',
    entityId: result.rows[0].id,
    userId,
    newValue: { riskId, description }
  });
  
  return mapControlRow(result.rows[0], []);
};

/**
 * Update a control
 */
const updateControl = async (controlId, riskId, organisationId, data, userId) => {
  const existing = await getControlById(controlId, riskId, organisationId);
  
  const {
    description,
    controlType,
    hierarchy,
    effectiveness,
    ownerUserId,
    verificationMethod,
    nextVerificationDate,
    sortOrder
  } = data;
  
  const result = await query(
    `UPDATE risk_controls SET
       description = COALESCE($1, description),
       control_type = COALESCE($2, control_type),
       hierarchy = COALESCE($3, hierarchy),
       effectiveness = COALESCE($4, effectiveness),
       owner_user_id = COALESCE($5, owner_user_id),
       verification_method = COALESCE($6, verification_method),
       next_verification_date = COALESCE($7, next_verification_date),
       sort_order = COALESCE($8, sort_order),
       updated_at = NOW()
     WHERE id = $9
     RETURNING *`,
    [description, controlType, hierarchy, effectiveness, ownerUserId,
     verificationMethod, nextVerificationDate, sortOrder, controlId]
  );
  
  await recordAudit({
    eventType: 'updated',
    entityType: 'risk_control',
    entityId: controlId,
    userId,
    oldValue: existing,
    newValue: result.rows[0]
  });
  
  return mapControlRow(result.rows[0], existing.links || []);
};

/**
 * Delete/deactivate a control
 */
const deleteControl = async (controlId, riskId, organisationId, userId) => {
  const existing = await getControlById(controlId, riskId, organisationId);
  
  await query(
    'UPDATE risk_controls SET is_active = FALSE, updated_at = NOW() WHERE id = $1',
    [controlId]
  );
  
  await recordAudit({
    eventType: 'deleted',
    entityType: 'risk_control',
    entityId: controlId,
    userId,
    oldValue: existing
  });
  
  return { success: true, message: 'Control deleted successfully' };
};

/**
 * Verify a control
 */
const verifyControl = async (controlId, riskId, organisationId, data, userId) => {
  await getControlById(controlId, riskId, organisationId);
  
  const { effectiveness, notes } = data;
  
  // Calculate next verification date (default 3 months)
  const nextDate = new Date();
  nextDate.setMonth(nextDate.getMonth() + 3);
  
  const result = await query(
    `UPDATE risk_controls SET
       effectiveness = COALESCE($1, effectiveness),
       last_verified_at = NOW(),
       next_verification_date = $2,
       updated_at = NOW()
     WHERE id = $3
     RETURNING *`,
    [effectiveness, nextDate, controlId]
  );
  
  await recordAudit({
    eventType: 'verified',
    entityType: 'risk_control',
    entityId: controlId,
    userId,
    newValue: { effectiveness, notes }
  });
  
  return mapControlRow(result.rows[0], []);
};

// =====================================================
// CONTROL LINK FUNCTIONS
// =====================================================

/**
 * Link a control to an entity (action, training, permit)
 */
const linkControlToEntity = async (controlId, riskId, organisationId, data, userId) => {
  await getControlById(controlId, riskId, organisationId);
  
  const { entityType, entityId } = data;
  
  // Validate entity type
  const validTypes = ['action', 'training_course', 'permit'];
  if (!validTypes.includes(entityType)) {
    throw new AppError('Invalid entity type for control link', 400, 'INVALID_ENTITY_TYPE');
  }
  
  // Validate entity exists (basic check - extend as needed)
  const entityCheck = await validateEntityExists(entityType, entityId);
  if (!entityCheck) {
    throw new AppError('Linked entity not found', 400, 'ENTITY_NOT_FOUND');
  }
  
  // Check for duplicate
  const existing = await query(
    `SELECT id FROM risk_control_links 
     WHERE control_id = $1 AND entity_type = $2 AND entity_id = $3`,
    [controlId, entityType, entityId]
  );
  
  if (existing.rows.length > 0) {
    throw new AppError('Link already exists', 409, 'DUPLICATE_LINK');
  }
  
  const result = await query(
    `INSERT INTO risk_control_links (control_id, entity_type, entity_id, linked_by)
     VALUES ($1, $2, $3, $4)
     RETURNING *`,
    [controlId, entityType, entityId, userId]
  );
  
  await recordAudit({
    eventType: 'created',
    entityType: 'risk_control_link',
    entityId: result.rows[0].id,
    userId,
    newValue: data
  });
  
  return {
    linkId: result.rows[0].id,
    controlId,
    entityType,
    entityId,
    linkedAt: result.rows[0].linked_at
  };
};

/**
 * Remove a control-entity link
 */
const unlinkControlFromEntity = async (controlId, riskId, organisationId, linkId, userId) => {
  await getControlById(controlId, riskId, organisationId);
  
  const existing = await query(
    'SELECT * FROM risk_control_links WHERE id = $1 AND control_id = $2',
    [linkId, controlId]
  );
  
  if (existing.rows.length === 0) {
    throw new AppError('Link not found', 404, 'LINK_NOT_FOUND');
  }
  
  await query('DELETE FROM risk_control_links WHERE id = $1', [linkId]);
  
  await recordAudit({
    eventType: 'deleted',
    entityType: 'risk_control_link',
    entityId: linkId,
    userId,
    oldValue: existing.rows[0]
  });
  
  return { success: true, message: 'Link removed successfully' };
};

// =====================================================
// HELPER FUNCTIONS
// =====================================================

/**
 * Validate that an entity exists
 */
const validateEntityExists = async (entityType, entityId) => {
  const tableMap = {
    'action': 'actions',
    'training_course': 'training_courses',
    'permit': 'permits'
  };
  
  const tableName = tableMap[entityType];
  if (!tableName) return false;
  
  try {
    const result = await query(
      `SELECT id FROM ${tableName} WHERE id = $1`,
      [entityId]
    );
    return result.rows.length > 0;
  } catch (error) {
    // Table might not exist if phase not implemented
    return true; // Allow linking for future compatibility
  }
};

/**
 * Map control row to response object
 */
const mapControlRow = (row, links = []) => ({
  id: row.id,
  riskId: row.risk_id,
  description: row.description,
  controlType: row.control_type,
  hierarchy: row.hierarchy,
  effectiveness: row.effectiveness,
  ownerUserId: row.owner_user_id,
  ownerName: row.owner_name || null,
  verificationMethod: row.verification_method,
  lastVerifiedAt: row.last_verified_at,
  nextVerificationDate: row.next_verification_date,
  sortOrder: row.sort_order,
  isActive: row.is_active,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
  links: links.map(l => ({
    id: l.id,
    entityType: l.entity_type,
    entityId: l.entity_id,
    linkedAt: l.linked_at
  }))
});

module.exports = {
  listControls,
  getControlById,
  addControl,
  updateControl,
  deleteControl,
  verifyControl,
  linkControlToEntity,
  unlinkControlFromEntity
};

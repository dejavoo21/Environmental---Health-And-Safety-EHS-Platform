/**
 * RiskLinkService - Phase 9
 * Handles linking risks to operational entities (incidents, actions, inspections, etc.)
 */

const { query } = require('../config/db');
const { AppError } = require('../utils/appError');
const { recordAudit } = require('../utils/audit');

// =====================================================
// RISK LINK FUNCTIONS
// =====================================================

/**
 * List links for a risk
 */
const listLinks = async (riskId, organisationId, options = {}) => {
  const { entityType } = options;
  
  // Verify risk belongs to org
  const riskCheck = await query(
    'SELECT id FROM risks WHERE id = $1 AND organisation_id = $2',
    [riskId, organisationId]
  );
  
  if (riskCheck.rows.length === 0) {
    throw new AppError('Risk not found', 404, 'RISK_NOT_FOUND');
  }
  
  let sql = `
    SELECT rl.*, u.name AS linked_by_name
    FROM risk_links rl
    LEFT JOIN users u ON rl.linked_by = u.id
    WHERE rl.risk_id = $1
  `;
  const values = [riskId];
  
  if (entityType) {
    sql += ` AND rl.entity_type = $2`;
    values.push(entityType);
  }
  
  sql += ` ORDER BY rl.linked_at DESC`;
  
  const result = await query(sql, values);
  
  // Enrich with entity details
  const links = await Promise.all(result.rows.map(enrichLinkWithEntityDetails));
  
  // Calculate summary
  const summaryResult = await query(
    `SELECT entity_type, COUNT(*) as count
     FROM risk_links WHERE risk_id = $1
     GROUP BY entity_type`,
    [riskId]
  );
  
  const summary = {
    incident: 0,
    action: 0,
    inspection: 0,
    training_course: 0,
    chemical: 0,
    permit: 0
  };
  
  summaryResult.rows.forEach(row => {
    summary[row.entity_type] = parseInt(row.count, 10);
  });
  
  return { links, summary };
};

/**
 * Create a link between risk and entity
 */
const createLink = async (riskId, organisationId, data, userId) => {
  // Verify risk belongs to org
  const riskCheck = await query(
    'SELECT id FROM risks WHERE id = $1 AND organisation_id = $2',
    [riskId, organisationId]
  );
  
  if (riskCheck.rows.length === 0) {
    throw new AppError('Risk not found', 404, 'RISK_NOT_FOUND');
  }
  
  const { entityType, entityId, linkReason } = data;
  
  // Validate entity type
  const validTypes = ['incident', 'inspection', 'action', 'training_course', 'chemical', 'permit'];
  if (!validTypes.includes(entityType)) {
    throw new AppError('Invalid entity type', 400, 'INVALID_ENTITY_TYPE');
  }
  
  // Validate entity exists
  const entityExists = await validateEntityExists(entityType, entityId, organisationId);
  if (!entityExists) {
    throw new AppError('Linked entity not found', 400, 'ENTITY_NOT_FOUND');
  }
  
  // Check for duplicate
  const existing = await query(
    `SELECT id FROM risk_links 
     WHERE risk_id = $1 AND entity_type = $2 AND entity_id = $3`,
    [riskId, entityType, entityId]
  );
  
  if (existing.rows.length > 0) {
    throw new AppError('Link already exists', 409, 'DUPLICATE_LINK');
  }
  
  const result = await query(
    `INSERT INTO risk_links (risk_id, entity_type, entity_id, link_reason, linked_by)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING *`,
    [riskId, entityType, entityId, linkReason, userId]
  );
  
  await recordAudit(userId, 'risk_link', result.rows[0].id, 'created', null, data, null);
  
  // Enrich with entity details
  const enriched = await enrichLinkWithEntityDetails(result.rows[0]);
  
  return enriched;
};

/**
 * Delete a risk link
 */
const deleteLink = async (riskId, organisationId, linkId, userId) => {
  // Verify risk belongs to org
  const riskCheck = await query(
    'SELECT id FROM risks WHERE id = $1 AND organisation_id = $2',
    [riskId, organisationId]
  );
  
  if (riskCheck.rows.length === 0) {
    throw new AppError('Risk not found', 404, 'RISK_NOT_FOUND');
  }
  
  const existing = await query(
    'SELECT * FROM risk_links WHERE id = $1 AND risk_id = $2',
    [linkId, riskId]
  );
  
  if (existing.rows.length === 0) {
    throw new AppError('Link not found', 404, 'LINK_NOT_FOUND');
  }
  
  await query('DELETE FROM risk_links WHERE id = $1', [linkId]);
  
  await recordAudit(userId, 'risk_link', linkId, 'deleted', existing.rows[0], null, null);
  
  return { success: true, message: 'Link removed successfully' };
};

/**
 * Get risks linked to an entity (reverse lookup)
 */
const getRisksForEntity = async (entityType, entityId, organisationId) => {
  const result = await query(
    `SELECT r.id, r.reference_number, r.title, r.status, r.residual_level,
            rl.link_reason, rl.linked_at
     FROM risk_links rl
     JOIN risks r ON rl.risk_id = r.id
     WHERE rl.entity_type = $1 AND rl.entity_id = $2 AND r.organisation_id = $3
     ORDER BY r.residual_level DESC, r.title`,
    [entityType, entityId, organisationId]
  );
  
  return {
    risks: result.rows.map(row => ({
      id: row.id,
      reference: row.reference_number,
      title: row.title,
      status: row.status,
      residualLevel: row.residual_level,
      linkReason: row.link_reason,
      linkedAt: row.linked_at
    }))
  };
};

// =====================================================
// HELPER FUNCTIONS
// =====================================================

/**
 * Validate that an entity exists
 */
const validateEntityExists = async (entityType, entityId, organisationId) => {
  const tableMap = {
    'incident': { table: 'incidents', orgColumn: 'organisation_id' },
    'inspection': { table: 'inspections', orgColumn: 'organisation_id' },
    'action': { table: 'actions', orgColumn: 'organisation_id' },
    'training_course': { table: 'training_courses', orgColumn: 'organisation_id' },
    'chemical': { table: 'chemicals', orgColumn: 'organisation_id' },
    'permit': { table: 'permits', orgColumn: 'organisation_id' }
  };
  
  const mapping = tableMap[entityType];
  if (!mapping) return false;
  
  try {
    const result = await query(
      `SELECT id FROM ${mapping.table} WHERE id = $1 AND ${mapping.orgColumn} = $2`,
      [entityId, organisationId]
    );
    return result.rows.length > 0;
  } catch (error) {
    // Table might not exist if phase not implemented - allow for future compatibility
    console.warn(`Entity validation skipped for ${entityType}: ${error.message}`);
    return true;
  }
};

/**
 * Enrich link with entity details
 */
const enrichLinkWithEntityDetails = async (link) => {
  const enriched = {
    id: link.id,
    entityType: link.entity_type,
    entityId: link.entity_id,
    linkReason: link.link_reason,
    linkedAt: link.linked_at,
    linkedBy: {
      name: link.linked_by_name
    }
  };
  
  // Try to get entity details
  try {
    const entityDetails = await getEntityDetails(link.entity_type, link.entity_id);
    enriched.entityReference = entityDetails.reference;
    enriched.entityTitle = entityDetails.title;
    enriched.entityStatus = entityDetails.status;
  } catch (error) {
    // Entity might be deleted or table doesn't exist
    enriched.entityReference = null;
    enriched.entityTitle = 'Unknown';
    enriched.entityStatus = null;
  }
  
  return enriched;
};

/**
 * Get entity details for display
 */
const getEntityDetails = async (entityType, entityId) => {
  const queryMap = {
    'incident': {
      sql: 'SELECT reference_number AS reference, title, status FROM incidents WHERE id = $1',
    },
    'inspection': {
      sql: "SELECT CONCAT('INS-', EXTRACT(YEAR FROM created_at), '-', LPAD(id::text, 4, '0')) AS reference, site_id AS title, status FROM inspections WHERE id = $1"
    },
    'action': {
      sql: 'SELECT reference_number AS reference, title, status FROM actions WHERE id = $1'
    },
    'training_course': {
      sql: 'SELECT code AS reference, title, status FROM training_courses WHERE id = $1'
    },
    'chemical': {
      sql: 'SELECT product_code AS reference, product_name AS title, status FROM chemicals WHERE id = $1'
    },
    'permit': {
      sql: 'SELECT permit_number AS reference, title, status FROM permits WHERE id = $1'
    }
  };
  
  const mapping = queryMap[entityType];
  if (!mapping) {
    return { reference: null, title: 'Unknown', status: null };
  }
  
  try {
    const result = await query(mapping.sql, [entityId]);
    if (result.rows.length > 0) {
      return result.rows[0];
    }
  } catch (error) {
    // Table might not exist
  }
  
  return { reference: null, title: 'Unknown', status: null };
};

module.exports = {
  listLinks,
  createLink,
  deleteLink,
  getRisksForEntity
};

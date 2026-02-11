/**
 * LegislationService - Phase 11
 *
 * Manages site legislation references and mappings.
 * BR-11-13 to BR-11-15 (C-282 to C-284)
 */

const { query } = require('../config/db');
const { recordAudit } = require('../utils/audit');

/**
 * Get legislation references for a site
 * BR-11-15 (C-284)
 *
 * @param {number} siteId - Site ID
 * @param {Object} options - Filter options
 * @returns {Array} List of legislation references
 */
const getLegislationRefsForSite = async (siteId, options = {}) => {
  const { limit = 10, category = null, includeDeleted = false } = options;

  // Get site-specific legislation
  const conditions = ['site_id = $1'];
  const values = [siteId];
  let paramIndex = 2;

  if (!includeDeleted) {
    conditions.push('deleted_at IS NULL');
  }

  if (category) {
    values.push(category);
    conditions.push(`category = $${paramIndex++}`);
  }

  values.push(limit);

  try {
    const result = await query(`
      SELECT id, site_id, title, jurisdiction, category, summary, reference_url, is_primary, created_at
      FROM site_legislation_refs
      WHERE ${conditions.join(' AND ')}
      ORDER BY is_primary DESC, title ASC
      LIMIT $${paramIndex}
    `, values);

    return result.rows || [];
  } catch (err) {
    // If table doesn't exist, return empty array gracefully
    if (err.code === '42P01') {
      console.warn('[LegislationService] site_legislation_refs table not found, returning empty array');
      return [];
    }
    // Log other errors but don't crash
    console.error('[LegislationService] Error fetching legislation for site:', {
      siteId,
      code: err.code,
      message: err.message
    });
    // Return empty array on any query error to keep Safety Advisor working
    return [];
  }
};

/**
 * Get all legislation references for an organisation
 *
 * @param {number} orgId - Organisation ID
 * @param {Object} options - Filter options
 * @returns {Object} Paginated list of legislation references
 */
const getLegislationRefs = async (orgId, options = {}) => {
  const {
    page = 1,
    limit = 20,
    siteId = null,
    category = null,
    jurisdiction = null,
    search = null
  } = options;

  const offset = (page - 1) * limit;
  const conditions = ['slr.organisation_id = $1', 'slr.deleted_at IS NULL'];
  const values = [orgId];
  let paramIndex = 2;

  if (siteId) {
    values.push(siteId);
    conditions.push(`slr.site_id = $${paramIndex++}`);
  }

  if (category) {
    values.push(category);
    conditions.push(`slr.category = $${paramIndex++}`);
  }

  if (jurisdiction) {
    values.push(jurisdiction);
    conditions.push(`slr.jurisdiction = $${paramIndex++}`);
  }

  if (search) {
    values.push(`%${search}%`);
    conditions.push(`(slr.title ILIKE $${paramIndex} OR slr.summary ILIKE $${paramIndex})`);
    paramIndex++;
  }

  const whereClause = conditions.join(' AND ');

  // Get total count
  const countResult = await query(
    `SELECT COUNT(*) as total FROM site_legislation_refs slr WHERE ${whereClause}`,
    values
  );
  const total = parseInt(countResult.rows[0].total);

  // Get paginated results
  values.push(limit, offset);
  const result = await query(`
    SELECT
      slr.id,
      slr.site_id,
      s.name as site_name,
      slr.title,
      slr.jurisdiction,
      slr.category,
      slr.summary,
      slr.reference_url,
      slr.is_primary,
      slr.created_at,
      slr.updated_at
    FROM site_legislation_refs slr
    JOIN sites s ON s.id = slr.site_id
    WHERE ${whereClause}
    ORDER BY slr.is_primary DESC, slr.title ASC
    LIMIT $${paramIndex++} OFFSET $${paramIndex++}
  `, values);

  return {
    data: result.rows.map(row => ({
      id: row.id,
      siteId: row.site_id,
      siteName: row.site_name,
      title: row.title,
      jurisdiction: row.jurisdiction,
      category: row.category,
      summary: row.summary,
      referenceUrl: row.reference_url,
      isPrimary: row.is_primary,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    })),
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit)
    }
  };
};

/**
 * Create a new legislation reference
 * BR-11-13 (C-282)
 *
 * @param {number} orgId - Organisation ID
 * @param {Object} data - Legislation reference data
 * @param {number} userId - User creating the reference
 * @returns {Object} Created legislation reference
 */
const createLegislationRef = async (orgId, data, userId) => {
  const {
    siteId,
    title,
    jurisdiction,
    category,
    summary,
    referenceUrl,
    isPrimary = false
  } = data;

  const result = await query(`
    INSERT INTO site_legislation_refs (
      organisation_id, site_id, title, jurisdiction, category,
      summary, reference_url, is_primary, created_by, created_at
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())
    RETURNING *
  `, [orgId, siteId, title, jurisdiction, category, summary, referenceUrl, isPrimary, userId]);

  const row = result.rows[0];

  await recordAudit({
    eventType: 'created',
    entityType: 'legislation_ref',
    entityId: row.id,
    userId,
    newValue: { title, jurisdiction, category, siteId }
  });

  return {
    id: row.id,
    siteId: row.site_id,
    title: row.title,
    jurisdiction: row.jurisdiction,
    category: row.category,
    summary: row.summary,
    referenceUrl: row.reference_url,
    isPrimary: row.is_primary,
    createdAt: row.created_at
  };
};

/**
 * Update a legislation reference
 *
 * @param {number} orgId - Organisation ID
 * @param {number} refId - Legislation reference ID
 * @param {Object} data - Update data
 * @param {number} userId - User updating the reference
 * @returns {Object|null} Updated reference or null if not found
 */
const updateLegislationRef = async (orgId, refId, data, userId) => {
  const {
    title,
    jurisdiction,
    category,
    summary,
    referenceUrl,
    isPrimary
  } = data;

  // Check exists
  const existing = await query(
    'SELECT * FROM site_legislation_refs WHERE id = $1 AND organisation_id = $2 AND deleted_at IS NULL',
    [refId, orgId]
  );

  if (existing.rowCount === 0) {
    return null;
  }

  const result = await query(`
    UPDATE site_legislation_refs
    SET
      title = COALESCE($3, title),
      jurisdiction = COALESCE($4, jurisdiction),
      category = COALESCE($5, category),
      summary = COALESCE($6, summary),
      reference_url = COALESCE($7, reference_url),
      is_primary = COALESCE($8, is_primary),
      updated_by = $9,
      updated_at = NOW()
    WHERE id = $1 AND organisation_id = $2
    RETURNING *
  `, [refId, orgId, title, jurisdiction, category, summary, referenceUrl, isPrimary, userId]);

  const row = result.rows[0];

  await recordAudit({
    eventType: 'updated',
    entityType: 'legislation_ref',
    entityId: row.id,
    userId,
    newValue: { title: row.title, jurisdiction: row.jurisdiction, category: row.category }
  });

  return {
    id: row.id,
    siteId: row.site_id,
    title: row.title,
    jurisdiction: row.jurisdiction,
    category: row.category,
    summary: row.summary,
    referenceUrl: row.reference_url,
    isPrimary: row.is_primary,
    updatedAt: row.updated_at
  };
};

/**
 * Delete a legislation reference (soft delete)
 *
 * @param {number} orgId - Organisation ID
 * @param {number} refId - Legislation reference ID
 * @param {number} userId - User deleting the reference
 * @returns {boolean} Success status
 */
const deleteLegislationRef = async (orgId, refId, userId) => {
  const result = await query(`
    UPDATE site_legislation_refs
    SET deleted_at = NOW(), updated_by = $3
    WHERE id = $1 AND organisation_id = $2 AND deleted_at IS NULL
    RETURNING id
  `, [refId, orgId, userId]);

  if (result.rowCount === 0) {
    return false;
  }

  await recordAudit({
    eventType: 'deleted',
    entityType: 'legislation_ref',
    entityId: refId,
    userId,
    newValue: { deleted: true }
  });

  return true;
};

/**
 * Get unique jurisdictions for an organisation
 *
 * @param {number} orgId - Organisation ID
 * @returns {Array} List of unique jurisdictions
 */
const getJurisdictions = async (orgId) => {
  const result = await query(`
    SELECT DISTINCT jurisdiction
    FROM site_legislation_refs
    WHERE organisation_id = $1 AND deleted_at IS NULL AND jurisdiction IS NOT NULL
    ORDER BY jurisdiction
  `, [orgId]);

  return result.rows.map(row => row.jurisdiction);
};

/**
 * Get legislation categories
 *
 * @returns {Array} List of standard legislation categories
 */
const getLegislationCategories = () => {
  return [
    { value: 'safety', label: 'Health & Safety' },
    { value: 'environmental', label: 'Environmental' },
    { value: 'medical', label: 'Medical/Occupational Health' },
    { value: 'transport', label: 'Transport & Logistics' },
    { value: 'chemicals', label: 'Chemicals & Hazardous Substances' },
    { value: 'construction', label: 'Construction' },
    { value: 'mining', label: 'Mining' },
    { value: 'other', label: 'Other' }
  ];
};

module.exports = {
  getLegislationRefsForSite,
  getLegislationRefs,
  createLegislationRef,
  updateLegislationRef,
  deleteLegislationRef,
  getJurisdictions,
  getLegislationCategories
};

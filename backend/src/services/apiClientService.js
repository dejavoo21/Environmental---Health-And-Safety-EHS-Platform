/**
 * API Client Service - Phase 10
 * Handles API client management, key generation, and usage tracking
 */

const { query, withTransaction } = require('../config/db');
const { AppError } = require('../utils/appError');
const { recordAudit } = require('../utils/audit');
const { encryptSecret, decryptSecret } = require('../utils/encryption');
const { generateApiKey, verifyApiKey, maskApiKey } = require('../utils/apiKeyUtils');
const env = require('../config/env');

// =====================================================
// API CLIENT MANAGEMENT
// =====================================================

// Helper to parse PostgreSQL array string to JS array
const parsePostgresArray = (value) => {
  if (!value) return [];
  if (Array.isArray(value)) return value;
  if (typeof value === 'string') {
    // Remove curly braces and split by comma
    const inner = value.replace(/^\{|\}$/g, '');
    if (!inner) return [];
    return inner.split(',').map(s => s.replace(/^"|"$/g, '').trim());
  }
  return [];
};

/**
 * List API clients for an organisation
 */
const listClients = async (organisationId, { page = 1, limit = 20, status } = {}) => {
  const offset = (page - 1) * limit;
  
  let whereClause = 'WHERE organisation_id = $1 AND deleted_at IS NULL';
  const params = [organisationId];
  
  if (status) {
    params.push(status);
    whereClause += ` AND status = $${params.length}`;
  }
  
  const countResult = await query(
    `SELECT COUNT(*) FROM api_clients ${whereClause}`,
    params
  );
  
  const result = await query(
    `SELECT id, organisation_id, client_name as name, api_key_prefix as key_prefix, 
            scopes, status, rate_limit_tier, ip_allowlist, description, 
            request_count, last_used_at,
            created_at, updated_at, created_by
     FROM api_clients
     ${whereClause}
     ORDER BY created_at DESC
     LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
    [...params, limit, offset]
  );
  
  // Parse scopes from PostgreSQL array format to JS array
  const data = result.rows.map(client => ({
    ...client,
    scopes: parsePostgresArray(client.scopes),
    ip_allowlist: parsePostgresArray(client.ip_allowlist)
  }));
  
  return {
    success: true,
    data,
    pagination: {
      page,
      limit,
      total: parseInt(countResult.rows[0].count),
      totalPages: Math.ceil(countResult.rows[0].count / limit)
    }
  };
};

/**
 * Get API client by ID
 */
const getClientById = async (clientId, organisationId) => {
  const result = await query(
    `SELECT id, organisation_id, client_name as name, api_key_prefix as key_prefix, 
            scopes, status, rate_limit_tier, ip_allowlist, description,
            request_count, last_used_at,
            created_at, updated_at, created_by
     FROM api_clients
     WHERE id = $1 AND organisation_id = $2 AND deleted_at IS NULL`,
    [clientId, organisationId]
  );
  
  if (result.rowCount === 0) {
    throw new AppError('API client not found', 404, 'NOT_FOUND');
  }
  
  const client = result.rows[0];
  return {
    ...client,
    scopes: parsePostgresArray(client.scopes),
    ip_allowlist: parsePostgresArray(client.ip_allowlist)
  };
};

/**
 * Get API client by key prefix (for authentication)
 */
const getClientByKeyPrefix = async (keyPrefix) => {
  const result = await query(
    `SELECT c.id, c.organisation_id, c.client_name as name, c.api_key_prefix as key_prefix, 
            c.api_key_hash as key_hash, c.scopes, c.status, c.rate_limit_tier, c.ip_allowlist,
            c.request_count
     FROM api_clients c
     WHERE c.api_key_prefix = $1 AND c.deleted_at IS NULL`,
    [keyPrefix]
  );
  
  if (!result.rows[0]) return null;
  
  const client = result.rows[0];
  return {
    ...client,
    scopes: parsePostgresArray(client.scopes),
    ip_allowlist: parsePostgresArray(client.ip_allowlist)
  };
};

/**
 * Create a new API client
 * Returns the full API key only once - must be stored by the user
 */
const createClient = async (organisationId, data, userId) => {
  // Validate scopes - match the enum values from migration
  const validScopes = ['read:incidents', 'write:incidents', 'read:actions', 'write:actions', 
                       'read:inspections', 'read:training', 'read:risks', 'read:chemicals', 'read:users'];
  
  const scopes = data.scopes || ['read:incidents', 'read:actions', 'read:risks'];
  const invalidScopes = scopes.filter(s => !validScopes.includes(s));
  if (invalidScopes.length > 0) {
    throw new AppError(`Invalid scopes: ${invalidScopes.join(', ')}`, 400, 'VALIDATION_ERROR');
  }
  
  // Check client name uniqueness within org
  const existingResult = await query(
    `SELECT id FROM api_clients WHERE client_name = $1 AND organisation_id = $2 AND deleted_at IS NULL`,
    [data.name, organisationId]
  );
  if (existingResult.rowCount > 0) {
    throw new AppError('API client name already exists', 409, 'DUPLICATE_NAME');
  }
  
  // Generate API key
  const { apiKey, prefix, hash } = await generateApiKey();
  
  // Validate rate limit tier
  const validTiers = ['standard', 'premium', 'unlimited'];
  const rateLimitTier = validTiers.includes(data.rate_limit_tier) ? data.rate_limit_tier : 'standard';
  
  // Validate IP allowlist if provided
  let ipAllowlist = null;
  if (data.ip_allowlist && Array.isArray(data.ip_allowlist) && data.ip_allowlist.length > 0) {
    ipAllowlist = data.ip_allowlist;
  }
  
  const result = await query(
    `INSERT INTO api_clients (
       organisation_id, client_name, api_key_prefix, api_key_hash, scopes, status,
       rate_limit_tier, ip_allowlist, description, created_by
     ) VALUES ($1, $2, $3, $4, $5::api_scope[], 'active', $6::rate_limit_tier, $7, $8, $9)
     RETURNING id, client_name as name, api_key_prefix as key_prefix, scopes, status, rate_limit_tier, 
               ip_allowlist, description, created_at`,
    [
      organisationId,
      data.name,
      prefix,
      hash,
      scopes,
      rateLimitTier,
      ipAllowlist,
      data.description || null,
      userId
    ]
  );
  
  await recordAudit({
    userId,
    action: 'api_client.created',
    entityType: 'api_client',
    entityId: result.rows[0].id,
    organisationId,
    changes: { name: data.name, scopes }
  });
  
  // Return client with the full API key (only shown once)
  return {
    success: true,
    apiKey: apiKey,
    client: result.rows[0],
    message: 'API client created. Store the API key securely - it will not be shown again.'
  };
};

/**
 * Update API client settings (not the key)
 */
const updateClient = async (clientId, organisationId, data, userId) => {
  const existing = await getClientById(clientId, organisationId);
  
  // Validate scopes if provided
  if (data.scopes) {
    const validScopes = ['read:incidents', 'write:incidents', 'read:actions', 'write:actions',
                         'read:inspections', 'read:training', 'read:risks', 'read:chemicals', 'read:users'];
    const invalidScopes = data.scopes.filter(s => !validScopes.includes(s));
    if (invalidScopes.length > 0) {
      throw new AppError(`Invalid scopes: ${invalidScopes.join(', ')}`, 400, 'VALIDATION_ERROR');
    }
  }
  
  // Check name uniqueness if changing
  if (data.name && data.name !== existing.name) {
    const nameResult = await query(
      `SELECT id FROM api_clients WHERE client_name = $1 AND organisation_id = $2 AND id != $3 AND deleted_at IS NULL`,
      [data.name, organisationId, clientId]
    );
    if (nameResult.rowCount > 0) {
      throw new AppError('API client name already exists', 409, 'DUPLICATE_NAME');
    }
  }
  
  const result = await query(
    `UPDATE api_clients SET
       client_name = COALESCE($1, client_name),
       description = COALESCE($2, description),
       scopes = COALESCE($3::api_scope[], scopes),
       rate_limit_tier = COALESCE($4::rate_limit_tier, rate_limit_tier),
       ip_allowlist = $5,
       updated_at = NOW()
     WHERE id = $6 AND organisation_id = $7
     RETURNING id, client_name as name, api_key_prefix as key_prefix, scopes, status, rate_limit_tier,
               ip_allowlist, description, updated_at`,
    [
      data.name,
      data.description,
      data.scopes,
      data.rate_limit_tier,
      data.ip_allowlist ? data.ip_allowlist : existing.ip_allowlist,
      clientId,
      organisationId
    ]
  );
  
  await recordAudit({
    userId,
    action: 'api_client.updated',
    entityType: 'api_client',
    entityId: clientId,
    organisationId,
    changes: data
  });
  
  return result.rows[0];
};

/**
 * Regenerate API key for a client
 * Invalidates old key immediately
 */
const regenerateKey = async (clientId, organisationId, userId) => {
  const existing = await getClientById(clientId, organisationId);
  
  // Generate new key
  const { apiKey, prefix, hash } = await generateApiKey();
  
  await query(
    `UPDATE api_clients SET
       api_key_prefix = $1,
       api_key_hash = $2,
       updated_at = NOW()
     WHERE id = $3`,
    [prefix, hash, clientId]
  );
  
  await recordAudit({
    userId,
    action: 'api_client.key_regenerated',
    entityType: 'api_client',
    entityId: clientId,
    organisationId,
    changes: { old_prefix: existing.key_prefix, new_prefix: prefix }
  });
  
  return {
    apiKey: apiKey,
    key_prefix: prefix,
    message: 'Store this API key securely. It will not be shown again.'
  };
};

/**
 * Update client status (activate, suspend, revoke)
 */
const updateStatus = async (clientId, organisationId, status, userId) => {
  const validStatuses = ['active', 'suspended', 'revoked'];
  if (!validStatuses.includes(status)) {
    throw new AppError('Invalid status', 400, 'VALIDATION_ERROR');
  }
  
  const existing = await getClientById(clientId, organisationId);
  
  // Cannot reactivate a revoked key
  if (existing.status === 'revoked' && status === 'active') {
    throw new AppError('Cannot reactivate a revoked API client. Create a new one.', 400, 'CANNOT_REACTIVATE');
  }
  
  await query(
    `UPDATE api_clients SET status = $1, updated_at = NOW(), updated_by = $2
     WHERE id = $3`,
    [status, userId, clientId]
  );
  
  await recordAudit({
    userId,
    action: `api_client.${status}`,
    entityType: 'api_client',
    entityId: clientId,
    organisationId,
    changes: { old_status: existing.status, new_status: status }
  });
  
  return { status };
};

/**
 * Delete API client (soft delete)
 */
const deleteClient = async (clientId, organisationId, userId) => {
  await getClientById(clientId, organisationId); // Verify exists
  
  await query(
    `UPDATE api_clients SET 
       deleted_at = NOW(),
       status = 'revoked'
     WHERE id = $1`,
    [clientId]
  );
  
  await recordAudit({
    userId,
    action: 'api_client.deleted',
    entityType: 'api_client',
    entityId: clientId,
    organisationId
  });
  
  return { deleted: true };
};

// =====================================================
// API KEY AUTHENTICATION & RATE LIMITING
// =====================================================

/**
 * Validate API key and get client info
 * Returns client info if valid, null if invalid
 */
const validateApiKey = async (apiKey) => {
  // Extract prefix from API key
  const parts = apiKey.split('_');
  if (parts.length < 3) {
    return null;
  }
  
  const prefix = parts.slice(0, 3).join('_'); // e.g., "ehs_live_abc123"
  
  // Find client by prefix
  const client = await getClientByKeyPrefix(prefix);
  if (!client) {
    return null;
  }
  
  // Verify key hash
  const isValid = await verifyApiKey(apiKey, client.key_hash);
  if (!isValid) {
    return null;
  }
  
  // Check status
  if (client.status !== 'active') {
    return { valid: false, reason: `API client ${client.status}` };
  }
  
  // Check expiry
  if (client.key_expires_at && new Date(client.key_expires_at) < new Date()) {
    return { valid: false, reason: 'API key expired' };
  }
  
  return {
    valid: true,
    client: {
      id: client.id,
      organisationId: client.organisation_id,
      name: client.name,
      scopes: client.scopes,
      rateLimitTier: client.rate_limit_tier,
      ipAllowlist: client.ip_allowlist
    }
  };
};

/**
 * Record API request for a client
 */
const recordRequest = async (clientId, endpoint, method, statusCode, responseTimeMs) => {
  // Update request count and last used
  await query(
    `UPDATE api_clients SET 
       request_count = request_count + 1,
       last_used_at = NOW()
     WHERE id = $1`,
    [clientId]
  );
};

/**
 * Get rate limit for a tier
 */
const getRateLimits = (tier) => {
  const limits = {
    standard: { requests_per_minute: 1000, requests_per_hour: 50000 },
    premium: { requests_per_minute: 5000, requests_per_hour: 200000 },
    enterprise: { requests_per_minute: 10000, requests_per_hour: 500000 }
  };
  
  return limits[tier] || limits.standard;
};

/**
 * Check if scope is allowed for action
 */
const hasScope = (clientScopes, requiredScope) => {
  // Check for exact scope
  if (clientScopes.includes(requiredScope)) {
    return true;
  }
  
  // Check for write scope (includes read)
  const [resource, action] = requiredScope.split(':');
  if (action === 'read' && clientScopes.includes(`${resource}:write`)) {
    return true;
  }
  
  return false;
};

/**
 * Check if IP is in allowlist
 */
const isIpAllowed = (clientIpAllowlist, requestIp) => {
  // If no allowlist, all IPs allowed
  if (!clientIpAllowlist || clientIpAllowlist.length === 0) {
    return true;
  }
  
  // Parse allowlist if it's a string
  let allowlist = clientIpAllowlist;
  if (typeof allowlist === 'string') {
    try {
      allowlist = JSON.parse(allowlist);
    } catch {
      return true;
    }
  }
  
  // Check if IP is in allowlist
  return allowlist.includes(requestIp);
};

/**
 * Get API client usage statistics
 */
const getClientStats = async (clientId, organisationId, days = 30) => {
  const client = await getClientById(clientId, organisationId);
  
  // For now, return basic stats from the client record
  // In future, could query detailed logs
  return {
    client_id: client.id,
    name: client.name,
    total_requests: client.request_count || 0,
    last_used_at: client.last_used_at,
    status: client.status,
    rate_limit_tier: client.rate_limit_tier,
    key_expires_at: client.key_expires_at
  };
};

module.exports = {
  listClients,
  getClientById,
  getClientByKeyPrefix,
  createClient,
  updateClient,
  regenerateKey,
  updateStatus,
  deleteClient,
  validateApiKey,
  recordRequest,
  getRateLimits,
  hasScope,
  isIpAllowed,
  getClientStats
};

/**
 * SSO Service - Phase 10
 * Handles OIDC SSO provider configuration and authentication flows
 */

const crypto = require('crypto');
const { query, withTransaction } = require('../config/db');
const { AppError } = require('../utils/appError');
const { recordAudit } = require('../utils/audit');
const { encryptSecret, decryptSecret } = require('../utils/encryption');
const { generateState, generateNonce, generateCodeVerifier, generateCodeChallenge } = require('../utils/apiKeyUtils');
const env = require('../config/env');

// =====================================================
// SSO PROVIDER MANAGEMENT
// =====================================================

/**
 * Get SSO provider for an organisation
 */
const getProviderForOrg = async (organisationId) => {
  const result = await query(
    `SELECT id, organisation_id, provider_name, provider_type, issuer_url, 
            client_id, redirect_uri, scopes, group_claim_name, default_role,
            jit_enabled, sso_only_mode, enabled, last_sync_at, 
            created_at, updated_at, created_by
     FROM sso_providers
     WHERE organisation_id = $1 AND deleted_at IS NULL`,
    [organisationId]
  );
  
  return result.rows[0] || null;
};

/**
 * Get SSO provider by ID
 */
const getProviderById = async (providerId) => {
  const result = await query(
    `SELECT id, organisation_id, provider_name, provider_type, issuer_url,
            client_id, client_secret_encrypted, redirect_uri, scopes, 
            group_claim_name, default_role, jit_enabled, sso_only_mode, 
            enabled, last_sync_at, created_at, updated_at
     FROM sso_providers
     WHERE id = $1 AND deleted_at IS NULL`,
    [providerId]
  );
  
  return result.rows[0] || null;
};

/**
 * Create or update SSO provider
 */
const upsertProvider = async (organisationId, data, userId) => {
  const existing = await getProviderForOrg(organisationId);
  
  // Generate redirect URI
  const baseUrl = env.backendUrl || `http://localhost:${env.port}`;
  const redirectUri = `${baseUrl}/api/auth/sso/callback`;
  
  // Encrypt client secret if provided
  let encryptedSecret = existing?.client_secret_encrypted;
  if (data.client_secret) {
    encryptedSecret = encryptSecret(data.client_secret);
  }
  
  if (existing) {
    // Update existing
    const result = await query(
      `UPDATE sso_providers SET
         provider_name = COALESCE($1, provider_name),
         provider_type = COALESCE($2, provider_type),
         issuer_url = COALESCE($3, issuer_url),
         client_id = COALESCE($4, client_id),
         client_secret_encrypted = COALESCE($5, client_secret_encrypted),
         redirect_uri = $6,
         scopes = COALESCE($7, scopes),
         group_claim_name = COALESCE($8, group_claim_name),
         default_role = COALESCE($9, default_role),
         jit_enabled = COALESCE($10, jit_enabled),
         sso_only_mode = COALESCE($11, sso_only_mode),
         enabled = COALESCE($12, enabled),
         updated_by = $13,
         updated_at = NOW()
       WHERE id = $14
       RETURNING id, redirect_uri`,
      [
        data.provider_name,
        data.provider_type,
        data.issuer_url,
        data.client_id,
        encryptedSecret,
        redirectUri,
        data.scopes || 'openid profile email',
        data.group_claim_name,
        data.default_role,
        data.jit_enabled,
        data.sso_only_mode,
        data.enabled,
        userId,
        existing.id
      ]
    );
    
    await recordAudit({
      userId,
      action: 'sso_provider.updated',
      entityType: 'sso_provider',
      entityId: existing.id,
      organisationId,
      changes: { updated_fields: Object.keys(data) }
    });
    
    return { id: existing.id, redirectUri, created: false };
  } else {
    // Create new
    if (!data.client_secret) {
      throw new AppError('Client secret is required for new SSO configuration', 400, 'VALIDATION_ERROR');
    }
    
    const result = await query(
      `INSERT INTO sso_providers (
         organisation_id, provider_name, provider_type, issuer_url,
         client_id, client_secret_encrypted, redirect_uri, scopes,
         group_claim_name, default_role, jit_enabled, sso_only_mode,
         enabled, created_by
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
       RETURNING id`,
      [
        organisationId,
        data.provider_name,
        data.provider_type,
        data.issuer_url,
        data.client_id,
        encryptedSecret,
        redirectUri,
        data.scopes || 'openid profile email',
        data.group_claim_name || 'groups',
        data.default_role || 'worker',
        data.jit_enabled !== false,
        data.sso_only_mode || false,
        data.enabled || false,
        userId
      ]
    );
    
    await recordAudit({
      userId,
      action: 'sso_provider.created',
      entityType: 'sso_provider',
      entityId: result.rows[0].id,
      organisationId,
      changes: { provider_name: data.provider_name, provider_type: data.provider_type }
    });
    
    return { id: result.rows[0].id, redirectUri, created: true };
  }
};

/**
 * Delete (soft) SSO provider
 */
const deleteProvider = async (organisationId, userId) => {
  const existing = await getProviderForOrg(organisationId);
  if (!existing) {
    throw new AppError('SSO provider not found', 404, 'NOT_FOUND');
  }
  
  await query(
    `UPDATE sso_providers SET deleted_at = NOW(), updated_by = $1
     WHERE id = $2`,
    [userId, existing.id]
  );
  
  await recordAudit({
    userId,
    action: 'sso_provider.deleted',
    entityType: 'sso_provider',
    entityId: existing.id,
    organisationId
  });
  
  return { deleted: true };
};

/**
 * Test SSO provider connection by fetching discovery document
 */
const testConnection = async (issuerUrl, clientId, clientSecret) => {
  try {
    // Validate issuer URL format
    if (!issuerUrl.startsWith('https://')) {
      return { reachable: false, error: 'Issuer URL must use HTTPS' };
    }
    
    // Fetch OIDC discovery document
    const discoveryUrl = issuerUrl.endsWith('/')
      ? `${issuerUrl}.well-known/openid-configuration`
      : `${issuerUrl}/.well-known/openid-configuration`;
    
    const response = await fetch(discoveryUrl, {
      method: 'GET',
      headers: { 'Accept': 'application/json' },
      signal: AbortSignal.timeout(10000)
    });
    
    if (!response.ok) {
      return { reachable: false, error: `HTTP ${response.status}: ${response.statusText}` };
    }
    
    const discovery = await response.json();
    
    // Validate required endpoints
    const requiredEndpoints = ['authorization_endpoint', 'token_endpoint', 'jwks_uri'];
    const missingEndpoints = requiredEndpoints.filter(ep => !discovery[ep]);
    
    if (missingEndpoints.length > 0) {
      return { 
        reachable: true, 
        issuer_validated: false,
        error: `Missing endpoints: ${missingEndpoints.join(', ')}`
      };
    }
    
    return {
      reachable: true,
      issuer_validated: discovery.issuer === issuerUrl || discovery.issuer === issuerUrl.replace(/\/$/, ''),
      endpoints: {
        authorization: discovery.authorization_endpoint,
        token: discovery.token_endpoint,
        jwks: discovery.jwks_uri,
        userinfo: discovery.userinfo_endpoint
      }
    };
  } catch (error) {
    return { 
      reachable: false, 
      error: error.message || 'Connection failed'
    };
  }
};

// =====================================================
// SSO ROLE MAPPINGS
// =====================================================

/**
 * Get role mappings for a provider
 */
const getMappingsForProvider = async (providerId) => {
  const result = await query(
    `SELECT id, sso_provider_id, idp_claim_name, idp_claim_value, ehs_role, priority,
            created_at, updated_at
     FROM sso_mappings
     WHERE sso_provider_id = $1
     ORDER BY priority DESC, created_at`,
    [providerId]
  );
  
  return result.rows;
};

/**
 * Create a role mapping
 */
const createMapping = async (providerId, data, userId, organisationId) => {
  const result = await query(
    `INSERT INTO sso_mappings (sso_provider_id, idp_claim_name, idp_claim_value, ehs_role, priority)
     VALUES ($1, $2, $3, $4, $5)
     ON CONFLICT (sso_provider_id, idp_claim_name, idp_claim_value) 
     DO UPDATE SET ehs_role = $4, priority = $5, updated_at = NOW()
     RETURNING id`,
    [providerId, data.idp_claim_name || 'groups', data.idp_claim_value, data.ehs_role, data.priority || 0]
  );
  
  await recordAudit({
    userId,
    action: 'sso_mapping.created',
    entityType: 'sso_mapping',
    entityId: result.rows[0].id,
    organisationId,
    changes: { idp_claim_value: data.idp_claim_value, ehs_role: data.ehs_role }
  });
  
  return result.rows[0];
};

/**
 * Update a role mapping
 */
const updateMapping = async (mappingId, data, userId, organisationId) => {
  const result = await query(
    `UPDATE sso_mappings SET
       idp_claim_name = COALESCE($1, idp_claim_name),
       idp_claim_value = COALESCE($2, idp_claim_value),
       ehs_role = COALESCE($3, ehs_role),
       priority = COALESCE($4, priority),
       updated_at = NOW()
     WHERE id = $5
     RETURNING id`,
    [data.idp_claim_name, data.idp_claim_value, data.ehs_role, data.priority, mappingId]
  );
  
  if (result.rowCount === 0) {
    throw new AppError('Mapping not found', 404, 'NOT_FOUND');
  }
  
  await recordAudit({
    userId,
    action: 'sso_mapping.updated',
    entityType: 'sso_mapping',
    entityId: mappingId,
    organisationId,
    changes: data
  });
  
  return result.rows[0];
};

/**
 * Delete a role mapping
 */
const deleteMapping = async (mappingId, userId, organisationId) => {
  const result = await query(
    `DELETE FROM sso_mappings WHERE id = $1 RETURNING id`,
    [mappingId]
  );
  
  if (result.rowCount === 0) {
    throw new AppError('Mapping not found', 404, 'NOT_FOUND');
  }
  
  await recordAudit({
    userId,
    action: 'sso_mapping.deleted',
    entityType: 'sso_mapping',
    entityId: mappingId,
    organisationId
  });
  
  return { deleted: true };
};

// =====================================================
// SSO AUTHENTICATION FLOW
// =====================================================

/**
 * Initiate SSO login - create state and return authorization URL
 */
const initiateLogin = async (organisationSlug, redirectTo, ipAddress) => {
  // Find organisation by slug
  const orgResult = await query(
    `SELECT id, name, slug FROM organisations WHERE slug = $1`,
    [organisationSlug]
  );
  
  if (orgResult.rowCount === 0) {
    throw new AppError('Organisation not found', 404, 'NOT_FOUND');
  }
  
  const organisation = orgResult.rows[0];
  
  // Get SSO provider for org
  const provider = await getProviderForOrg(organisation.id);
  
  if (!provider || !provider.enabled) {
    throw new AppError('SSO not configured for this organisation', 404, 'SSO_NOT_CONFIGURED');
  }
  
  // Generate PKCE values
  const state = generateState();
  const nonce = generateNonce();
  const codeVerifier = generateCodeVerifier();
  const codeChallenge = generateCodeChallenge(codeVerifier);
  
  // Store state for callback verification
  await query(
    `INSERT INTO sso_states (state, nonce, code_verifier, organisation_id, sso_provider_id, redirect_to, ip_address)
     VALUES ($1, $2, $3, $4, $5, $6, $7)`,
    [state, nonce, codeVerifier, organisation.id, provider.id, redirectTo, ipAddress]
  );
  
  // Fetch discovery document to get authorization endpoint
  const discovery = await testConnection(provider.issuer_url);
  if (!discovery.reachable || !discovery.endpoints?.authorization) {
    throw new AppError('Failed to connect to identity provider', 502, 'IDP_UNREACHABLE');
  }
  
  // Build authorization URL
  const authUrl = new URL(discovery.endpoints.authorization);
  authUrl.searchParams.set('client_id', provider.client_id);
  authUrl.searchParams.set('response_type', 'code');
  authUrl.searchParams.set('scope', provider.scopes);
  authUrl.searchParams.set('redirect_uri', provider.redirect_uri);
  authUrl.searchParams.set('state', state);
  authUrl.searchParams.set('nonce', nonce);
  authUrl.searchParams.set('code_challenge', codeChallenge);
  authUrl.searchParams.set('code_challenge_method', 'S256');
  
  return { authorizationUrl: authUrl.toString(), state };
};

/**
 * Handle SSO callback - exchange code for tokens and authenticate user
 */
const handleCallback = async (code, state, ipAddress, userAgent) => {
  // Validate state
  const stateResult = await query(
    `SELECT s.*, p.*, o.name as org_name, o.slug as org_slug
     FROM sso_states s
     JOIN sso_providers p ON p.id = s.sso_provider_id
     JOIN organisations o ON o.id = s.organisation_id
     WHERE s.state = $1 AND s.expires_at > NOW()`,
    [state]
  );
  
  if (stateResult.rowCount === 0) {
    throw new AppError('Invalid or expired state', 401, 'STATE_MISMATCH');
  }
  
  const stateData = stateResult.rows[0];
  const providerId = stateData.sso_provider_id;
  const organisationId = stateData.organisation_id;
  
  // Delete used state
  await query(`DELETE FROM sso_states WHERE state = $1`, [state]);
  
  // Fetch discovery document
  const discovery = await testConnection(stateData.issuer_url);
  if (!discovery.reachable) {
    await logLoginAttempt(organisationId, providerId, null, '', false, 'idp_unreachable', ipAddress, userAgent);
    throw new AppError('Failed to connect to identity provider', 502, 'IDP_UNREACHABLE');
  }
  
  // Exchange code for tokens
  const tokenResponse = await fetch(discovery.endpoints.token, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Accept': 'application/json'
    },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: stateData.redirect_uri,
      client_id: stateData.client_id,
      client_secret: decryptSecret(stateData.client_secret_encrypted),
      code_verifier: stateData.code_verifier
    }),
    signal: AbortSignal.timeout(10000)
  });
  
  if (!tokenResponse.ok) {
    const errorText = await tokenResponse.text();
    await logLoginAttempt(organisationId, providerId, null, '', false, 'token_exchange_failed', ipAddress, userAgent);
    throw new AppError('Failed to exchange authorization code', 401, 'TOKEN_ERROR');
  }
  
  const tokens = await tokenResponse.json();
  
  // Decode and validate ID token (basic validation - production should verify signature with JWKS)
  const idToken = tokens.id_token;
  const claims = decodeIdToken(idToken);
  
  // Validate nonce
  if (claims.nonce !== stateData.nonce) {
    await logLoginAttempt(organisationId, providerId, null, claims.email || '', false, 'nonce_mismatch', ipAddress, userAgent);
    throw new AppError('Invalid nonce', 401, 'INVALID_TOKEN');
  }
  
  // Extract user info from claims
  const email = claims.email || claims.preferred_username || claims.upn;
  const externalId = claims.sub || claims.oid;
  const firstName = claims.given_name || claims.name?.split(' ')[0] || '';
  const lastName = claims.family_name || claims.name?.split(' ').slice(1).join(' ') || '';
  const groups = claims[stateData.group_claim_name] || claims.groups || [];
  
  if (!email) {
    await logLoginAttempt(organisationId, providerId, null, '', false, 'no_email_claim', ipAddress, userAgent);
    throw new AppError('No email claim in ID token', 401, 'INVALID_TOKEN');
  }
  
  // Find or create user
  const userResult = await findOrCreateUser({
    organisationId,
    providerId,
    email,
    externalId,
    firstName,
    lastName,
    groups,
    defaultRole: stateData.default_role,
    jitEnabled: stateData.jit_enabled,
    claims,
    ipAddress,
    userAgent
  });
  
  return {
    user: userResult.user,
    jitProvisioned: userResult.jitProvisioned,
    redirectTo: stateData.redirect_to
  };
};

/**
 * Decode ID token (JWT) - basic decode without signature verification
 * In production, you should verify with JWKS
 */
const decodeIdToken = (token) => {
  const parts = token.split('.');
  if (parts.length !== 3) {
    throw new AppError('Invalid ID token format', 401, 'INVALID_TOKEN');
  }
  
  const payload = Buffer.from(parts[1], 'base64url').toString('utf8');
  return JSON.parse(payload);
};

/**
 * Find existing user or create via JIT provisioning
 */
const findOrCreateUser = async ({
  organisationId,
  providerId,
  email,
  externalId,
  firstName,
  lastName,
  groups,
  defaultRole,
  jitEnabled,
  claims,
  ipAddress,
  userAgent
}) => {
  // Try to find user by external_id first, then by email
  let userResult = await query(
    `SELECT id, email, name, role, is_active, organisation_id, external_id, auth_provider
     FROM users
     WHERE (external_id = $1 OR email = $2) AND organisation_id = $3`,
    [externalId, email.toLowerCase(), organisationId]
  );
  
  let user = userResult.rows[0];
  let jitProvisioned = false;
  
  // Determine role from mappings
  const mappings = await getMappingsForProvider(providerId);
  const role = mapClaimsToRole(groups, mappings, defaultRole);
  
  if (user) {
    // Update existing user with SSO info
    await query(
      `UPDATE users SET
         external_id = COALESCE(external_id, $1),
         auth_provider = 'sso',
         sso_provider_id = $2,
         last_sso_login_at = NOW(),
         sso_attributes = $3,
         name = COALESCE(NULLIF($4, ''), name),
         role = $5
       WHERE id = $6`,
      [
        externalId,
        providerId,
        JSON.stringify({ sub: claims.sub, email: claims.email, groups }),
        `${firstName} ${lastName}`.trim(),
        role,
        user.id
      ]
    );
    
    // Refresh user data
    const refreshResult = await query(
      `SELECT id, email, name, role, is_active, organisation_id FROM users WHERE id = $1`,
      [user.id]
    );
    user = refreshResult.rows[0];
  } else if (jitEnabled) {
    // JIT provisioning - create new user
    const name = `${firstName} ${lastName}`.trim() || email.split('@')[0];
    
    const insertResult = await query(
      `INSERT INTO users (email, name, role, organisation_id, external_id, auth_provider, 
                          sso_provider_id, password_hash, last_sso_login_at, sso_attributes, is_active)
       VALUES ($1, $2, $3, $4, $5, 'sso', $6, '', NOW(), $7, true)
       RETURNING id, email, name, role, is_active, organisation_id`,
      [
        email.toLowerCase(),
        name,
        role,
        organisationId,
        externalId,
        providerId,
        JSON.stringify({ sub: claims.sub, email: claims.email, groups })
      ]
    );
    
    user = insertResult.rows[0];
    jitProvisioned = true;
    
    await recordAudit({
      userId: user.id,
      action: 'user.jit_provisioned',
      entityType: 'user',
      entityId: user.id,
      organisationId,
      changes: { email, role, provider_id: providerId }
    });
  } else {
    // JIT disabled and user not found
    await logLoginAttempt(organisationId, providerId, null, email, false, 'user_not_found_jit_disabled', ipAddress, userAgent);
    throw new AppError('User not found. Contact your administrator.', 401, 'USER_NOT_FOUND');
  }
  
  // Check if user is active
  if (!user.is_active) {
    await logLoginAttempt(organisationId, providerId, user.id, email, false, 'user_inactive', ipAddress, userAgent);
    throw new AppError('Your account has been disabled', 401, 'ACCOUNT_DISABLED');
  }
  
  // Log successful login
  await logLoginAttempt(organisationId, providerId, user.id, email, true, null, ipAddress, userAgent, jitProvisioned, role);
  
  return { user, jitProvisioned };
};

/**
 * Map IdP groups to EHS role based on mappings
 */
const mapClaimsToRole = (groups, mappings, defaultRole) => {
  if (!Array.isArray(groups) || groups.length === 0) {
    return defaultRole;
  }
  
  // Sort mappings by priority (highest first)
  const sortedMappings = [...mappings].sort((a, b) => b.priority - a.priority);
  
  for (const mapping of sortedMappings) {
    if (groups.includes(mapping.idp_claim_value)) {
      return mapping.ehs_role;
    }
  }
  
  return defaultRole;
};

/**
 * Log SSO login attempt
 */
const logLoginAttempt = async (organisationId, providerId, userId, email, success, failureReason, ipAddress, userAgent, jitProvisioned = false, roleAssigned = null) => {
  await query(
    `INSERT INTO sso_login_attempts 
     (organisation_id, sso_provider_id, user_id, user_email, success, failure_reason, 
      jit_provisioned, role_assigned, ip_address, user_agent)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
    [organisationId, providerId, userId, email, success, failureReason, jitProvisioned, roleAssigned, ipAddress, userAgent]
  );
};

/**
 * Get SSO login statistics
 */
const getLoginStats = async (organisationId, days = 30) => {
  const result = await query(
    `SELECT 
       COUNT(*) FILTER (WHERE success = true) as total_logins,
       COUNT(DISTINCT user_id) FILTER (WHERE success = true) as unique_users,
       COUNT(*) FILTER (WHERE jit_provisioned = true) as jit_users_created,
       COUNT(*) FILTER (WHERE success = false) as failed_logins
     FROM sso_login_attempts
     WHERE organisation_id = $1 AND created_at > NOW() - INTERVAL '${days} days'`,
    [organisationId]
  );
  
  return result.rows[0];
};

/**
 * Check if SSO-only mode is enabled for org (used to block password login)
 */
const isSsoOnlyMode = async (organisationId) => {
  const provider = await getProviderForOrg(organisationId);
  return provider?.enabled && provider?.sso_only_mode;
};

/**
 * Get SSO provider by org slug (for login page)
 */
const getProviderByOrgSlug = async (orgSlug) => {
  const result = await query(
    `SELECT p.id, p.provider_name, p.provider_type, p.enabled, p.sso_only_mode,
            o.id as org_id, o.slug as org_slug
     FROM sso_providers p
     JOIN organisations o ON o.id = p.organisation_id
     WHERE o.slug = $1 AND p.deleted_at IS NULL AND p.enabled = true`,
    [orgSlug]
  );
  
  return result.rows[0] || null;
};

module.exports = {
  getProviderForOrg,
  getProviderById,
  upsertProvider,
  deleteProvider,
  testConnection,
  getMappingsForProvider,
  createMapping,
  updateMapping,
  deleteMapping,
  initiateLogin,
  handleCallback,
  mapClaimsToRole,
  getLoginStats,
  isSsoOnlyMode,
  getProviderByOrgSlug
};

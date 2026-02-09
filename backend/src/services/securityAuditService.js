/**
 * SecurityAuditService - Phase 6
 * Logs security-related events to security_audit_log table
 * Events are immutable and used for compliance/auditing
 */

const { query } = require('../config/db');

/**
 * Security event types
 */
const EventTypes = {
  // Login events
  LOGIN_SUCCESS: 'LOGIN_SUCCESS',
  LOGIN_FAILURE: 'LOGIN_FAILURE',
  LOGOUT: 'LOGOUT',
  
  // Password events
  PASSWORD_RESET_REQUEST: 'PASSWORD_RESET_REQUEST',
  PASSWORD_RESET_COMPLETE: 'PASSWORD_RESET_COMPLETE',
  PASSWORD_CHANGED: 'PASSWORD_CHANGED',
  
  // 2FA events
  TWO_FA_ENABLED: '2FA_ENABLED',
  TWO_FA_DISABLED: '2FA_DISABLED',
  TWO_FA_BACKUP_USED: '2FA_BACKUP_USED',
  TWO_FA_BACKUP_REGENERATED: '2FA_BACKUP_REGENERATED',
  
  // Access request events
  ACCESS_REQUEST_CREATED: 'ACCESS_REQUEST_CREATED',
  ACCESS_REQUEST_APPROVED: 'ACCESS_REQUEST_APPROVED',
  ACCESS_REQUEST_REJECTED: 'ACCESS_REQUEST_REJECTED',
  ACCESS_REQUEST_CANCELLED: 'ACCESS_REQUEST_CANCELLED',
  ACCESS_REQUEST_EXPIRED: 'ACCESS_REQUEST_EXPIRED',
  
  // User management events
  USER_CREATED: 'USER_CREATED',
  USER_ROLE_CHANGED: 'USER_ROLE_CHANGED',
  USER_DISABLED: 'USER_DISABLED',
  USER_ENABLED: 'USER_ENABLED',
  
  // Account security events
  ACCOUNT_LOCKED: 'ACCOUNT_LOCKED',
  ACCOUNT_UNLOCKED: 'ACCOUNT_UNLOCKED'
};

/**
 * Log a security event
 * @param {Object} params - Event parameters
 * @param {string} params.eventType - Type of security event (from EventTypes)
 * @param {string} [params.organisationId] - Organisation ID
 * @param {string} [params.userId] - User ID who performed the action
 * @param {string} [params.targetUserId] - User ID who is affected by the action
 * @param {string} [params.ipAddress] - IP address
 * @param {string} [params.userAgent] - User agent string
 * @param {Object} [params.metadata] - Additional event-specific data
 * @returns {Promise<Object>} - Created audit log entry
 */
const logSecurityEvent = async ({
  eventType,
  organisationId = null,
  userId = null,
  targetUserId = null,
  ipAddress = null,
  userAgent = null,
  metadata = null
}) => {
  const result = await query(
    `INSERT INTO security_audit_log (
      event_type, organisation_id, user_id, target_user_id,
      ip_address, user_agent, metadata
    ) VALUES ($1, $2, $3, $4, $5, $6, $7)
    RETURNING id, event_type, created_at`,
    [eventType, organisationId, userId, targetUserId, ipAddress, userAgent, metadata]
  );
  
  return result.rows[0];
};

/**
 * Log a login attempt (success or failure)
 * @param {Object} params - Login event parameters
 */
const logLoginAttempt = async ({
  success,
  userId = null,
  organisationId = null,
  email = null,
  ipAddress = null,
  userAgent = null,
  failureReason = null
}) => {
  const eventType = success ? EventTypes.LOGIN_SUCCESS : EventTypes.LOGIN_FAILURE;
  const metadata = {};
  
  if (email) metadata.email = email;
  if (failureReason) metadata.failureReason = failureReason;
  
  return logSecurityEvent({
    eventType,
    organisationId,
    userId,
    ipAddress,
    userAgent,
    metadata: Object.keys(metadata).length > 0 ? metadata : null
  });
};

/**
 * Log a password reset request
 */
const logPasswordResetRequest = async ({
  email,
  userId = null,
  ipAddress = null,
  userAgent = null
}) => {
  return logSecurityEvent({
    eventType: EventTypes.PASSWORD_RESET_REQUEST,
    userId,
    ipAddress,
    userAgent,
    metadata: { email }
  });
};

/**
 * Log a password reset completion
 */
const logPasswordResetComplete = async ({
  userId,
  organisationId,
  ipAddress = null,
  userAgent = null
}) => {
  return logSecurityEvent({
    eventType: EventTypes.PASSWORD_RESET_COMPLETE,
    organisationId,
    userId,
    ipAddress,
    userAgent
  });
};

/**
 * Log a password change (user-initiated)
 */
const logPasswordChange = async ({
  userId,
  organisationId,
  ipAddress = null,
  userAgent = null
}) => {
  return logSecurityEvent({
    eventType: EventTypes.PASSWORD_CHANGED,
    organisationId,
    userId,
    ipAddress,
    userAgent
  });
};

/**
 * Log 2FA enabled
 */
const log2FAEnabled = async ({
  userId,
  organisationId,
  ipAddress = null,
  userAgent = null
}) => {
  return logSecurityEvent({
    eventType: EventTypes.TWO_FA_ENABLED,
    organisationId,
    userId,
    ipAddress,
    userAgent
  });
};

/**
 * Log 2FA disabled
 */
const log2FADisabled = async ({
  userId,
  organisationId,
  ipAddress = null,
  userAgent = null
}) => {
  return logSecurityEvent({
    eventType: EventTypes.TWO_FA_DISABLED,
    organisationId,
    userId,
    ipAddress,
    userAgent
  });
};

/**
 * Log backup code used
 */
const log2FABackupUsed = async ({
  userId,
  organisationId,
  codesRemaining,
  ipAddress = null,
  userAgent = null
}) => {
  return logSecurityEvent({
    eventType: EventTypes.TWO_FA_BACKUP_USED,
    organisationId,
    userId,
    ipAddress,
    userAgent,
    metadata: { codesRemaining }
  });
};

/**
 * Log access request created
 */
const logAccessRequestCreated = async ({
  organisationId,
  referenceNumber,
  email,
  ipAddress = null,
  userAgent = null
}) => {
  return logSecurityEvent({
    eventType: EventTypes.ACCESS_REQUEST_CREATED,
    organisationId,
    ipAddress,
    userAgent,
    metadata: { referenceNumber, email }
  });
};

/**
 * Log access request approved
 */
const logAccessRequestApproved = async ({
  organisationId,
  userId,
  targetUserId,
  referenceNumber,
  ipAddress = null,
  userAgent = null
}) => {
  return logSecurityEvent({
    eventType: EventTypes.ACCESS_REQUEST_APPROVED,
    organisationId,
    userId,
    targetUserId,
    ipAddress,
    userAgent,
    metadata: { referenceNumber }
  });
};

/**
 * Log access request rejected
 */
const logAccessRequestRejected = async ({
  organisationId,
  userId,
  referenceNumber,
  reason = null,
  ipAddress = null,
  userAgent = null
}) => {
  return logSecurityEvent({
    eventType: EventTypes.ACCESS_REQUEST_REJECTED,
    organisationId,
    userId,
    ipAddress,
    userAgent,
    metadata: { referenceNumber, reason }
  });
};

/**
 * Log account locked
 */
const logAccountLocked = async ({
  userId,
  organisationId,
  reason = 'too_many_failed_attempts',
  ipAddress = null,
  userAgent = null
}) => {
  return logSecurityEvent({
    eventType: EventTypes.ACCOUNT_LOCKED,
    organisationId,
    userId,
    targetUserId: userId,
    ipAddress,
    userAgent,
    metadata: { reason }
  });
};

/**
 * Log account unlocked
 */
const logAccountUnlocked = async ({
  userId,
  organisationId,
  unlockedBy = null,
  ipAddress = null,
  userAgent = null
}) => {
  return logSecurityEvent({
    eventType: EventTypes.ACCOUNT_UNLOCKED,
    organisationId,
    userId: unlockedBy,
    targetUserId: userId,
    ipAddress,
    userAgent
  });
};

/**
 * Log user role changed
 */
const logUserRoleChanged = async ({
  userId,
  targetUserId,
  organisationId,
  oldRole,
  newRole,
  ipAddress = null,
  userAgent = null
}) => {
  return logSecurityEvent({
    eventType: EventTypes.USER_ROLE_CHANGED,
    organisationId,
    userId,
    targetUserId,
    ipAddress,
    userAgent,
    metadata: { oldRole, newRole }
  });
};

/**
 * Query security audit log with filters
 * @param {Object} params - Query parameters
 * @returns {Promise<Object>} - Paginated results
 */
const querySecurityAudit = async ({
  organisationId,
  eventType = null,
  userId = null,
  startDate = null,
  endDate = null,
  ipAddress = null,
  page = 1,
  limit = 50
}) => {
  const conditions = ['organisation_id = $1'];
  const values = [organisationId];
  let paramIndex = 2;
  
  if (eventType && eventType !== 'all') {
    conditions.push(`event_type = $${paramIndex++}`);
    values.push(eventType);
  }
  
  if (userId) {
    conditions.push(`(user_id = $${paramIndex} OR target_user_id = $${paramIndex})`);
    values.push(userId);
    paramIndex++;
  }
  
  if (startDate) {
    conditions.push(`created_at >= $${paramIndex++}`);
    values.push(startDate);
  }
  
  if (endDate) {
    conditions.push(`created_at <= $${paramIndex++}`);
    values.push(endDate);
  }
  
  if (ipAddress) {
    conditions.push(`ip_address::text LIKE $${paramIndex++}`);
    values.push(`${ipAddress}%`);
  }
  
  const whereClause = conditions.join(' AND ');
  const offset = (page - 1) * limit;
  
  // Get total count
  const countResult = await query(
    `SELECT COUNT(*) FROM security_audit_log WHERE ${whereClause}`,
    values
  );
  const total = parseInt(countResult.rows[0].count, 10);
  
  // Get paginated data with user names
  const dataResult = await query(
    `SELECT 
      sal.id,
      sal.event_type,
      sal.user_id,
      u.name AS user_name,
      sal.target_user_id,
      tu.name AS target_user_name,
      sal.ip_address,
      sal.user_agent,
      sal.metadata,
      sal.created_at
    FROM security_audit_log sal
    LEFT JOIN users u ON u.id = sal.user_id
    LEFT JOIN users tu ON tu.id = sal.target_user_id
    WHERE ${whereClause}
    ORDER BY sal.created_at DESC
    LIMIT $${paramIndex++} OFFSET $${paramIndex}`,
    [...values, limit, offset]
  );
  
  return {
    data: dataResult.rows.map(row => ({
      id: row.id,
      eventType: row.event_type,
      userId: row.user_id,
      userName: row.user_name,
      targetUserId: row.target_user_id,
      targetUserName: row.target_user_name,
      ipAddress: row.ip_address ? maskIpAddress(row.ip_address) : null,
      userAgent: row.user_agent,
      metadata: row.metadata,
      createdAt: row.created_at
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
 * Get a single audit event by ID
 */
const getSecurityAuditEvent = async (id, organisationId) => {
  const result = await query(
    `SELECT 
      sal.id,
      sal.event_type,
      sal.organisation_id,
      sal.user_id,
      u.name AS user_name,
      sal.target_user_id,
      tu.name AS target_user_name,
      sal.ip_address,
      sal.user_agent,
      sal.metadata,
      sal.created_at
    FROM security_audit_log sal
    LEFT JOIN users u ON u.id = sal.user_id
    LEFT JOIN users tu ON tu.id = sal.target_user_id
    WHERE sal.id = $1 AND sal.organisation_id = $2`,
    [id, organisationId]
  );
  
  if (result.rowCount === 0) {
    return null;
  }
  
  const row = result.rows[0];
  return {
    id: row.id,
    eventType: row.event_type,
    organisationId: row.organisation_id,
    userId: row.user_id,
    userName: row.user_name,
    targetUserId: row.target_user_id,
    targetUserName: row.target_user_name,
    ipAddress: row.ip_address,
    userAgent: row.user_agent,
    metadata: row.metadata,
    createdAt: row.created_at
  };
};

/**
 * Mask the last octet of an IP address for privacy
 */
const maskIpAddress = (ip) => {
  if (!ip) return null;
  const ipStr = ip.toString();
  // For IPv4, mask last octet
  if (ipStr.includes('.')) {
    const parts = ipStr.split('.');
    if (parts.length === 4) {
      parts[3] = 'xxx';
      return parts.join('.');
    }
  }
  // For IPv6, just show partial
  if (ipStr.includes(':')) {
    const parts = ipStr.split(':');
    if (parts.length > 2) {
      return `${parts[0]}:${parts[1]}:...`;
    }
  }
  return ipStr;
};

module.exports = {
  EventTypes,
  logSecurityEvent,
  logLoginAttempt,
  logPasswordResetRequest,
  logPasswordResetComplete,
  logPasswordChange,
  log2FAEnabled,
  log2FADisabled,
  log2FABackupUsed,
  logAccessRequestCreated,
  logAccessRequestApproved,
  logAccessRequestRejected,
  logAccountLocked,
  logAccountUnlocked,
  logUserRoleChanged,
  querySecurityAudit,
  getSecurityAuditEvent,
  maskIpAddress
};

/**
 * TwoFactorService - Phase 6
 * Handles TOTP-based two-factor authentication
 * Uses otplib for TOTP generation/verification
 */

const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const QRCode = require('qrcode');
const { authenticator } = require('otplib');
const { query } = require('../config/db');
const env = require('../config/env');
const securityAuditService = require('./securityAuditService');

// Constants
const BACKUP_CODE_COUNT = 10;
const BACKUP_CODE_LENGTH = 8;
const TOTP_WINDOW = 1; // Allow ±1 time step

// Configure otplib
authenticator.options = {
  window: TOTP_WINDOW,
  digits: 6,
  step: 30
};

/**
 * Get encryption key from environment
 * @returns {Buffer} - 32-byte key
 */
const getEncryptionKey = () => {
  // Use TOTP_ENCRYPTION_KEY if available, fall back to JWT_SECRET
  const key = env.totpEncryptionKey || process.env.TOTP_ENCRYPTION_KEY || env.jwtSecret || process.env.JWT_SECRET;
  if (!key) {
    throw new Error('No encryption key available for 2FA. Set TOTP_ENCRYPTION_KEY or JWT_SECRET.');
  }
  // Ensure key is 32 bytes for AES-256
  return crypto.scryptSync(key, 'salt', 32);
};

/**
 * Encrypt a TOTP secret using AES-256-GCM
 * @param {string} secret - Plain TOTP secret
 * @returns {Object} - { encrypted, iv }
 */
const encryptSecret = (secret) => {
  const key = getEncryptionKey();
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  
  let encrypted = cipher.update(secret, 'utf8', 'base64');
  encrypted += cipher.final('base64');
  const authTag = cipher.getAuthTag();
  
  // Combine encrypted data and auth tag
  const combined = Buffer.concat([
    Buffer.from(encrypted, 'base64'),
    authTag
  ]).toString('base64');
  
  return {
    encrypted: combined,
    iv: iv.toString('hex')
  };
};

/**
 * Decrypt a TOTP secret
 * @param {string} encrypted - Encrypted secret
 * @param {string} ivHex - IV in hex format
 * @returns {string} - Plain TOTP secret
 */
const decryptSecret = (encrypted, ivHex) => {
  const key = getEncryptionKey();
  const iv = Buffer.from(ivHex, 'hex');
  
  const combined = Buffer.from(encrypted, 'base64');
  const authTag = combined.slice(-16);
  const encryptedData = combined.slice(0, -16);
  
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(authTag);
  
  let decrypted = decipher.update(encryptedData, null, 'utf8');
  decrypted += decipher.final('utf8');
  
  return decrypted;
};

/**
 * Generate a random backup code
 * @returns {string} - 8-character alphanumeric code
 */
const generateBackupCode = () => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Exclude confusing chars
  let code = '';
  const bytes = crypto.randomBytes(BACKUP_CODE_LENGTH);
  for (let i = 0; i < BACKUP_CODE_LENGTH; i++) {
    code += chars[bytes[i] % chars.length];
  }
  return code;
};

/**
 * Generate backup codes for a user
 * @param {string} userId - User ID
 * @returns {Promise<string[]>} - Array of plain backup codes
 */
const generateBackupCodes = async (userId) => {
  const codes = [];
  
  // Delete existing codes
  await query('DELETE FROM user_backup_codes WHERE user_id = $1', [userId]);
  
  // Generate new codes
  for (let i = 0; i < BACKUP_CODE_COUNT; i++) {
    const code = generateBackupCode();
    codes.push(code);
    
    // Hash and store
    const codeHash = await bcrypt.hash(code, 10);
    await query(
      `INSERT INTO user_backup_codes (user_id, code_hash, code_index) VALUES ($1, $2, $3)`,
      [userId, codeHash, i]
    );
  }
  
  // Update 2FA record
  await query(
    `UPDATE user_2fa 
     SET backup_codes_generated_at = NOW(), 
         backup_codes_remaining = $1,
         updated_at = NOW()
     WHERE user_id = $2`,
    [BACKUP_CODE_COUNT, userId]
  );
  
  return codes;
};

/**
 * Initiate 2FA setup for a user
 * @param {string} userId - User ID
 * @param {string} email - User email
 * @returns {Promise<Object>} - Setup data with secret and QR code
 */
const initiate2FASetup = async (userId, email) => {
  // Generate new secret
  const secret = authenticator.generateSecret(20); // 160-bit secret
  
  // Encrypt the secret
  const { encrypted, iv } = encryptSecret(secret);
  
  // Store or update 2FA record (not enabled yet)
  const existingResult = await query(
    'SELECT id FROM user_2fa WHERE user_id = $1',
    [userId]
  );
  
  if (existingResult.rowCount > 0) {
    await query(
      `UPDATE user_2fa 
       SET secret_encrypted = $1, secret_iv = $2, is_enabled = FALSE, updated_at = NOW()
       WHERE user_id = $3`,
      [encrypted, iv, userId]
    );
  } else {
    await query(
      `INSERT INTO user_2fa (user_id, secret_encrypted, secret_iv, is_enabled)
       VALUES ($1, $2, $3, FALSE)`,
      [userId, encrypted, iv]
    );
  }
  
  // Generate QR code
  const issuer = 'EHS Portal';
  const otpauthUrl = authenticator.keyuri(email, issuer, secret);
  const qrCodeUrl = await QRCode.toDataURL(otpauthUrl);
  
  // Format secret for manual entry (groups of 4)
  const manualEntryKey = secret.match(/.{1,4}/g).join(' ');
  
  return {
    secret,
    qrCodeUrl,
    manualEntryKey,
    issuer,
    accountName: email
  };
};

/**
 * Verify and enable 2FA
 * @param {Object} params - Verification parameters
 * @returns {Promise<Object>} - Result with backup codes if successful
 */
const verifyAndEnable2FA = async ({
  userId,
  organisationId,
  code,
  ipAddress = null,
  userAgent = null
}) => {
  // Get pending 2FA setup
  const result = await query(
    `SELECT secret_encrypted, secret_iv, is_enabled 
     FROM user_2fa WHERE user_id = $1`,
    [userId]
  );
  
  if (result.rowCount === 0) {
    return { success: false, error: 'NO_PENDING_SETUP', message: 'No 2FA setup in progress.' };
  }
  
  const record = result.rows[0];
  
  if (record.is_enabled) {
    return { success: false, error: 'ALREADY_ENABLED', message: '2FA is already enabled.' };
  }
  
  // Decrypt secret and verify code
  const secret = decryptSecret(record.secret_encrypted, record.secret_iv);
  const isValid = authenticator.verify({ token: code, secret });
  
  if (!isValid) {
    return { success: false, error: 'INVALID_CODE', message: 'Invalid verification code.' };
  }
  
  // Enable 2FA
  await query(
    `UPDATE user_2fa 
     SET is_enabled = TRUE, enabled_at = NOW(), updated_at = NOW()
     WHERE user_id = $1`,
    [userId]
  );
  
  // Update user flag
  await query(
    `UPDATE users SET has_2fa_enabled = TRUE WHERE id = $1`,
    [userId]
  );
  
  // Generate backup codes
  const backupCodes = await generateBackupCodes(userId);
  
  // Log the event
  await securityAuditService.log2FAEnabled({
    userId,
    organisationId,
    ipAddress,
    userAgent
  });
  
  return {
    success: true,
    enabled: true,
    backupCodes,
    message: 'Two-factor authentication is now enabled. Please save your backup codes.'
  };
};

/**
 * Verify a TOTP code
 * @param {string} userId - User ID
 * @param {string} code - 6-digit TOTP code
 * @returns {Promise<Object>} - Verification result
 */
const verifyTOTP = async (userId, code) => {
  const result = await query(
    `SELECT secret_encrypted, secret_iv, is_enabled 
     FROM user_2fa WHERE user_id = $1`,
    [userId]
  );
  
  if (result.rowCount === 0 || !result.rows[0].is_enabled) {
    return { valid: false, error: '2FA_NOT_ENABLED' };
  }
  
  const record = result.rows[0];
  const secret = decryptSecret(record.secret_encrypted, record.secret_iv);
  const isValid = authenticator.verify({ token: code, secret });
  
  if (isValid) {
    // Update last used
    await query(
      `UPDATE user_2fa SET last_used_at = NOW() WHERE user_id = $1`,
      [userId]
    );
  }
  
  return { valid: isValid };
};

/**
 * Verify a backup code
 * @param {Object} params - Verification parameters
 * @returns {Promise<Object>} - Verification result
 */
const verifyBackupCode = async ({
  userId,
  organisationId,
  code,
  ipAddress = null,
  userAgent = null
}) => {
  // Get unused backup codes
  const result = await query(
    `SELECT id, code_hash FROM user_backup_codes 
     WHERE user_id = $1 AND used_at IS NULL`,
    [userId]
  );
  
  for (const row of result.rows) {
    const matches = await bcrypt.compare(code.toUpperCase(), row.code_hash);
    if (matches) {
      // Mark as used
      await query(
        `UPDATE user_backup_codes SET used_at = NOW() WHERE id = $1`,
        [row.id]
      );
      
      // Update remaining count
      await query(
        `UPDATE user_2fa 
         SET backup_codes_remaining = backup_codes_remaining - 1 
         WHERE user_id = $1`,
        [userId]
      );
      
      // Get remaining count
      const countResult = await query(
        `SELECT backup_codes_remaining FROM user_2fa WHERE user_id = $1`,
        [userId]
      );
      const codesRemaining = countResult.rows[0]?.backup_codes_remaining || 0;
      
      // Log the event
      await securityAuditService.log2FABackupUsed({
        userId,
        organisationId,
        codesRemaining,
        ipAddress,
        userAgent
      });
      
      return { 
        valid: true, 
        codesRemaining,
        warning: codesRemaining <= 2 ? {
          codesRemaining,
          message: `You have only ${codesRemaining} backup codes remaining. Consider regenerating.`
        } : null
      };
    }
  }
  
  return { valid: false, error: 'INVALID_BACKUP_CODE' };
};

/**
 * Disable 2FA for a user
 * @param {Object} params - Disable parameters
 * @returns {Promise<Object>} - Result
 */
const disable2FA = async ({
  userId,
  organisationId,
  code,
  ipAddress = null,
  userAgent = null
}) => {
  // Verify current code first
  const verification = await verifyTOTP(userId, code);
  if (!verification.valid) {
    return { success: false, error: 'INVALID_CODE', message: 'Invalid verification code.' };
  }
  
  // Disable 2FA
  await query(
    `UPDATE user_2fa 
     SET is_enabled = FALSE, disabled_at = NOW(), updated_at = NOW()
     WHERE user_id = $1`,
    [userId]
  );
  
  // Update user flag
  await query(
    `UPDATE users SET has_2fa_enabled = FALSE WHERE id = $1`,
    [userId]
  );
  
  // Delete backup codes
  await query('DELETE FROM user_backup_codes WHERE user_id = $1', [userId]);
  
  // Log the event
  await securityAuditService.log2FADisabled({
    userId,
    organisationId,
    ipAddress,
    userAgent
  });
  
  return {
    success: true,
    message: 'Two-factor authentication has been disabled.'
  };
};

/**
 * Regenerate backup codes
 * @param {Object} params - Regenerate parameters
 * @returns {Promise<Object>} - Result with new codes
 */
const regenerateBackupCodes = async ({
  userId,
  organisationId,
  code,
  ipAddress = null,
  userAgent = null
}) => {
  // Verify current code first
  const verification = await verifyTOTP(userId, code);
  if (!verification.valid) {
    return { success: false, error: 'INVALID_CODE', message: 'Invalid verification code.' };
  }
  
  // Generate new codes
  const backupCodes = await generateBackupCodes(userId);
  
  // Log the event
  await securityAuditService.logSecurityEvent({
    eventType: securityAuditService.EventTypes.TWO_FA_BACKUP_REGENERATED,
    organisationId,
    userId,
    ipAddress,
    userAgent
  });
  
  return {
    success: true,
    backupCodes,
    message: 'New backup codes generated. Previous codes are now invalid.'
  };
};

/**
 * Get 2FA status for a user
 * @param {string} userId - User ID
 * @returns {Promise<Object>} - 2FA status
 */
const get2FAStatus = async (userId) => {
  const result = await query(
    `SELECT is_enabled, enabled_at, last_used_at, backup_codes_remaining 
     FROM user_2fa WHERE user_id = $1`,
    [userId]
  );
  
  if (result.rowCount === 0) {
    return {
      enabled: false,
      enabledAt: null,
      backupCodesRemaining: 0,
      lastUsed: null
    };
  }
  
  const record = result.rows[0];
  return {
    enabled: record.is_enabled,
    enabledAt: record.enabled_at,
    backupCodesRemaining: record.backup_codes_remaining,
    lastUsed: record.last_used_at
  };
};

/**
 * Check if user has 2FA enabled
 * @param {string} userId - User ID
 * @returns {Promise<boolean>} - Whether 2FA is enabled
 */
const is2FAEnabled = async (userId) => {
  const result = await query(
    `SELECT has_2fa_enabled FROM users WHERE id = $1`,
    [userId]
  );
  return result.rows[0]?.has_2fa_enabled || false;
};

module.exports = {
  initiate2FASetup,
  verifyAndEnable2FA,
  verifyTOTP,
  verifyBackupCode,
  disable2FA,
  regenerateBackupCodes,
  get2FAStatus,
  is2FAEnabled,
  generateBackupCodes
};

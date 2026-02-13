/**
 * PasswordResetService - Phase 6
 * Handles password reset token generation, validation, and password reset flow
 */

const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const { query } = require('../config/db');
const { sendEmail, isSmtpConfigured } = require('../utils/emailSender');
const emailTemplates = require('../utils/emailTemplates');
const env = require('../config/env');
const securityAuditService = require('./securityAuditService');

// Constants
const TOKEN_EXPIRY_MINUTES = 30;
const MAX_TOKEN_ATTEMPTS = 5;
const PASSWORD_HISTORY_COUNT = 5;

/**
 * Generate a secure random token
 * @returns {string} - 64-byte hex-encoded token
 */
const generateToken = () => {
  return crypto.randomBytes(64).toString('hex');
};

/**
 * Hash a token using SHA-256
 * @param {string} token - Plain token
 * @returns {string} - Hashed token
 */
const hashToken = (token) => {
  return crypto.createHash('sha256').update(token).digest('hex');
};

/**
 * Request a password reset for an email address
 * @param {Object} params - Request parameters
 * @returns {Promise<Object>} - Result with success status
 */
const requestPasswordReset = async ({
  email,
  ipAddress = null,
  userAgent = null
}) => {
  // Look up user by email
  const userResult = await query(
    `SELECT id, email, name, organisation_id FROM users WHERE email = $1 AND is_active = true`,
    [email.toLowerCase().trim()]
  );
  
  // Always return success to prevent email enumeration
  if (userResult.rowCount === 0) {
    // Log the attempt but don't reveal user doesn't exist
    await securityAuditService.logPasswordResetRequest({
      email: email.toLowerCase().trim(),
      ipAddress,
      userAgent
    });
    return { success: true, message: 'If this email exists in our system, you will receive password reset instructions.' };
  }
  
  const user = userResult.rows[0];
  
  // Invalidate any existing tokens for this user
  await query(
    `UPDATE password_reset_tokens 
     SET used_at = NOW() 
     WHERE user_id = $1 AND used_at IS NULL`,
    [user.id]
  );
  
  // Generate new token
  const plainToken = generateToken();
  const tokenHash = hashToken(plainToken);
  const expiresAt = new Date(Date.now() + TOKEN_EXPIRY_MINUTES * 60 * 1000);
  
  // Store hashed token
  await query(
    `INSERT INTO password_reset_tokens (user_id, token_hash, expires_at, ip_address)
     VALUES ($1, $2, $3, $4)`,
    [user.id, tokenHash, expiresAt, ipAddress]
  );
  
  // Log the request
  await securityAuditService.logPasswordResetRequest({
    email: user.email,
    userId: user.id,
    ipAddress,
    userAgent
  });
  
  // Send email if SMTP is configured
  let emailSent = false;
  if (isSmtpConfigured()) {
    const resetUrl = `${env.frontendUrl}/reset-password?token=${plainToken}`;
    try {
      await sendPasswordResetEmail(user, resetUrl);
      emailSent = true;
      console.log('[PasswordReset] Reset email sent to:', user.email);
    } catch (emailError) {
      console.error('[PasswordReset] Failed to send reset email:', emailError.message);
      // Continue - token is still valid, user just won't receive email
    }
  } else {
    console.warn('[PasswordReset] SMTP not configured - email not sent for:', user.email);
  }
  
  return { 
    success: true, 
    message: 'If this email exists in our system, you will receive password reset instructions.',
    // Only include token in development for testing
    ...(env.nodeEnv === 'development' && { _devToken: plainToken }),
    // Include email status for debugging (not exposed to users)
    _emailSent: emailSent
  };
};

/**
 * Validate a password reset token
 * @param {string} token - Plain token from URL
 * @returns {Promise<Object>} - Validation result
 */
const validateResetToken = async (token) => {
  if (!token || token.length < 32) {
    return { valid: false, error: 'TOKEN_INVALID', message: 'Invalid reset link.' };
  }
  
  const tokenHash = hashToken(token);
  
  const result = await query(
    `SELECT prt.id, prt.user_id, prt.expires_at, prt.used_at, prt.attempts,
            u.email
     FROM password_reset_tokens prt
     JOIN users u ON u.id = prt.user_id
     WHERE prt.token_hash = $1`,
    [tokenHash]
  );
  
  if (result.rowCount === 0) {
    return { valid: false, error: 'TOKEN_INVALID', message: 'This reset link is invalid.' };
  }
  
  const tokenRecord = result.rows[0];
  
  if (tokenRecord.used_at) {
    return { valid: false, error: 'TOKEN_USED', message: 'This reset link has already been used.' };
  }
  
  if (new Date(tokenRecord.expires_at) < new Date()) {
    return { valid: false, error: 'TOKEN_EXPIRED', message: 'This reset link has expired. Please request a new one.' };
  }
  
  if (tokenRecord.attempts >= MAX_TOKEN_ATTEMPTS) {
    return { valid: false, error: 'MAX_ATTEMPTS', message: 'Too many invalid attempts. Please request a new reset link.' };
  }
  
  // Mask email for display
  const maskedEmail = maskEmail(tokenRecord.email);
  
  return { 
    valid: true, 
    email: maskedEmail,
    tokenId: tokenRecord.id
  };
};

/**
 * Reset password using a valid token
 * @param {Object} params - Reset parameters
 * @returns {Promise<Object>} - Result
 */
const resetPassword = async ({
  token,
  newPassword,
  ipAddress = null,
  userAgent = null
}) => {
  if (!token || token.length < 32) {
    return { success: false, error: 'TOKEN_INVALID', message: 'Invalid reset link.' };
  }
  
  const tokenHash = hashToken(token);
  
  // Get token record with user info
  const result = await query(
    `SELECT prt.id, prt.user_id, prt.expires_at, prt.used_at, prt.attempts,
            u.email, u.password_hash AS current_hash, u.organisation_id
     FROM password_reset_tokens prt
     JOIN users u ON u.id = prt.user_id
     WHERE prt.token_hash = $1`,
    [tokenHash]
  );
  
  if (result.rowCount === 0) {
    return { success: false, error: 'TOKEN_INVALID', message: 'This reset link is invalid.' };
  }
  
  const tokenRecord = result.rows[0];
  
  if (tokenRecord.used_at) {
    return { success: false, error: 'TOKEN_USED', message: 'This reset link has already been used.' };
  }
  
  if (new Date(tokenRecord.expires_at) < new Date()) {
    return { success: false, error: 'TOKEN_EXPIRED', message: 'This reset link has expired. Please request a new one.' };
  }
  
  // Increment attempts
  await query(
    `UPDATE password_reset_tokens SET attempts = attempts + 1 WHERE id = $1`,
    [tokenRecord.id]
  );
  
  if (tokenRecord.attempts >= MAX_TOKEN_ATTEMPTS) {
    return { success: false, error: 'MAX_ATTEMPTS', message: 'Too many invalid attempts. Please request a new reset link.' };
  }
  
  // Validate password strength
  const passwordValidation = validatePasswordStrength(newPassword);
  if (!passwordValidation.valid) {
    return { success: false, error: 'PASSWORD_WEAK', message: passwordValidation.message };
  }
  
  // Check password history
  const historyCheck = await checkPasswordHistory(tokenRecord.user_id, newPassword);
  if (!historyCheck.allowed) {
    return { success: false, error: 'PASSWORD_REUSED', message: 'You cannot reuse a recent password. Please choose a different password.' };
  }
  
  // Hash new password
  const newPasswordHash = await bcrypt.hash(newPassword, 12);
  
  // Update user password
  await query(
    `UPDATE users 
     SET password_hash = $1, 
         password_changed_at = NOW(),
         force_password_change = FALSE,
         failed_login_attempts = 0,
         locked_until = NULL
     WHERE id = $2`,
    [newPasswordHash, tokenRecord.user_id]
  );
  
  // Store in password history
  await addPasswordToHistory(tokenRecord.user_id, tokenRecord.current_hash);
  
  // Mark token as used
  await query(
    `UPDATE password_reset_tokens SET used_at = NOW() WHERE id = $1`,
    [tokenRecord.id]
  );
  
  // Log the password reset
  await securityAuditService.logPasswordResetComplete({
    userId: tokenRecord.user_id,
    organisationId: tokenRecord.organisation_id,
    ipAddress,
    userAgent
  });
  
  return { 
    success: true, 
    message: 'Your password has been reset. You can now log in with your new password.' 
  };
};

/**
 * Change password for authenticated user
 * @param {Object} params - Change parameters
 * @returns {Promise<Object>} - Result
 */
const changePassword = async ({
  userId,
  organisationId,
  currentPassword,
  newPassword,
  ipAddress = null,
  userAgent = null
}) => {
  // Get current password hash
  const userResult = await query(
    `SELECT password_hash FROM users WHERE id = $1`,
    [userId]
  );
  
  if (userResult.rowCount === 0) {
    return { success: false, error: 'USER_NOT_FOUND', message: 'User not found.' };
  }
  
  const currentHash = userResult.rows[0].password_hash;
  
  // Verify current password
  const matches = await bcrypt.compare(currentPassword, currentHash);
  if (!matches) {
    return { success: false, error: 'INCORRECT_PASSWORD', message: 'Current password is incorrect.' };
  }
  
  // Check if new password is same as current
  const samePassword = await bcrypt.compare(newPassword, currentHash);
  if (samePassword) {
    return { success: false, error: 'SAME_PASSWORD', message: 'New password must be different from your current password.' };
  }
  
  // Validate password strength
  const passwordValidation = validatePasswordStrength(newPassword);
  if (!passwordValidation.valid) {
    return { success: false, error: 'PASSWORD_WEAK', message: passwordValidation.message };
  }
  
  // Check password history
  const historyCheck = await checkPasswordHistory(userId, newPassword);
  if (!historyCheck.allowed) {
    return { success: false, error: 'PASSWORD_REUSED', message: 'You cannot reuse a recent password. Please choose a different password.' };
  }
  
  // Hash new password
  const newPasswordHash = await bcrypt.hash(newPassword, 12);
  
  // Update user password
  await query(
    `UPDATE users 
     SET password_hash = $1, 
         password_changed_at = NOW(),
         force_password_change = FALSE
     WHERE id = $2`,
    [newPasswordHash, userId]
  );
  
  // Store in password history
  await addPasswordToHistory(userId, currentHash);
  
  // Log the password change
  await securityAuditService.logPasswordChange({
    userId,
    organisationId,
    ipAddress,
    userAgent
  });
  
  return { 
    success: true, 
    message: 'Your password has been changed successfully.' 
  };
};

/**
 * Validate password strength
 * @param {string} password - Password to validate
 * @returns {Object} - Validation result
 */
const validatePasswordStrength = (password) => {
  if (!password || password.length < 12) {
    return { valid: false, message: 'Password must be at least 12 characters long.' };
  }
  
  if (password.length > 128) {
    return { valid: false, message: 'Password must be less than 128 characters.' };
  }
  
  // Check for at least one uppercase, one lowercase, one number, and one special character
  const hasUppercase = /[A-Z]/.test(password);
  const hasLowercase = /[a-z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const hasSpecial = /[!@#$%^&*(),.?":{}|<>]/.test(password);
  
  if (!hasUppercase || !hasLowercase || !hasNumber || !hasSpecial) {
    return { 
      valid: false, 
      message: 'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character.' 
    };
  }
  
  return { valid: true };
};

/**
 * Check if password was used recently
 * @param {string} userId - User ID
 * @param {string} newPassword - New password to check
 * @returns {Promise<Object>} - Check result
 */
const checkPasswordHistory = async (userId, newPassword) => {
  const historyResult = await query(
    `SELECT password_hash FROM user_password_history 
     WHERE user_id = $1 
     ORDER BY created_at DESC 
     LIMIT $2`,
    [userId, PASSWORD_HISTORY_COUNT]
  );
  
  for (const row of historyResult.rows) {
    const matches = await bcrypt.compare(newPassword, row.password_hash);
    if (matches) {
      return { allowed: false };
    }
  }
  
  return { allowed: true };
};

/**
 * Add password to history
 * @param {string} userId - User ID
 * @param {string} passwordHash - Password hash to store
 */
const addPasswordToHistory = async (userId, passwordHash) => {
  // Insert new password hash
  await query(
    `INSERT INTO user_password_history (user_id, password_hash) VALUES ($1, $2)`,
    [userId, passwordHash]
  );
  
  // Delete old entries beyond the limit
  await query(
    `DELETE FROM user_password_history 
     WHERE id IN (
       SELECT id FROM user_password_history 
       WHERE user_id = $1 
       ORDER BY created_at DESC 
       OFFSET $2
     )`,
    [userId, PASSWORD_HISTORY_COUNT]
  );
};

/**
 * Mask an email address for display
 * @param {string} email - Email to mask
 * @returns {string} - Masked email (e.g., "u***@example.com")
 */
const maskEmail = (email) => {
  if (!email) return '';
  const [local, domain] = email.split('@');
  if (!domain) return email;
  
  const maskedLocal = local.charAt(0) + '***';
  return `${maskedLocal}@${domain}`;
};

/**
 * Send password reset email
 * @param {Object} user - User object
 * @param {string} resetUrl - Password reset URL
 */
const sendPasswordResetEmail = async (user, resetUrl) => {
  const template = emailTemplates.passwordReset({
    name: user.name,
    resetUrl,
    expiryMinutes: TOKEN_EXPIRY_MINUTES
  });
  
  await sendEmail({
    to: user.email,
    subject: template.subject,
    text: template.text,
    html: template.html
  });
};

/**
 * Cleanup expired tokens (for scheduled job)
 */
const cleanupExpiredTokens = async () => {
  const result = await query(
    `DELETE FROM password_reset_tokens 
     WHERE expires_at < NOW() - INTERVAL '24 hours'
     RETURNING id`
  );
  return { deleted: result.rowCount };
};

module.exports = {
  requestPasswordReset,
  validateResetToken,
  resetPassword,
  changePassword,
  validatePasswordStrength,
  cleanupExpiredTokens,
  maskEmail
};

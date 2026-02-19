const crypto = require('crypto');
const { query } = require('../config/db');
const { sendEmail, isSmtpConfigured } = require('../utils/emailSender');
const emailTemplates = require('../utils/emailTemplates');
const env = require('../config/env');

const OTP_LENGTH = 6;
const OTP_EXPIRY_MINUTES = 10;
const MAX_ATTEMPTS = 5;
const REVALIDATION_WINDOW_DAYS = 7;
const TRUSTED_DEVICE_DAYS = 30;

const normalizePhone = (value) => {
  if (!value) return '';
  const trimmed = String(value).trim();
  if (!trimmed) return '';
  const normalized = trimmed.replace(/[^\d+]/g, '');
  if (normalized.startsWith('+')) return normalized;
  return `+${normalized}`;
};

const hashSecret = (value) => crypto.createHash('sha256').update(value).digest('hex');

const generateOtp = () => {
  const min = 10 ** (OTP_LENGTH - 1);
  const max = (10 ** OTP_LENGTH) - 1;
  return String(crypto.randomInt(min, max + 1));
};

const maskEmail = (email) => {
  const [local = '', domain = ''] = String(email).split('@');
  if (!local || !domain) return email;
  const head = local.slice(0, 2);
  return `${head}${'*'.repeat(Math.max(local.length - 2, 1))}@${domain}`;
};

const maskPhone = (phone) => {
  const cleaned = String(phone).replace(/\D/g, '');
  if (cleaned.length < 4) return phone;
  return `***-***-${cleaned.slice(-4)}`;
};

const isRevalidationRequired = (lastRevalidatedAt) => {
  if (!lastRevalidatedAt) return true;
  const thresholdMs = REVALIDATION_WINDOW_DAYS * 24 * 60 * 60 * 1000;
  return (Date.now() - new Date(lastRevalidatedAt).getTime()) >= thresholdMs;
};

const cleanupStaleOtps = async (userId) => {
  await query(
    `DELETE FROM user_access_revalidation_otp
     WHERE user_id = $1
       AND (used_at IS NOT NULL OR expires_at < NOW())`,
    [userId]
  );
};

const sendEmailOtp = async ({ email, name, otpCode }) => {
  if (!isSmtpConfigured()) {
    throw new Error('Email delivery is not configured.');
  }
  const template = emailTemplates.otpVerification({
    name: name || 'User',
    otpCode,
    expiryMinutes: OTP_EXPIRY_MINUTES,
    purpose: 're-validate your account access'
  });
  await sendEmail({
    to: email,
    subject: template.subject,
    text: template.text,
    html: template.html
  });
};

const sendPhoneOtp = async ({ phone, email, name, otpCode }) => {
  const smsConfigured = Boolean(env.twilioAccountSid && env.twilioAuthToken && env.twilioFromNumber);
  if (!smsConfigured) {
    await sendEmailOtp({ email, name, otpCode });
    return { usedFallback: true, fallback: 'email' };
  }

  const message = `Your EHS Portal verification code is ${otpCode}. It expires in ${OTP_EXPIRY_MINUTES} minutes.`;
  const endpoint = `https://api.twilio.com/2010-04-01/Accounts/${env.twilioAccountSid}/Messages.json`;
  const authHeader = Buffer.from(`${env.twilioAccountSid}:${env.twilioAuthToken}`).toString('base64');
  const body = new URLSearchParams({
    To: phone,
    From: env.twilioFromNumber,
    Body: message
  });

  try {
    const resp = await fetch(endpoint, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${authHeader}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body
    });

    if (!resp.ok) {
      const errorText = await resp.text();
      console.error('[Revalidation OTP] Twilio send failed:', resp.status, errorText);
      await sendEmailOtp({ email, name, otpCode });
      return { usedFallback: true, fallback: 'email', requestedPhone: phone };
    }

    return { usedFallback: false };
  } catch (err) {
    console.error('[Revalidation OTP] Twilio error:', err.message);
    await sendEmailOtp({ email, name, otpCode });
    return { usedFallback: true, fallback: 'email', requestedPhone: phone };
  }
};

const startRevalidationOtp = async ({ userId, email, name, mobilePhone, preferredChannel }) => {
  await cleanupStaleOtps(userId);

  const normalizedPhone = normalizePhone(mobilePhone);
  const resolvedChannel = preferredChannel === 'phone' ? 'phone' : 'email';

  if (resolvedChannel === 'phone' && !normalizedPhone) {
    return {
      success: false,
      error: 'PHONE_REQUIRED',
      message: 'No mobile number is registered for this account. Choose email instead.'
    };
  }

  const otpCode = generateOtp();
  const otpHash = hashSecret(otpCode);
  const expiresAt = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);
  const destination = resolvedChannel === 'phone' ? normalizedPhone : email;

  await query(
    `INSERT INTO user_access_revalidation_otp
      (user_id, channel, destination, otp_hash, expires_at, max_attempts)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [userId, resolvedChannel, destination, otpHash, expiresAt, MAX_ATTEMPTS]
  );

  let deliveryMeta = {};
  if (resolvedChannel === 'phone') {
    deliveryMeta = await sendPhoneOtp({ phone: normalizedPhone, email, name, otpCode });
  } else {
    await sendEmailOtp({ email, name, otpCode });
  }

  return {
    success: true,
    channel: resolvedChannel,
    destinationMasked: resolvedChannel === 'phone' ? maskPhone(destination) : maskEmail(destination),
    expiresInMinutes: OTP_EXPIRY_MINUTES,
    deliveryMeta
  };
};

const verifyRevalidationOtp = async ({ userId, code }) => {
  const latestResult = await query(
    `SELECT id, otp_hash, attempts, max_attempts, expires_at, used_at
     FROM user_access_revalidation_otp
     WHERE user_id = $1
     ORDER BY created_at DESC
     LIMIT 1`,
    [userId]
  );

  if (latestResult.rowCount === 0) {
    return { success: false, error: 'NOT_FOUND', message: 'No active revalidation challenge found.' };
  }

  const otp = latestResult.rows[0];
  const now = new Date();
  if (otp.used_at) {
    return { success: false, error: 'ALREADY_USED', message: 'This code has already been used. Request a new code.' };
  }
  if (now > new Date(otp.expires_at)) {
    return { success: false, error: 'EXPIRED', message: 'This code has expired. Request a new code.' };
  }
  if (otp.attempts >= otp.max_attempts) {
    return { success: false, error: 'MAX_ATTEMPTS', message: 'Maximum attempts reached. Request a new code.' };
  }

  const candidateHash = hashSecret(String(code || '').trim());
  if (candidateHash !== otp.otp_hash) {
    const nextAttempts = otp.attempts + 1;
    await query(
      `UPDATE user_access_revalidation_otp
       SET attempts = $1
       WHERE id = $2`,
      [nextAttempts, otp.id]
    );

    if (nextAttempts >= otp.max_attempts) {
      return { success: false, error: 'MAX_ATTEMPTS', message: 'Maximum attempts reached. Request a new code.' };
    }

    return {
      success: false,
      error: 'INVALID_CODE',
      message: `Invalid code. ${otp.max_attempts - nextAttempts} attempt(s) remaining.`
    };
  }

  await query(
    `UPDATE user_access_revalidation_otp
     SET used_at = NOW()
     WHERE id = $1`,
    [otp.id]
  );

  await query(
    `UPDATE users
     SET last_access_revalidated_at = NOW()
     WHERE id = $1`,
    [userId]
  );

  return { success: true };
};

const createTrustedDevice = async ({ userId, label = null, userAgent = null }) => {
  const rawToken = crypto.randomBytes(32).toString('hex');
  const tokenHash = hashSecret(rawToken);
  const expiresAt = new Date(Date.now() + TRUSTED_DEVICE_DAYS * 24 * 60 * 60 * 1000);

  await query(
    `INSERT INTO user_trusted_devices
      (user_id, token_hash, label, user_agent, expires_at, last_used_at)
     VALUES ($1, $2, $3, $4, $5, NOW())`,
    [userId, tokenHash, label, userAgent, expiresAt]
  );

  return {
    token: rawToken,
    expiresAt
  };
};

const validateTrustedDevice = async ({ userId, token }) => {
  if (!token) return { valid: false };
  const tokenHash = hashSecret(String(token).trim());
  const result = await query(
    `SELECT id
     FROM user_trusted_devices
     WHERE user_id = $1
       AND token_hash = $2
       AND revoked_at IS NULL
       AND expires_at > NOW()
     LIMIT 1`,
    [userId, tokenHash]
  );

  if (result.rowCount === 0) {
    return { valid: false };
  }

  await query(
    `UPDATE user_trusted_devices
     SET last_used_at = NOW()
     WHERE id = $1`,
    [result.rows[0].id]
  );

  return { valid: true };
};

module.exports = {
  REVALIDATION_WINDOW_DAYS,
  normalizePhone,
  isRevalidationRequired,
  startRevalidationOtp,
  verifyRevalidationOtp,
  createTrustedDevice,
  validateTrustedDevice
};

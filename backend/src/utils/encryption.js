/**
 * Encryption utilities for Phase 10
 * Handles AES-256-GCM encryption for secrets (client_secret, etc.)
 */

const crypto = require('crypto');
const env = require('../config/env');

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const AUTH_TAG_LENGTH = 16;

/**
 * Get encryption key from environment
 * Falls back to deriving from JWT secret if no dedicated key set
 */
const getEncryptionKey = () => {
  const key = env.integrationEncryptionKey || env.jwtSecret;
  // Ensure key is 32 bytes for AES-256
  return crypto.scryptSync(key, 'ehs-salt', 32);
};

/**
 * Encrypt a string value using AES-256-GCM
 * @param {string} plaintext - Value to encrypt
 * @returns {string} - Base64 encoded encrypted value (iv:authTag:ciphertext)
 */
const encryptSecret = (plaintext) => {
  if (!plaintext) return null;
  
  const key = getEncryptionKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  
  let encrypted = cipher.update(plaintext, 'utf8', 'base64');
  encrypted += cipher.final('base64');
  
  const authTag = cipher.getAuthTag();
  
  // Format: base64(iv):base64(authTag):base64(ciphertext)
  return `${iv.toString('base64')}:${authTag.toString('base64')}:${encrypted}`;
};

/**
 * Decrypt an encrypted string value
 * @param {string} encryptedValue - Base64 encoded encrypted value
 * @returns {string} - Decrypted plaintext
 */
const decryptSecret = (encryptedValue) => {
  if (!encryptedValue) return null;
  
  const key = getEncryptionKey();
  const parts = encryptedValue.split(':');
  
  if (parts.length !== 3) {
    throw new Error('Invalid encrypted value format');
  }
  
  const iv = Buffer.from(parts[0], 'base64');
  const authTag = Buffer.from(parts[1], 'base64');
  const ciphertext = parts[2];
  
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);
  
  let decrypted = decipher.update(ciphertext, 'base64', 'utf8');
  decrypted += decipher.final('utf8');
  
  return decrypted;
};

/**
 * Generate HMAC signature for webhook payloads
 * @param {string} payload - JSON string payload
 * @param {string} secret - Webhook secret
 * @param {string} timestamp - ISO timestamp
 * @returns {string} - HMAC-SHA256 signature
 */
const generateWebhookSignature = (payload, secret, timestamp) => {
  const signaturePayload = `${timestamp}.${payload}`;
  return crypto
    .createHmac('sha256', secret)
    .update(signaturePayload)
    .digest('hex');
};

/**
 * Verify webhook signature
 * @param {string} payload - JSON string payload
 * @param {string} secret - Webhook secret
 * @param {string} timestamp - ISO timestamp from header
 * @param {string} signature - Signature from header
 * @returns {boolean} - True if signature is valid
 */
const verifyWebhookSignature = (payload, secret, timestamp, signature) => {
  const expectedSignature = generateWebhookSignature(payload, secret, timestamp);
  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSignature)
  );
};

/**
 * Generate a secure random secret for webhooks
 * @param {number} length - Length of secret (default 32)
 * @returns {string} - Random secret string
 */
const generateWebhookSecret = (length = 32) => {
  return `whsec_${crypto.randomBytes(length).toString('base64url')}`;
};

module.exports = {
  encryptSecret,
  decryptSecret,
  generateWebhookSignature,
  verifyWebhookSignature,
  generateWebhookSecret
};

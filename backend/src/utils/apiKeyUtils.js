/**
 * API Key utilities for Phase 10
 * Handles API key generation, hashing, and verification
 */

const crypto = require('crypto');
const bcrypt = require('bcryptjs');

const API_KEY_PREFIX = 'ehs_';
const API_KEY_BYTES = 32;
const BCRYPT_ROUNDS = 10;

/**
 * Generate a new API key
 * @returns {{apiKey: string, prefix: string, hash: string}}
 */
const generateApiKey = async () => {
  // Generate random bytes
  const randomBytes = crypto.randomBytes(API_KEY_BYTES);
  const keyBody = randomBytes.toString('base64url');
  
  // Full key with prefix
  const apiKey = `${API_KEY_PREFIX}${keyBody}`;
  
  // Store prefix for identification - must fit in VARCHAR(12)
  // ehs_ (4 chars) + 8 chars from key body = 12 chars total
  const prefix = `${API_KEY_PREFIX}${keyBody.substring(0, 8)}`;
  
  // Hash the full key for storage
  const hash = await bcrypt.hash(apiKey, BCRYPT_ROUNDS);
  
  return {
    apiKey,      // Return to user once, never stored
    prefix,      // Stored for identification
    hash         // Stored for verification
  };
};

/**
 * Verify an API key against its hash
 * @param {string} apiKey - The API key to verify
 * @param {string} hash - The stored bcrypt hash
 * @returns {Promise<boolean>}
 */
const verifyApiKey = async (apiKey, hash) => {
  if (!apiKey || !hash) return false;
  return bcrypt.compare(apiKey, hash);
};

/**
 * Extract prefix from an API key for lookup
 * @param {string} apiKey - The API key
 * @returns {string|null} - The prefix or null if invalid format
 */
const extractPrefix = (apiKey) => {
  if (!apiKey || !apiKey.startsWith(API_KEY_PREFIX)) {
    return null;
  }
  // Return prefix + first 4 chars of body
  const body = apiKey.substring(API_KEY_PREFIX.length);
  return `${API_KEY_PREFIX}${body.substring(0, 4)}`;
};

/**
 * Mask an API key for display (show prefix + last 4 chars)
 * @param {string} apiKey - The full API key
 * @returns {string} - Masked key
 */
const maskApiKey = (apiKey) => {
  if (!apiKey || apiKey.length < 12) return '****';
  const last4 = apiKey.substring(apiKey.length - 4);
  return `${API_KEY_PREFIX}${'*'.repeat(24)}${last4}`;
};

/**
 * Validate API key format
 * @param {string} apiKey - The API key to validate
 * @returns {boolean}
 */
const isValidFormat = (apiKey) => {
  if (!apiKey) return false;
  if (!apiKey.startsWith(API_KEY_PREFIX)) return false;
  // Prefix + at least 32 chars of base64url
  return apiKey.length >= API_KEY_PREFIX.length + 32;
};

/**
 * Generate a random state parameter for SSO
 * @returns {string}
 */
const generateState = () => {
  return crypto.randomBytes(32).toString('base64url');
};

/**
 * Generate a random nonce for SSO
 * @returns {string}
 */
const generateNonce = () => {
  return crypto.randomBytes(32).toString('base64url');
};

/**
 * Generate PKCE code verifier
 * @returns {string}
 */
const generateCodeVerifier = () => {
  return crypto.randomBytes(64).toString('base64url');
};

/**
 * Generate PKCE code challenge from verifier
 * @param {string} verifier - Code verifier
 * @returns {string} - Code challenge (S256)
 */
const generateCodeChallenge = (verifier) => {
  return crypto
    .createHash('sha256')
    .update(verifier)
    .digest('base64url');
};

module.exports = {
  generateApiKey,
  verifyApiKey,
  extractPrefix,
  maskApiKey,
  isValidFormat,
  generateState,
  generateNonce,
  generateCodeVerifier,
  generateCodeChallenge,
  API_KEY_PREFIX
};

/**
 * SSO Routes - Phase 10
 * Handles SSO initiation, callback, and login status checks
 */

const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const ssoService = require('../services/ssoService');
const env = require('../config/env');
const { AppError } = require('../utils/appError');

/**
 * Helper to get client IP
 */
const getClientIp = (req) => {
  const forwarded = req.headers['x-forwarded-for'];
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  return req.connection?.remoteAddress || req.socket?.remoteAddress || req.ip || '0.0.0.0';
};

/**
 * Helper to parse user agent
 */
const parseUserAgent = (req) => {
  return req.headers['user-agent'] || 'Unknown';
};

/**
 * @route   GET /api/auth/sso/check/:orgSlug
 * @desc    Check if SSO is available for an organisation
 * @access  Public
 */
router.get('/check/:orgSlug', async (req, res, next) => {
  try {
    const { orgSlug } = req.params;
    
    const provider = await ssoService.getProviderByOrgSlug(orgSlug);
    
    if (!provider) {
      return res.json({
        sso_available: false,
        sso_only: false
      });
    }
    
    return res.json({
      sso_available: true,
      sso_only: provider.sso_only_mode || false,
      provider_name: provider.provider_name,
      provider_type: provider.provider_type
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   GET /api/auth/sso/init
 * @desc    Initiate SSO login flow
 * @access  Public
 * @query   org - Organisation slug
 * @query   redirect_to - Where to redirect after login (optional)
 */
router.get('/init', async (req, res, next) => {
  try {
    const { org, redirect_to } = req.query;
    
    if (!org) {
      throw new AppError('Organisation slug is required', 400, 'VALIDATION_ERROR');
    }
    
    const ipAddress = getClientIp(req);
    const redirectTo = redirect_to || '/dashboard';
    
    const result = await ssoService.initiateLogin(org, redirectTo, ipAddress);
    
    // Redirect to IdP authorization URL
    return res.redirect(result.authorizationUrl);
  } catch (error) {
    // For SSO errors, redirect to login with error message
    if (error.code === 'SSO_NOT_CONFIGURED' || error.code === 'NOT_FOUND') {
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
      return res.redirect(`${frontendUrl}/login?error=${encodeURIComponent(error.message)}`);
    }
    next(error);
  }
});

/**
 * @route   GET /api/auth/sso/callback
 * @desc    Handle SSO callback from IdP
 * @access  Public (called by IdP)
 */
router.get('/callback', async (req, res, next) => {
  try {
    const { code, state, error, error_description } = req.query;
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    
    // Handle IdP errors
    if (error) {
      console.error('SSO IdP error:', error, error_description);
      return res.redirect(`${frontendUrl}/login?error=${encodeURIComponent(error_description || error)}`);
    }
    
    if (!code || !state) {
      return res.redirect(`${frontendUrl}/login?error=${encodeURIComponent('Invalid SSO callback')}`);
    }
    
    const ipAddress = getClientIp(req);
    const userAgent = parseUserAgent(req);
    
    const result = await ssoService.handleCallback(code, state, ipAddress, userAgent);
    
    // Generate JWT token using same format as auth.js
    const token = jwt.sign(
      {
        sub: result.user.id,
        role: result.user.role,
        organisationId: result.user.organisation_id,
        ssoLogin: true,
        jitProvisioned: result.jitProvisioned
      },
      env.jwtSecret,
      { expiresIn: env.jwtExpiresIn }
    );
    
    // Redirect to frontend with token
    const redirectPath = result.redirectTo || '/dashboard';
    
    // For security, pass token in a short-lived manner
    // Option 1: Query param (less secure but simple)
    // Option 2: Set cookie (more secure)
    // Using query param for simplicity - frontend should immediately store and clear from URL
    return res.redirect(`${frontendUrl}${redirectPath}?sso_token=${token}&sso_success=true`);
    
  } catch (error) {
    console.error('SSO callback error:', error);
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    
    // User-friendly error messages
    let errorMessage = 'SSO login failed';
    if (error.code === 'STATE_MISMATCH') {
      errorMessage = 'Session expired. Please try again.';
    } else if (error.code === 'USER_NOT_FOUND') {
      errorMessage = error.message || 'User not found. Contact your administrator.';
    } else if (error.code === 'ACCOUNT_DISABLED') {
      errorMessage = 'Your account has been disabled.';
    } else if (error.code === 'INVALID_TOKEN') {
      errorMessage = 'Authentication failed. Please try again.';
    }
    
    return res.redirect(`${frontendUrl}/login?error=${encodeURIComponent(errorMessage)}`);
  }
});

/**
 * @route   POST /api/auth/sso/callback
 * @desc    Handle SSO callback via POST (some IdPs use POST)
 * @access  Public
 */
router.post('/callback', async (req, res, next) => {
  // Merge query and body params
  req.query = { ...req.query, ...req.body };
  
  // Delegate to GET handler
  return router.handle(req, res, next);
});

/**
 * @route   GET /api/auth/sso/logout
 * @desc    Handle SSO logout (optional - for future SLO support)
 * @access  Authenticated
 */
router.get('/logout', async (req, res, next) => {
  try {
    // For now, just redirect to frontend logout
    // Future: Implement Single Logout (SLO) with IdP
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    return res.redirect(`${frontendUrl}/logout`);
  } catch (error) {
    next(error);
  }
});

/**
 * @route   GET /api/auth/sso/metadata
 * @desc    Get SP metadata (for IdP configuration)
 * @access  Public
 */
router.get('/metadata', async (req, res, next) => {
  try {
    const baseUrl = process.env.BACKEND_URL || `http://localhost:${process.env.PORT || 3001}`;
    
    // Return basic metadata for IdP configuration
    return res.json({
      entity_id: `${baseUrl}/api/auth/sso`,
      acs_url: `${baseUrl}/api/auth/sso/callback`,
      slo_url: `${baseUrl}/api/auth/sso/logout`,
      supported_bindings: ['HTTP-Redirect', 'HTTP-POST'],
      name_id_format: 'urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress'
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;

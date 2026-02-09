/**
 * API Authentication Middleware - Phase 10
 * Handles X-API-Key authentication, rate limiting, scope checking, and IP allowlist
 */

const apiClientService = require('../services/apiClientService');
const { AppError } = require('../utils/appError');

// In-memory rate limit store (use Redis in production)
const rateLimitStore = new Map();

// Cleanup old rate limit entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, data] of rateLimitStore.entries()) {
    if (now - data.windowStart > 60000) { // 1 minute window
      rateLimitStore.delete(key);
    }
  }
}, 300000);

/**
 * Get client IP address from request
 */
const getClientIp = (req) => {
  const forwarded = req.headers['x-forwarded-for'];
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  return req.connection?.remoteAddress || req.socket?.remoteAddress || req.ip || '0.0.0.0';
};

/**
 * Main API key authentication middleware
 * Validates X-API-Key header and attaches client info to request
 */
const apiKeyAuth = async (req, res, next) => {
  const apiKey = req.headers['x-api-key'];
  
  if (!apiKey) {
    return res.status(401).json({
      error: 'API key required',
      code: 'API_KEY_MISSING',
      message: 'Please provide a valid API key in the X-API-Key header'
    });
  }
  
  try {
    const result = await apiClientService.validateApiKey(apiKey);
    
    if (!result) {
      return res.status(401).json({
        error: 'Invalid API key',
        code: 'API_KEY_INVALID',
        message: 'The provided API key is not valid'
      });
    }
    
    if (!result.valid) {
      return res.status(401).json({
        error: 'API key not active',
        code: 'API_KEY_INACTIVE',
        message: result.reason || 'API key is not active'
      });
    }
    
    // Check IP allowlist
    const clientIp = getClientIp(req);
    if (!apiClientService.isIpAllowed(result.client.ipAllowlist, clientIp)) {
      return res.status(403).json({
        error: 'IP not allowed',
        code: 'IP_NOT_ALLOWED',
        message: 'Your IP address is not in the allowlist for this API client'
      });
    }
    
    // Check rate limit
    const rateLimitResult = checkRateLimit(result.client.id, result.client.rateLimitTier);
    if (!rateLimitResult.allowed) {
      res.set('X-RateLimit-Limit', rateLimitResult.limit);
      res.set('X-RateLimit-Remaining', 0);
      res.set('X-RateLimit-Reset', rateLimitResult.resetAt);
      res.set('Retry-After', Math.ceil((rateLimitResult.resetAt - Date.now()) / 1000));
      
      return res.status(429).json({
        error: 'Rate limit exceeded',
        code: 'RATE_LIMIT_EXCEEDED',
        message: `Rate limit of ${rateLimitResult.limit} requests per minute exceeded`,
        retry_after: Math.ceil((rateLimitResult.resetAt - Date.now()) / 1000)
      });
    }
    
    // Set rate limit headers
    res.set('X-RateLimit-Limit', rateLimitResult.limit);
    res.set('X-RateLimit-Remaining', rateLimitResult.remaining);
    res.set('X-RateLimit-Reset', rateLimitResult.resetAt);
    
    // Attach client info to request
    req.apiClient = result.client;
    req.apiClientIp = clientIp;
    
    // Record request for analytics (async, don't wait)
    apiClientService.recordRequest(result.client.id, req.path, req.method, null, null)
      .catch(err => console.error('Failed to record API request:', err));
    
    next();
  } catch (error) {
    console.error('API auth error:', error);
    return res.status(500).json({
      error: 'Authentication error',
      code: 'AUTH_ERROR',
      message: 'An error occurred during authentication'
    });
  }
};

/**
 * Check and update rate limit for a client
 */
const checkRateLimit = (clientId, tier) => {
  const limits = apiClientService.getRateLimits(tier);
  const limit = limits.requests_per_minute;
  
  const key = `ratelimit:${clientId}`;
  const now = Date.now();
  
  let data = rateLimitStore.get(key);
  
  if (!data || now - data.windowStart > 60000) {
    // New window
    data = {
      windowStart: now,
      count: 1
    };
    rateLimitStore.set(key, data);
    
    return {
      allowed: true,
      limit,
      remaining: limit - 1,
      resetAt: now + 60000
    };
  }
  
  // Same window
  data.count++;
  
  if (data.count > limit) {
    return {
      allowed: false,
      limit,
      remaining: 0,
      resetAt: data.windowStart + 60000
    };
  }
  
  return {
    allowed: true,
    limit,
    remaining: limit - data.count,
    resetAt: data.windowStart + 60000
  };
};

/**
 * Middleware factory to require specific scopes
 * Usage: requireScopes('incidents:read')
 *        requireScopes('incidents:write', 'actions:write')
 */
const requireScopes = (...requiredScopes) => {
  return (req, res, next) => {
    if (!req.apiClient) {
      return res.status(401).json({
        error: 'Not authenticated',
        code: 'NOT_AUTHENTICATED',
        message: 'API key authentication required'
      });
    }
    
    const clientScopes = req.apiClient.scopes || [];
    
    // Check if client has any of the required scopes
    const hasRequiredScope = requiredScopes.some(scope => 
      apiClientService.hasScope(clientScopes, scope)
    );
    
    if (!hasRequiredScope) {
      return res.status(403).json({
        error: 'Insufficient scope',
        code: 'INSUFFICIENT_SCOPE',
        message: `This endpoint requires one of these scopes: ${requiredScopes.join(', ')}`,
        required_scopes: requiredScopes,
        client_scopes: clientScopes
      });
    }
    
    next();
  };
};

/**
 * Middleware to check exact scope (not OR logic)
 * Usage: requireExactScope('incidents:read')
 */
const requireExactScope = (requiredScope) => {
  return (req, res, next) => {
    if (!req.apiClient) {
      return res.status(401).json({
        error: 'Not authenticated',
        code: 'NOT_AUTHENTICATED'
      });
    }
    
    if (!apiClientService.hasScope(req.apiClient.scopes, requiredScope)) {
      return res.status(403).json({
        error: 'Insufficient scope',
        code: 'INSUFFICIENT_SCOPE',
        message: `This endpoint requires the "${requiredScope}" scope`,
        required_scope: requiredScope
      });
    }
    
    next();
  };
};

/**
 * Optional API key auth - doesn't fail if no key provided
 * Useful for endpoints that have different behavior for authenticated vs anonymous
 */
const optionalApiKeyAuth = async (req, res, next) => {
  const apiKey = req.headers['x-api-key'];
  
  if (!apiKey) {
    return next();
  }
  
  // If API key is provided, validate it
  return apiKeyAuth(req, res, next);
};

/**
 * Middleware to log API request/response
 */
const apiRequestLogger = (req, res, next) => {
  const startTime = Date.now();
  
  // Capture response
  const originalSend = res.send;
  res.send = function(body) {
    const responseTime = Date.now() - startTime;
    
    // Log request (if client is authenticated)
    if (req.apiClient) {
      console.log(`[API] ${req.method} ${req.path} - Client: ${req.apiClient.name} - Status: ${res.statusCode} - ${responseTime}ms`);
    }
    
    return originalSend.call(this, body);
  };
  
  next();
};

/**
 * Error handler for API routes
 */
const apiErrorHandler = (err, req, res, next) => {
  console.error('API Error:', err);
  
  // Handle known error types
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      error: err.message,
      code: err.code || 'ERROR'
    });
  }
  
  // Validation errors
  if (err.name === 'ValidationError') {
    return res.status(400).json({
      error: 'Validation error',
      code: 'VALIDATION_ERROR',
      details: err.details || err.message
    });
  }
  
  // Database errors
  if (err.code && err.code.startsWith('23')) {
    return res.status(400).json({
      error: 'Database constraint violation',
      code: 'DB_ERROR'
    });
  }
  
  // Default error
  return res.status(500).json({
    error: 'Internal server error',
    code: 'INTERNAL_ERROR'
  });
};

/**
 * Get current rate limit status for a client
 */
const getRateLimitStatus = (clientId, tier) => {
  const limits = apiClientService.getRateLimits(tier);
  const key = `ratelimit:${clientId}`;
  const data = rateLimitStore.get(key);
  
  if (!data) {
    return {
      limit: limits.requests_per_minute,
      remaining: limits.requests_per_minute,
      reset_at: null
    };
  }
  
  const now = Date.now();
  if (now - data.windowStart > 60000) {
    return {
      limit: limits.requests_per_minute,
      remaining: limits.requests_per_minute,
      reset_at: null
    };
  }
  
  return {
    limit: limits.requests_per_minute,
    remaining: Math.max(0, limits.requests_per_minute - data.count),
    reset_at: new Date(data.windowStart + 60000).toISOString()
  };
};

module.exports = {
  apiKeyAuth,
  requireScopes,
  requireExactScope,
  optionalApiKeyAuth,
  apiRequestLogger,
  apiErrorHandler,
  getRateLimitStatus,
  getClientIp
};

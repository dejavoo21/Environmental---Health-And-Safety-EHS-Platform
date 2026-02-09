/**
 * Integrations Admin Routes - Phase 10
 * Handles SSO provider config, API clients, and webhooks management
 */

const express = require('express');
const router = express.Router();
const { authMiddleware, requireRole } = require('../middleware/auth');
const ssoService = require('../services/ssoService');
const apiClientService = require('../services/apiClientService');
const webhookService = require('../services/webhookService');
const webhookDispatcher = require('../services/webhookDispatcher');
const integrationEventService = require('../services/integrationEventService');
const { AppError } = require('../utils/appError');

// All routes require authentication
router.use(authMiddleware);

// =====================================================
// SSO PROVIDER MANAGEMENT (Admin only)
// =====================================================

/**
 * @route   GET /api/integrations/sso
 * @desc    Get SSO configuration for organisation
 * @access  Admin
 */
router.get('/sso', requireRole('admin'), async (req, res, next) => {
  try {
    const provider = await ssoService.getProviderForOrg(req.user.organisationId);
    
    if (!provider) {
      return res.json({
        configured: false,
        provider: null
      });
    }
    
    return res.json({
      configured: true,
      provider: {
        id: provider.id,
        provider_name: provider.provider_name,
        provider_type: provider.provider_type,
        issuer_url: provider.issuer_url,
        client_id: provider.client_id,
        redirect_uri: provider.redirect_uri,
        scopes: provider.scopes,
        group_claim_name: provider.group_claim_name,
        default_role: provider.default_role,
        jit_enabled: provider.jit_enabled,
        sso_only_mode: provider.sso_only_mode,
        enabled: provider.enabled,
        last_sync_at: provider.last_sync_at,
        created_at: provider.created_at,
        updated_at: provider.updated_at
      }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   PUT /api/integrations/sso
 * @desc    Create or update SSO configuration
 * @access  Admin
 */
router.put('/sso', requireRole('admin'), async (req, res, next) => {
  try {
    const result = await ssoService.upsertProvider(
      req.user.organisationId,
      req.body,
      req.user.id
    );
    
    return res.status(result.created ? 201 : 200).json({
      success: true,
      ...result
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   DELETE /api/integrations/sso
 * @desc    Delete SSO configuration
 * @access  Admin
 */
router.delete('/sso', requireRole('admin'), async (req, res, next) => {
  try {
    await ssoService.deleteProvider(req.user.organisationId, req.user.id);
    return res.json({ success: true, message: 'SSO configuration deleted' });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   POST /api/integrations/sso/test
 * @desc    Test SSO provider connection
 * @access  Admin
 */
router.post('/sso/test', requireRole('admin'), async (req, res, next) => {
  try {
    const { issuer_url, client_id, client_secret } = req.body;
    
    if (!issuer_url) {
      throw new AppError('Issuer URL is required', 400, 'VALIDATION_ERROR');
    }
    
    const result = await ssoService.testConnection(issuer_url, client_id, client_secret);
    return res.json(result);
  } catch (error) {
    next(error);
  }
});

/**
 * @route   GET /api/integrations/sso/stats
 * @desc    Get SSO login statistics
 * @access  Admin
 */
router.get('/sso/stats', requireRole('admin'), async (req, res, next) => {
  try {
    const days = parseInt(req.query.days) || 30;
    const stats = await ssoService.getLoginStats(req.user.organisationId, days);
    return res.json(stats);
  } catch (error) {
    next(error);
  }
});

// =====================================================
// SSO ROLE MAPPINGS
// =====================================================

/**
 * @route   GET /api/integrations/sso/mappings
 * @desc    Get role mappings for SSO provider
 * @access  Admin
 */
router.get('/sso/mappings', requireRole('admin'), async (req, res, next) => {
  try {
    const provider = await ssoService.getProviderForOrg(req.user.organisationId);
    
    if (!provider) {
      return res.json({ mappings: [] });
    }
    
    const mappings = await ssoService.getMappingsForProvider(provider.id);
    return res.json({ mappings });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   POST /api/integrations/sso/mappings
 * @desc    Create a role mapping
 * @access  Admin
 */
router.post('/sso/mappings', requireRole('admin'), async (req, res, next) => {
  try {
    const provider = await ssoService.getProviderForOrg(req.user.organisationId);
    
    if (!provider) {
      throw new AppError('SSO not configured', 404, 'SSO_NOT_CONFIGURED');
    }
    
    const mapping = await ssoService.createMapping(
      provider.id,
      req.body,
      req.user.id,
      req.user.organisationId
    );
    
    return res.status(201).json(mapping);
  } catch (error) {
    next(error);
  }
});

/**
 * @route   PUT /api/integrations/sso/mappings/:id
 * @desc    Update a role mapping
 * @access  Admin
 */
router.put('/sso/mappings/:id', requireRole('admin'), async (req, res, next) => {
  try {
    const mapping = await ssoService.updateMapping(
      req.params.id,
      req.body,
      req.user.id,
      req.user.organisationId
    );
    
    return res.json(mapping);
  } catch (error) {
    next(error);
  }
});

/**
 * @route   DELETE /api/integrations/sso/mappings/:id
 * @desc    Delete a role mapping
 * @access  Admin
 */
router.delete('/sso/mappings/:id', requireRole('admin'), async (req, res, next) => {
  try {
    await ssoService.deleteMapping(
      req.params.id,
      req.user.id,
      req.user.organisationId
    );
    
    return res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

// =====================================================
// API CLIENTS MANAGEMENT
// =====================================================

/**
 * @route   GET /api/integrations/api-clients
 * @desc    List API clients
 * @access  Admin
 */
router.get('/api-clients', requireRole('admin'), async (req, res, next) => {
  try {
    const { page, limit, status } = req.query;
    
    const result = await apiClientService.listClients(
      req.user.organisationId,
      { 
        page: parseInt(page) || 1, 
        limit: parseInt(limit) || 20,
        status 
      }
    );
    
    return res.json(result);
  } catch (error) {
    next(error);
  }
});

/**
 * @route   GET /api/integrations/api-clients/:id
 * @desc    Get API client by ID
 * @access  Admin
 */
router.get('/api-clients/:id', requireRole('admin'), async (req, res, next) => {
  try {
    const client = await apiClientService.getClientById(
      req.params.id,
      req.user.organisationId
    );
    
    return res.json(client);
  } catch (error) {
    next(error);
  }
});

/**
 * @route   POST /api/integrations/api-clients
 * @desc    Create a new API client
 * @access  Admin
 */
router.post('/api-clients', requireRole('admin'), async (req, res, next) => {
  try {
    const client = await apiClientService.createClient(
      req.user.organisationId,
      req.body,
      req.user.id
    );
    
    return res.status(201).json(client);
  } catch (error) {
    next(error);
  }
});

/**
 * @route   PUT /api/integrations/api-clients/:id
 * @desc    Update API client settings
 * @access  Admin
 */
router.put('/api-clients/:id', requireRole('admin'), async (req, res, next) => {
  try {
    const client = await apiClientService.updateClient(
      req.params.id,
      req.user.organisationId,
      req.body,
      req.user.id
    );
    
    return res.json(client);
  } catch (error) {
    next(error);
  }
});

/**
 * @route   POST /api/integrations/api-clients/:id/regenerate-key
 * @desc    Regenerate API key
 * @access  Admin
 */
router.post('/api-clients/:id/regenerate-key', requireRole('admin'), async (req, res, next) => {
  try {
    const result = await apiClientService.regenerateKey(
      req.params.id,
      req.user.organisationId,
      req.user.id
    );
    
    return res.json(result);
  } catch (error) {
    next(error);
  }
});

/**
 * @route   PUT /api/integrations/api-clients/:id/status
 * @desc    Update API client status (activate/suspend/revoke)
 * @access  Admin
 */
router.put('/api-clients/:id/status', requireRole('admin'), async (req, res, next) => {
  try {
    const { status } = req.body;
    
    if (!status) {
      throw new AppError('Status is required', 400, 'VALIDATION_ERROR');
    }
    
    const result = await apiClientService.updateStatus(
      req.params.id,
      req.user.organisationId,
      status,
      req.user.id
    );
    
    return res.json(result);
  } catch (error) {
    next(error);
  }
});

/**
 * @route   DELETE /api/integrations/api-clients/:id
 * @desc    Delete API client
 * @access  Admin
 */
router.delete('/api-clients/:id', requireRole('admin'), async (req, res, next) => {
  try {
    await apiClientService.deleteClient(
      req.params.id,
      req.user.organisationId,
      req.user.id
    );
    
    return res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   GET /api/integrations/api-clients/:id/stats
 * @desc    Get API client usage statistics
 * @access  Admin
 */
router.get('/api-clients/:id/stats', requireRole('admin'), async (req, res, next) => {
  try {
    const days = parseInt(req.query.days) || 30;
    
    const stats = await apiClientService.getClientStats(
      req.params.id,
      req.user.organisationId,
      days
    );
    
    return res.json(stats);
  } catch (error) {
    next(error);
  }
});

// =====================================================
// WEBHOOKS MANAGEMENT
// =====================================================

/**
 * @route   GET /api/integrations/webhooks
 * @desc    List webhooks
 * @access  Admin
 */
router.get('/webhooks', requireRole('admin'), async (req, res, next) => {
  try {
    const { page, limit, is_active } = req.query;
    
    const result = await webhookService.listWebhooks(
      req.user.organisationId,
      { 
        page: parseInt(page) || 1, 
        limit: parseInt(limit) || 20,
        is_active: is_active !== undefined ? is_active === 'true' : undefined
      }
    );
    
    return res.json(result);
  } catch (error) {
    next(error);
  }
});

/**
 * @route   GET /api/integrations/webhooks/:id
 * @desc    Get webhook by ID
 * @access  Admin
 */
router.get('/webhooks/:id', requireRole('admin'), async (req, res, next) => {
  try {
    const webhook = await webhookService.getWebhookById(
      req.params.id,
      req.user.organisationId
    );
    
    return res.json(webhook);
  } catch (error) {
    next(error);
  }
});

/**
 * @route   POST /api/integrations/webhooks
 * @desc    Create a new webhook
 * @access  Admin
 */
router.post('/webhooks', requireRole('admin'), async (req, res, next) => {
  try {
    const webhook = await webhookService.createWebhook(
      req.user.organisationId,
      req.body,
      req.user.id
    );
    
    return res.status(201).json(webhook);
  } catch (error) {
    next(error);
  }
});

/**
 * @route   PUT /api/integrations/webhooks/:id
 * @desc    Update webhook settings
 * @access  Admin
 */
router.put('/webhooks/:id', requireRole('admin'), async (req, res, next) => {
  try {
    const webhook = await webhookService.updateWebhook(
      req.params.id,
      req.user.organisationId,
      req.body,
      req.user.id
    );
    
    return res.json(webhook);
  } catch (error) {
    next(error);
  }
});

/**
 * @route   POST /api/integrations/webhooks/:id/regenerate-secret
 * @desc    Regenerate webhook signing secret
 * @access  Admin
 */
router.post('/webhooks/:id/regenerate-secret', requireRole('admin'), async (req, res, next) => {
  try {
    const result = await webhookService.regenerateSecret(
      req.params.id,
      req.user.organisationId,
      req.user.id
    );
    
    return res.json(result);
  } catch (error) {
    next(error);
  }
});

/**
 * @route   PUT /api/integrations/webhooks/:id/toggle
 * @desc    Toggle webhook active status
 * @access  Admin
 */
router.put('/webhooks/:id/toggle', requireRole('admin'), async (req, res, next) => {
  try {
    const { is_active } = req.body;
    
    if (is_active === undefined) {
      throw new AppError('is_active is required', 400, 'VALIDATION_ERROR');
    }
    
    const result = await webhookService.toggleActive(
      req.params.id,
      req.user.organisationId,
      is_active,
      req.user.id
    );
    
    return res.json(result);
  } catch (error) {
    next(error);
  }
});

/**
 * @route   DELETE /api/integrations/webhooks/:id
 * @desc    Delete webhook
 * @access  Admin
 */
router.delete('/webhooks/:id', requireRole('admin'), async (req, res, next) => {
  try {
    await webhookService.deleteWebhook(
      req.params.id,
      req.user.organisationId,
      req.user.id
    );
    
    return res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   POST /api/integrations/webhooks/:id/test
 * @desc    Send a test webhook
 * @access  Admin
 */
router.post('/webhooks/:id/test', requireRole('admin'), async (req, res, next) => {
  try {
    const result = await webhookDispatcher.sendTestEvent(
      req.params.id,
      req.user.organisationId
    );
    
    return res.json(result);
  } catch (error) {
    next(error);
  }
});

/**
 * @route   GET /api/integrations/webhooks/:id/events
 * @desc    Get webhook event deliveries
 * @access  Admin
 */
router.get('/webhooks/:id/events', requireRole('admin'), async (req, res, next) => {
  try {
    const { page, limit, status } = req.query;
    
    const result = await webhookService.getEventDeliveries(
      req.params.id,
      req.user.organisationId,
      {
        page: parseInt(page) || 1,
        limit: parseInt(limit) || 20,
        status
      }
    );
    
    return res.json(result);
  } catch (error) {
    next(error);
  }
});

/**
 * @route   POST /api/integrations/webhooks/:id/events/:eventId/retry
 * @desc    Retry a failed webhook event
 * @access  Admin
 */
router.post('/webhooks/:id/events/:eventId/retry', requireRole('admin'), async (req, res, next) => {
  try {
    const result = await webhookService.retryEvent(
      req.params.eventId,
      req.user.organisationId,
      req.user.id
    );
    
    return res.json(result);
  } catch (error) {
    next(error);
  }
});

/**
 * @route   GET /api/integrations/webhooks/:id/stats
 * @desc    Get webhook statistics
 * @access  Admin
 */
router.get('/webhooks/:id/stats', requireRole('admin'), async (req, res, next) => {
  try {
    const days = parseInt(req.query.days) || 30;
    
    const stats = await webhookService.getWebhookStats(
      req.params.id,
      req.user.organisationId,
      days
    );
    
    return res.json(stats);
  } catch (error) {
    next(error);
  }
});

// =====================================================
// ACTIVITY LOG (Integration Events)
// =====================================================

/**
 * @route   GET /api/integrations/activity
 * @desc    Get activity log (alias for events - used by frontend)
 * @access  Admin
 */
router.get('/activity', requireRole('admin'), async (req, res, next) => {
  try {
    const { page, limit, type, source, days, start_date, end_date } = req.query;
    
    // Calculate date range from days if provided
    let startDate = start_date;
    let endDate = end_date;
    
    if (days && !start_date) {
      const now = new Date();
      const daysAgo = new Date(now.getTime() - (parseInt(days) * 24 * 60 * 60 * 1000));
      startDate = daysAgo.toISOString();
    }
    
    const result = await integrationEventService.listEvents(
      req.user.organisationId,
      {
        page: parseInt(page) || 1,
        limit: parseInt(limit) || 50,
        event_type: type, // frontend uses 'type', backend expects 'event_type'
        event_source: source,
        start_date: startDate,
        end_date: endDate
      }
    );
    
    return res.json(result);
  } catch (error) {
    next(error);
  }
});

// =====================================================
// INTEGRATION EVENTS
// =====================================================

/**
 * @route   GET /api/integrations/events
 * @desc    List integration events
 * @access  Admin
 */
router.get('/events', requireRole('admin'), async (req, res, next) => {
  try {
    const { page, limit, event_type, entity_type, entity_id, start_date, end_date } = req.query;
    
    const result = await integrationEventService.listEvents(
      req.user.organisationId,
      {
        page: parseInt(page) || 1,
        limit: parseInt(limit) || 50,
        event_type,
        entity_type,
        entity_id,
        start_date,
        end_date
      }
    );
    
    return res.json(result);
  } catch (error) {
    next(error);
  }
});

/**
 * @route   GET /api/integrations/events/stats
 * @desc    Get integration event statistics
 * @access  Admin
 */
router.get('/events/stats', requireRole('admin'), async (req, res, next) => {
  try {
    const days = parseInt(req.query.days) || 30;
    
    const stats = await integrationEventService.getEventStats(
      req.user.organisationId,
      days
    );
    
    return res.json(stats);
  } catch (error) {
    next(error);
  }
});

/**
 * @route   GET /api/integrations/events/:id
 * @desc    Get integration event by ID
 * @access  Admin
 */
router.get('/events/:id', requireRole('admin'), async (req, res, next) => {
  try {
    const event = await integrationEventService.getEventById(
      req.params.id,
      req.user.organisationId
    );
    
    return res.json(event);
  } catch (error) {
    next(error);
  }
});

module.exports = router;

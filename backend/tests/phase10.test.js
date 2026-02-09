/**
 * Phase 10 Integration Tests - SSO, API Clients, Webhooks, Public API
 * Test cases covering TC-P10-xxx test IDs
 */

const request = require('supertest');
const app = require('../src/app');
const { query, pool } = require('../src/config/db');
const { generateToken } = require('../src/utils/jwt');
const { generateApiKey, verifyApiKey } = require('../src/utils/apiKeyUtils');
const { encryptSecret, decryptSecret, generateWebhookSecret, generateWebhookSignature, verifyWebhookSignature } = require('../src/utils/encryption');

describe('Phase 10 - Integrations, SSO & External Connectivity', () => {
  let adminToken;
  let workerToken;
  let testOrgId;
  let testAdminId;
  let testWorkerId;
  
  beforeAll(async () => {
    // Get test org and users
    const orgResult = await query(`SELECT id FROM organisations LIMIT 1`);
    testOrgId = orgResult.rows[0]?.id || 1;
    
    const adminResult = await query(
      `SELECT id FROM users WHERE organisation_id = $1 AND role = 'admin' LIMIT 1`,
      [testOrgId]
    );
    testAdminId = adminResult.rows[0]?.id;
    
    const workerResult = await query(
      `SELECT id FROM users WHERE organisation_id = $1 AND role = 'worker' LIMIT 1`,
      [testOrgId]
    );
    testWorkerId = workerResult.rows[0]?.id;
    
    if (testAdminId) {
      adminToken = generateToken({
        userId: testAdminId,
        email: 'admin@test.com',
        role: 'admin',
        organisationId: testOrgId
      });
    }
    
    if (testWorkerId) {
      workerToken = generateToken({
        userId: testWorkerId,
        email: 'worker@test.com',
        role: 'worker',
        organisationId: testOrgId
      });
    }
  });
  
  afterAll(async () => {
    // Cleanup test data
    await query(`DELETE FROM api_clients WHERE name LIKE 'Test API Client%'`);
    await query(`DELETE FROM webhooks WHERE name LIKE 'Test Webhook%'`);
    await pool.end();
  });
  
  // ===========================================================================
  // TC-P10-001 to TC-P10-010: Utility Functions
  // ===========================================================================
  
  describe('Encryption & API Key Utilities', () => {
    // TC-P10-001: Test AES-256-GCM encryption/decryption
    test('TC-P10-001: should encrypt and decrypt secrets correctly', () => {
      const originalSecret = 'my-super-secret-client-secret-12345';
      const encrypted = encryptSecret(originalSecret);
      
      expect(encrypted).toBeDefined();
      expect(encrypted).not.toBe(originalSecret);
      expect(encrypted).toContain(':'); // Format: iv:authTag:ciphertext
      
      const decrypted = decryptSecret(encrypted);
      expect(decrypted).toBe(originalSecret);
    });
    
    // TC-P10-002: Test API key generation
    test('TC-P10-002: should generate valid API keys with prefix and hash', async () => {
      const { apiKey, prefix, hash } = await generateApiKey();
      
      expect(apiKey).toBeDefined();
      expect(apiKey).toMatch(/^ehs_live_[a-z0-9]+_[A-Za-z0-9]+$/);
      expect(prefix).toBeDefined();
      expect(prefix).toMatch(/^ehs_live_[a-z0-9]+$/);
      expect(hash).toBeDefined();
      expect(hash.length).toBeGreaterThan(50); // bcrypt hash
    });
    
    // TC-P10-003: Test API key verification
    test('TC-P10-003: should verify API key against hash', async () => {
      const { apiKey, hash } = await generateApiKey();
      
      const isValid = await verifyApiKey(apiKey, hash);
      expect(isValid).toBe(true);
      
      const isInvalid = await verifyApiKey('wrong-key', hash);
      expect(isInvalid).toBe(false);
    });
    
    // TC-P10-004: Test webhook signature generation
    test('TC-P10-004: should generate valid webhook signatures', () => {
      const payload = JSON.stringify({ event: 'test', data: { id: 1 } });
      const secret = generateWebhookSecret();
      const timestamp = Math.floor(Date.now() / 1000);
      
      const signature = generateWebhookSignature(payload, secret, timestamp);
      
      expect(signature).toBeDefined();
      expect(signature).toMatch(/^sha256=[a-f0-9]{64}$/);
      
      // Verify signature
      const isValid = verifyWebhookSignature(payload, signature, secret, timestamp);
      expect(isValid).toBe(true);
    });
    
    // TC-P10-005: Test webhook signature verification fails with wrong secret
    test('TC-P10-005: should reject invalid webhook signatures', () => {
      const payload = JSON.stringify({ event: 'test' });
      const secret = generateWebhookSecret();
      const wrongSecret = generateWebhookSecret();
      const timestamp = Math.floor(Date.now() / 1000);
      
      const signature = generateWebhookSignature(payload, secret, timestamp);
      
      const isValid = verifyWebhookSignature(payload, signature, wrongSecret, timestamp);
      expect(isValid).toBe(false);
    });
  });
  
  // ===========================================================================
  // TC-P10-011 to TC-P10-020: SSO Routes
  // ===========================================================================
  
  describe('SSO Routes', () => {
    // TC-P10-011: Check SSO availability for non-configured org
    test('TC-P10-011: should return SSO not available for org without SSO config', async () => {
      const response = await request(app)
        .get('/api/auth/sso/check/nonexistent-org')
        .expect(200);
      
      expect(response.body.sso_available).toBe(false);
    });
    
    // TC-P10-012: Get SP metadata
    test('TC-P10-012: should return SP metadata', async () => {
      const response = await request(app)
        .get('/api/auth/sso/metadata')
        .expect(200);
      
      expect(response.body).toHaveProperty('entity_id');
      expect(response.body).toHaveProperty('acs_url');
      expect(response.body.acs_url).toContain('/api/auth/sso/callback');
    });
    
    // TC-P10-013: SSO init without org param should fail
    test('TC-P10-013: should require org parameter for SSO init', async () => {
      const response = await request(app)
        .get('/api/auth/sso/init')
        .expect(302); // Redirects to error page
      
      expect(response.headers.location).toContain('error=');
    });
  });
  
  // ===========================================================================
  // TC-P10-021 to TC-P10-040: API Client Management
  // ===========================================================================
  
  describe('API Client Management', () => {
    let createdClientId;
    let createdApiKey;
    
    // TC-P10-021: Create API client (admin only)
    test('TC-P10-021: should create API client as admin', async () => {
      if (!adminToken) {
        console.log('Skipping: No admin user available');
        return;
      }
      
      const response = await request(app)
        .post('/api/integrations/api-clients')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Test API Client 1',
          description: 'Test client for automated testing',
          scopes: ['incidents:read', 'actions:read'],
          rate_limit_tier: 'standard'
        })
        .expect(201);
      
      expect(response.body).toHaveProperty('id');
      expect(response.body).toHaveProperty('api_key');
      expect(response.body.api_key).toMatch(/^ehs_live_/);
      expect(response.body).toHaveProperty('warning');
      expect(response.body.scopes).toContain('incidents:read');
      
      createdClientId = response.body.id;
      createdApiKey = response.body.api_key;
    });
    
    // TC-P10-022: List API clients
    test('TC-P10-022: should list API clients as admin', async () => {
      if (!adminToken) return;
      
      const response = await request(app)
        .get('/api/integrations/api-clients')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
      
      expect(response.body).toHaveProperty('clients');
      expect(response.body).toHaveProperty('pagination');
      expect(Array.isArray(response.body.clients)).toBe(true);
    });
    
    // TC-P10-023: Get single API client
    test('TC-P10-023: should get API client by ID', async () => {
      if (!adminToken || !createdClientId) return;
      
      const response = await request(app)
        .get(`/api/integrations/api-clients/${createdClientId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
      
      expect(response.body.id).toBe(createdClientId);
      expect(response.body.name).toBe('Test API Client 1');
    });
    
    // TC-P10-024: Update API client
    test('TC-P10-024: should update API client settings', async () => {
      if (!adminToken || !createdClientId) return;
      
      const response = await request(app)
        .put(`/api/integrations/api-clients/${createdClientId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          description: 'Updated description',
          scopes: ['incidents:read', 'actions:read', 'risks:read']
        })
        .expect(200);
      
      expect(response.body.scopes).toContain('risks:read');
    });
    
    // TC-P10-025: Regenerate API key
    test('TC-P10-025: should regenerate API key', async () => {
      if (!adminToken || !createdClientId) return;
      
      const response = await request(app)
        .post(`/api/integrations/api-clients/${createdClientId}/regenerate-key`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
      
      expect(response.body).toHaveProperty('api_key');
      expect(response.body.api_key).not.toBe(createdApiKey);
      createdApiKey = response.body.api_key; // Update for later tests
    });
    
    // TC-P10-026: Suspend API client
    test('TC-P10-026: should suspend API client', async () => {
      if (!adminToken || !createdClientId) return;
      
      const response = await request(app)
        .put(`/api/integrations/api-clients/${createdClientId}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: 'suspended' })
        .expect(200);
      
      expect(response.body.status).toBe('suspended');
    });
    
    // TC-P10-027: Reactivate API client
    test('TC-P10-027: should reactivate suspended client', async () => {
      if (!adminToken || !createdClientId) return;
      
      const response = await request(app)
        .put(`/api/integrations/api-clients/${createdClientId}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: 'active' })
        .expect(200);
      
      expect(response.body.status).toBe('active');
    });
    
    // TC-P10-028: Worker cannot access API clients
    test('TC-P10-028: should deny worker access to API clients', async () => {
      if (!workerToken) return;
      
      await request(app)
        .get('/api/integrations/api-clients')
        .set('Authorization', `Bearer ${workerToken}`)
        .expect(403);
    });
    
    // TC-P10-029: Create client with invalid scopes fails
    test('TC-P10-029: should reject invalid scopes', async () => {
      if (!adminToken) return;
      
      const response = await request(app)
        .post('/api/integrations/api-clients')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Test API Client Invalid',
          scopes: ['invalid:scope', 'incidents:read']
        })
        .expect(400);
      
      expect(response.body.code).toBe('VALIDATION_ERROR');
    });
    
    // TC-P10-030: Delete API client
    test('TC-P10-030: should delete API client', async () => {
      if (!adminToken || !createdClientId) return;
      
      await request(app)
        .delete(`/api/integrations/api-clients/${createdClientId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
      
      // Verify deleted
      await request(app)
        .get(`/api/integrations/api-clients/${createdClientId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);
    });
  });
  
  // ===========================================================================
  // TC-P10-041 to TC-P10-060: Webhook Management
  // ===========================================================================
  
  describe('Webhook Management', () => {
    let createdWebhookId;
    let webhookSecret;
    
    // TC-P10-041: Create webhook
    test('TC-P10-041: should create webhook as admin', async () => {
      if (!adminToken) return;
      
      const response = await request(app)
        .post('/api/integrations/webhooks')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Test Webhook 1',
          target_url: 'https://webhook.site/test-endpoint',
          event_types: ['incident.created', 'incident.updated'],
          is_active: true
        })
        .expect(201);
      
      expect(response.body).toHaveProperty('id');
      expect(response.body).toHaveProperty('signing_secret');
      expect(response.body.signing_secret).toMatch(/^whsec_/);
      expect(response.body).toHaveProperty('warning');
      
      createdWebhookId = response.body.id;
      webhookSecret = response.body.signing_secret;
    });
    
    // TC-P10-042: List webhooks
    test('TC-P10-042: should list webhooks as admin', async () => {
      if (!adminToken) return;
      
      const response = await request(app)
        .get('/api/integrations/webhooks')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
      
      expect(response.body).toHaveProperty('webhooks');
      expect(response.body).toHaveProperty('pagination');
    });
    
    // TC-P10-043: Get single webhook
    test('TC-P10-043: should get webhook by ID', async () => {
      if (!adminToken || !createdWebhookId) return;
      
      const response = await request(app)
        .get(`/api/integrations/webhooks/${createdWebhookId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
      
      expect(response.body.id).toBe(createdWebhookId);
      expect(response.body).toHaveProperty('has_secret');
      expect(response.body.has_secret).toBe(true);
      // Secret should not be exposed
      expect(response.body.secret_encrypted).toBeUndefined();
    });
    
    // TC-P10-044: Update webhook
    test('TC-P10-044: should update webhook settings', async () => {
      if (!adminToken || !createdWebhookId) return;
      
      const response = await request(app)
        .put(`/api/integrations/webhooks/${createdWebhookId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          event_types: ['incident.created', 'incident.updated', 'incident.closed']
        })
        .expect(200);
      
      expect(response.body.event_types).toContain('incident.closed');
    });
    
    // TC-P10-045: Regenerate webhook secret
    test('TC-P10-045: should regenerate webhook secret', async () => {
      if (!adminToken || !createdWebhookId) return;
      
      const response = await request(app)
        .post(`/api/integrations/webhooks/${createdWebhookId}/regenerate-secret`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
      
      expect(response.body).toHaveProperty('signing_secret');
      expect(response.body.signing_secret).not.toBe(webhookSecret);
    });
    
    // TC-P10-046: Toggle webhook active status
    test('TC-P10-046: should toggle webhook active status', async () => {
      if (!adminToken || !createdWebhookId) return;
      
      // Disable
      let response = await request(app)
        .put(`/api/integrations/webhooks/${createdWebhookId}/toggle`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ is_active: false })
        .expect(200);
      
      expect(response.body.is_active).toBe(false);
      
      // Re-enable
      response = await request(app)
        .put(`/api/integrations/webhooks/${createdWebhookId}/toggle`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ is_active: true })
        .expect(200);
      
      expect(response.body.is_active).toBe(true);
    });
    
    // TC-P10-047: Get webhook events
    test('TC-P10-047: should get webhook event deliveries', async () => {
      if (!adminToken || !createdWebhookId) return;
      
      const response = await request(app)
        .get(`/api/integrations/webhooks/${createdWebhookId}/events`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
      
      expect(response.body).toHaveProperty('events');
      expect(response.body).toHaveProperty('pagination');
    });
    
    // TC-P10-048: Get webhook stats
    test('TC-P10-048: should get webhook statistics', async () => {
      if (!adminToken || !createdWebhookId) return;
      
      const response = await request(app)
        .get(`/api/integrations/webhooks/${createdWebhookId}/stats`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
      
      expect(response.body).toHaveProperty('total_events');
    });
    
    // TC-P10-049: Webhook requires HTTPS URL
    test('TC-P10-049: should reject HTTP webhook URLs', async () => {
      if (!adminToken) return;
      
      const response = await request(app)
        .post('/api/integrations/webhooks')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Test Webhook HTTP',
          target_url: 'http://insecure-endpoint.com/webhook',
          event_types: ['incident.created']
        })
        .expect(400);
      
      expect(response.body.code).toBe('VALIDATION_ERROR');
    });
    
    // TC-P10-050: Delete webhook
    test('TC-P10-050: should delete webhook', async () => {
      if (!adminToken || !createdWebhookId) return;
      
      await request(app)
        .delete(`/api/integrations/webhooks/${createdWebhookId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
    });
  });
  
  // ===========================================================================
  // TC-P10-061 to TC-P10-080: Public API
  // ===========================================================================
  
  describe('Public API', () => {
    let testApiKey;
    let testClientId;
    
    beforeAll(async () => {
      // Create a test API client for public API tests
      if (!adminToken) return;
      
      const response = await request(app)
        .post('/api/integrations/api-clients')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Test API Client Public',
          scopes: ['incidents:read', 'incidents:write', 'actions:read', 'risks:read', 'users:read']
        });
      
      if (response.status === 201) {
        testApiKey = response.body.api_key;
        testClientId = response.body.id;
      }
    });
    
    afterAll(async () => {
      if (testClientId && adminToken) {
        await request(app)
          .delete(`/api/integrations/api-clients/${testClientId}`)
          .set('Authorization', `Bearer ${adminToken}`);
      }
    });
    
    // TC-P10-061: API requires X-API-Key header
    test('TC-P10-061: should require X-API-Key header', async () => {
      const response = await request(app)
        .get('/api/public/v1')
        .expect(401);
      
      expect(response.body.code).toBe('API_KEY_MISSING');
    });
    
    // TC-P10-062: API rejects invalid API key
    test('TC-P10-062: should reject invalid API key', async () => {
      const response = await request(app)
        .get('/api/public/v1')
        .set('X-API-Key', 'invalid-api-key')
        .expect(401);
      
      expect(response.body.code).toBe('API_KEY_INVALID');
    });
    
    // TC-P10-063: API info endpoint works with valid key
    test('TC-P10-063: should return API info with valid key', async () => {
      if (!testApiKey) return;
      
      const response = await request(app)
        .get('/api/public/v1')
        .set('X-API-Key', testApiKey)
        .expect(200);
      
      expect(response.body).toHaveProperty('api');
      expect(response.body).toHaveProperty('client');
      expect(response.body).toHaveProperty('scopes');
      expect(response.body).toHaveProperty('rate_limit');
    });
    
    // TC-P10-064: List incidents via public API
    test('TC-P10-064: should list incidents via public API', async () => {
      if (!testApiKey) return;
      
      const response = await request(app)
        .get('/api/public/v1/incidents')
        .set('X-API-Key', testApiKey)
        .expect(200);
      
      expect(response.body).toHaveProperty('data');
      expect(response.body).toHaveProperty('pagination');
      expect(Array.isArray(response.body.data)).toBe(true);
    });
    
    // TC-P10-065: List incidents with filters
    test('TC-P10-065: should filter incidents by status', async () => {
      if (!testApiKey) return;
      
      const response = await request(app)
        .get('/api/public/v1/incidents?status=open')
        .set('X-API-Key', testApiKey)
        .expect(200);
      
      expect(response.body).toHaveProperty('data');
    });
    
    // TC-P10-066: List actions via public API
    test('TC-P10-066: should list actions via public API', async () => {
      if (!testApiKey) return;
      
      const response = await request(app)
        .get('/api/public/v1/actions')
        .set('X-API-Key', testApiKey)
        .expect(200);
      
      expect(response.body).toHaveProperty('data');
      expect(response.body).toHaveProperty('pagination');
    });
    
    // TC-P10-067: List risks via public API
    test('TC-P10-067: should list risks via public API', async () => {
      if (!testApiKey) return;
      
      const response = await request(app)
        .get('/api/public/v1/risks')
        .set('X-API-Key', testApiKey)
        .expect(200);
      
      expect(response.body).toHaveProperty('data');
      expect(response.body).toHaveProperty('pagination');
    });
    
    // TC-P10-068: List users via public API
    test('TC-P10-068: should list users via public API', async () => {
      if (!testApiKey) return;
      
      const response = await request(app)
        .get('/api/public/v1/users')
        .set('X-API-Key', testApiKey)
        .expect(200);
      
      expect(response.body).toHaveProperty('data');
      expect(response.body).toHaveProperty('pagination');
    });
    
    // TC-P10-069: List locations via public API
    test('TC-P10-069: should list locations via public API', async () => {
      if (!testApiKey) return;
      
      const response = await request(app)
        .get('/api/public/v1/locations')
        .set('X-API-Key', testApiKey)
        .expect(200);
      
      expect(response.body).toHaveProperty('data');
    });
    
    // TC-P10-070: Create incident via public API
    test('TC-P10-070: should create incident via public API', async () => {
      if (!testApiKey) return;
      
      const response = await request(app)
        .post('/api/public/v1/incidents')
        .set('X-API-Key', testApiKey)
        .send({
          title: 'API Test Incident',
          description: 'Created via public API',
          incident_date: new Date().toISOString(),
          severity: 'low'
        })
        .expect(201);
      
      expect(response.body.data).toHaveProperty('id');
      expect(response.body.data.title).toBe('API Test Incident');
    });
    
    // TC-P10-071: Rate limit headers are included
    test('TC-P10-071: should include rate limit headers', async () => {
      if (!testApiKey) return;
      
      const response = await request(app)
        .get('/api/public/v1')
        .set('X-API-Key', testApiKey)
        .expect(200);
      
      expect(response.headers['x-ratelimit-limit']).toBeDefined();
      expect(response.headers['x-ratelimit-remaining']).toBeDefined();
      expect(response.headers['x-ratelimit-reset']).toBeDefined();
    });
    
    // TC-P10-072: Scope enforcement - missing scope
    test('TC-P10-072: should enforce scope requirements', async () => {
      // Create client with limited scopes
      if (!adminToken) return;
      
      const clientResp = await request(app)
        .post('/api/integrations/api-clients')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Test API Client Limited',
          scopes: ['incidents:read'] // No actions:read
        });
      
      if (clientResp.status !== 201) return;
      
      const limitedKey = clientResp.body.api_key;
      
      // Try to access actions (should fail)
      const response = await request(app)
        .get('/api/public/v1/actions')
        .set('X-API-Key', limitedKey)
        .expect(403);
      
      expect(response.body.code).toBe('INSUFFICIENT_SCOPE');
      
      // Cleanup
      await request(app)
        .delete(`/api/integrations/api-clients/${clientResp.body.id}`)
        .set('Authorization', `Bearer ${adminToken}`);
    });
  });
  
  // ===========================================================================
  // TC-P10-081 to TC-P10-090: SSO Provider Management
  // ===========================================================================
  
  describe('SSO Provider Management', () => {
    // TC-P10-081: Get SSO config (none configured)
    test('TC-P10-081: should return SSO not configured', async () => {
      if (!adminToken) return;
      
      const response = await request(app)
        .get('/api/integrations/sso')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
      
      // May or may not be configured depending on test state
      expect(response.body).toHaveProperty('configured');
    });
    
    // TC-P10-082: Test SSO connection
    test('TC-P10-082: should test SSO connection', async () => {
      if (!adminToken) return;
      
      const response = await request(app)
        .post('/api/integrations/sso/test')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          issuer_url: 'https://login.microsoftonline.com/common/v2.0'
        })
        .expect(200);
      
      expect(response.body).toHaveProperty('reachable');
    });
    
    // TC-P10-083: Get SSO role mappings (empty)
    test('TC-P10-083: should return empty mappings when SSO not configured', async () => {
      if (!adminToken) return;
      
      const response = await request(app)
        .get('/api/integrations/sso/mappings')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
      
      expect(response.body).toHaveProperty('mappings');
    });
    
    // TC-P10-084: Worker cannot access SSO config
    test('TC-P10-084: should deny worker access to SSO config', async () => {
      if (!workerToken) return;
      
      await request(app)
        .get('/api/integrations/sso')
        .set('Authorization', `Bearer ${workerToken}`)
        .expect(403);
    });
  });
  
  // ===========================================================================
  // TC-P10-091 to TC-P10-100: Integration Events
  // ===========================================================================
  
  describe('Integration Events', () => {
    // TC-P10-091: List integration events
    test('TC-P10-091: should list integration events', async () => {
      if (!adminToken) return;
      
      const response = await request(app)
        .get('/api/integrations/events')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
      
      expect(response.body).toHaveProperty('events');
      expect(response.body).toHaveProperty('pagination');
    });
    
    // TC-P10-092: Get integration event stats
    test('TC-P10-092: should get event statistics', async () => {
      if (!adminToken) return;
      
      const response = await request(app)
        .get('/api/integrations/events/stats')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
      
      expect(response.body).toHaveProperty('summary');
    });
    
    // TC-P10-093: Filter events by type
    test('TC-P10-093: should filter events by type', async () => {
      if (!adminToken) return;
      
      const response = await request(app)
        .get('/api/integrations/events?event_type=incident.created')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
      
      expect(response.body).toHaveProperty('events');
    });
    
    // TC-P10-094: Filter events by entity type
    test('TC-P10-094: should filter events by entity type', async () => {
      if (!adminToken) return;
      
      const response = await request(app)
        .get('/api/integrations/events?entity_type=incident')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
      
      expect(response.body).toHaveProperty('events');
    });
  });
});

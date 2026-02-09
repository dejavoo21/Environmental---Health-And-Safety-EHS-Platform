const { app, request, query, getToken, closePool } = require('./testUtils');
const bcrypt = require('bcryptjs');

describe('Auth API - Phase 3 Changes', () => {
  let adminToken;
  let testUserId;

  beforeAll(async () => {
    adminToken = await getToken('admin');
  });

  afterAll(async () => {
    // Clean up test user
    if (testUserId) {
      await query('DELETE FROM users WHERE id = $1', [testUserId]);
    }
    await closePool();
  });

  describe('Login with Organisation Info', () => {
    it('should return organisation info in login response', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'admin@ehs.local',
          password: 'Admin123!'
        });

      expect(res.statusCode).toBe(200);
      expect(res.body.user).toHaveProperty('organisationId');
      expect(res.body.user).toHaveProperty('organisationName');
      expect(res.body.user).toHaveProperty('organisationSlug');
    });

    it('should return organisation info in /me response', async () => {
      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('organisationId');
      expect(res.body).toHaveProperty('organisationName');
      expect(res.body).toHaveProperty('organisationSlug');
    });
  });

  describe('Disabled User Login (C80)', () => {
    it('should block login for disabled user', async () => {
      // Get org id first
      const orgRes = await query("SELECT id FROM organisations WHERE slug = 'default-org'");
      const orgId = orgRes.rows[0].id;

      // Create a test user
      const passwordHash = await bcrypt.hash('TestPass123!', 10);
      const createRes = await query(
        `INSERT INTO users (email, name, password_hash, role, organisation_id, is_active)
         VALUES ('disabled.test@test.local', 'Disabled Test User', $1, 'worker', $2, TRUE)
         RETURNING id`,
        [passwordHash, orgId]
      );
      testUserId = createRes.rows[0].id;

      // Test user can login
      const loginRes1 = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'disabled.test@test.local',
          password: 'TestPass123!'
        });
      expect(loginRes1.statusCode).toBe(200);

      // Disable the user
      await query('UPDATE users SET is_active = FALSE WHERE id = $1', [testUserId]);

      // Test user cannot login when disabled
      const loginRes2 = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'disabled.test@test.local',
          password: 'TestPass123!'
        });

      expect(loginRes2.statusCode).toBe(401);
      expect(loginRes2.body.code).toBe('ACCOUNT_DISABLED');
    });

    it('should block API access with token of disabled user', async () => {
      // Get org id first
      const orgRes = await query("SELECT id FROM organisations WHERE slug = 'default-org'");
      const orgId = orgRes.rows[0].id;

      // Create a test user
      const passwordHash = await bcrypt.hash('BlockedPass123!', 10);
      const createRes = await query(
        `INSERT INTO users (email, name, password_hash, role, organisation_id, is_active)
         VALUES ('blocked.test@test.local', 'Blocked Test User', $1, 'worker', $2, TRUE)
         RETURNING id`,
        [passwordHash, orgId]
      );
      const blockedUserId = createRes.rows[0].id;

      // Login and get token while user is active
      const loginRes = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'blocked.test@test.local',
          password: 'BlockedPass123!'
        });
      expect(loginRes.statusCode).toBe(200);
      const token = loginRes.body.token;

      // Disable the user
      await query('UPDATE users SET is_active = FALSE WHERE id = $1', [blockedUserId]);

      // Try to access API with existing token
      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${token}`);

      expect(res.statusCode).toBe(401);
      expect(res.body.code).toBe('ACCOUNT_DISABLED');

      // Clean up
      await query('DELETE FROM users WHERE id = $1', [blockedUserId]);
    });
  });
});

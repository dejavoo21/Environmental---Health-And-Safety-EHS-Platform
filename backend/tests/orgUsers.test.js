const { app, request, query, getToken, closePool } = require('./testUtils');

describe('User Management API (Phase 3)', () => {
  let adminToken;
  let managerToken;
  let workerToken;
  let testUserId;

  beforeAll(async () => {
    adminToken = await getToken('admin');
    managerToken = await getToken('manager');
    workerToken = await getToken('worker');
  });

  afterAll(async () => {
    // Clean up test users
    if (testUserId) {
      await query('DELETE FROM users WHERE id = $1', [testUserId]);
    }
    await query("DELETE FROM users WHERE email LIKE 'testuser%@test.local'");
    await closePool();
  });

  describe('GET /api/org-users', () => {
    // TC-P3-031: Admin can list users
    it('should list all users for admin', async () => {
      const res = await request(app)
        .get('/api/org-users')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.data.users).toBeInstanceOf(Array);
      expect(res.body.data.users.length).toBeGreaterThanOrEqual(3);
    });

    // TC-P3-041: Non-admin cannot list users
    it('should reject list request from worker', async () => {
      const res = await request(app)
        .get('/api/org-users')
        .set('Authorization', `Bearer ${workerToken}`);

      expect(res.statusCode).toBe(403);
    });

    it('should reject list request from manager', async () => {
      const res = await request(app)
        .get('/api/org-users')
        .set('Authorization', `Bearer ${managerToken}`);

      expect(res.statusCode).toBe(403);
    });

    it('should filter by role', async () => {
      const res = await request(app)
        .get('/api/org-users?role=admin')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.statusCode).toBe(200);
      res.body.data.users.forEach(user => {
        expect(user.role).toBe('admin');
      });
    });
  });

  describe('POST /api/org-users', () => {
    // TC-P3-036: Admin creates user with valid data
    it('should create new user as admin', async () => {
      const res = await request(app)
        .post('/api/org-users')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          email: 'testuser1@test.local',
          name: 'Test User',
          password: 'TestPass123!',
          role: 'worker'
        });

      expect(res.statusCode).toBe(201);
      expect(res.body.data.email).toBe('testuser1@test.local');
      expect(res.body.data.role).toBe('worker');
      testUserId = res.body.data.id;
    });

    // TC-P3-037: Admin creates user with duplicate email in same org
    it('should reject duplicate email in same org', async () => {
      const res = await request(app)
        .post('/api/org-users')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          email: 'testuser1@test.local',
          name: 'Another User',
          password: 'TestPass123!',
          role: 'worker'
        });

      expect(res.statusCode).toBe(409);
      expect(res.body.code).toBe('EMAIL_EXISTS');
    });

    // TC-P3-040: Admin creates user with short password
    it('should reject short password', async () => {
      const res = await request(app)
        .post('/api/org-users')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          email: 'testuser2@test.local',
          name: 'Short Pass User',
          password: 'short',
          role: 'worker'
        });

      expect(res.statusCode).toBe(400);
      expect(res.body.code).toBe('PASSWORD_TOO_SHORT');
    });

    // TC-P3-039: Admin creates user with invalid role
    it('should reject invalid role', async () => {
      const res = await request(app)
        .post('/api/org-users')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          email: 'testuser3@test.local',
          name: 'Invalid Role User',
          password: 'TestPass123!',
          role: 'superadmin'
        });

      expect(res.statusCode).toBe(400);
      expect(res.body.code).toBe('INVALID_ROLE');
    });

    it('should reject invalid email format', async () => {
      const res = await request(app)
        .post('/api/org-users')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          email: 'invalid-email',
          name: 'Invalid Email User',
          password: 'TestPass123!',
          role: 'worker'
        });

      expect(res.statusCode).toBe(400);
      expect(res.body.code).toBe('INVALID_EMAIL');
    });
  });

  describe('GET /api/org-users/:id', () => {
    it('should get user by ID as admin', async () => {
      const res = await request(app)
        .get(`/api/org-users/${testUserId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.data.id).toBe(testUserId);
    });

    it('should return 404 for non-existent user', async () => {
      const res = await request(app)
        .get('/api/org-users/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.statusCode).toBe(404);
    });
  });

  describe('PUT /api/org-users/:id', () => {
    // TC-P3-046: Admin changes user role
    it('should update user name and role', async () => {
      const res = await request(app)
        .put(`/api/org-users/${testUserId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Updated Test User',
          role: 'manager'
        });

      expect(res.statusCode).toBe(200);
      expect(res.body.data.name).toBe('Updated Test User');
      expect(res.body.data.role).toBe('manager');
    });

    // TC-P3-047: Admin tries to change own role
    it('should reject changing own role', async () => {
      const meRes = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${adminToken}`);

      const adminId = meRes.body.id;

      const res = await request(app)
        .put(`/api/org-users/${adminId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ role: 'worker' });

      expect(res.statusCode).toBe(400);
      expect(res.body.code).toBe('CANNOT_CHANGE_OWN_ROLE');
    });
  });

  describe('POST /api/org-users/:id/disable', () => {
    // TC-P3-056: Admin disables user
    it('should disable user', async () => {
      const res = await request(app)
        .post(`/api/org-users/${testUserId}/disable`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.data.isActive).toBe(false);
    });

    // TC-P3-058: Admin tries to disable themselves
    it('should reject disabling self', async () => {
      const meRes = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${adminToken}`);

      const adminId = meRes.body.id;

      const res = await request(app)
        .post(`/api/org-users/${adminId}/disable`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.statusCode).toBe(400);
      expect(res.body.code).toBe('CANNOT_DISABLE_SELF');
    });
  });

  describe('POST /api/org-users/:id/enable', () => {
    // TC-P3-060: Admin enables disabled user
    it('should enable disabled user', async () => {
      const res = await request(app)
        .post(`/api/org-users/${testUserId}/enable`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.data.isActive).toBe(true);
    });
  });

  describe('POST /api/org-users/:id/reset-password', () => {
    // TC-P3-074: Admin resets user password
    it('should reset user password', async () => {
      const res = await request(app)
        .post(`/api/org-users/${testUserId}/reset-password`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ newPassword: 'NewPass123!' });

      expect(res.statusCode).toBe(200);
      expect(res.body.data.message).toBe('Password reset successfully');
    });

    // TC-P3-075: Password reset with short password
    it('should reject short password on reset', async () => {
      const res = await request(app)
        .post(`/api/org-users/${testUserId}/reset-password`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ newPassword: 'short' });

      expect(res.statusCode).toBe(400);
      expect(res.body.code).toBe('PASSWORD_TOO_SHORT');
    });
  });
});

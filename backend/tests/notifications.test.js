/**
 * Phase 4 Notification Tests
 */

const request = require('supertest');
const app = require('../src/app');
const { pool, query } = require('../src/config/db');
const notificationService = require('../src/services/notificationService');
const preferencesService = require('../src/services/preferencesService');
const jwt = require('jsonwebtoken');
const env = require('../src/config/env');

// Test data
let testOrg;
let testUser;
let testManager;
let userToken;
let managerToken;
let adminToken;
let testAdmin;

// Generate unique slug with timestamp
const uniqueSlug = `test-org-notif-${Date.now()}`;

beforeAll(async () => {
  // Create test organisation
  const orgResult = await query(
    `INSERT INTO organisations (name, slug, settings)
     VALUES ('Test Org Notifications', $1, '{"escalation": {"enabled": true, "daysOverdue": 3}}')
     RETURNING id`,
    [uniqueSlug]
  );
  testOrg = { id: orgResult.rows[0].id };

  // Create test users
  const bcrypt = require('bcryptjs');
  const hashedPassword = await bcrypt.hash('password123', 10);

  const userResult = await query(
    `INSERT INTO users (name, email, password_hash, role, organisation_id)
     VALUES ('Test Worker', $1, $2, 'worker', $3)
     RETURNING id, name, email, role, organisation_id`,
    [`worker-notif-${Date.now()}@test.com`, hashedPassword, testOrg.id]
  );
  testUser = userResult.rows[0];

  const managerResult = await query(
    `INSERT INTO users (name, email, password_hash, role, organisation_id)
     VALUES ('Test Manager', $1, $2, 'manager', $3)
     RETURNING id, name, email, role, organisation_id`,
    [`manager-notif-${Date.now()}@test.com`, hashedPassword, testOrg.id]
  );
  testManager = managerResult.rows[0];

  const adminResult = await query(
    `INSERT INTO users (name, email, password_hash, role, organisation_id)
     VALUES ('Test Admin', $1, $2, 'admin', $3)
     RETURNING id, name, email, role, organisation_id`,
    [`admin-notif-${Date.now()}@test.com`, hashedPassword, testOrg.id]
  );
  testAdmin = adminResult.rows[0];

  // Generate JWT tokens
  userToken = jwt.sign(
    { id: testUser.id, name: testUser.name, email: testUser.email, role: testUser.role, organisationId: testOrg.id },
    env.jwtSecret,
    { expiresIn: '1h' }
  );

  managerToken = jwt.sign(
    { id: testManager.id, name: testManager.name, email: testManager.email, role: testManager.role, organisationId: testOrg.id },
    env.jwtSecret,
    { expiresIn: '1h' }
  );

  adminToken = jwt.sign(
    { id: testAdmin.id, name: testAdmin.name, email: testAdmin.email, role: testAdmin.role, organisationId: testOrg.id },
    env.jwtSecret,
    { expiresIn: '1h' }
  );
});

afterAll(async () => {
  // Cleanup - must be in order due to foreign keys
  if (testOrg && testOrg.id) {
    await query('DELETE FROM notifications WHERE organisation_id = $1', [testOrg.id]);
    await query('DELETE FROM user_notification_preferences WHERE organisation_id = $1', [testOrg.id]);
    await query('DELETE FROM email_logs WHERE organisation_id = $1', [testOrg.id]);
    await query('DELETE FROM scheduled_job_runs WHERE organisation_id = $1', [testOrg.id]);
    await query('DELETE FROM users WHERE organisation_id = $1', [testOrg.id]);
    await query('DELETE FROM organisations WHERE id = $1', [testOrg.id]);
  }
});

describe('NotificationService', () => {
  describe('createNotification', () => {
    it('should create a notification', async () => {
      const notification = await notificationService.createNotification({
        userId: testUser.id,
        organisationId: testOrg.id,
        type: 'action_assigned',
        priority: 'normal',
        title: 'Test Notification',
        message: 'This is a test notification',
        relatedType: 'action',
        relatedId: '00000000-0000-0000-0000-000000000001',
        metadata: { actionTitle: 'Test Action' }
      });

      expect(notification).toBeDefined();
      expect(notification.id).toBeDefined();
      expect(notification.title).toBe('Test Notification');
      expect(notification.type).toBe('action_assigned');
      expect(notification.isRead).toBe(false);
    });

    it('should create high priority notification', async () => {
      const notification = await notificationService.createNotification({
        userId: testUser.id,
        organisationId: testOrg.id,
        type: 'incident_high_severity',
        priority: 'high',
        title: 'Critical Incident',
        message: 'A critical incident has been reported'
      });

      expect(notification.priority).toBe('high');
    });
  });

  describe('getNotifications', () => {
    beforeAll(async () => {
      // Create some notifications for testing
      for (let i = 0; i < 5; i++) {
        await notificationService.createNotification({
          userId: testUser.id,
          organisationId: testOrg.id,
          type: i % 2 === 0 ? 'action_assigned' : 'action_overdue',
          priority: 'normal',
          title: `Notification ${i}`,
          message: `Message ${i}`
        });
      }
    });

    it('should return paginated notifications', async () => {
      const result = await notificationService.getNotifications(
        testUser.id,
        testOrg.id,
        { page: 1, limit: 3 }
      );

      expect(result.notifications).toBeDefined();
      expect(result.notifications.length).toBeLessThanOrEqual(3);
      expect(result.pagination).toBeDefined();
      expect(result.pagination.page).toBe(1);
      expect(result.pagination.limit).toBe(3);
    });

    it('should filter by type', async () => {
      const result = await notificationService.getNotifications(
        testUser.id,
        testOrg.id,
        { type: 'action_assigned' }
      );

      result.notifications.forEach(n => {
        expect(n.type).toBe('action_assigned');
      });
    });
  });

  describe('getUnreadCount', () => {
    it('should return unread count', async () => {
      const count = await notificationService.getUnreadCount(testUser.id, testOrg.id);
      expect(typeof count).toBe('number');
      expect(count).toBeGreaterThan(0);
    });
  });

  describe('markAsRead', () => {
    it('should mark notification as read', async () => {
      const notification = await notificationService.createNotification({
        userId: testUser.id,
        organisationId: testOrg.id,
        type: 'system',
        priority: 'normal',
        title: 'Test Read',
        message: 'Test'
      });

      const result = await notificationService.markAsRead(notification.id, testUser.id);

      expect(result.isRead).toBe(true);
      expect(result.readAt).toBeDefined();
    });

    it('should return null for non-existent notification', async () => {
      const result = await notificationService.markAsRead(
        '00000000-0000-0000-0000-000000000999',
        testUser.id
      );
      expect(result).toBeNull();
    });
  });

  describe('markAllAsRead', () => {
    it('should mark all notifications as read', async () => {
      const updated = await notificationService.markAllAsRead(testUser.id, testOrg.id);
      expect(typeof updated).toBe('number');
    });
  });
});

describe('PreferencesService', () => {
  describe('getPreferences', () => {
    it('should return default preferences for new user', async () => {
      const prefs = await preferencesService.getPreferences(
        testUser.id,
        testOrg.id,
        'worker'
      );

      expect(prefs).toBeDefined();
      expect(prefs.emailActionAssigned).toBe(true);
      expect(prefs.digestFrequency).toBe('none'); // Workers default to none
    });

    it('should return weekly digest for managers', async () => {
      const prefs = await preferencesService.getPreferences(
        testManager.id,
        testOrg.id,
        'manager'
      );

      expect(prefs.digestFrequency).toBe('weekly');
    });
  });

  describe('updatePreferences', () => {
    it('should update preferences', async () => {
      const updated = await preferencesService.updatePreferences(
        testUser.id,
        testOrg.id,
        { emailActionAssigned: false, digestFrequency: 'daily' }
      );

      expect(updated.emailActionAssigned).toBe(false);
      expect(updated.digestFrequency).toBe('daily');
    });
  });
});

describe('Notification API Endpoints', () => {
  describe('GET /api/notifications', () => {
    it('should return notifications for authenticated user', async () => {
      const res = await request(app)
        .get('/api/notifications')
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.notifications).toBeDefined();
      expect(res.body.data.pagination).toBeDefined();
    });

    it('should filter by is_read', async () => {
      const res = await request(app)
        .get('/api/notifications?is_read=false')
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.status).toBe(200);
    });

    it('should require authentication', async () => {
      const res = await request(app).get('/api/notifications');
      expect(res.status).toBe(401);
    });
  });

  describe('GET /api/notifications/unread-count', () => {
    it('should return unread count', async () => {
      const res = await request(app)
        .get('/api/notifications/unread-count')
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(typeof res.body.data.count).toBe('number');
    });
  });

  describe('PUT /api/notifications/:id/read', () => {
    it('should mark notification as read', async () => {
      // Create a notification first
      const notification = await notificationService.createNotification({
        userId: testUser.id,
        organisationId: testOrg.id,
        type: 'system',
        priority: 'normal',
        title: 'API Test',
        message: 'Test'
      });

      const res = await request(app)
        .put(`/api/notifications/${notification.id}/read`)
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.isRead).toBe(true);
    });

    it('should return 404 for non-existent notification', async () => {
      const res = await request(app)
        .put('/api/notifications/00000000-0000-0000-0000-000000000999/read')
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.status).toBe(404);
    });
  });

  describe('PUT /api/notifications/mark-all-read', () => {
    it('should mark all as read', async () => {
      const res = await request(app)
        .put('/api/notifications/mark-all-read')
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(typeof res.body.data.updated).toBe('number');
    });
  });

  describe('DELETE /api/notifications/:id', () => {
    it('should delete notification', async () => {
      const notification = await notificationService.createNotification({
        userId: testUser.id,
        organisationId: testOrg.id,
        type: 'system',
        priority: 'normal',
        title: 'To Delete',
        message: 'Test'
      });

      const res = await request(app)
        .delete(`/api/notifications/${notification.id}`)
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.status).toBe(200);
      expect(res.body.message).toBe('Notification deleted');
    });
  });
});

describe('Preferences API Endpoints', () => {
  describe('GET /api/preferences/notifications', () => {
    it('should return preferences', async () => {
      const res = await request(app)
        .get('/api/preferences/notifications')
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.emailActionAssigned).toBeDefined();
    });
  });

  describe('PUT /api/preferences/notifications', () => {
    it('should update preferences', async () => {
      const res = await request(app)
        .put('/api/preferences/notifications')
        .set('Authorization', `Bearer ${managerToken}`)
        .send({
          emailActionAssigned: true,
          digestFrequency: 'daily',
          digestTime: '08:00'
        });

      expect(res.status).toBe(200);
      expect(res.body.data.digestFrequency).toBe('daily');
      expect(res.body.data.digestTime).toBe('08:00');
    });

    it('should reject invalid digest frequency', async () => {
      const res = await request(app)
        .put('/api/preferences/notifications')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ digestFrequency: 'hourly' });

      expect(res.status).toBe(400);
    });

    it('should reject invalid time format', async () => {
      const res = await request(app)
        .put('/api/preferences/notifications')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ digestTime: '25:00' });

      expect(res.status).toBe(400);
    });
  });
});

describe('Admin API Endpoints', () => {
  describe('GET /api/admin/jobs/runs', () => {
    it('should return job runs for admin', async () => {
      const res = await request(app)
        .get('/api/admin/jobs/runs')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.runs).toBeDefined();
    });

    it('should reject non-admin users', async () => {
      const res = await request(app)
        .get('/api/admin/jobs/runs')
        .set('Authorization', `Bearer ${managerToken}`);

      expect(res.status).toBe(403);
    });
  });

  describe('GET /api/admin/organisation/escalation', () => {
    it('should return escalation settings', async () => {
      const res = await request(app)
        .get('/api/admin/organisation/escalation')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.escalation).toBeDefined();
    });
  });

  describe('PUT /api/admin/organisation/escalation', () => {
    it('should update escalation settings', async () => {
      const res = await request(app)
        .put('/api/admin/organisation/escalation')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          enabled: true,
          daysOverdue: 5,
          notifyManagers: true
        });

      expect(res.status).toBe(200);
      expect(res.body.data.escalation.daysOverdue).toBe(5);
    });

    it('should reject invalid daysOverdue', async () => {
      const res = await request(app)
        .put('/api/admin/organisation/escalation')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ daysOverdue: 50 });

      expect(res.status).toBe(400);
    });
  });

  describe('GET /api/admin/email-logs', () => {
    it('should return email logs', async () => {
      const res = await request(app)
        .get('/api/admin/email-logs')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.logs).toBeDefined();
    });
  });
});

describe('Cross-Organisation Isolation', () => {
  let otherOrg;
  let otherUser;
  let otherUserToken;
  const otherOrgSlug = `other-org-${Date.now()}`;

  beforeAll(async () => {
    // Create another organisation
    const orgResult = await query(
      `INSERT INTO organisations (name, slug)
       VALUES ('Other Org', $1)
       RETURNING id`,
      [otherOrgSlug]
    );
    otherOrg = { id: orgResult.rows[0].id };

    const bcrypt = require('bcryptjs');
    const hashedPassword = await bcrypt.hash('password123', 10);

    const userResult = await query(
      `INSERT INTO users (name, email, password_hash, role, organisation_id)
       VALUES ('Other User', $1, $2, 'worker', $3)
       RETURNING id, name, email, role, organisation_id`,
      [`other-user-${Date.now()}@test.com`, hashedPassword, otherOrg.id]
    );
    otherUser = userResult.rows[0];

    otherUserToken = jwt.sign(
      { id: otherUser.id, name: otherUser.name, email: otherUser.email, role: otherUser.role, organisationId: otherOrg.id },
      env.jwtSecret,
      { expiresIn: '1h' }
    );

    // Create notification for other org user
    await notificationService.createNotification({
      userId: otherUser.id,
      organisationId: otherOrg.id,
      type: 'system',
      priority: 'normal',
      title: 'Other Org Notification',
      message: 'Test'
    });
  });

  afterAll(async () => {
    if (otherOrg && otherOrg.id) {
      await query('DELETE FROM notifications WHERE organisation_id = $1', [otherOrg.id]);
      await query('DELETE FROM user_notification_preferences WHERE organisation_id = $1', [otherOrg.id]);
      await query('DELETE FROM users WHERE organisation_id = $1', [otherOrg.id]);
      await query('DELETE FROM organisations WHERE id = $1', [otherOrg.id]);
    }
  });

  it('should not return notifications from other organisations', async () => {
    const res = await request(app)
      .get('/api/notifications')
      .set('Authorization', `Bearer ${userToken}`);

    expect(res.status).toBe(200);
    res.body.data.notifications.forEach(n => {
      expect(n.organisationId).not.toBe(otherOrg.id);
    });
  });

  it('should not allow marking other org notifications as read', async () => {
    // Get notification from other org
    const result = await query(
      'SELECT id FROM notifications WHERE organisation_id = $1 LIMIT 1',
      [otherOrg.id]
    );

    if (result.rows.length > 0) {
      const res = await request(app)
        .put(`/api/notifications/${result.rows[0].id}/read`)
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.status).toBe(404); // Should not find it
    }
  });
});

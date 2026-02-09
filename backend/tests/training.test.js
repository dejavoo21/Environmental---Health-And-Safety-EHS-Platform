/**
 * Training Module Tests - Phase 8
 * Tests for Training & Competence Management APIs
 */

const {
  request,
  app,
  query,
  getToken,
  getActiveSites
} = require('./testUtils');

// TC-TRAIN-* (API tests)

describe('Training API', () => {
  const createdCategoryIds = [];
  const createdCourseIds = [];
  const createdSessionIds = [];
  const createdAssignmentIds = [];
  const createdCompletionIds = [];
  
  let siteIds = [];
  let workerToken;
  let managerToken;
  let adminToken;
  let workerId;
  let managerId;
  let testCategoryId;
  let testCourseId;
  let testSessionId;

  beforeAll(async () => {
    workerToken = await getToken('worker');
    managerToken = await getToken('manager');
    adminToken = await getToken('admin');

    const sites = await getActiveSites();
    siteIds = sites.map((site) => site.id);

    // Get user IDs
    const workerRes = await query("SELECT id FROM users WHERE email = 'worker@ehs.local'");
    workerId = workerRes.rows[0]?.id;

    const managerRes = await query("SELECT id FROM users WHERE email = 'manager@ehs.local'");
    managerId = managerRes.rows[0]?.id;

    if (siteIds.length === 0 || !workerId || !managerId) {
      console.warn('Seed data may be missing for training tests');
    }
  });

  afterAll(async () => {
    // Clean up in reverse order of dependencies
    if (createdCompletionIds.length > 0) {
      await query('DELETE FROM training_completions WHERE id = ANY($1::uuid[])', [createdCompletionIds]);
    }
    if (createdAssignmentIds.length > 0) {
      await query('DELETE FROM training_assignments WHERE id = ANY($1::uuid[])', [createdAssignmentIds]);
    }
    if (createdSessionIds.length > 0) {
      await query('DELETE FROM training_session_enrollments WHERE session_id = ANY($1::uuid[])', [createdSessionIds]);
      await query('DELETE FROM training_sessions WHERE id = ANY($1::uuid[])', [createdSessionIds]);
    }
    if (createdCourseIds.length > 0) {
      await query('DELETE FROM training_course_prerequisites WHERE course_id = ANY($1::uuid[]) OR prerequisite_course_id = ANY($1::uuid[])', [createdCourseIds]);
      await query('DELETE FROM training_courses WHERE id = ANY($1::uuid[])', [createdCourseIds]);
    }
    if (createdCategoryIds.length > 0) {
      await query('DELETE FROM training_categories WHERE id = ANY($1::uuid[]) AND is_system = false', [createdCategoryIds]);
    }
  });

  // ==================== CATEGORIES ====================

  describe('Categories', () => {
    // TC-TRAIN-CAT-001: List categories
    it('lists training categories (TC-TRAIN-CAT-001)', async () => {
      const res = await request(app)
        .get('/api/training/categories')
        .set('Authorization', `Bearer ${managerToken}`);

      expect(res.statusCode).toBe(200);
      expect(Array.isArray(res.body.categories)).toBe(true);
      // Should have system categories from seed
      expect(res.body.categories.length).toBeGreaterThan(0);
    });

    // TC-TRAIN-CAT-002: Create custom category
    it('creates custom category (TC-TRAIN-CAT-002)', async () => {
      const res = await request(app)
        .post('/api/training/categories')
        .set('Authorization', `Bearer ${managerToken}`)
        .send({
          code: 'CUSTOM-TEST',
          name: 'Custom Test Category',
          description: 'Test category for unit tests'
        });

      expect(res.statusCode).toBe(201);
      expect(res.body.code).toBe('CUSTOM-TEST');
      expect(res.body.isSystem).toBe(false);
      
      createdCategoryIds.push(res.body.id);
      testCategoryId = res.body.id;
    });

    // TC-TRAIN-CAT-003: Cannot modify system category
    it('rejects modification of system category (TC-TRAIN-CAT-003)', async () => {
      // Get a system category
      const sysRes = await request(app)
        .get('/api/training/categories')
        .set('Authorization', `Bearer ${managerToken}`);
      
      const systemCategory = sysRes.body.categories.find(c => c.isSystem);
      
      if (systemCategory) {
        const res = await request(app)
          .put(`/api/training/categories/${systemCategory.id}`)
          .set('Authorization', `Bearer ${managerToken}`)
          .send({ name: 'Modified Name' });

        expect(res.statusCode).toBe(403);
      }
    });
  });

  // ==================== COURSES ====================

  describe('Courses', () => {
    // TC-TRAIN-CRS-001: Create course
    it('creates training course (TC-TRAIN-CRS-001)', async () => {
      const res = await request(app)
        .post('/api/training/courses')
        .set('Authorization', `Bearer ${managerToken}`)
        .send({
          code: 'TEST-001',
          title: 'Test Safety Training',
          description: 'Test course for unit testing',
          categoryId: testCategoryId,
          deliveryMethod: 'classroom',
          estimatedDurationHours: 4,
          validityMonths: 12,
          isMandatory: false,
          maxParticipants: 20
        });

      expect(res.statusCode).toBe(201);
      expect(res.body.code).toBe('TEST-001');
      expect(res.body.status).toBe('active');
      
      createdCourseIds.push(res.body.id);
      testCourseId = res.body.id;
    });

    // TC-TRAIN-CRS-002: List courses with filters
    it('lists courses with filters (TC-TRAIN-CRS-002)', async () => {
      const res = await request(app)
        .get('/api/training/courses')
        .query({ status: 'active', page: 1, limit: 10 })
        .set('Authorization', `Bearer ${managerToken}`);

      expect(res.statusCode).toBe(200);
      expect(Array.isArray(res.body.courses)).toBe(true);
      expect(res.body.pagination).toBeDefined();
    });

    // TC-TRAIN-CRS-003: Get course details
    it('gets course details (TC-TRAIN-CRS-003)', async () => {
      const res = await request(app)
        .get(`/api/training/courses/${testCourseId}`)
        .set('Authorization', `Bearer ${managerToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.id).toBe(testCourseId);
      expect(res.body.title).toBe('Test Safety Training');
    });

    // TC-TRAIN-CRS-004: Update course
    it('updates course (TC-TRAIN-CRS-004)', async () => {
      const res = await request(app)
        .put(`/api/training/courses/${testCourseId}`)
        .set('Authorization', `Bearer ${managerToken}`)
        .send({
          description: 'Updated description for test course'
        });

      expect(res.statusCode).toBe(200);
      expect(res.body.description).toBe('Updated description for test course');
    });

    // TC-TRAIN-CRS-005: Worker cannot create course
    it('worker cannot create course (TC-TRAIN-CRS-005)', async () => {
      const res = await request(app)
        .post('/api/training/courses')
        .set('Authorization', `Bearer ${workerToken}`)
        .send({
          code: 'FAIL-001',
          title: 'Should Fail',
          deliveryMethod: 'online'
        });

      expect(res.statusCode).toBe(403);
    });
  });

  // ==================== SESSIONS ====================

  describe('Sessions', () => {
    // TC-TRAIN-SES-001: Create session
    it('creates training session (TC-TRAIN-SES-001)', async () => {
      const sessionDate = new Date();
      sessionDate.setDate(sessionDate.getDate() + 7);
      
      const res = await request(app)
        .post('/api/training/sessions')
        .set('Authorization', `Bearer ${managerToken}`)
        .send({
          courseId: testCourseId,
          siteId: siteIds[0],
          locationDetail: 'Conference Room A',
          trainerId: managerId,
          sessionDate: sessionDate.toISOString().split('T')[0],
          startTime: '09:00',
          endTime: '13:00',
          maxParticipants: 15,
          minParticipants: 3
        });

      expect(res.statusCode).toBe(201);
      expect(res.body.status).toBe('scheduled');
      
      createdSessionIds.push(res.body.id);
      testSessionId = res.body.id;
    });

    // TC-TRAIN-SES-002: List sessions
    it('lists sessions (TC-TRAIN-SES-002)', async () => {
      const res = await request(app)
        .get('/api/training/sessions')
        .query({ courseId: testCourseId })
        .set('Authorization', `Bearer ${managerToken}`);

      expect(res.statusCode).toBe(200);
      expect(Array.isArray(res.body.sessions)).toBe(true);
    });

    // TC-TRAIN-SES-003: Enroll users
    it('enrolls users in session (TC-TRAIN-SES-003)', async () => {
      const res = await request(app)
        .post(`/api/training/sessions/${testSessionId}/enroll`)
        .set('Authorization', `Bearer ${managerToken}`)
        .send({
          userIds: [workerId]
        });

      expect(res.statusCode).toBe(200);
      expect(res.body.enrolled.length).toBeGreaterThan(0);
    });

    // TC-TRAIN-SES-004: Self-enroll
    it('allows self-enrollment (TC-TRAIN-SES-004)', async () => {
      // Create another session for self-enrollment test
      const sessionDate = new Date();
      sessionDate.setDate(sessionDate.getDate() + 14);
      
      const createRes = await request(app)
        .post('/api/training/sessions')
        .set('Authorization', `Bearer ${managerToken}`)
        .send({
          courseId: testCourseId,
          siteId: siteIds[0],
          sessionDate: sessionDate.toISOString().split('T')[0],
          startTime: '14:00',
          endTime: '16:00',
          maxParticipants: 10
        });

      if (createRes.statusCode === 201) {
        createdSessionIds.push(createRes.body.id);
        
        const res = await request(app)
          .post(`/api/training/sessions/${createRes.body.id}/self-enroll`)
          .set('Authorization', `Bearer ${workerToken}`);

        expect(res.statusCode).toBe(200);
      }
    });
  });

  // ==================== ASSIGNMENTS ====================

  describe('Assignments', () => {
    // TC-TRAIN-ASN-001: Assign training
    it('assigns training to users (TC-TRAIN-ASN-001)', async () => {
      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + 30);
      
      const res = await request(app)
        .post('/api/training/assignments')
        .set('Authorization', `Bearer ${managerToken}`)
        .send({
          courseId: testCourseId,
          userIds: [workerId],
          dueDate: dueDate.toISOString().split('T')[0],
          priority: 'normal'
        });

      expect(res.statusCode).toBe(201);
      expect(res.body.assigned.length).toBe(1);
      
      if (res.body.assigned[0]) {
        createdAssignmentIds.push(res.body.assigned[0].id);
      }
    });

    // TC-TRAIN-ASN-002: List assignments
    it('lists assignments (TC-TRAIN-ASN-002)', async () => {
      const res = await request(app)
        .get('/api/training/assignments')
        .set('Authorization', `Bearer ${managerToken}`);

      expect(res.statusCode).toBe(200);
      expect(Array.isArray(res.body.assignments)).toBe(true);
    });

    // TC-TRAIN-ASN-003: Worker sees only own assignments
    it('worker sees only own assignments (TC-TRAIN-ASN-003)', async () => {
      const res = await request(app)
        .get('/api/training/assignments')
        .set('Authorization', `Bearer ${workerToken}`);

      expect(res.statusCode).toBe(200);
      // All returned assignments should belong to the worker
      res.body.assignments.forEach(a => {
        expect(a.user.id).toBe(workerId);
      });
    });
  });

  // ==================== MY TRAINING ====================

  describe('My Training', () => {
    // TC-TRAIN-MY-001: Get my training dashboard
    it('gets my training dashboard (TC-TRAIN-MY-001)', async () => {
      const res = await request(app)
        .get('/api/training/my-training')
        .set('Authorization', `Bearer ${workerToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.assigned).toBeDefined();
      expect(res.body.upcomingSessions).toBeDefined();
      expect(res.body.recentCompletions).toBeDefined();
      expect(res.body.summary).toBeDefined();
    });

    // TC-TRAIN-MY-002: Get my training history
    it('gets my training history (TC-TRAIN-MY-002)', async () => {
      const res = await request(app)
        .get('/api/training/my-training/history')
        .set('Authorization', `Bearer ${workerToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.completions).toBeDefined();
      expect(res.body.statistics).toBeDefined();
    });
  });

  // ==================== COMPLETIONS ====================

  describe('Completions', () => {
    // TC-TRAIN-CMP-001: Record manual completion
    it('records manual completion (TC-TRAIN-CMP-001)', async () => {
      const completionDate = new Date();
      completionDate.setDate(completionDate.getDate() - 1);
      
      const res = await request(app)
        .post('/api/training/completions')
        .set('Authorization', `Bearer ${managerToken}`)
        .send({
          userId: workerId,
          courseId: testCourseId,
          completionDate: completionDate.toISOString().split('T')[0],
          result: 'passed',
          score: 85
        });

      expect(res.statusCode).toBe(201);
      expect(res.body.result).toBe('passed');
      
      createdCompletionIds.push(res.body.id);
    });

    // TC-TRAIN-CMP-002: List completions
    it('lists completions (TC-TRAIN-CMP-002)', async () => {
      const res = await request(app)
        .get('/api/training/completions')
        .set('Authorization', `Bearer ${managerToken}`);

      expect(res.statusCode).toBe(200);
      expect(Array.isArray(res.body.completions)).toBe(true);
    });

    // TC-TRAIN-CMP-003: Submit external training
    it('submits external training for verification (TC-TRAIN-CMP-003)', async () => {
      // Create a second course for external training
      const courseRes = await request(app)
        .post('/api/training/courses')
        .set('Authorization', `Bearer ${managerToken}`)
        .send({
          code: 'EXT-001',
          title: 'External Training Course',
          deliveryMethod: 'external'
        });

      if (courseRes.statusCode === 201) {
        createdCourseIds.push(courseRes.body.id);

        const res = await request(app)
          .post('/api/training/completions/external')
          .set('Authorization', `Bearer ${workerToken}`)
          .send({
            courseId: courseRes.body.id,
            completionDate: new Date().toISOString().split('T')[0],
            externalTrainerName: 'John Smith',
            externalOrg: 'Safety Training Inc.',
            certificateNumber: 'CERT-12345'
          });

        expect(res.statusCode).toBe(201);
        expect(res.body.verificationStatus).toBe('pending');
        
        createdCompletionIds.push(res.body.id);
      }
    });
  });

  // ==================== TRAINING MATRIX ====================

  describe('Training Matrix', () => {
    // TC-TRAIN-MTX-001: Get training matrix
    it('gets training matrix (TC-TRAIN-MTX-001)', async () => {
      const res = await request(app)
        .get('/api/training/matrix')
        .set('Authorization', `Bearer ${managerToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.matrix).toBeDefined();
      expect(res.body.summary).toBeDefined();
    });

    // TC-TRAIN-MTX-002: Get gap analysis
    it('gets gap analysis (TC-TRAIN-MTX-002)', async () => {
      const res = await request(app)
        .get('/api/training/matrix/gaps')
        .set('Authorization', `Bearer ${managerToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.gapsByCourse).toBeDefined();
      expect(res.body.gapsByUser).toBeDefined();
    });

    // TC-TRAIN-MTX-003: Worker cannot access matrix
    it('worker cannot access training matrix (TC-TRAIN-MTX-003)', async () => {
      const res = await request(app)
        .get('/api/training/matrix')
        .set('Authorization', `Bearer ${workerToken}`);

      expect(res.statusCode).toBe(403);
    });
  });

  // ==================== REPORTS ====================

  describe('Reports', () => {
    // TC-TRAIN-RPT-001: Get dashboard stats
    it('gets training dashboard stats (TC-TRAIN-RPT-001)', async () => {
      const res = await request(app)
        .get('/api/training/reports/dashboard')
        .set('Authorization', `Bearer ${managerToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.completions).toBeDefined();
      expect(res.body.sessions).toBeDefined();
      expect(res.body.assignments).toBeDefined();
    });

    // TC-TRAIN-RPT-002: Get compliance report
    it('gets compliance report (TC-TRAIN-RPT-002)', async () => {
      const res = await request(app)
        .get('/api/training/reports/compliance')
        .set('Authorization', `Bearer ${managerToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.reportType).toBe('training_compliance');
      expect(res.body.summary).toBeDefined();
    });

    // TC-TRAIN-RPT-003: Export matrix to Excel
    it('exports matrix to Excel (TC-TRAIN-RPT-003)', async () => {
      const res = await request(app)
        .get('/api/training/exports/matrix')
        .set('Authorization', `Bearer ${managerToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.headers['content-type']).toContain('spreadsheetml');
    });
  });

  // ==================== REQUIREMENTS ====================

  describe('Requirements', () => {
    // TC-TRAIN-REQ-001: Get role requirements
    it('gets role requirements (TC-TRAIN-REQ-001)', async () => {
      const res = await request(app)
        .get('/api/training/requirements/roles')
        .set('Authorization', `Bearer ${managerToken}`);

      expect(res.statusCode).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
    });

    // TC-TRAIN-REQ-002: Get site requirements
    it('gets site requirements (TC-TRAIN-REQ-002)', async () => {
      const res = await request(app)
        .get('/api/training/requirements/sites')
        .set('Authorization', `Bearer ${managerToken}`);

      expect(res.statusCode).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
    });
  });

  // ==================== ASSIGNMENT RULES ====================

  describe('Assignment Rules', () => {
    // TC-TRAIN-RUL-001: List rules
    it('lists assignment rules (TC-TRAIN-RUL-001)', async () => {
      const res = await request(app)
        .get('/api/training/rules')
        .set('Authorization', `Bearer ${managerToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.rules).toBeDefined();
    });

    // TC-TRAIN-RUL-002: Create rule (admin only)
    it('creates assignment rule (TC-TRAIN-RUL-002)', async () => {
      const res = await request(app)
        .post('/api/training/rules')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          ruleName: 'Test Rule',
          courseId: testCourseId,
          triggerType: 'onboarding',
          criteria: { roleIds: [] },
          daysToComplete: 30
        });

      expect(res.statusCode).toBe(201);
      expect(res.body.rule_name).toBe('Test Rule');
    });
  });
});

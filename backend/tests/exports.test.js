const { app, request, query, getToken, closePool } = require('./testUtils');
const emailSender = require('../src/utils/emailSender');

describe('Exports API (Phase 3 & 4)', () => {
  let adminToken;
  let managerToken;
  let workerToken;

  beforeAll(async () => {
    adminToken = await getToken('admin');
    managerToken = await getToken('manager');
    workerToken = await getToken('worker');
  });

  afterAll(async () => {
    await closePool();
  });

  // Clear rate limit between test files
  beforeEach(() => {
    const exportsRouter = require('../src/routes/exports');
    if (exportsRouter._rateLimitStore) {
      exportsRouter._rateLimitStore.clear();
    }
  });

  describe('GET /api/exports/incidents', () => {
    // TC-P3-081: Manager exports incidents
    it('should export incidents CSV for manager', async () => {
      const res = await request(app)
        .get('/api/exports/incidents')
        .set('Authorization', `Bearer ${managerToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.headers['content-type']).toMatch(/text\/csv/);
      expect(res.headers['content-disposition']).toMatch(/attachment/);
      expect(res.headers['content-disposition']).toMatch(/incidents_/);
      expect(res.headers['content-disposition']).toMatch(/\.csv/);
    });

    // TC-P3-082: Worker tries to export
    it('should reject export from worker', async () => {
      const res = await request(app)
        .get('/api/exports/incidents')
        .set('Authorization', `Bearer ${workerToken}`);

      expect(res.statusCode).toBe(403);
    });

    it('should export incidents CSV for admin', async () => {
      const res = await request(app)
        .get('/api/exports/incidents')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.headers['content-type']).toMatch(/text\/csv/);
    });

    // TC-P3-083: Export with date range filter
    it('should accept date range filter', async () => {
      const res = await request(app)
        .get('/api/exports/incidents?startDate=2024-01-01&endDate=2024-12-31')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.headers['content-type']).toMatch(/text\/csv/);
    });

    it('should reject invalid date format', async () => {
      const res = await request(app)
        .get('/api/exports/incidents?startDate=invalid-date')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.statusCode).toBe(400);
      expect(res.body.code).toBe('INVALID_DATE');
    });

    // TC-P3-087: Export has correct columns
    it('should include expected CSV headers', async () => {
      const res = await request(app)
        .get('/api/exports/incidents')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.statusCode).toBe(200);
      const lines = res.text.split('\n');
      const headers = lines[0];
      expect(headers).toContain('ID');
      expect(headers).toContain('Title');
      expect(headers).toContain('Severity');
      expect(headers).toContain('Status');
    });

    // TC-P3-132: Rate limit headers present
    it('should include rate limit headers', async () => {
      const res = await request(app)
        .get('/api/exports/incidents')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.headers['x-ratelimit-limit']).toBe('1');
      expect(res.headers['x-ratelimit-remaining']).toBe('0');
      expect(res.headers['x-ratelimit-reset']).toBeDefined();
    });

    // TC-P3-130: Export rate limited
    it('should rate limit consecutive exports', async () => {
      // Clear rate limit store first
      const exportsRouter = require('../src/routes/exports');
      exportsRouter._rateLimitStore.clear();

      // First export should succeed
      const res1 = await request(app)
        .get('/api/exports/incidents')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res1.statusCode).toBe(200);

      // Second export should be rate limited
      const res2 = await request(app)
        .get('/api/exports/incidents')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res2.statusCode).toBe(429);
      expect(res2.body.code).toBe('RATE_LIMITED');
      expect(res2.headers['retry-after']).toBeDefined();
    });
  });

  describe('GET /api/exports/inspections', () => {
    it('should export inspections CSV for manager', async () => {
      // Clear rate limit
      const exportsRouter = require('../src/routes/exports');
      exportsRouter._rateLimitStore.clear();

      const res = await request(app)
        .get('/api/exports/inspections')
        .set('Authorization', `Bearer ${managerToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.headers['content-type']).toMatch(/text\/csv/);
      expect(res.headers['content-disposition']).toMatch(/inspections_/);
    });

    it('should include expected CSV headers', async () => {
      // Clear rate limit
      const exportsRouter = require('../src/routes/exports');
      exportsRouter._rateLimitStore.clear();

      const res = await request(app)
        .get('/api/exports/inspections')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.statusCode).toBe(200);
      const lines = res.text.split('\n');
      const headers = lines[0];
      expect(headers).toContain('ID');
      expect(headers).toContain('Template');
      expect(headers).toContain('Site');
      expect(headers).toContain('Result');
    });
  });

  describe('GET /api/exports/actions', () => {
    it('should export actions CSV for manager', async () => {
      // Clear rate limit
      const exportsRouter = require('../src/routes/exports');
      exportsRouter._rateLimitStore.clear();

      const res = await request(app)
        .get('/api/exports/actions')
        .set('Authorization', `Bearer ${managerToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.headers['content-type']).toMatch(/text\/csv/);
      expect(res.headers['content-disposition']).toMatch(/actions_/);
    });

    it('should include expected CSV headers', async () => {
      // Clear rate limit
      const exportsRouter = require('../src/routes/exports');
      exportsRouter._rateLimitStore.clear();

      const res = await request(app)
        .get('/api/exports/actions')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.statusCode).toBe(200);
      const lines = res.text.split('\n');
      const headers = lines[0];
      expect(headers).toContain('ID');
      expect(headers).toContain('Title');
      expect(headers).toContain('Status');
      expect(headers).toContain('Due Date');
    });

    it('should filter by status', async () => {
      // Clear rate limit
      const exportsRouter = require('../src/routes/exports');
      exportsRouter._rateLimitStore.clear();

      const res = await request(app)
        .get('/api/exports/actions?status=open')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.statusCode).toBe(200);
    });
  });

  // ============================================================================
  // Phase 4: PDF Export Tests
  // ============================================================================

  describe('PDF Export (Phase 4)', () => {
    describe('GET /api/exports/incidents?format=pdf', () => {
      it('should export incidents as PDF', async () => {
        const exportsRouter = require('../src/routes/exports');
        exportsRouter._rateLimitStore.clear();

        const res = await request(app)
          .get('/api/exports/incidents?format=pdf')
          .set('Authorization', `Bearer ${adminToken}`);

        expect(res.statusCode).toBe(200);
        expect(res.headers['content-type']).toMatch(/application\/pdf/);
        expect(res.headers['content-disposition']).toMatch(/\.pdf/);
        // PDF files start with %PDF
        expect(res.body.toString().substring(0, 4)).toBe('%PDF');
      });

      it('should reject invalid format', async () => {
        const exportsRouter = require('../src/routes/exports');
        exportsRouter._rateLimitStore.clear();

        const res = await request(app)
          .get('/api/exports/incidents?format=xlsx')
          .set('Authorization', `Bearer ${adminToken}`);

        expect(res.statusCode).toBe(400);
        expect(res.body.code).toBe('INVALID_FORMAT');
      });

      it('should default to CSV when format not specified', async () => {
        const exportsRouter = require('../src/routes/exports');
        exportsRouter._rateLimitStore.clear();

        const res = await request(app)
          .get('/api/exports/incidents')
          .set('Authorization', `Bearer ${adminToken}`);

        expect(res.statusCode).toBe(200);
        expect(res.headers['content-type']).toMatch(/text\/csv/);
      });
    });

    describe('GET /api/exports/inspections?format=pdf', () => {
      it('should export inspections as PDF', async () => {
        const exportsRouter = require('../src/routes/exports');
        exportsRouter._rateLimitStore.clear();

        const res = await request(app)
          .get('/api/exports/inspections?format=pdf')
          .set('Authorization', `Bearer ${managerToken}`);

        expect(res.statusCode).toBe(200);
        expect(res.headers['content-type']).toMatch(/application\/pdf/);
        expect(res.headers['content-disposition']).toMatch(/inspections_.*\.pdf/);
      });
    });

    describe('GET /api/exports/actions?format=pdf', () => {
      it('should export actions as PDF', async () => {
        const exportsRouter = require('../src/routes/exports');
        exportsRouter._rateLimitStore.clear();

        const res = await request(app)
          .get('/api/exports/actions?format=pdf')
          .set('Authorization', `Bearer ${managerToken}`);

        expect(res.statusCode).toBe(200);
        expect(res.headers['content-type']).toMatch(/application\/pdf/);
        expect(res.headers['content-disposition']).toMatch(/actions_.*\.pdf/);
      });

      it('should apply rate limit to PDF exports', async () => {
        const exportsRouter = require('../src/routes/exports');
        exportsRouter._rateLimitStore.clear();

        // First export should succeed
        const res1 = await request(app)
          .get('/api/exports/actions?format=pdf')
          .set('Authorization', `Bearer ${adminToken}`);
        expect(res1.statusCode).toBe(200);

        // Second export should be rate limited
        const res2 = await request(app)
          .get('/api/exports/actions?format=pdf')
          .set('Authorization', `Bearer ${adminToken}`);
        expect(res2.statusCode).toBe(429);
      });
    });
  });

  // ============================================================================
  // Phase 4: Email Export Tests
  // ============================================================================

  describe('Email Export (Phase 4)', () => {
    // Mock transport for email tests
    const mockSendMail = jest.fn().mockResolvedValue({ messageId: 'test-message-id' });

    beforeEach(() => {
      // Reset mocks and set up mock transport
      mockSendMail.mockClear();
      emailSender.setTransporter({
        sendMail: mockSendMail
      });
    });

    afterEach(() => {
      emailSender.resetTransporter();
    });

    describe('POST /api/exports/incidents/email', () => {
      it('should send email with PDF attachment', async () => {
        const exportsRouter = require('../src/routes/exports');
        exportsRouter._rateLimitStore.clear();

        const res = await request(app)
          .post('/api/exports/incidents/email')
          .set('Authorization', `Bearer ${adminToken}`)
          .send({
            toEmail: 'test@example.com',
            subject: 'Test Subject'
          });

        expect(res.statusCode).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.data.recipient).toBe('test@example.com');
        expect(res.body.data.filename).toMatch(/Incidents_Report_.*\.pdf/);
        expect(mockSendMail).toHaveBeenCalledWith(
          expect.objectContaining({
            to: 'test@example.com',
            subject: 'Test Subject'
          })
        );
      });

      it('should use default subject when not provided', async () => {
        const exportsRouter = require('../src/routes/exports');
        exportsRouter._rateLimitStore.clear();

        const res = await request(app)
          .post('/api/exports/incidents/email')
          .set('Authorization', `Bearer ${adminToken}`)
          .send({
            toEmail: 'test@example.com'
          });

        expect(res.statusCode).toBe(200);
        expect(mockSendMail).toHaveBeenCalledWith(
          expect.objectContaining({
            subject: expect.stringContaining('EHS Report - Incidents')
          })
        );
      });

      it('should require toEmail field', async () => {
        const exportsRouter = require('../src/routes/exports');
        exportsRouter._rateLimitStore.clear();

        const res = await request(app)
          .post('/api/exports/incidents/email')
          .set('Authorization', `Bearer ${adminToken}`)
          .send({});

        expect(res.statusCode).toBe(400);
        expect(res.body.code).toBe('VALIDATION_ERROR');
      });

      it('should validate email format', async () => {
        const exportsRouter = require('../src/routes/exports');
        exportsRouter._rateLimitStore.clear();

        const res = await request(app)
          .post('/api/exports/incidents/email')
          .set('Authorization', `Bearer ${adminToken}`)
          .send({
            toEmail: 'invalid-email'
          });

        expect(res.statusCode).toBe(400);
        expect(res.body.code).toBe('VALIDATION_ERROR');
      });

      it('should check SMTP configuration before sending', async () => {
        // This test verifies isSmtpConfigured is called during email export
        // When SMTP is configured, it should proceed to send (or fail with send error)
        // When SMTP is not configured, it returns 503 SMTP_NOT_CONFIGURED
        const exportsRouter = require('../src/routes/exports');
        exportsRouter._rateLimitStore.clear();

        const res = await request(app)
          .post('/api/exports/incidents/email')
          .set('Authorization', `Bearer ${adminToken}`)
          .send({
            toEmail: 'test@example.com'
          });

        // If SMTP is configured (env has SMTP_HOST), it will attempt to send
        // If not configured, it returns 503
        if (emailSender.isSmtpConfigured()) {
          // SMTP configured - should succeed (mock sendMail is set up in beforeEach)
          expect(res.statusCode).toBe(200);
        } else {
          // SMTP not configured - should return 503
          expect(res.statusCode).toBe(503);
          expect(res.body.code).toBe('SMTP_NOT_CONFIGURED');
        }
      });

      it('should enforce rate limit for email exports', async () => {
        const exportsRouter = require('../src/routes/exports');
        exportsRouter._rateLimitStore.clear();

        // First email should succeed
        const res1 = await request(app)
          .post('/api/exports/incidents/email')
          .set('Authorization', `Bearer ${adminToken}`)
          .send({ toEmail: 'test@example.com' });
        expect(res1.statusCode).toBe(200);

        // Second email should be rate limited (shares bucket with exports)
        const res2 = await request(app)
          .post('/api/exports/incidents/email')
          .set('Authorization', `Bearer ${adminToken}`)
          .send({ toEmail: 'test@example.com' });
        expect(res2.statusCode).toBe(429);
      });

      it('should reject email from worker', async () => {
        const exportsRouter = require('../src/routes/exports');
        exportsRouter._rateLimitStore.clear();

        const res = await request(app)
          .post('/api/exports/incidents/email')
          .set('Authorization', `Bearer ${workerToken}`)
          .send({ toEmail: 'test@example.com' });

        expect(res.statusCode).toBe(403);
      });
    });

    describe('POST /api/exports/inspections/email', () => {
      it('should send inspections email with PDF attachment', async () => {
        const exportsRouter = require('../src/routes/exports');
        exportsRouter._rateLimitStore.clear();

        const res = await request(app)
          .post('/api/exports/inspections/email')
          .set('Authorization', `Bearer ${managerToken}`)
          .send({
            toEmail: 'manager@example.com'
          });

        expect(res.statusCode).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.data.filename).toMatch(/Inspections_Report_.*\.pdf/);
      });
    });

    describe('POST /api/exports/actions/email', () => {
      it('should send actions email with PDF attachment', async () => {
        const exportsRouter = require('../src/routes/exports');
        exportsRouter._rateLimitStore.clear();

        const res = await request(app)
          .post('/api/exports/actions/email')
          .set('Authorization', `Bearer ${managerToken}`)
          .send({
            toEmail: 'manager@example.com',
            subject: 'Actions Report'
          });

        expect(res.statusCode).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.data.filename).toMatch(/Actions_Report_.*\.pdf/);
        expect(mockSendMail).toHaveBeenCalledWith(
          expect.objectContaining({
            to: 'manager@example.com',
            subject: 'Actions Report'
          })
        );
      });
    });
  });
});

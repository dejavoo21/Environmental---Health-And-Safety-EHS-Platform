const { request, app } = require('./testUtils');

// TC-AUTH-01, TC-AUTH-02, TC-AUTH-04

describe('Auth API', () => {

  it('logs in with valid credentials (TC-AUTH-01)', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'admin@ehs.local', password: 'Admin123!' });

    expect(res.statusCode).toBe(200);
    expect(res.body.token).toBeDefined();
    expect(res.body.user.role).toBe('admin');
  });

  it('rejects invalid credentials (TC-AUTH-02)', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'admin@ehs.local', password: 'WrongPassword' });

    expect(res.statusCode).toBe(401);
    expect(res.body.code).toBe('INVALID_CREDENTIALS');
  });

  it('/auth/me returns correct role (TC-AUTH-04)', async () => {
    const login = await request(app)
      .post('/api/auth/login')
      .send({ email: 'manager@ehs.local', password: 'Manager123!' });

    const token = login.body.token;

    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${token}`);

    expect(res.statusCode).toBe(200);
    expect(res.body.email).toBe('manager@ehs.local');
    expect(res.body.name).toBeDefined();
    expect(res.body.role).toBe('manager');
  });
});

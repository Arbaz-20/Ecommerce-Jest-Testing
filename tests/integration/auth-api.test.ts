import request from 'supertest';
import { createApp } from '../../src/app';
import { testUsers } from '../fixtures/testData';

const app = createApp();

describe('Auth API — Integration Tests', () => {
  // ── POST /api/auth/register ───────────────────────────────────
  describe('POST /api/auth/register', () => {
    it('should register a new user', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send(testUsers.customer);

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.token).toBeDefined();
      expect(res.body.data.user.email).toBe(testUsers.customer.email);
      expect(res.body.data.user).not.toHaveProperty('passwordHash');
      expect(res.body.data.user).not.toHaveProperty('password_hash');
    });

    it('should reject duplicate email', async () => {
      await request(app)
        .post('/api/auth/register')
        .send(testUsers.customer);

      const res = await request(app)
        .post('/api/auth/register')
        .send(testUsers.customer);

      expect(res.status).toBe(409);
      expect(res.body.error).toContain('already registered');
    });

    it('should reject invalid email format', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({ ...testUsers.customer, email: 'bad-email' });

      expect(res.status).toBe(400);
    });

    it('should reject short password', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({ ...testUsers.customer, email: 'new@test.com', password: 'short' });

      expect(res.status).toBe(400);
    });
  });

  // ── POST /api/auth/login ──────────────────────────────────────
  describe('POST /api/auth/login', () => {
    beforeEach(async () => {
      await request(app)
        .post('/api/auth/register')
        .send(testUsers.customer);
    });

    it('should login with correct credentials', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: testUsers.customer.email,
          password: testUsers.customer.password,
        });

      expect(res.status).toBe(200);
      expect(res.body.data.token).toBeDefined();
      expect(res.body.data.user.email).toBe(testUsers.customer.email);
    });

    it('should reject wrong password', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: testUsers.customer.email,
          password: 'WrongPassword!',
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('Invalid email or password');
    });

    it('should reject non-existent email', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'nobody@test.com', password: 'pass' });

      expect(res.status).toBe(400);
    });
  });

  // ── GET /api/auth/profile ─────────────────────────────────────
  describe('GET /api/auth/profile', () => {
    it('should return profile for authenticated user', async () => {
      const registerRes = await request(app)
        .post('/api/auth/register')
        .send(testUsers.customer);

      const token = registerRes.body.data.token;

      const res = await request(app)
        .get('/api/auth/profile')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.data.email).toBe(testUsers.customer.email);
      expect(res.body.data.firstName).toBe(testUsers.customer.firstName);
    });

    it('should reject unauthenticated request', async () => {
      const res = await request(app).get('/api/auth/profile');

      expect(res.status).toBe(401);
    });

    it('should reject invalid token', async () => {
      const res = await request(app)
        .get('/api/auth/profile')
        .set('Authorization', 'Bearer invalid.token.here');

      expect(res.status).toBe(401);
    });
  });

  // ── PUT /api/auth/profile ─────────────────────────────────────
  describe('PUT /api/auth/profile', () => {
    it('should update user profile', async () => {
      const registerRes = await request(app)
        .post('/api/auth/register')
        .send(testUsers.customer);

      const token = registerRes.body.data.token;

      const res = await request(app)
        .put('/api/auth/profile')
        .set('Authorization', `Bearer ${token}`)
        .send({ firstName: 'Updated', lastName: 'Name' });

      expect(res.status).toBe(200);
      expect(res.body.data.firstName).toBe('Updated');
      expect(res.body.data.lastName).toBe('Name');
    });
  });
});

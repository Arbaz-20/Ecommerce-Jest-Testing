import request from 'supertest';
import { createApp } from '../../src/app';
import { query } from '../../src/shared/database';
import { testProducts, generateAdminToken, generateCustomerToken } from '../fixtures/testData';

const app = createApp();

describe('Product API — Integration Tests', () => {
  let adminToken: string;
  let customerToken: string;

  beforeAll(() => {
    adminToken = generateAdminToken();
    customerToken = generateCustomerToken();
  });

  // ── GET /api/products ─────────────────────────────────────────
  describe('GET /api/products', () => {
    it('should return empty list initially', async () => {
      const res = await request(app).get('/api/products');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.items).toHaveLength(0);
      expect(res.body.data.total).toBe(0);
    });

    it('should return products after seeding', async () => {
      // Seed directly via DB
      for (const p of testProducts.slice(0, 3)) {
        await query(
          `INSERT INTO products (name, description, price, stock, category)
           VALUES ($1, $2, $3, $4, $5)`,
          [p.name, p.description, p.price, p.stock, p.category]
        );
      }

      const res = await request(app).get('/api/products');

      expect(res.status).toBe(200);
      expect(res.body.data.items).toHaveLength(3);
      expect(res.body.data.total).toBe(3);
    });

    it('should filter by category', async () => {
      // Seed electronics + furniture
      await query(
        `INSERT INTO products (name, description, price, stock, category)
         VALUES ('Keyboard', 'desc', 100, 10, 'electronics')`,
      );
      await query(
        `INSERT INTO products (name, description, price, stock, category)
         VALUES ('Desk', 'desc', 300, 5, 'furniture')`,
      );

      const res = await request(app)
        .get('/api/products?category=electronics');

      expect(res.status).toBe(200);
      expect(res.body.data.items).toHaveLength(1);
      expect(res.body.data.items[0].name).toBe('Keyboard');
    });

    it('should paginate results', async () => {
      for (let i = 0; i < 15; i++) {
        await query(
          `INSERT INTO products (name, description, price, stock, category)
           VALUES ($1, 'desc', 10, 5, 'test')`,
          [`Product ${i}`]
        );
      }

      const res = await request(app)
        .get('/api/products?page=2&pageSize=10');

      expect(res.status).toBe(200);
      expect(res.body.data.items).toHaveLength(5);
      expect(res.body.data.totalPages).toBe(2);
    });
  });

  // ── POST /api/products (admin) ────────────────────────────────
  describe('POST /api/products', () => {
    it('should create product with admin token', async () => {
      const res = await request(app)
        .post('/api/products')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(testProducts[0]);

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.name).toBe(testProducts[0].name);
      expect(res.body.data.id).toBeDefined();
    });

    it('should reject without auth token', async () => {
      const res = await request(app)
        .post('/api/products')
        .send(testProducts[0]);

      expect(res.status).toBe(401);
    });

    it('should reject with customer token (not admin)', async () => {
      const res = await request(app)
        .post('/api/products')
        .set('Authorization', `Bearer ${customerToken}`)
        .send(testProducts[0]);

      expect(res.status).toBe(403);
    });

    it('should reject invalid product data', async () => {
      const res = await request(app)
        .post('/api/products')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: '', price: -10, stock: 0, category: '' });

      expect(res.status).toBe(400);
    });
  });

  // ── GET /api/products/:id ─────────────────────────────────────
  describe('GET /api/products/:id', () => {
    it('should return product by id', async () => {
      const createRes = await request(app)
        .post('/api/products')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(testProducts[1]);

      const productId = createRes.body.data.id;

      const res = await request(app).get(`/api/products/${productId}`);

      expect(res.status).toBe(200);
      expect(res.body.data.name).toBe(testProducts[1].name);
    });

    it('should return 404 for non-existent product', async () => {
      const res = await request(app).get(
        '/api/products/00000000-0000-0000-0000-000000000000'
      );

      expect(res.status).toBe(404);
    });
  });

  // ── PUT /api/products/:id ─────────────────────────────────────
  describe('PUT /api/products/:id', () => {
    it('should update product price', async () => {
      const createRes = await request(app)
        .post('/api/products')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(testProducts[0]);

      const productId = createRes.body.data.id;

      const res = await request(app)
        .put(`/api/products/${productId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ price: 199.99 });

      expect(res.status).toBe(200);
      expect(Number(res.body.data.price)).toBe(199.99);
    });
  });

  // ── DELETE /api/products/:id ──────────────────────────────────
  describe('DELETE /api/products/:id', () => {
    it('should delete product', async () => {
      const createRes = await request(app)
        .post('/api/products')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(testProducts[2]);

      const productId = createRes.body.data.id;

      const deleteRes = await request(app)
        .delete(`/api/products/${productId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(deleteRes.status).toBe(200);

      // Verify it's gone
      const getRes = await request(app).get(`/api/products/${productId}`);
      expect(getRes.status).toBe(404);
    });
  });

  // ── GET /api/products/search ──────────────────────────────────
  describe('GET /api/products/search', () => {
    it('should find products by keyword', async () => {
      await request(app)
        .post('/api/products')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(testProducts[0]); // "Mechanical Keyboard"

      const res = await request(app)
        .get('/api/products/search?q=keyboard');

      expect(res.status).toBe(200);
      expect(res.body.data.length).toBeGreaterThan(0);
      expect(res.body.data[0].name).toContain('Keyboard');
    });
  });
});

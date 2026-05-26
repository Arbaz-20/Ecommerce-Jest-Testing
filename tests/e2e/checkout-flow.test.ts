import request from 'supertest';
import { createApp } from '../../src/app';
import { testProducts, testUsers, testAddresses } from '../fixtures/testData';

const app = createApp();

describe('E2E — Full Checkout Flow', () => {
  let customerToken: string;
  let customerId: string;
  let productIds: string[] = [];

  // ── Setup: Register user + Seed products ──────────────────────
  beforeEach(async () => {
    // Register customer
    const registerRes = await request(app)
      .post('/api/auth/register')
      .send(testUsers.customer);

    customerToken = registerRes.body.data.token;
    customerId = registerRes.body.data.user.id;

    // Register admin and seed products
    const adminRegRes = await request(app)
      .post('/api/auth/register')
      .send({ ...testUsers.admin, email: 'admin@ecommerce.test' });

    const adminToken = adminRegRes.body.data.token;

    // We need to make admin an actual admin — update directly in DB
    const { query } = require('../../src/shared/database');
    await query(
      `UPDATE users SET role = 'admin' WHERE id = $1`,
      [adminRegRes.body.data.user.id]
    );

    // Re-login admin to get updated token with admin role
    // Actually, we need to generate a proper admin token
    const { generateToken } = require('../../src/shared/middleware/auth');
    const adminTokenReal = generateToken({
      userId: adminRegRes.body.data.user.id,
      email: 'admin@ecommerce.test',
      role: 'admin',
    });

    // Create products
    productIds = [];
    for (const product of testProducts.slice(0, 3)) {
      const res = await request(app)
        .post('/api/products')
        .set('Authorization', `Bearer ${adminTokenReal}`)
        .send(product);

      productIds.push(res.body.data.id);
    }
  });

  // ── Test: Complete purchase flow ──────────────────────────────
  it('should complete full checkout: browse → order → pay → verify', async () => {
    // ═══════════════════════════════════════════════════════════
    // STEP 1: Browse products (public, no auth needed)
    // ═══════════════════════════════════════════════════════════
    const browseRes = await request(app).get('/api/products');

    expect(browseRes.status).toBe(200);
    expect(browseRes.body.data.items.length).toBeGreaterThanOrEqual(3);

    // ═══════════════════════════════════════════════════════════
    // STEP 2: View specific product
    // ═══════════════════════════════════════════════════════════
    const productRes = await request(app).get(`/api/products/${productIds[0]}`);

    expect(productRes.status).toBe(200);
    expect(productRes.body.data.name).toBe(testProducts[0].name);
    const originalStock = Number(productRes.body.data.stock);

    // ═══════════════════════════════════════════════════════════
    // STEP 3: Create order (auth required)
    // ═══════════════════════════════════════════════════════════
    const orderRes = await request(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({
        items: [
          { productId: productIds[0], quantity: 2 },
          { productId: productIds[1], quantity: 1 },
        ],
        shippingAddress: testAddresses.istanbul,
      });

    expect(orderRes.status).toBe(201);
    expect(orderRes.body.data.status).toBe('pending_payment');
    expect(orderRes.body.data.items).toHaveLength(2);

    const orderId = orderRes.body.data.id;
    const orderTotal = Number(orderRes.body.data.total);

    // Verify subtotal calculation
    const expectedSubtotal =
      Number(testProducts[0].price) * 2 + Number(testProducts[1].price) * 1;
    expect(Number(orderRes.body.data.subtotal)).toBe(expectedSubtotal);
    expect(orderTotal).toBeGreaterThan(0);

    // ═══════════════════════════════════════════════════════════
    // STEP 4: Verify stock was reserved
    // ═══════════════════════════════════════════════════════════
    const stockCheckRes = await request(app).get(`/api/products/${productIds[0]}`);
    expect(Number(stockCheckRes.body.data.stock)).toBe(originalStock - 2);

    // ═══════════════════════════════════════════════════════════
    // STEP 5: Process payment
    // ═══════════════════════════════════════════════════════════
    const paymentRes = await request(app)
      .post('/api/payments')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({
        orderId,
        amount: orderTotal,
        method: 'credit_card',
        cardToken: 'tok_visa_test',
      });

    expect(paymentRes.status).toBe(201);
    expect(paymentRes.body.data.status).toBe('captured');
    expect(paymentRes.body.data.transactionId).toBeDefined();

    const paymentId = paymentRes.body.data.id;

    // ═══════════════════════════════════════════════════════════
    // STEP 6: Verify order is now "paid"
    // ═══════════════════════════════════════════════════════════
    const orderCheckRes = await request(app)
      .get(`/api/orders/${orderId}`)
      .set('Authorization', `Bearer ${customerToken}`);

    expect(orderCheckRes.status).toBe(200);
    expect(orderCheckRes.body.data.status).toBe('paid');
    expect(orderCheckRes.body.data.paymentId).toBe(paymentId);

    // ═══════════════════════════════════════════════════════════
    // STEP 7: Verify payment details via payment API
    // ═══════════════════════════════════════════════════════════
    const paymentCheckRes = await request(app)
      .get(`/api/payments/${paymentId}`)
      .set('Authorization', `Bearer ${customerToken}`);

    expect(paymentCheckRes.status).toBe(200);
    expect(paymentCheckRes.body.data.orderId).toBe(orderId);
    expect(Number(paymentCheckRes.body.data.amount)).toBe(orderTotal);

    // ═══════════════════════════════════════════════════════════
    // STEP 8: Verify order appears in user's order list
    // ═══════════════════════════════════════════════════════════
    const ordersListRes = await request(app)
      .get('/api/orders')
      .set('Authorization', `Bearer ${customerToken}`);

    expect(ordersListRes.status).toBe(200);
    expect(ordersListRes.body.data).toHaveLength(1);
    expect(ordersListRes.body.data[0].id).toBe(orderId);
  });

  // ── Test: Payment failure flow ────────────────────────────────
  it('should handle payment failure gracefully', async () => {
    // Create order
    const orderRes = await request(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({
        items: [{ productId: productIds[0], quantity: 1 }],
        shippingAddress: testAddresses.newyork,
      });

    const orderId = orderRes.body.data.id;
    const orderTotal = Number(orderRes.body.data.total);

    // Attempt payment with failing card token
    const paymentRes = await request(app)
      .post('/api/payments')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({
        orderId,
        amount: orderTotal,
        method: 'credit_card',
        cardToken: 'tok_fail', // Simulated decline
      });

    expect(paymentRes.status).toBe(402);
    expect(paymentRes.body.error).toContain('Card was declined');

    // Order should still be pending_payment
    const orderCheck = await request(app)
      .get(`/api/orders/${orderId}`)
      .set('Authorization', `Bearer ${customerToken}`);

    expect(orderCheck.body.data.status).toBe('pending_payment');
  });

  // ── Test: Order cancellation with stock release ───────────────
  it('should cancel order and release stock', async () => {
    // Check initial stock
    const initialStock = await request(app).get(`/api/products/${productIds[2]}`);
    const stockBefore = Number(initialStock.body.data.stock);

    // Create order
    const orderRes = await request(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({
        items: [{ productId: productIds[2], quantity: 5 }],
        shippingAddress: testAddresses.istanbul,
      });

    const orderId = orderRes.body.data.id;

    // Verify stock decreased
    const midStock = await request(app).get(`/api/products/${productIds[2]}`);
    expect(Number(midStock.body.data.stock)).toBe(stockBefore - 5);

    // Cancel order
    const cancelRes = await request(app)
      .post(`/api/orders/${orderId}/cancel`)
      .set('Authorization', `Bearer ${customerToken}`);

    expect(cancelRes.status).toBe(200);
    expect(cancelRes.body.data.status).toBe('cancelled');

    // Verify stock restored
    const finalStock = await request(app).get(`/api/products/${productIds[2]}`);
    expect(Number(finalStock.body.data.stock)).toBe(stockBefore);
  });

  // ── Test: Insufficient stock prevents order ───────────────────
  it('should reject order when stock is insufficient', async () => {
    const res = await request(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({
        items: [{ productId: productIds[0], quantity: 9999 }],
        shippingAddress: testAddresses.istanbul,
      });

    expect(res.status).toBe(400);
    expect(res.body.error).toContain('Insufficient stock');
  });

  // ── Test: Unauthenticated access blocked ──────────────────────
  it('should block unauthenticated order creation', async () => {
    const res = await request(app)
      .post('/api/orders')
      .send({
        items: [{ productId: productIds[0], quantity: 1 }],
        shippingAddress: testAddresses.istanbul,
      });

    expect(res.status).toBe(401);
  });

  // ── Test: Cross-user access blocked ───────────────────────────
  it('should prevent user from viewing another users order', async () => {
    // Customer 1 creates an order
    const orderRes = await request(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({
        items: [{ productId: productIds[0], quantity: 1 }],
        shippingAddress: testAddresses.istanbul,
      });

    const orderId = orderRes.body.data.id;

    // Register customer 2
    const customer2Res = await request(app)
      .post('/api/auth/register')
      .send(testUsers.customer2);

    const customer2Token = customer2Res.body.data.token;

    // Customer 2 tries to view customer 1's order
    const accessRes = await request(app)
      .get(`/api/orders/${orderId}`)
      .set('Authorization', `Bearer ${customer2Token}`);

    expect(accessRes.status).toBe(403);
  });
});

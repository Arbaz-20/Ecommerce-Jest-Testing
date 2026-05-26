import request from 'supertest';
import { createApp } from '../../src/app';
import { testProducts, testUsers, testAddresses } from '../fixtures/testData';
import { query } from '../../src/shared/database';
import { generateToken } from '../../src/shared/middleware/auth';

const app = createApp();

describe('E2E — Refund & Advanced Flows', () => {
  let customerToken: string;
  let adminToken: string;
  let productId: string;

  beforeEach(async () => {
    // Register customer
    const custRes = await request(app)
      .post('/api/auth/register')
      .send(testUsers.customer);
    customerToken = custRes.body.data.token;

    // Register and promote admin
    const adminRes = await request(app)
      .post('/api/auth/register')
      .send(testUsers.admin);

    await query('UPDATE users SET role = $1 WHERE id = $2', [
      'admin',
      adminRes.body.data.user.id,
    ]);

    adminToken = generateToken({
      userId: adminRes.body.data.user.id,
      email: testUsers.admin.email,
      role: 'admin',
    });

    // Seed a product
    const prodRes = await request(app)
      .post('/api/products')
      .set('Authorization', `Bearer ${adminToken}`)
      .send(testProducts[0]);
    productId = prodRes.body.data.id;
  });

  // ── Full refund flow ──────────────────────────────────────────
  it('should complete full purchase → refund lifecycle', async () => {
    // 1. Create order
    const orderRes = await request(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({
        items: [{ productId, quantity: 3 }],
        shippingAddress: testAddresses.istanbul,
      });

    expect(orderRes.status).toBe(201);
    const orderId = orderRes.body.data.id;
    const orderTotal = Number(orderRes.body.data.total);

    // 2. Pay for order
    const payRes = await request(app)
      .post('/api/payments')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({
        orderId,
        amount: orderTotal,
        method: 'credit_card',
        cardToken: 'tok_visa_test',
      });

    expect(payRes.status).toBe(201);
    const paymentId = payRes.body.data.id;

    // 3. Verify order is paid
    const paidOrder = await request(app)
      .get(`/api/orders/${orderId}`)
      .set('Authorization', `Bearer ${customerToken}`);
    expect(paidOrder.body.data.status).toBe('paid');

    // 4. Refund the payment
    const refundRes = await request(app)
      .post(`/api/payments/${paymentId}/refund`)
      .set('Authorization', `Bearer ${customerToken}`);

    expect(refundRes.status).toBe(200);
    expect(refundRes.body.data.status).toBe('refunded');

    // 5. Verify order status changed to refunded
    const refundedOrder = await request(app)
      .get(`/api/orders/${orderId}`)
      .set('Authorization', `Bearer ${customerToken}`);
    expect(refundedOrder.body.data.status).toBe('refunded');
  });

  // ── Double payment prevention ─────────────────────────────────
  it('should prevent paying for an already paid order', async () => {
    // Create + pay
    const orderRes = await request(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({
        items: [{ productId, quantity: 1 }],
        shippingAddress: testAddresses.newyork,
      });

    const orderId = orderRes.body.data.id;
    const orderTotal = Number(orderRes.body.data.total);

    await request(app)
      .post('/api/payments')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({
        orderId,
        amount: orderTotal,
        method: 'credit_card',
        cardToken: 'tok_visa_test',
      });

    // Try to pay again
    const secondPay = await request(app)
      .post('/api/payments')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({
        orderId,
        amount: orderTotal,
        method: 'credit_card',
        cardToken: 'tok_visa_test',
      });

    expect(secondPay.status).toBe(400);
  });

  // ── Double refund prevention ──────────────────────────────────
  it('should prevent refunding an already refunded payment', async () => {
    // Create → pay → refund
    const orderRes = await request(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({
        items: [{ productId, quantity: 1 }],
        shippingAddress: testAddresses.istanbul,
      });

    const orderId = orderRes.body.data.id;
    const total = Number(orderRes.body.data.total);

    const payRes = await request(app)
      .post('/api/payments')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({
        orderId,
        amount: total,
        method: 'credit_card',
        cardToken: 'tok_visa_test',
      });

    const paymentId = payRes.body.data.id;

    // First refund succeeds
    await request(app)
      .post(`/api/payments/${paymentId}/refund`)
      .set('Authorization', `Bearer ${customerToken}`);

    // Second refund should fail
    const doubleRefund = await request(app)
      .post(`/api/payments/${paymentId}/refund`)
      .set('Authorization', `Bearer ${customerToken}`);

    expect(doubleRefund.status).toBe(400);
    expect(doubleRefund.body.error).toContain('Only captured payments');
  });

  // ── Order status progression ──────────────────────────────────
  it('should progress through order lifecycle: paid → processing → shipped → delivered', async () => {
    // Create and pay
    const orderRes = await request(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({
        items: [{ productId, quantity: 1 }],
        shippingAddress: testAddresses.istanbul,
      });

    const orderId = orderRes.body.data.id;
    const total = Number(orderRes.body.data.total);

    await request(app)
      .post('/api/payments')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({
        orderId,
        amount: total,
        method: 'credit_card',
        cardToken: 'tok_visa_test',
      });

    // Transition: paid → processing
    const proc = await request(app)
      .patch(`/api/orders/${orderId}/status`)
      .set('Authorization', `Bearer ${customerToken}`)
      .send({ status: 'processing' });
    expect(proc.body.data.status).toBe('processing');

    // Transition: processing → shipped
    const shipped = await request(app)
      .patch(`/api/orders/${orderId}/status`)
      .set('Authorization', `Bearer ${customerToken}`)
      .send({ status: 'shipped' });
    expect(shipped.body.data.status).toBe('shipped');

    // Transition: shipped → delivered
    const delivered = await request(app)
      .patch(`/api/orders/${orderId}/status`)
      .set('Authorization', `Bearer ${customerToken}`)
      .send({ status: 'delivered' });
    expect(delivered.body.data.status).toBe('delivered');

    // Cannot transition from delivered
    const invalid = await request(app)
      .patch(`/api/orders/${orderId}/status`)
      .set('Authorization', `Bearer ${customerToken}`)
      .send({ status: 'cancelled' });
    expect(invalid.status).toBe(400);
  });

  // ── Multiple orders by same user ──────────────────────────────
  it('should handle multiple orders from the same customer', async () => {
    // Order 1
    await request(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({
        items: [{ productId, quantity: 1 }],
        shippingAddress: testAddresses.istanbul,
      });

    // Order 2
    await request(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({
        items: [{ productId, quantity: 2 }],
        shippingAddress: testAddresses.newyork,
      });

    // List should have 2 orders
    const listRes = await request(app)
      .get('/api/orders')
      .set('Authorization', `Bearer ${customerToken}`);

    expect(listRes.status).toBe(200);
    expect(listRes.body.data).toHaveLength(2);
  });

  // ── Health check ──────────────────────────────────────────────
  it('GET /health should return ok', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
    expect(res.body.timestamp).toBeDefined();
  });

  // ── 404 for unknown routes ────────────────────────────────────
  it('should return 404 for unknown routes', async () => {
    const res = await request(app).get('/api/unknown');
    expect(res.status).toBe(404);
  });
});

import { PaymentService } from '../../../src/modules/payment/payment.service';
import { PaymentGateway } from '../../../src/modules/payment/payment.gateway';
import { PaymentRepository } from '../../../src/modules/payment/payment.repository';
import { OrderRepository } from '../../../src/modules/order/order.repository';
import { testAddresses } from '../../fixtures/testData';

jest.mock('../../../src/modules/payment/payment.repository');
jest.mock('../../../src/modules/order/order.repository');
jest.mock('../../../src/shared/database');

describe('PaymentService — Unit Tests', () => {
  let service: PaymentService;
  let mockPaymentRepo: jest.Mocked<PaymentRepository>;
  let mockOrderRepo: jest.Mocked<OrderRepository>;
  let mockGateway: jest.Mocked<PaymentGateway>;

  const mockOrder = {
    id: 'order-001',
    userId: 'user-001',
    items: [],
    subtotal: 100,
    tax: 8,
    discount: 0,
    total: 108,
    status: 'pending_payment' as const,
    shippingAddress: testAddresses.istanbul,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(() => {
    mockPaymentRepo = new PaymentRepository() as jest.Mocked<PaymentRepository>;
    mockOrderRepo = new OrderRepository() as jest.Mocked<OrderRepository>;
    mockGateway = {
      Charge: jest.fn(),
      Refund: jest.fn(),
    } as unknown as jest.Mocked<PaymentGateway>;

    service = new PaymentService(mockPaymentRepo, mockOrderRepo, mockGateway);
  });

  // ── processPayment ────────────────────────────────────────────
  describe('processPayment()', () => {
    const paymentDto = {
      orderId: 'order-001',
      userId: 'user-001',
      amount: 108,
      method: 'credit_card' as const,
      cardToken: 'tok_visa_test',
    };

    it('should process a successful payment', async () => {
      mockOrderRepo.FindById.mockResolvedValueOnce(mockOrder);
      mockPaymentRepo.FindByOrderId.mockResolvedValueOnce(null);
      mockPaymentRepo.Create.mockResolvedValueOnce({
        id: 'pay-001',
        orderId: 'order-001',
        userId: 'user-001',
        amount: 108,
        currency: 'USD',
        method: 'credit_card',
        status: 'pending',
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      mockGateway.Charge.mockResolvedValueOnce({
        success: true,
        transactionId: 'txn_abc123',
      });

      mockPaymentRepo.UpdateStatus.mockResolvedValueOnce({
        id: 'pay-001',
        orderId: 'order-001',
        userId: 'user-001',
        amount: 108,
        currency: 'USD',
        method: 'credit_card',
        status: 'captured',
        transactionId: 'txn_abc123',
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      mockOrderRepo.UpdateStatus.mockResolvedValueOnce(null);
      mockOrderRepo.SetPaymentId.mockResolvedValueOnce();

      const result = await service.ProcessPayment(paymentDto);

      expect(result.status).toBe('captured');
      expect(result.transactionId).toBe('txn_abc123');
      expect(mockOrderRepo.UpdateStatus).toHaveBeenCalledWith('order-001', 'paid');
      expect(mockOrderRepo.SetPaymentId).toHaveBeenCalledWith('order-001', 'pay-001');
    });

    it('should throw when order not found', async () => {
      mockOrderRepo.FindById.mockResolvedValueOnce(null);

      await expect(service.ProcessPayment(paymentDto)).rejects.toThrow(
        'Order not found'
      );
    });

    it('should throw when order is not in payable state', async () => {
      mockOrderRepo.FindById.mockResolvedValueOnce({
        ...mockOrder,
        status: 'paid',
      });

      await expect(service.ProcessPayment(paymentDto)).rejects.toThrow(
        "in 'paid' state and cannot be paid"
      );
    });

    it('should throw when amount does not match order total', async () => {
      mockOrderRepo.FindById.mockResolvedValueOnce(mockOrder);

      await expect(
        service.ProcessPayment({ ...paymentDto, amount: 50 })
      ).rejects.toThrow('does not match order total');
    });

    it('should handle gateway failure (card declined)', async () => {
      mockOrderRepo.FindById.mockResolvedValueOnce(mockOrder);
      mockPaymentRepo.FindByOrderId.mockResolvedValueOnce(null);
      mockPaymentRepo.Create.mockResolvedValueOnce({
        id: 'pay-002',
        orderId: 'order-001',
        userId: 'user-001',
        amount: 108,
        currency: 'USD',
        method: 'credit_card',
        status: 'pending',
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      mockGateway.Charge.mockResolvedValueOnce({
        success: false,
        errorCode: 'CARD_DECLINED',
        errorMessage: 'Card was declined by the issuer',
      });

      mockPaymentRepo.UpdateStatus.mockResolvedValueOnce(null);

      await expect(service.ProcessPayment(paymentDto)).rejects.toThrow(
        'Card was declined'
      );

      expect(mockPaymentRepo.UpdateStatus).toHaveBeenCalledWith(
        'pay-002',
        'failed',
        undefined,
        'Card was declined by the issuer'
      );
    });
  });

  // ── refundPayment ─────────────────────────────────────────────
  describe('refundPayment()', () => {
    it('should refund a captured payment', async () => {
      mockPaymentRepo.FindById.mockResolvedValueOnce({
        id: 'pay-001',
        orderId: 'order-001',
        userId: 'user-001',
        amount: 108,
        currency: 'USD',
        method: 'credit_card',
        status: 'captured',
        transactionId: 'txn_abc',
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      mockGateway.Refund.mockResolvedValueOnce({
        success: true,
        transactionId: 'ref_xyz',
      });

      mockPaymentRepo.UpdateStatus.mockResolvedValueOnce({
        id: 'pay-001',
        orderId: 'order-001',
        userId: 'user-001',
        amount: 108,
        currency: 'USD',
        method: 'credit_card',
        status: 'refunded',
        transactionId: 'ref_xyz',
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      mockOrderRepo.UpdateStatus.mockResolvedValueOnce(null);

      const result = await service.RefundPayment('pay-001');

      expect(result.status).toBe('refunded');
      expect(mockOrderRepo.UpdateStatus).toHaveBeenCalledWith('order-001', 'refunded');
    });

    it('should reject refund on non-captured payment', async () => {
      mockPaymentRepo.FindById.mockResolvedValueOnce({
        id: 'pay-001',
        orderId: 'order-001',
        userId: 'user-001',
        amount: 108,
        currency: 'USD',
        method: 'credit_card',
        status: 'pending',
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      await expect(service.RefundPayment('pay-001')).rejects.toThrow(
        'Only captured payments can be refunded'
      );
    });
  });

  // ── PaymentGateway Simulation ─────────────────────────────────
  describe('PaymentGateway (simulated)', () => {
    const gateway = new PaymentGateway();

    it('should succeed with valid token', async () => {
      const result = await gateway.Charge(100, 'credit_card', 'tok_valid');
      expect(result.success).toBe(true);
      expect(result.transactionId).toBeDefined();
    });

    it('should fail with tok_fail token', async () => {
      const result = await gateway.Charge(100, 'credit_card', 'tok_fail');
      expect(result.success).toBe(false);
      expect(result.errorCode).toBe('CARD_DECLINED');
    });

    it('should fail with tok_insufficient token', async () => {
      const result = await gateway.Charge(100, 'credit_card', 'tok_insufficient');
      expect(result.success).toBe(false);
      expect(result.errorCode).toBe('INSUFFICIENT_FUNDS');
    });

    it('should fail for amounts over 10000', async () => {
      const result = await gateway.Charge(15000, 'credit_card', 'tok_valid');
      expect(result.success).toBe(false);
      expect(result.errorCode).toBe('AMOUNT_TOO_LARGE');
    });
  });
});

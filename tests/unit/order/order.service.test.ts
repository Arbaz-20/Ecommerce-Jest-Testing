import { OrderService } from '../../../src/modules/order/order.service';
import { OrderRepository } from '../../../src/modules/order/order.repository';
import { ProductRepository } from '../../../src/modules/product/product.repository';
import { testAddresses } from '../../fixtures/testData';

// Mock repositories
jest.mock('../../../src/modules/order/order.repository');
jest.mock('../../../src/modules/product/product.repository');
jest.mock('../../../src/shared/database');

describe('OrderService — Unit Tests', () => {
  let service: OrderService;
  let mockOrderRepo: jest.Mocked<OrderRepository>;
  let mockProductRepo: jest.Mocked<ProductRepository>;

  beforeEach(() => {
    mockOrderRepo = new OrderRepository() as jest.Mocked<OrderRepository>;
    mockProductRepo = new ProductRepository() as jest.Mocked<ProductRepository>;
    service = new OrderService(mockOrderRepo, mockProductRepo);
  });

  // ── getOrder ──────────────────────────────────────────────────
  describe('getOrder()', () => {
    it('should return order when found', async () => {
      const mockOrder = {
        id: 'order-001',
        userId: 'user-001',
        items: [],
        subtotal: 100,
        tax: 8,
        discount: 0,
        total: 108,
        status: 'pending' as const,
        shippingAddress: testAddresses.istanbul,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockOrderRepo.findById.mockResolvedValueOnce(mockOrder);

      const result = await service.getOrder('order-001');

      expect(result).toEqual(mockOrder);
      expect(mockOrderRepo.findById).toHaveBeenCalledWith('order-001');
    });

    it('should throw NotFoundError when order does not exist', async () => {
      mockOrderRepo.findById.mockResolvedValueOnce(null);

      await expect(service.getOrder('nope')).rejects.toThrow('Order not found');
    });
  });

  // ── createOrder ───────────────────────────────────────────────
  describe('createOrder()', () => {
    const createOrderDto = {
      userId: 'user-001',
      items: [
        { productId: 'prod-001', quantity: 2 },
        { productId: 'prod-002', quantity: 1 },
      ],
      shippingAddress: testAddresses.istanbul,
    };

    it('should create order with correct totals', async () => {
      // Mock product lookups
      mockProductRepo.findById
        .mockResolvedValueOnce({
          id: 'prod-001',
          name: 'Keyboard',
          description: '',
          price: 100,
          stock: 50,
          category: 'electronics',
          createdAt: new Date(),
          updatedAt: new Date(),
        })
        .mockResolvedValueOnce({
          id: 'prod-002',
          name: 'Mouse',
          description: '',
          price: 50,
          stock: 30,
          category: 'electronics',
          createdAt: new Date(),
          updatedAt: new Date(),
        });

      // Mock stock reservation
      mockProductRepo.updateStock
        .mockResolvedValueOnce({ id: 'prod-001', stock: 48 } as any)
        .mockResolvedValueOnce({ id: 'prod-002', stock: 29 } as any);

      // Mock order creation
      const createdOrder = {
        id: 'order-new',
        userId: 'user-001',
        items: [
          {
            productId: 'prod-001',
            productName: 'Keyboard',
            quantity: 2,
            unitPrice: 100,
            totalPrice: 200,
          },
          {
            productId: 'prod-002',
            productName: 'Mouse',
            quantity: 1,
            unitPrice: 50,
            totalPrice: 50,
          },
        ],
        subtotal: 250,
        tax: 20,
        discount: 0,
        total: 270,
        status: 'pending_payment' as const,
        shippingAddress: testAddresses.istanbul,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      mockOrderRepo.create.mockResolvedValueOnce(createdOrder);

      const result = await service.createOrder(createOrderDto);

      expect(result.id).toBe('order-new');
      expect(result.status).toBe('pending_payment');
      expect(mockProductRepo.findById).toHaveBeenCalledTimes(2);
      expect(mockProductRepo.updateStock).toHaveBeenCalledTimes(2);
      expect(mockProductRepo.updateStock).toHaveBeenCalledWith('prod-001', -2);
      expect(mockProductRepo.updateStock).toHaveBeenCalledWith('prod-002', -1);
    });

    it('should throw ValidationError for empty items', async () => {
      await expect(
        service.createOrder({ ...createOrderDto, items: [] })
      ).rejects.toThrow('at least one item');
    });

    it('should throw NotFoundError for non-existent product', async () => {
      mockProductRepo.findById.mockResolvedValueOnce(null);

      await expect(service.createOrder(createOrderDto)).rejects.toThrow(
        'not found'
      );
    });

    it('should throw InsufficientStockError when stock is low', async () => {
      mockProductRepo.findById.mockResolvedValueOnce({
        id: 'prod-001',
        name: 'Keyboard',
        description: '',
        price: 100,
        stock: 1, // Less than requested quantity of 2
        category: 'electronics',
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      await expect(service.createOrder(createOrderDto)).rejects.toThrow(
        'Insufficient stock'
      );
    });
  });

  // ── updateOrderStatus ─────────────────────────────────────────
  describe('updateOrderStatus()', () => {
    const baseOrder = {
      id: 'order-001',
      userId: 'user-001',
      items: [
        { productId: 'prod-001', productName: 'KB', quantity: 1, unitPrice: 100, totalPrice: 100 },
      ],
      subtotal: 100,
      tax: 8,
      discount: 0,
      total: 108,
      shippingAddress: testAddresses.istanbul,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    it('should transition pending_payment → paid', async () => {
      mockOrderRepo.findById.mockResolvedValueOnce({
        ...baseOrder,
        status: 'pending_payment',
      });
      mockOrderRepo.updateStatus.mockResolvedValueOnce({
        ...baseOrder,
        status: 'paid',
      });

      const result = await service.updateOrderStatus('order-001', 'paid');

      expect(result.status).toBe('paid');
    });

    it('should reject invalid status transition (paid → pending)', async () => {
      mockOrderRepo.findById.mockResolvedValueOnce({
        ...baseOrder,
        status: 'paid',
      });

      await expect(
        service.updateOrderStatus('order-001', 'pending')
      ).rejects.toThrow("Cannot transition from 'paid' to 'pending'");
    });

    it('should release stock when cancelling', async () => {
      mockOrderRepo.findById.mockResolvedValueOnce({
        ...baseOrder,
        status: 'pending_payment',
      });
      mockProductRepo.updateStock.mockResolvedValueOnce({ id: 'prod-001' } as any);
      mockOrderRepo.updateStatus.mockResolvedValueOnce({
        ...baseOrder,
        status: 'cancelled',
      });

      await service.cancelOrder('order-001');

      expect(mockProductRepo.updateStock).toHaveBeenCalledWith('prod-001', 1);
    });

    it('should reject transition from delivered (terminal state)', async () => {
      mockOrderRepo.findById.mockResolvedValueOnce({
        ...baseOrder,
        status: 'delivered',
      });

      await expect(
        service.updateOrderStatus('order-001', 'shipped')
      ).rejects.toThrow('Cannot transition');
    });
  });
});

import { OrderRepository } from './order.repository';
import { IOrderRepository } from './interfaces/IOrderRepository';
import { IOrderService } from './interfaces/IOrderService';
import { ProductRepository } from '../product/product.repository';
import { IProductRepository } from '../product/interfaces/IProductRepository';
import { Order, CreateOrderDTO, OrderItem, OrderStatus, Coupon } from '../../shared/types';
import {
  NotFoundError,
  ValidationError,
  InsufficientStockError,
} from '../../shared/middleware/errorHandler';
import { calculateTax, applyDiscount, calculateOrderTotal } from '../../shared/utils';
import { getOne } from '../../shared/database';

export class OrderService implements IOrderService {
  private orderRepo: IOrderRepository;
  private productRepo: IProductRepository;

  constructor(
    orderRepo: IOrderRepository = new OrderRepository(),
    productRepo: IProductRepository = new ProductRepository()
  ) {
    this.orderRepo = orderRepo;
    this.productRepo = productRepo;
  }

  async getOrder(id: string): Promise<Order> {
    const order = await this.orderRepo.findById(id);
    if (!order) throw new NotFoundError('Order');
    return order;
  }

  async getUserOrders(userId: string): Promise<Order[]> {
    return this.orderRepo.findByUserId(userId);
  }

  async createOrder(dto: CreateOrderDTO): Promise<Order> {
    if (!dto.items || dto.items.length === 0) {
      throw new ValidationError('Order must have at least one item');
    }

    const orderItems: OrderItem[] = [];
    let subtotal = 0;

    for (const item of dto.items) {
      const product = await this.productRepo.findById(item.productId);
      if (!product) {
        throw new NotFoundError(`Product ${item.productId}`);
      }
      if (product.stock < item.quantity) {
        throw new InsufficientStockError(item.productId);
      }

      const totalPrice = Number(product.price) * item.quantity;
      orderItems.push({
        productId: product.id,
        productName: product.name,
        quantity: item.quantity,
        unitPrice: Number(product.price),
        totalPrice,
      });
      subtotal += totalPrice;
    }

    for (const item of dto.items) {
      const updated = await this.productRepo.updateStock(item.productId, -item.quantity);
      if (!updated) throw new InsufficientStockError(item.productId);
    }

    let discount = 0;
    if (dto.couponCode) {
      discount = await this.applyCoupon(dto.couponCode, subtotal);
    }

    const tax = calculateTax(subtotal - discount);
    const total = calculateOrderTotal(subtotal, tax, discount);

    return this.orderRepo.create(
      dto.userId,
      orderItems,
      subtotal,
      tax,
      discount,
      total,
      dto.shippingAddress,
      dto.couponCode
    );
  }

  async updateOrderStatus(orderId: string, status: OrderStatus): Promise<Order> {
    const order = await this.getOrder(orderId);

    const validTransitions: Record<string, OrderStatus[]> = {
      pending: ['pending_payment', 'cancelled'],
      pending_payment: ['paid', 'cancelled'],
      paid: ['processing', 'refunded'],
      processing: ['shipped', 'cancelled'],
      shipped: ['delivered'],
      delivered: [],
      cancelled: [],
      refunded: [],
    };

    const allowed = validTransitions[order.status] || [];
    if (!allowed.includes(status)) {
      throw new ValidationError(
        `Cannot transition from '${order.status}' to '${status}'`
      );
    }

    if (status === 'cancelled') {
      for (const item of order.items) {
        await this.productRepo.updateStock(item.productId, item.quantity);
      }
    }

    const updated = await this.orderRepo.updateStatus(orderId, status);
    if (!updated) throw new NotFoundError('Order');
    return updated;
  }

  async cancelOrder(orderId: string): Promise<Order> {
    return this.updateOrderStatus(orderId, 'cancelled');
  }

  private async applyCoupon(code: string, subtotal: number): Promise<number> {
    const coupon = await getOne<Coupon>(
      'SELECT * FROM coupons WHERE code = $1 AND is_active = true',
      [code]
    );

    if (!coupon) throw new ValidationError(`Invalid coupon code: ${code}`);
    if (coupon.expiresAt && new Date(coupon.expiresAt) < new Date()) {
      throw new ValidationError('Coupon has expired');
    }
    if (coupon.maxUses > 0 && coupon.currentUses >= coupon.maxUses) {
      throw new ValidationError('Coupon usage limit reached');
    }
    if (subtotal < Number(coupon.minOrderAmount)) {
      throw new ValidationError(
        `Minimum order amount for this coupon is $${coupon.minOrderAmount}`
      );
    }

    return applyDiscount(subtotal, coupon.discountType, Number(coupon.discountValue));
  }
}

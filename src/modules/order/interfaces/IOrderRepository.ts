import { Order, OrderItem, OrderStatus } from '../../../shared/types';

export interface IOrderRepository {
  findById(id: string): Promise<Order | null>;
  findByUserId(userId: string): Promise<Order[]>;
  create(
    userId: string,
    items: OrderItem[],
    subtotal: number,
    tax: number,
    discount: number,
    total: number,
    shippingAddress: Order['shippingAddress'],
    couponCode?: string
  ): Promise<Order>;
  updateStatus(id: string, status: OrderStatus): Promise<Order | null>;
  setPaymentId(orderId: string, paymentId: string): Promise<void>;
}

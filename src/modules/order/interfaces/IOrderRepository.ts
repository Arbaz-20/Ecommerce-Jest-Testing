import { Order, OrderItem, OrderStatus } from '../../../shared/types';

export interface OrderListQuery {
  page?: number;
  pageSize?: number;
  search?: string;
  sortBy?: 'createdAt' | 'total' | 'status';
  sortOrder?: 'asc' | 'desc';
  status?: OrderStatus;
  userId?: string;
}

export interface IOrderRepository {
  FindById(id: string): Promise<Order | null>;
  FindAll(options: OrderListQuery): Promise<{ items: Order[]; total: number }>;
  FindByUserId(userId: string): Promise<Order[]>;
  Create(
    userId: string,
    items: OrderItem[],
    subtotal: number,
    tax: number,
    discount: number,
    total: number,
    shippingAddress: Order['shippingAddress'],
    couponCode?: string
  ): Promise<Order>;
  UpdateStatus(id: string, status: OrderStatus): Promise<Order | null>;
  SetPaymentId(orderId: string, paymentId: string): Promise<void>;
}

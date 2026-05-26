import { Order, CreateOrderDTO, OrderStatus } from '../../../shared/types';

export interface IOrderService {
  getOrder(id: string): Promise<Order>;
  getUserOrders(userId: string): Promise<Order[]>;
  createOrder(dto: CreateOrderDTO): Promise<Order>;
  updateOrderStatus(orderId: string, status: OrderStatus): Promise<Order>;
  cancelOrder(orderId: string): Promise<Order>;
}

import { Order, CreateOrderDTO, OrderStatus, PaginatedResponse } from '../../../shared/types';
import { OrderListQuery } from './IOrderRepository';

export interface IOrderService {
  GetOrderById(id: string): Promise<Order>;
  GetAllOrders(options: OrderListQuery): Promise<PaginatedResponse<Order>>;
  CreateOrder(dto: CreateOrderDTO): Promise<Order>;
  UpdateOrderStatus(orderId: string, status: OrderStatus): Promise<Order>;
  CancelOrder(orderId: string): Promise<Order>;
}

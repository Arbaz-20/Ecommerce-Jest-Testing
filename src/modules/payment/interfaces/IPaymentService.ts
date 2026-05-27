import { Payment, ProcessPaymentDTO, PaginatedResponse } from '../../../shared/types';
import { PaymentListQuery } from './IPaymentRepository';

export interface IPaymentService {
  GetPaymentById(id: string): Promise<Payment>;
  GetAllPayments(options: PaymentListQuery): Promise<PaginatedResponse<Payment>>;
  GetPaymentByOrderId(orderId: string): Promise<Payment>;
  ProcessPayment(dto: ProcessPaymentDTO): Promise<Payment>;
  RefundPayment(paymentId: string): Promise<Payment>;
}

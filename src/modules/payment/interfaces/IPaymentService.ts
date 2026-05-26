import { Payment, ProcessPaymentDTO } from '../../../shared/types';

export interface IPaymentService {
  getPayment(id: string): Promise<Payment>;
  getPaymentByOrder(orderId: string): Promise<Payment>;
  getUserPayments(userId: string): Promise<Payment[]>;
  processPayment(dto: ProcessPaymentDTO): Promise<Payment>;
  refundPayment(paymentId: string): Promise<Payment>;
}

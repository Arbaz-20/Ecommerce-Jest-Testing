import { Payment, PaymentStatus } from '../../../shared/types';

export interface IPaymentRepository {
  findById(id: string): Promise<Payment | null>;
  findByOrderId(orderId: string): Promise<Payment | null>;
  findByUserId(userId: string): Promise<Payment[]>;
  create(
    orderId: string,
    userId: string,
    amount: number,
    method: string,
    currency?: string
  ): Promise<Payment>;
  updateStatus(
    id: string,
    status: PaymentStatus,
    transactionId?: string,
    failureReason?: string
  ): Promise<Payment | null>;
}

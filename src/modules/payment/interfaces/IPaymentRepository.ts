import { Payment, PaymentStatus } from '../../../shared/types';

export interface PaymentListQuery {
  page?: number;
  pageSize?: number;
  search?: string;
  sortBy?: 'createdAt' | 'amount' | 'status';
  sortOrder?: 'asc' | 'desc';
  status?: PaymentStatus;
  userId?: string;
}

export interface IPaymentRepository {
  FindById(id: string): Promise<Payment | null>;
  FindAll(options: PaymentListQuery): Promise<{ items: Payment[]; total: number }>;
  FindByOrderId(orderId: string): Promise<Payment | null>;
  FindByUserId(userId: string): Promise<Payment[]>;
  Create(
    orderId: string,
    userId: string,
    amount: number,
    method: string,
    currency?: string
  ): Promise<Payment>;
  UpdateStatus(
    id: string,
    status: PaymentStatus,
    transactionId?: string,
    failureReason?: string
  ): Promise<Payment | null>;
}

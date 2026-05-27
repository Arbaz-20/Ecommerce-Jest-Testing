import { PaymentRepository } from './payment.repository';
import { PaymentGateway } from './payment.gateway';
import { IPaymentRepository, PaymentListQuery } from './interfaces/IPaymentRepository';
import { IPaymentService } from './interfaces/IPaymentService';
import { IPaymentGateway } from './interfaces/IPaymentGateway';
import { OrderRepository } from '../order/order.repository';
import { IOrderRepository } from '../order/interfaces/IOrderRepository';
import { Payment, ProcessPaymentDTO, PaginatedResponse } from '../../shared/types';
import {
  NotFoundError,
  ValidationError,
  PaymentFailedError,
} from '../../shared/middleware/errorHandler';

export class PaymentService implements IPaymentService {
  private paymentRepo: IPaymentRepository;
  private orderRepo: IOrderRepository;
  private gateway: IPaymentGateway;

  constructor(
    paymentRepo: IPaymentRepository = new PaymentRepository(),
    orderRepo: IOrderRepository = new OrderRepository(),
    gateway: IPaymentGateway = new PaymentGateway()
  ) {
    this.paymentRepo = paymentRepo;
    this.orderRepo = orderRepo;
    this.gateway = gateway;
  }

  async GetPaymentById(id: string): Promise<Payment> {
    const payment = await this.paymentRepo.FindById(id);
    if (!payment) throw new NotFoundError('Payment');
    return payment;
  }

  async GetAllPayments(options: PaymentListQuery): Promise<PaginatedResponse<Payment>> {
    const page = options.page && options.page > 0 ? options.page : 1;
    const pageSize = options.pageSize && options.pageSize > 0 ? Math.min(options.pageSize, 100) : 20;
    const { items, total } = await this.paymentRepo.FindAll({ ...options, page, pageSize });
    return {
      items,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  }

  async GetPaymentByOrderId(orderId: string): Promise<Payment> {
    const payment = await this.paymentRepo.FindByOrderId(orderId);
    if (!payment) throw new NotFoundError('Payment for order');
    return payment;
  }

  async ProcessPayment(dto: ProcessPaymentDTO): Promise<Payment> {
    const order = await this.orderRepo.FindById(dto.orderId);
    if (!order) throw new NotFoundError('Order');

    if (order.status !== 'pending_payment') {
      throw new ValidationError(
        `Order is in '${order.status}' state and cannot be paid`
      );
    }

    if (dto.amount !== Number(order.total)) {
      throw new ValidationError(
        `Payment amount ($${dto.amount}) does not match order total ($${order.total})`
      );
    }

    const existing = await this.paymentRepo.FindByOrderId(dto.orderId);
    if (existing && existing.status === 'captured') {
      throw new ValidationError('Order has already been paid');
    }

    const payment = await this.paymentRepo.Create(
      dto.orderId,
      dto.userId,
      dto.amount,
      dto.method,
      dto.currency || 'USD'
    );

    const gatewayResult = await this.gateway.Charge(
      dto.amount,
      dto.method,
      dto.cardToken
    );

    if (gatewayResult.success) {
      const updated = await this.paymentRepo.UpdateStatus(
        payment.id,
        'captured',
        gatewayResult.transactionId
      );

      await this.orderRepo.UpdateStatus(dto.orderId, 'paid');
      await this.orderRepo.SetPaymentId(dto.orderId, payment.id);

      return updated!;
    } else {
      await this.paymentRepo.UpdateStatus(
        payment.id,
        'failed',
        undefined,
        gatewayResult.errorMessage
      );

      throw new PaymentFailedError(
        gatewayResult.errorMessage || 'Unknown error'
      );
    }
  }

  async RefundPayment(paymentId: string): Promise<Payment> {
    const payment = await this.GetPaymentById(paymentId);

    if (payment.status !== 'captured') {
      throw new ValidationError('Only captured payments can be refunded');
    }

    const result = await this.gateway.Refund(payment.transactionId!, payment.amount);

    if (!result.success) {
      throw new PaymentFailedError('Refund failed');
    }

    const updated = await this.paymentRepo.UpdateStatus(
      paymentId,
      'refunded',
      result.transactionId
    );

    await this.orderRepo.UpdateStatus(payment.orderId, 'refunded');

    return updated!;
  }
}

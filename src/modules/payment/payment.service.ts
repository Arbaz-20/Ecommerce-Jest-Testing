import { PaymentRepository } from './payment.repository';
import { PaymentGateway } from './payment.gateway';
import { IPaymentRepository } from './interfaces/IPaymentRepository';
import { IPaymentService } from './interfaces/IPaymentService';
import { IPaymentGateway } from './interfaces/IPaymentGateway';
import { OrderRepository } from '../order/order.repository';
import { IOrderRepository } from '../order/interfaces/IOrderRepository';
import { Payment, ProcessPaymentDTO } from '../../shared/types';
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

  async getPayment(id: string): Promise<Payment> {
    const payment = await this.paymentRepo.findById(id);
    if (!payment) throw new NotFoundError('Payment');
    return payment;
  }

  async getPaymentByOrder(orderId: string): Promise<Payment> {
    const payment = await this.paymentRepo.findByOrderId(orderId);
    if (!payment) throw new NotFoundError('Payment for order');
    return payment;
  }

  async getUserPayments(userId: string): Promise<Payment[]> {
    return this.paymentRepo.findByUserId(userId);
  }

  async processPayment(dto: ProcessPaymentDTO): Promise<Payment> {
    const order = await this.orderRepo.findById(dto.orderId);
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

    const existing = await this.paymentRepo.findByOrderId(dto.orderId);
    if (existing && existing.status === 'captured') {
      throw new ValidationError('Order has already been paid');
    }

    const payment = await this.paymentRepo.create(
      dto.orderId,
      dto.userId,
      dto.amount,
      dto.method,
      dto.currency || 'USD'
    );

    const gatewayResult = await this.gateway.charge(
      dto.amount,
      dto.method,
      dto.cardToken
    );

    if (gatewayResult.success) {
      const updated = await this.paymentRepo.updateStatus(
        payment.id,
        'captured',
        gatewayResult.transactionId
      );

      await this.orderRepo.updateStatus(dto.orderId, 'paid');
      await this.orderRepo.setPaymentId(dto.orderId, payment.id);

      return updated!;
    } else {
      await this.paymentRepo.updateStatus(
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

  async refundPayment(paymentId: string): Promise<Payment> {
    const payment = await this.getPayment(paymentId);

    if (payment.status !== 'captured') {
      throw new ValidationError('Only captured payments can be refunded');
    }

    const result = await this.gateway.refund(payment.transactionId!, payment.amount);

    if (!result.success) {
      throw new PaymentFailedError('Refund failed');
    }

    const updated = await this.paymentRepo.updateStatus(
      paymentId,
      'refunded',
      result.transactionId
    );

    await this.orderRepo.updateStatus(payment.orderId, 'refunded');

    return updated!;
  }
}

import { Response, NextFunction } from 'express';
import { PaymentService } from './payment.service';
import { IPaymentService } from './interfaces/IPaymentService';
import { AuthenticatedRequest } from '../../shared/middleware/auth';

export class PaymentController {
  private service: IPaymentService;

  constructor(service: IPaymentService = new PaymentService()) {
    this.service = service;
  }

  process = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const payment = await this.service.processPayment({
        ...req.body,
        userId: req.user!.userId,
      });
      res.status(201).json({ success: true, data: payment });
    } catch (err) {
      next(err);
    }
  };

  getById = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const payment = await this.service.getPayment(req.params.id);
      if (payment.userId !== req.user!.userId && req.user!.role !== 'admin') {
        res.status(403).json({ success: false, error: 'Access denied' });
        return;
      }
      res.json({ success: true, data: payment });
    } catch (err) {
      next(err);
    }
  };

  getByOrder = async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const payment = await this.service.getPaymentByOrder(req.params.orderId);
      res.json({ success: true, data: payment });
    } catch (err) {
      next(err);
    }
  };

  refund = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const payment = await this.service.refundPayment(req.params.id);
      res.json({ success: true, data: payment });
    } catch (err) {
      next(err);
    }
  };
}

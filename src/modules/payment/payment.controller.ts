import { Response, NextFunction } from 'express';
import { PaymentService } from './payment.service';
import { IPaymentService } from './interfaces/IPaymentService';
import { PaymentListQuery } from './interfaces/IPaymentRepository';
import { AuthenticatedRequest } from '../../shared/middleware/auth';
import { PaymentStatus } from '../../shared/types';

export class PaymentController {
  private service: IPaymentService;

  constructor(service: IPaymentService = new PaymentService()) {
    this.service = service;
  }

  public GetAllPayments = async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const isAdmin = req.user!.role === 'admin';
      const options: PaymentListQuery = {
        page: req.query.page ? parseInt(req.query.page as string, 10) : undefined,
        pageSize: req.query.pageSize ? parseInt(req.query.pageSize as string, 10) : undefined,
        search: (req.query.search as string) || undefined,
        sortBy: (req.query.sortBy as PaymentListQuery['sortBy']) || undefined,
        sortOrder: (req.query.sortOrder as PaymentListQuery['sortOrder']) || undefined,
        status: (req.query.status as PaymentStatus) || undefined,
        userId: isAdmin ? ((req.query.userId as string) || undefined) : req.user!.userId,
      };
      const result = await this.service.GetAllPayments(options);
      res.json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  };

  public ProcessPayment = async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const payment = await this.service.ProcessPayment({
        ...req.body,
        userId: req.user!.userId,
      });
      res.status(201).json({ success: true, data: payment });
    } catch (err) {
      next(err);
    }
  };

  public GetPaymentById = async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const payment = await this.service.GetPaymentById(req.params.id);
      if (payment.userId !== req.user!.userId && req.user!.role !== 'admin') {
        res.status(403).json({ success: false, error: 'Access denied' });
        return;
      }
      res.json({ success: true, data: payment });
    } catch (err) {
      next(err);
    }
  };

  public GetPaymentByOrderId = async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const payment = await this.service.GetPaymentByOrderId(req.params.orderId);
      res.json({ success: true, data: payment });
    } catch (err) {
      next(err);
    }
  };

  public RefundPayment = async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const payment = await this.service.RefundPayment(req.params.id);
      res.json({ success: true, data: payment });
    } catch (err) {
      next(err);
    }
  };
}

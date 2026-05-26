import { Response, NextFunction } from 'express';
import { OrderService } from './order.service';
import { IOrderService } from './interfaces/IOrderService';
import { AuthenticatedRequest } from '../../shared/middleware/auth';

export class OrderController {
  private service: IOrderService;

  constructor(service: IOrderService = new OrderService()) {
    this.service = service;
  }

  list = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const orders = await this.service.getUserOrders(req.user!.userId);
      res.json({ success: true, data: orders });
    } catch (err) {
      next(err);
    }
  };

  getById = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const order = await this.service.getOrder(req.params.id);
      if (order.userId !== req.user!.userId && req.user!.role !== 'admin') {
        res.status(403).json({ success: false, error: 'Access denied' });
        return;
      }
      res.json({ success: true, data: order });
    } catch (err) {
      next(err);
    }
  };

  create = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const order = await this.service.createOrder({
        ...req.body,
        userId: req.user!.userId,
      });
      res.status(201).json({ success: true, data: order });
    } catch (err) {
      next(err);
    }
  };

  updateStatus = async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const order = await this.service.updateOrderStatus(req.params.id, req.body.status);
      res.json({ success: true, data: order });
    } catch (err) {
      next(err);
    }
  };

  cancel = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const order = await this.service.cancelOrder(req.params.id);
      res.json({ success: true, data: order });
    } catch (err) {
      next(err);
    }
  };
}

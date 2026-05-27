import { Response, NextFunction } from 'express';
import { OrderService } from './order.service';
import { IOrderService } from './interfaces/IOrderService';
import { OrderListQuery } from './interfaces/IOrderRepository';
import { AuthenticatedRequest } from '../../shared/middleware/auth';
import { OrderStatus } from '../../shared/types';

export class OrderController {
  private service: IOrderService;

  constructor(service: IOrderService = new OrderService()) {
    this.service = service;
  }

  GetAllOrders = async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const isAdmin = req.user!.role === 'admin';
      const options: OrderListQuery = {
        page: req.query.page ? parseInt(req.query.page as string, 10) : undefined,
        pageSize: req.query.pageSize ? parseInt(req.query.pageSize as string, 10) : undefined,
        search: (req.query.search as string) || undefined,
        sortBy: (req.query.sortBy as OrderListQuery['sortBy']) || undefined,
        sortOrder: (req.query.sortOrder as OrderListQuery['sortOrder']) || undefined,
        status: (req.query.status as OrderStatus) || undefined,
        userId: isAdmin ? ((req.query.userId as string) || undefined) : req.user!.userId,
      };
      const result = await this.service.GetAllOrders(options);
      res.json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  };

  GetOrderById = async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const order = await this.service.GetOrderById(req.params.id);
      if (order.userId !== req.user!.userId && req.user!.role !== 'admin') {
        res.status(403).json({ success: false, error: 'Access denied' });
        return;
      }
      res.json({ success: true, data: order });
    } catch (err) {
      next(err);
    }
  };

  CreateOrder = async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const order = await this.service.CreateOrder({
        ...req.body,
        userId: req.user!.userId,
      });
      res.status(201).json({ success: true, data: order });
    } catch (err) {
      next(err);
    }
  };

  UpdateOrderStatus = async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const order = await this.service.UpdateOrderStatus(req.params.id, req.body.status);
      res.json({ success: true, data: order });
    } catch (err) {
      next(err);
    }
  };

  CancelOrder = async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const order = await this.service.CancelOrder(req.params.id);
      res.json({ success: true, data: order });
    } catch (err) {
      next(err);
    }
  };
}

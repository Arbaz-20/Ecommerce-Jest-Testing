import { Router } from 'express';
import { OrderController } from './order.controller';
import { authMiddleware } from '../../shared/middleware/auth';

export class OrderRoutes {
  public readonly router: Router;
  private controller: OrderController;

  constructor(controller: OrderController = new OrderController()) {
    this.router = Router();
    this.controller = controller;
    this.registerRoutes();
  }

  private registerRoutes(): void {
    this.router.use(authMiddleware);
    this.router.get('/', this.controller.GetAllOrders);
    this.router.get('/:id', this.controller.GetOrderById);
    this.router.post('/', this.controller.CreateOrder);
    this.router.patch('/:id/status', this.controller.UpdateOrderStatus);
    this.router.post('/:id/cancel', this.controller.CancelOrder);
  }
}

export const orderRoutes = new OrderRoutes().router;

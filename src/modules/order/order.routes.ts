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
    this.router.get('/', this.controller.list);
    this.router.get('/:id', this.controller.getById);
    this.router.post('/', this.controller.create);
    this.router.patch('/:id/status', this.controller.updateStatus);
    this.router.post('/:id/cancel', this.controller.cancel);
  }
}

export const orderRoutes = new OrderRoutes().router;

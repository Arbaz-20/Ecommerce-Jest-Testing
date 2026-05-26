import { Router } from 'express';
import { PaymentController } from './payment.controller';
import { authMiddleware } from '../../shared/middleware/auth';

export class PaymentRoutes {
  public readonly router: Router;
  private controller: PaymentController;

  constructor(controller: PaymentController = new PaymentController()) {
    this.router = Router();
    this.controller = controller;
    this.registerRoutes();
  }

  private registerRoutes(): void {
    this.router.use(authMiddleware);
    this.router.post('/', this.controller.process);
    this.router.get('/order/:orderId', this.controller.getByOrder);
    this.router.get('/:id', this.controller.getById);
    this.router.post('/:id/refund', this.controller.refund);
  }
}

export const paymentRoutes = new PaymentRoutes().router;

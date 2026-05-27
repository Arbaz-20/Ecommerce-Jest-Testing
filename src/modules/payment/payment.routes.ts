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
    this.router.get('/', this.controller.GetAllPayments);
    this.router.post('/', this.controller.ProcessPayment);
    this.router.get('/order/:orderId', this.controller.GetPaymentByOrderId);
    this.router.get('/:id', this.controller.GetPaymentById);
    this.router.post('/:id/refund', this.controller.RefundPayment);
  }
}

export const paymentRoutes = new PaymentRoutes().router;

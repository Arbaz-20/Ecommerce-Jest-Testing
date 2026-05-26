import express from 'express';
import cors from 'cors';
import { productRoutes } from './modules/product/product.routes';
import { orderRoutes } from './modules/order/order.routes';
import { paymentRoutes } from './modules/payment/payment.routes';
import { userRoutes } from './modules/user/user.routes';
import { errorHandler } from './shared/middleware/errorHandler';

export function createApp(): express.Application {
  const app = express();

  app.use(cors());
  app.use(express.json());

  app.get('/health', (_req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  app.use('/api/products', productRoutes);
  app.use('/api/orders', orderRoutes);
  app.use('/api/payments', paymentRoutes);
  app.use('/api/auth', userRoutes);

  app.use((_req, res) => {
    res.status(404).json({ success: false, error: 'Route not found' });
  });

  app.use(errorHandler);

  return app;
}

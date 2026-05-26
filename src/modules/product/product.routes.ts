import { Router } from 'express';
import { ProductController } from './product.controller';
import { authMiddleware, adminMiddleware } from '../../shared/middleware/auth';

export class ProductRoutes {
  public readonly router: Router;
  private controller: ProductController;

  constructor(controller: ProductController = new ProductController()) {
    this.router = Router();
    this.controller = controller;
    this.registerRoutes();
  }

  private registerRoutes(): void {
    this.router.get('/', this.controller.list);
    this.router.get('/search', this.controller.search);
    this.router.get('/:id', this.controller.getById);
    this.router.post('/', authMiddleware, adminMiddleware, this.controller.create);
    this.router.put('/:id', authMiddleware, adminMiddleware, this.controller.update);
    this.router.delete('/:id', authMiddleware, adminMiddleware, this.controller.delete);
  }
}

export const productRoutes = new ProductRoutes().router;
